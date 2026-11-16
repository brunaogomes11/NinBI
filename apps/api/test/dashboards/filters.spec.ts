import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { dashboards } from '../../src/database/schema'
import { createConnection } from '../factories'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

async function setup() {
  const test = await createTestApp()
  close = test.close
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  const owner = await signInAs(test.app, test.db, 'EDITOR', 'dono@x.com')
  const created = await owner.agent
    .post('/api/dashboards')
    .send({ name: 'Vendas', connectionId: connection.id })
  const id: string = created.body.id
  return { ...test, connection, owner, id, url: `/api/dashboards/${id}` }
}

const categoria = {
  id: uuid(11),
  label: 'Categoria',
  parameter: 'categoria',
  type: 'SINGLE_SELECT',
  options: { source: 'QUERY', cypher: 'MATCH (c:Categoria) RETURN c.nome' },
  defaultValue: null,
}
const periodo = {
  id: uuid(12),
  label: 'Período',
  parameter: 'periodo',
  type: 'DATE_RANGE',
  options: null,
  defaultValue: { start: '2025-01-01', end: null },
}

const widget = (n: number, cypher: string | null) => ({
  id: uuid(100 + n),
  title: `Widget ${n}`,
  cypher,
  visualization: 'TABLE',
  config: {},
  layout: { x: 0, y: 0, w: 4, h: 4 },
})

const body = (
  t: { connection: { id: string } },
  extra: Record<string, unknown> = {},
  widgets: ReturnType<typeof widget>[] = [],
  version = 1,
) => ({
  version,
  name: 'Vendas',
  connectionId: t.connection.id,
  tabs: [{ id: uuid(1), name: 'Geral', widgets }],
  ...extra,
})

describe('filtros e intervalo de atualização do dashboard', () => {
  it('FLT-17 salvar grava os filtros com o dashboard', async () => {
    const t = await setup()
    const saved = await t.owner.agent
      .put(t.url)
      .send(body(t, { filters: [categoria, periodo] }))
    expect(saved.status).toBe(200)

    const opened = await t.owner.agent.get(t.url)
    expect(opened.body.filters).toEqual([categoria, periodo])

    const removed = await t.owner.agent.delete(t.url)
    expect(removed.status).toBe(204)
    const rows = await t.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, t.id))
    expect(rows).toHaveLength(0)
  })

  it('RFR-03 intervalo padrão é gravado e devolvido com o dashboard', async () => {
    const t = await setup()
    const fresh = await t.owner.agent.get(t.url)
    expect(fresh.body.filters).toEqual([])
    expect(fresh.body.refreshIntervalSec).toBe(0)

    const saved = await t.owner.agent
      .put(t.url)
      .send(body(t, { refreshIntervalSec: 60 }))
    expect(saved.status).toBe(200)

    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'ver@x.com')
    t.shares.grant(viewer.user.id, t.id, 'view')
    const seen = await viewer.agent.get(t.url)
    expect(seen.status).toBe(200)
    expect(seen.body.refreshIntervalSec).toBe(60)
  })

  it('FLT-30 quem só vê recebe 403 ao gravar filtros', async () => {
    const t = await setup()
    const viewer = await signInAs(t.app, t.db, 'EDITOR', 'ver@x.com')
    t.shares.grant(viewer.user.id, t.id, 'view')

    const response = await viewer.agent
      .put(t.url)
      .send(body(t, { filters: [categoria] }))
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('DASHBOARD_EDIT_FORBIDDEN')

    const owner = await t.owner.agent.get(t.url)
    expect(owner.body.filters).toEqual([])
  })

  it('FLT-09 cada widget traz os parâmetros que o Cypher usa', async () => {
    const t = await setup()
    await t.owner.agent
      .put(t.url)
      .send(
        body(t, { filters: [categoria, periodo] }, [
          widget(
            1,
            'MATCH (n) WHERE n.c = $categoria AND n.d >= $periodo_inicio RETURN n',
          ),
          widget(2, null),
        ]),
      )
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'ver@x.com')
    t.shares.grant(viewer.user.id, t.id, 'view')
    const seen = await viewer.agent.get(t.url)
    const [first, second] = seen.body.tabs[0].widgets
    expect(first.cypher).toBeNull()
    expect(first.parameters).toEqual(['categoria', 'periodo_inicio'])
    expect(second.parameters).toEqual([])
  })

  it('FLT-30 quem só vê não recebe o Cypher das opções do filtro', async () => {
    const t = await setup()
    await t.owner.agent.put(t.url).send(body(t, { filters: [categoria] }))
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'ver@x.com')
    t.shares.grant(viewer.user.id, t.id, 'view')

    const seen = await viewer.agent.get(t.url)
    expect(seen.body.filters[0].options).toEqual({
      source: 'QUERY',
      cypher: null,
    })
    const owner = await t.owner.agent.get(t.url)
    expect(owner.body.filters[0].options.cypher).toBe(
      'MATCH (c:Categoria) RETURN c.nome',
    )
  })

  it('FLT-03 filtro com parâmetro repetido responde 400 e o dashboard fica na versão anterior', async () => {
    const t = await setup()
    const response = await t.owner.agent.put(t.url).send(
      body(t, {
        filters: [categoria, { ...categoria, id: uuid(13), label: 'Outra' }],
      }),
    )
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('VALIDATION_ERROR')
    const opened = await t.owner.agent.get(t.url)
    expect(opened.body.version).toBe(1)
    expect(opened.body.filters).toEqual([])
  })
})
