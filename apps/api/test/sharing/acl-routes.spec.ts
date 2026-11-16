import type { DashboardDto } from '@ninbi/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { dashboardTabs, widgets } from '../../src/database/schema'
import { createConnection, createDashboard, createTeam } from '../factories'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const TAB_ID = uuid(1)
const WIDGET_ID = uuid(2)

async function setup() {
  const test = await createTestApp({ realShares: true })
  close = test.close
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  const owner = await signInAs(test.app, test.db, 'EDITOR', 'dono@x.com')
  const admin = await signInAs(test.app, test.db, 'ADMIN', 'admin@x.com')
  const dashboard = await createDashboard(test.db, {
    ownerId: owner.user.id,
    connectionId: connection.id,
    name: 'Painel',
  })
  await test.db.insert(dashboardTabs).values({
    id: TAB_ID,
    dashboardId: dashboard.id,
    name: 'Aba 1',
    position: 0,
  })
  await test.db.insert(widgets).values({
    id: WIDGET_ID,
    dashboardId: dashboard.id,
    tabId: TAB_ID,
    title: 'Lojas',
    cypher: 'MATCH (l:Loja) RETURN l.nome AS nome',
    x: 0,
    y: 0,
    w: 4,
    h: 4,
  })
  test.neo4j.whenRead('MATCH (l:Loja)', [{ nome: 'Centro' }])
  const url = `/api/dashboards/${dashboard.id}`
  const share = (
    recipient: Record<string, unknown>,
    permission: 'view' | 'edit',
  ) =>
    owner.agent
      .post(`${url}/shares`)
      .send({ recipient, permission })
      .expect(200)
  const shareUser = (userId: string, permission: 'view' | 'edit') =>
    share({ type: 'USER', userId }, permission)
  const put = (agent: typeof owner.agent, version: number, name = 'Painel') =>
    agent.put(url).send({
      version,
      name,
      connectionId: connection.id,
      tabs: [{ id: TAB_ID, name: 'Aba 1', widgets: [] }],
    })
  return {
    ...test,
    connection,
    owner,
    admin,
    dashboard,
    url,
    share,
    shareUser,
    put,
  }
}

type Setup = Awaited<ReturnType<typeof setup>>
type Agent = Setup['owner']['agent']

/** Chama cada rota de dashboard como `agent` e devolve o status de cada uma. */
async function statuses(
  t: Setup,
  agent: Agent,
): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  result.get = (await agent.get(t.url)).status
  result.put = (await t.put(agent, 1)).status
  result.query = (
    await agent
      .post(`${t.url}/query`)
      .send({ cypher: 'MATCH (l:Loja) RETURN l' })
  ).status
  result.run = (
    await agent.post(`${t.url}/widgets/${WIDGET_ID}/run`).send({})
  ).status
  result.shares = (await agent.get(`${t.url}/shares`)).status
  result.candidates = (await agent.get(`${t.url}/share-candidates?q=a`)).status
  result.delete = (await agent.delete(t.url)).status
  return result
}

describe('permissão por dashboard nas rotas', () => {
  it('ACL-03 toda rota de dashboard verifica a permissão no dashboard', async () => {
    const t = await setup()
    const outsider = await signInAs(t.app, t.db, 'EDITOR', 'fora@x.com')
    const viewer = await signInAs(t.app, t.db, 'EDITOR', 'ver@x.com')
    await t.shareUser(viewer.user.id, 'view')

    expect(await statuses(t, outsider.agent)).toEqual({
      get: 404,
      put: 404,
      query: 404,
      run: 404,
      shares: 404,
      candidates: 404,
      delete: 404,
    })
    expect(await statuses(t, viewer.agent)).toEqual({
      get: 200,
      put: 403,
      query: 403,
      run: 200,
      shares: 403,
      candidates: 403,
      delete: 403,
    })
  })

  it('ACL-06 quem pode ver recebe permissões sem editar, excluir nem compartilhar', async () => {
    const t = await setup()
    const viewer = await signInAs(t.app, t.db, 'EDITOR', 'ver@x.com')
    await t.shareUser(viewer.user.id, 'view')

    const res = await viewer.agent.get(t.url)
    expect(res.status).toBe(200)
    expect((res.body as DashboardDto).permissions).toEqual({
      edit: false,
      delete: false,
      share: false,
    })
  })

  it('ACL-07 quem pode editar recebe editar sem excluir nem compartilhar', async () => {
    const t = await setup()
    const editor = await signInAs(t.app, t.db, 'EDITOR', 'edita@x.com')
    await t.shareUser(editor.user.id, 'edit')

    const res = await editor.agent.get(t.url)
    expect((res.body as DashboardDto).permissions).toEqual({
      edit: true,
      delete: false,
      share: false,
    })
    const saved = await t.put(editor.agent, (res.body as DashboardDto).version)
    expect(saved.status).toBe(200)
    expect((await editor.agent.delete(t.url)).status).toBe(403)
  })

  it('ACL-12 acesso removido responde Dashboard não encontrado na próxima ação', async () => {
    const t = await setup()
    const guest = await signInAs(t.app, t.db, 'EDITOR', 'conv@x.com')
    const created = await t.shareUser(guest.user.id, 'edit')
    expect((await guest.agent.get(t.url)).status).toBe(200)

    await t.owner.agent
      .delete(`${t.url}/shares/${created.body.shares[0].id}`)
      .expect(200)

    const run = await guest.agent
      .post(`${t.url}/widgets/${WIDGET_ID}/run`)
      .send({})
    const put = await t.put(guest.agent, 1)
    const get = await guest.agent.get(t.url)
    for (const res of [run, put, get]) {
      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Dashboard não encontrado')
    }
  })

  it('ACL-16 dono desativado mantém o dashboard e os compartilhamentos', async () => {
    const t = await setup()
    const guest = await signInAs(t.app, t.db, 'EDITOR', 'conv@x.com')
    await t.shareUser(guest.user.id, 'view')
    const before = (await t.admin.agent.get(`${t.url}/shares`).expect(200)).body

    await t.admin.agent
      .post(`/api/users/${t.owner.user.id}/deactivate`)
      .expect(200)

    expect((await guest.agent.get(t.url)).status).toBe(200)
    const after = (await t.admin.agent.get(`${t.url}/shares`).expect(200)).body
    expect(after).toEqual(before)
    expect(after.shares).toHaveLength(1)
  })

  it('ACL-17 dois editores salvando a mesma versão recebem 409 no segundo', async () => {
    const t = await setup()
    const first = await signInAs(t.app, t.db, 'EDITOR', 'ed1@x.com')
    const second = await signInAs(t.app, t.db, 'EDITOR', 'ed2@x.com')
    await t.shareUser(first.user.id, 'edit')
    await t.shareUser(second.user.id, 'edit')

    const a = await t.put(first.agent, 1, 'Do primeiro')
    const b = await t.put(second.agent, 1, 'Do segundo')

    expect(a.status).toBe(200)
    expect(b.status).toBe(409)
    expect(b.body.code).toBe('DASHBOARD_VERSION_CONFLICT')
  })

  it('TEAM-05 remover membro da equipe tira o acesso na próxima requisição', async () => {
    const t = await setup()
    const member = await signInAs(t.app, t.db, 'EDITOR', 'membro@x.com')
    const team = await createTeam(t.db, {
      name: 'Comercial',
      memberIds: [member.user.id],
    })
    await t.share({ type: 'TEAM', teamId: team.id }, 'view')
    expect((await member.agent.get(t.url)).status).toBe(200)

    await t.admin.agent
      .patch(`/api/teams/${team.id}`)
      .send({ memberIds: [] })
      .expect(200)
    expect((await member.agent.get(t.url)).status).toBe(404)

    await t.admin.agent
      .patch(`/api/teams/${team.id}`)
      .send({ memberIds: [member.user.id] })
      .expect(200)
    expect((await member.agent.get(t.url)).status).toBe(200)
  })
})
