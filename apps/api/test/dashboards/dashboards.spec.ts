import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { dashboardTabs, widgets } from '../../src/database/schema'
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
  return { ...test, connection }
}

const NO_ID = '00000000-0000-4000-8000-000000000000'

describe('criar, abrir e listar dashboards', () => {
  it('DASH-05 cria o dashboard com o usuário como dono e a aba Aba 1', async () => {
    const t = await setup()
    const editor = await signInAs(t.app, t.db, 'EDITOR')

    const created = await editor.agent
      .post('/api/dashboards')
      .send({ name: 'Vendas', connectionId: t.connection.id })
    expect(created.status).toBe(201)

    const opened = await editor.agent.get(`/api/dashboards/${created.body.id}`)
    expect(opened.status).toBe(200)
    expect(opened.body).toMatchObject({
      name: 'Vendas',
      version: 1,
      ownerId: editor.user.id,
      connectionId: t.connection.id,
      connectionName: 'Vendas',
    })
    expect(opened.body.tabs).toHaveLength(1)
    expect(opened.body.tabs[0]).toMatchObject({ name: 'Aba 1', widgets: [] })
  })

  it('DASH-06 nome com 81 caracteres dá 400 com a mensagem no campo name', async () => {
    const t = await setup()
    const editor = await signInAs(t.app, t.db, 'EDITOR')
    const response = await editor.agent
      .post('/api/dashboards')
      .send({ name: 'a'.repeat(81), connectionId: t.connection.id })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('VALIDATION_ERROR')
    expect(response.body.fieldErrors.name).toBe(
      'O nome pode ter até 80 caracteres',
    )
  })

  it('DASH-05 conexão inexistente dá 400 com Conexão não encontrada em connectionId', async () => {
    const t = await setup()
    const editor = await signInAs(t.app, t.db, 'EDITOR')
    const response = await editor.agent
      .post('/api/dashboards')
      .send({ name: 'Vendas', connectionId: NO_ID })
    expect(response.status).toBe(400)
    expect(response.body.fieldErrors.connectionId).toBe(
      'Conexão não encontrada',
    )
  })

  it('DASH-12 Visualizador recebe 403 ao criar dashboard', async () => {
    const t = await setup()
    const viewer = await signInAs(t.app, t.db, 'VIEWER')
    const response = await viewer.agent
      .post('/api/dashboards')
      .send({ name: 'Vendas', connectionId: t.connection.id })
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('FORBIDDEN')
  })

  it('DASH-13 dashboard inexistente ou fora do alcance responde 404', async () => {
    const t = await setup()
    const owner = await signInAs(t.app, t.db, 'EDITOR', 'dono@x.com')
    const other = await signInAs(t.app, t.db, 'EDITOR', 'outro@x.com')
    const dashboard = await createDashboard(t.db, {
      ownerId: owner.user.id,
      connectionId: t.connection.id,
    })
    for (const id of [NO_ID, dashboard.id]) {
      const response = await other.agent.get(`/api/dashboards/${id}`)
      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({
        code: 'DASHBOARD_NOT_FOUND',
        message: 'Dashboard não encontrado',
      })
    }
  })

  it('DASH-17 só o dono e os Admins alcançam um dashboard novo', async () => {
    const t = await setup()
    const owner = await signInAs(t.app, t.db, 'EDITOR', 'dono@x.com')
    const admin = await signInAs(t.app, t.db, 'ADMIN')
    const other = await signInAs(t.app, t.db, 'EDITOR', 'outro@x.com')
    const viewer = await signInAs(t.app, t.db, 'VIEWER')
    const created = await owner.agent
      .post('/api/dashboards')
      .send({ name: 'Vendas', connectionId: t.connection.id })
    const url = `/api/dashboards/${created.body.id}`

    expect((await owner.agent.get(url)).status).toBe(200)
    expect((await admin.agent.get(url)).status).toBe(200)
    expect((await other.agent.get(url)).status).toBe(404)
    expect((await viewer.agent.get(url)).status).toBe(404)
  })

  it('DASH-18 permissões do dashboard dizem quem edita e quem exclui', async () => {
    const t = await setup()
    const owner = await signInAs(t.app, t.db, 'EDITOR', 'dono@x.com')
    const admin = await signInAs(t.app, t.db, 'ADMIN')
    const editor = await signInAs(t.app, t.db, 'EDITOR', 'colega@x.com')
    const viewer = await signInAs(t.app, t.db, 'VIEWER')
    const dashboard = await createDashboard(t.db, {
      ownerId: owner.user.id,
      connectionId: t.connection.id,
    })
    const tab = {
      id: '00000000-0000-4000-8000-0000000000a1',
      dashboardId: dashboard.id,
      name: 'Aba 1',
      position: 0,
    }
    await t.db.insert(dashboardTabs).values(tab)
    await t.db.insert(widgets).values({
      id: '00000000-0000-4000-8000-0000000000b1',
      dashboardId: dashboard.id,
      tabId: tab.id,
      title: 'Lojas',
      cypher: 'MATCH (l:Loja) RETURN l.nome',
      x: 0,
      y: 0,
      w: 4,
      h: 4,
    })
    t.shares.grant(editor.user.id, dashboard.id, 'edit')
    t.shares.grant(viewer.user.id, dashboard.id, 'view')
    const url = `/api/dashboards/${dashboard.id}`

    for (const who of [owner, admin]) {
      const body = (await who.agent.get(url)).body
      expect(body.permissions).toEqual({ edit: true, delete: true })
      expect(body.tabs[0].widgets[0].cypher).toBe(
        'MATCH (l:Loja) RETURN l.nome',
      )
    }
    const shared = (await editor.agent.get(url)).body
    expect(shared.permissions).toEqual({ edit: true, delete: false })
    expect(shared.tabs.at(-1).widgets[0].cypher).toBe(
      'MATCH (l:Loja) RETURN l.nome',
    )
    const seen = (await viewer.agent.get(url)).body
    expect(seen.permissions).toEqual({ edit: false, delete: false })
    expect(seen.tabs[0].widgets[0]).toMatchObject({
      cypher: null,
      hasQuery: true,
      title: 'Lojas',
    })
  })

  it('DASH-20 Admin lista todos os dashboards com dono, conexão e última alteração em ordem de nome', async () => {
    const t = await setup()
    const admin = await signInAs(t.app, t.db, 'ADMIN')
    const ana = await signInAs(t.app, t.db, 'EDITOR', 'ana@x.com')
    const bia = await signInAs(t.app, t.db, 'EDITOR', 'bia@x.com')
    for (const [owner, name] of [
      [ana, 'zeta'],
      [bia, 'Álvaro'],
      [ana, 'beta'],
    ] as const) {
      await createDashboard(t.db, {
        ownerId: owner.user.id,
        connectionId: t.connection.id,
        name,
      })
    }

    const response = await admin.agent.get('/api/dashboards')
    expect(response.status).toBe(200)
    expect(response.body.map((row: { name: string }) => row.name)).toEqual([
      'Álvaro',
      'beta',
      'zeta',
    ])
    expect(response.body[0]).toEqual({
      id: expect.any(String),
      name: 'Álvaro',
      ownerName: 'bia@x.com',
      connectionName: 'Vendas',
      updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    })
  })

  it('DASH-21 Admin abre dashboard de outro usuário com permissão de edição', async () => {
    const t = await setup()
    const admin = await signInAs(t.app, t.db, 'ADMIN')
    const ana = await signInAs(t.app, t.db, 'EDITOR', 'ana@x.com')
    const dashboard = await createDashboard(t.db, {
      ownerId: ana.user.id,
      connectionId: t.connection.id,
    })
    const response = await admin.agent.get(`/api/dashboards/${dashboard.id}`)
    expect(response.status).toBe(200)
    expect(response.body.permissions).toEqual({ edit: true, delete: true })
    expect(response.body.ownerId).toBe(ana.user.id)
  })

  it('DASH-22 Editor e Visualizador recebem 403 na lista de todos', async () => {
    const t = await setup()
    const editor = await signInAs(t.app, t.db, 'EDITOR')
    const viewer = await signInAs(t.app, t.db, 'VIEWER')
    for (const who of [editor, viewer]) {
      const response = await who.agent.get('/api/dashboards')
      expect(response.status).toBe(403)
      expect(response.body.code).toBe('FORBIDDEN')
    }
  })
})
