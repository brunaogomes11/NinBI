import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { dashboards, dashboardTabs, widgets } from '../../src/database/schema'
import { createConnection, createDashboard } from '../factories'
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
  const crypto = test.app.get(CryptoService)
  const connection = await createConnection(test.db, crypto)
  const other = await createConnection(test.db, crypto, { name: 'Estoque' })
  const owner = await signInAs(test.app, test.db, 'EDITOR', 'dono@x.com')
  const created = await owner.agent
    .post('/api/dashboards')
    .send({ name: 'Vendas', connectionId: connection.id })
  const id: string = created.body.id
  return { ...test, connection, other, owner, id, url: `/api/dashboards/${id}` }
}

const widget = (n: number, overrides: Record<string, unknown> = {}) => ({
  id: uuid(100 + n),
  title: `Widget ${n}`,
  cypher: `MATCH (n) RETURN n LIMIT ${n}`,
  visualization: 'TABLE',
  config: {},
  layout: { x: 0, y: 0, w: 4, h: 4 },
  ...overrides,
})

describe('salvar e excluir dashboards', () => {
  it('EDIT-02 salvar grava nome, conexão, abas, widgets e layout de uma vez', async () => {
    const t = await setup()
    const body = {
      version: 1,
      name: 'Vendas 2',
      connectionId: t.other.id,
      tabs: [
        { id: uuid(2), name: 'Resumo', widgets: [widget(1), widget(2)] },
        { id: uuid(1), name: 'Detalhe', widgets: [widget(3)] },
      ],
    }
    const saved = await t.owner.agent.put(t.url).send(body)
    expect(saved.status).toBe(200)

    const opened = await t.owner.agent.get(t.url)
    expect(opened.body).toMatchObject({
      name: 'Vendas 2',
      connectionId: t.other.id,
      connectionName: 'Estoque',
      version: 2,
    })
    expect(opened.body.tabs.map((tab: { name: string }) => tab.name)).toEqual([
      'Resumo',
      'Detalhe',
    ])
    expect(
      opened.body.tabs.map((tab: { widgets: { id: string }[] }) =>
        tab.widgets.map((w) => w.id).sort(),
      ),
    ).toEqual([[uuid(101), uuid(102)], [uuid(103)]])
    expect(opened.body.tabs[0].widgets[0]).toMatchObject({
      title: expect.stringMatching(/^Widget [12]$/),
      cypher: expect.stringContaining('MATCH (n) RETURN n LIMIT'),
      hasQuery: true,
      visualization: 'TABLE',
    })
    expect(saved.body.version).toBe(2)
  })

  it('GRID-06 salvar grava posição e tamanho de cada widget por aba', async () => {
    const t = await setup()
    const layout = { x: 4, y: 0, w: 6, h: 3 }
    await t.owner.agent.put(t.url).send({
      version: 1,
      name: 'Vendas',
      connectionId: t.connection.id,
      tabs: [
        { id: uuid(1), name: 'Aba 1', widgets: [widget(1)] },
        { id: uuid(2), name: 'Aba 2', widgets: [widget(2, { layout })] },
      ],
    })
    const opened = await t.owner.agent.get(t.url)
    expect(opened.body.tabs[1].widgets[0].layout).toEqual(layout)
    expect(opened.body.tabs[0].widgets[0].layout).toEqual({
      x: 0,
      y: 0,
      w: 4,
      h: 4,
    })
  })

  it('EDIT-04 versão desatualizada responde 409', async () => {
    const t = await setup()
    const send = (name: string) =>
      t.owner.agent.put(t.url).send({
        version: 1,
        name,
        connectionId: t.connection.id,
        tabs: [{ id: uuid(1), name: 'Aba 1', widgets: [] }],
      })
    expect((await send('Primeiro')).status).toBe(200)

    const second = await send('Segundo')
    expect(second.status).toBe(409)
    expect(second.body).toMatchObject({
      code: 'DASHBOARD_VERSION_CONFLICT',
      message:
        'Este dashboard foi alterado por outra pessoa. Recarregue para continuar.',
    })
    const [row] = await t.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, t.id))
    expect(row).toMatchObject({ name: 'Primeiro', version: 2 })
  })

  it('EDIT-02 salvar atualiza a data da última alteração com o relógio', async () => {
    const t = await setup()
    t.clock.advance(60 * 60 * 1000)
    await t.owner.agent.put(t.url).send({
      version: 1,
      name: 'Vendas',
      connectionId: t.connection.id,
      tabs: [{ id: uuid(1), name: 'Aba 1', widgets: [] }],
    })
    const opened = await t.owner.agent.get(t.url)
    expect(opened.body.updatedAt).toBe('2026-01-01T13:00:00.000Z')
  })

  it('DASH-11 excluir apaga abas e widgets', async () => {
    const t = await setup()
    await t.owner.agent.put(t.url).send({
      version: 1,
      name: 'Vendas',
      connectionId: t.connection.id,
      tabs: [{ id: uuid(1), name: 'Aba 1', widgets: [widget(1)] }],
    })
    const removed = await t.owner.agent.delete(t.url)
    expect(removed.status).toBe(204)
    expect((await t.owner.agent.get(t.url)).status).toBe(404)
    const tabs = await t.db
      .select()
      .from(dashboardTabs)
      .where(eq(dashboardTabs.dashboardId, t.id))
    const rows = await t.db
      .select()
      .from(widgets)
      .where(eq(widgets.dashboardId, t.id))
    expect(tabs).toEqual([])
    expect(rows).toEqual([])
  })

  it('DASH-19 quem só vê recebe 403 ao alterar ou excluir', async () => {
    const t = await setup()
    const viewer = await signInAs(t.app, t.db, 'VIEWER')
    const editor = await signInAs(t.app, t.db, 'EDITOR', 'colega@x.com')
    t.shares.grant(viewer.user.id, t.id, 'view')
    t.shares.grant(editor.user.id, t.id, 'edit')
    const body = {
      version: 1,
      name: 'Hack',
      connectionId: t.connection.id,
      tabs: [{ id: uuid(1), name: 'Aba 1', widgets: [] }],
    }

    expect((await viewer.agent.put(t.url).send(body)).status).toBe(403)
    expect((await viewer.agent.delete(t.url)).status).toBe(403)
    expect((await editor.agent.delete(t.url)).status).toBe(403)
    const [row] = await t.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, t.id))
    expect(row).toMatchObject({ name: 'Vendas', version: 1 })
    expect((await editor.agent.put(t.url).send(body)).status).toBe(200)
  })

  it('EDIT-02 widget com id de outro dashboard dá 400 sem alterar nada', async () => {
    const t = await setup()
    const rival = await createDashboard(t.db, {
      ownerId: t.owner.user.id,
      connectionId: t.connection.id,
      name: 'Rival',
    })
    await t.db.insert(dashboardTabs).values({
      id: uuid(50),
      dashboardId: rival.id,
      name: 'Aba',
      position: 0,
    })
    await t.db.insert(widgets).values({
      id: uuid(150),
      dashboardId: rival.id,
      tabId: uuid(50),
      title: 'Alheio',
      x: 0,
      y: 0,
      w: 4,
      h: 4,
    })
    const stolen = await t.owner.agent.put(t.url).send({
      version: 1,
      name: 'Mudou',
      connectionId: t.connection.id,
      tabs: [
        { id: uuid(1), name: 'Aba 1', widgets: [widget(0, { id: uuid(150) })] },
      ],
    })
    expect(stolen.status).toBe(400)
    expect(stolen.body.code).toBe('VALIDATION_ERROR')

    const [row] = await t.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, t.id))
    expect(row).toMatchObject({ name: 'Vendas', version: 1 })
    const [theirs] = await t.db
      .select()
      .from(widgets)
      .where(eq(widgets.id, uuid(150)))
    expect(theirs).toMatchObject({ dashboardId: rival.id, title: 'Alheio' })
    const mine = await t.db
      .select()
      .from(dashboardTabs)
      .where(eq(dashboardTabs.dashboardId, t.id))
    expect(mine).toHaveLength(1)
    expect(mine[0]?.name).toBe('Aba 1')
  })
})
