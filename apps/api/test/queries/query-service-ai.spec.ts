import { afterEach, describe, expect, it } from 'vitest'
import type { AppError } from '../../src/common/app-error'
import { CryptoService } from '../../src/crypto/crypto.service'
import { Neo4jGatewayError } from '../../src/neo4j/neo4j.gateway'
import { QueryService } from '../../src/queries/query.service'
import { createConnection, createDashboard } from '../factories'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup() {
  const test = await createTestApp()
  close = test.close
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  return { ...test, connection, service: test.app.get(QueryService) }
}

describe('QueryService para a IA', () => {
  it('AIQ-13 QueryService repassa o signal ao gateway', async () => {
    const t = await setup()
    t.neo4j.whenRead('MATCH (n)', 'hang')
    const controller = new AbortController()
    const started = Date.now()

    const pending = t.service
      .run({
        userId: 'u1',
        connectionId: t.connection.id,
        cypher: 'MATCH (n) RETURN n',
        signal: controller.signal,
      })
      .catch((error: unknown) => error)
    setTimeout(() => controller.abort(), 50)
    const error = (await pending) as AppError

    expect(error.code).toBe('QUERY_TIMEOUT')
    expect(Date.now() - started).toBeLessThan(5000)
  })

  it('FIX-04 erro do Neo4j guarda o código sem serializá-lo', async () => {
    const t = await setup()
    t.neo4j.whenRead(
      'RETURN 1/0',
      new Neo4jGatewayError(
        '/ by zero',
        'Neo.ClientError.Statement.ArithmeticError',
      ),
    )

    const error = (await t.service
      .run({
        userId: 'u1',
        connectionId: t.connection.id,
        cypher: 'RETURN 1/0 AS x',
      })
      .catch((e: unknown) => e)) as AppError
    expect(error.code).toBe('QUERY_FAILED')
    expect(error.neo4jCode).toBe('Neo.ClientError.Statement.ArithmeticError')

    const owner = await signInAs(t.app, t.db, 'EDITOR', 'dono@x.com')
    const dashboard = await createDashboard(t.db, {
      ownerId: owner.user.id,
      connectionId: t.connection.id,
    })
    const res = await owner.agent
      .post(`/api/dashboards/${dashboard.id}/query`)
      .send({ cypher: 'RETURN 1/0 AS x' })
    expect(res.status).toBe(422)
    expect(Object.keys(res.body).sort()).toEqual(['code', 'message'])
    expect(res.body.code).toBe('QUERY_FAILED')
  })
})
