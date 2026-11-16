import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { dashboardTabs, widgets } from '../../src/database/schema'
import { Neo4jGatewayError } from '../../src/neo4j/neo4j.gateway'
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
  const connection = await createConnection(test.db, crypto, {
    uri: 'neo4j://vendas.exemplo:7687',
  })
  const other = await createConnection(test.db, crypto, {
    name: 'Estoque',
    uri: 'neo4j://estoque.exemplo:7687',
  })
  const owner = await signInAs(test.app, test.db, 'EDITOR', 'dono@x.com')
  const dashboard = await createDashboard(test.db, {
    ownerId: owner.user.id,
    connectionId: connection.id,
  })
  const tabId = uuid(1)
  await test.db.insert(dashboardTabs).values({
    id: tabId,
    dashboardId: dashboard.id,
    name: 'Aba 1',
    position: 0,
  })
  const widgetId = uuid(2)
  await test.db.insert(widgets).values({
    id: widgetId,
    dashboardId: dashboard.id,
    tabId,
    title: 'Lojas',
    cypher: 'MATCH (l:Loja) RETURN l.nome AS nome',
    x: 0,
    y: 0,
    w: 4,
    h: 4,
  })
  test.neo4j.whenRead('MATCH (l:Loja)', [{ nome: 'Centro' }, { nome: 'Norte' }])
  return {
    ...test,
    connection,
    other,
    owner,
    dashboard,
    widgetId,
    textUrl: `/api/dashboards/${dashboard.id}/query`,
    widgetUrl: `/api/dashboards/${dashboard.id}/widgets/${widgetId}/run`,
  }
}

describe('execução de consultas', () => {
  it('WDG-02 executa o Cypher enviado na conexão do dashboard', async () => {
    const t = await setup()
    const res = await t.owner.agent
      .post(t.textUrl)
      .send({ cypher: 'MATCH (l:Loja) RETURN l.nome AS nome' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      columns: ['nome'],
      rows: [['Centro'], ['Norte']],
      truncated: false,
      rowLimit: 5000,
    })
    const [call] = t.neo4j.calls
    expect(call?.cfg.uri).toBe('neo4j://vendas.exemplo:7687')
    expect(call?.cypher).toBe('MATCH (l:Loja) RETURN l.nome AS nome')
  })

  it('QRY-11 quem não pode editar recebe 403 ao executar texto', async () => {
    const t = await setup()
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'vis@x.com')
    t.shares.grant(viewer.user.id, t.dashboard.id, 'view')
    const res = await viewer.agent
      .post(t.textUrl)
      .send({ cypher: 'MATCH (l:Loja) RETURN l.nome AS nome' })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
    expect(t.neo4j.calls).toEqual([])
  })

  it('QRY-12 quem só vê executa o widget salvo pelo id', async () => {
    const t = await setup()
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'vis@x.com')
    t.shares.grant(viewer.user.id, t.dashboard.id, 'view')
    const res = await viewer.agent
      .post(t.widgetUrl)
      .send({ cypher: 'MATCH (n) DETACH DELETE n' })
    expect(res.status).toBe(200)
    expect(res.body.rows).toEqual([['Centro'], ['Norte']])
    expect(t.neo4j.calls.map((call) => call.cypher)).toEqual([
      'MATCH (l:Loja) RETURN l.nome AS nome',
    ])
  })

  it('QRY-16 quem não alcança recebe 404 ao executar widget', async () => {
    const t = await setup()
    const stranger = await signInAs(t.app, t.db, 'EDITOR', 'outro@x.com')
    const text = await stranger.agent
      .post(t.textUrl)
      .send({ cypher: 'RETURN 1' })
    const widget = await stranger.agent.post(t.widgetUrl).send({})
    expect(text.status).toBe(404)
    expect(text.body.code).toBe('DASHBOARD_NOT_FOUND')
    expect(widget.status).toBe(404)
    expect(widget.body.code).toBe('DASHBOARD_NOT_FOUND')
    expect(t.neo4j.calls).toEqual([])
  })

  it('TBL-12 quem só vê recebe a mensagem genérica de erro', async () => {
    const t = await setup()
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'vis@x.com')
    t.shares.grant(viewer.user.id, t.dashboard.id, 'view')
    t.neo4j.whenRead(
      'MATCH (l:Loja)',
      new Neo4jGatewayError('Variable `l` not defined'),
    )
    const seen = await viewer.agent.post(t.widgetUrl).send({})
    expect(seen.status).toBe(422)
    expect(seen.body.message).toBe('Não foi possível carregar este widget')
    expect(JSON.stringify(seen.body)).not.toContain('Variable')

    const own = await t.owner.agent.post(t.widgetUrl).send({})
    expect(own.status).toBe(422)
    expect(own.body.message).toBe('Variable `l` not defined')
  })

  it('EDIT-10 quem edita executa o texto em outra conexão', async () => {
    const t = await setup()
    const res = await t.owner.agent.post(t.textUrl).send({
      cypher: 'MATCH (l:Loja) RETURN l.nome AS nome',
      connectionId: t.other.id,
    })
    expect(res.status).toBe(200)
    expect(t.neo4j.calls[0]?.cfg.uri).toBe('neo4j://estoque.exemplo:7687')
  })

  it('WDG-02 widget de outro dashboard dá 404 WIDGET_NOT_FOUND', async () => {
    const t = await setup()
    const second = await createDashboard(t.db, {
      ownerId: t.owner.user.id,
      connectionId: t.connection.id,
      name: 'Outro',
    })
    const res = await t.owner.agent
      .post(`/api/dashboards/${second.id}/widgets/${t.widgetId}/run`)
      .send({})
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('WIDGET_NOT_FOUND')
    expect(t.neo4j.calls).toEqual([])
  })
})
