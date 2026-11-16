import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { connections } from '../../src/database/schema'
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
  const crypto = test.app.get(CryptoService)
  const admin = await signInAs(test.app, test.db, 'ADMIN')
  const editor = await signInAs(test.app, test.db, 'EDITOR')
  return { ...test, crypto, admin, editor }
}

describe('excluir conexão usada por dashboards', () => {
  it('DASH-14 excluir conexão usada responde 409 com o número de dashboards', async () => {
    const t = await setup()
    const used = await createConnection(t.db, t.crypto, { name: 'Usada' })
    for (const name of ['Um', 'Dois']) {
      await createDashboard(t.db, {
        ownerId: t.editor.user.id,
        connectionId: used.id,
        name,
      })
    }

    const response = await t.admin.agent.delete(`/api/connections/${used.id}`)

    expect(response.status).toBe(409)
    expect(response.body).toMatchObject({
      code: 'CONNECTION_IN_USE',
      message: 'Esta conexão é usada por 2 dashboard(s)',
    })
    const rows = await t.db
      .select()
      .from(connections)
      .where(eq(connections.id, used.id))
    expect(rows).toHaveLength(1)
  })

  it('DASH-14 conexão sem dashboards continua dando 204', async () => {
    const t = await setup()
    const used = await createConnection(t.db, t.crypto, { name: 'Usada' })
    const free = await createConnection(t.db, t.crypto, { name: 'Livre' })
    await createDashboard(t.db, {
      ownerId: t.editor.user.id,
      connectionId: used.id,
    })

    const response = await t.admin.agent.delete(`/api/connections/${free.id}`)

    expect(response.status).toBe(204)
    const rows = await t.db
      .select()
      .from(connections)
      .where(eq(connections.id, free.id))
    expect(rows).toEqual([])
  })
})
