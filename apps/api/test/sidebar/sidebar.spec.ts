import type { SidebarDto } from '@ninbi/contracts'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { createConnection, createDashboard } from '../factories'
import { createTestApp } from '../harness'
import { signInAs, TEST_PASSWORD } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const GROUP_ID = '00000000-0000-4000-8000-0000000000a1'

async function setup() {
  const test = await createTestApp()
  close = test.close
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  const ana = await signInAs(test.app, test.db, 'EDITOR', 'ana@x.com')
  const mine = async (name: string, minute: number) =>
    createDashboard(test.db, {
      ownerId: ana.user.id,
      connectionId: connection.id,
      name,
      createdAt: new Date(Date.UTC(2026, 0, 1, 12, minute)),
    })
  return { ...test, connection, ana, mine }
}

const dash = (id: string) => ({ type: 'dashboard' as const, id })

/** Resume a sidebar como texto: soltos pelo nome, grupos como `Nome[filhos]`. */
function outline(sidebar: SidebarDto): string[] {
  return sidebar.items.map((item) =>
    item.type === 'dashboard'
      ? item.name
      : `${item.name}[${item.items.map((child) => child.name).join(',')}]`,
  )
}

describe('sidebar por usuário', () => {
  it('DASH-01 sidebar devolve os dashboards alcançáveis na ordem e nos grupos gravados', async () => {
    const t = await setup()
    const a = await t.mine('A', 0)
    const b = await t.mine('B', 1)
    const other = await signInAs(t.app, t.db, 'EDITOR', 'bia@x.com')
    const c = await createDashboard(t.db, {
      ownerId: other.user.id,
      connectionId: t.connection.id,
      name: 'C',
      createdAt: new Date(Date.UTC(2026, 0, 1, 12, 2)),
    })
    t.shares.grant(t.ana.user.id, c.id, 'view')

    const put = await t.ana.agent.put('/api/sidebar').send({
      items: [
        dash(b.id),
        { type: 'group', id: GROUP_ID, name: 'Comercial', items: [dash(a.id)] },
      ],
    })
    expect(put.status).toBe(200)

    const response = await t.ana.agent.get('/api/sidebar')
    expect(response.status).toBe(200)
    // AD-051: o compartilhado fora do layout vem em `shared`, não no fim de `items`.
    expect(outline(response.body)).toEqual(['B', 'Comercial[A]'])
    expect(response.body.shared).toEqual([
      { type: 'dashboard', id: c.id, name: 'C' },
    ])
    expect(response.body.items[1].id).toBe(GROUP_ID)
    expect(response.body.items[0]).toEqual({
      type: 'dashboard',
      id: b.id,
      name: 'B',
    })
  })

  it('DASH-05 dashboard novo entra no fim da sidebar do dono', async () => {
    const t = await setup()
    const a = await t.mine('A', 0)
    await t.ana.agent.put('/api/sidebar').send({ items: [dash(a.id)] })

    const created = await t.ana.agent
      .post('/api/dashboards')
      .send({ name: 'Novo', connectionId: t.connection.id })
    expect(created.status).toBe(201)

    const response = await t.ana.agent.get('/api/sidebar')
    expect(outline(response.body)).toEqual(['A', 'Novo'])
  })

  it('DASH-11 dashboard apagado sai das sidebars', async () => {
    const t = await setup()
    const a = await t.mine('A', 0)
    const b = await t.mine('B', 1)
    const viewer = await signInAs(t.app, t.db, 'VIEWER')
    t.shares.grant(viewer.user.id, b.id, 'view')
    await t.ana.agent
      .put('/api/sidebar')
      .send({ items: [dash(b.id), dash(a.id)] })
    await viewer.agent.put('/api/sidebar').send({ items: [dash(b.id)] })
    expect(outline((await viewer.agent.get('/api/sidebar')).body)).toEqual([
      'B',
    ])

    expect((await t.ana.agent.delete(`/api/dashboards/${b.id}`)).status).toBe(
      204,
    )

    expect(outline((await t.ana.agent.get('/api/sidebar')).body)).toEqual(['A'])
    expect(outline((await viewer.agent.get('/api/sidebar')).body)).toEqual([])
  })

  it('SIDE-02 grupo com nome inválido responde 400', async () => {
    const t = await setup()
    const group = (name: string) => ({
      items: [{ type: 'group', id: GROUP_ID, name, items: [] }],
    })
    const empty = await t.ana.agent.put('/api/sidebar').send(group(''))
    expect(empty.status).toBe(400)
    expect(empty.body.fieldErrors.items).toBe('Informe o nome')
    const long = await t.ana.agent
      .put('/api/sidebar')
      .send(group('a'.repeat(41)))
    expect(long.status).toBe(400)
    expect(long.body.fieldErrors.items).toBe(
      'O nome pode ter até 40 caracteres',
    )
    expect((await t.ana.agent.get('/api/sidebar')).body).toEqual({
      items: [],
      shared: [],
    })
  })

  it('SIDE-10 gravar a sidebar de um usuário não muda a de outro', async () => {
    const t = await setup()
    const a = await t.mine('A', 0)
    const b = await t.mine('B', 1)
    const bia = await signInAs(t.app, t.db, 'EDITOR', 'bia@x.com')
    t.shares.grant(bia.user.id, a.id, 'view')
    t.shares.grant(bia.user.id, b.id, 'view')
    const before = (await bia.agent.get('/api/sidebar')).body

    await t.ana.agent.put('/api/sidebar').send({
      items: [
        dash(b.id),
        { type: 'group', id: GROUP_ID, name: 'Meu grupo', items: [dash(a.id)] },
      ],
    })

    expect((await bia.agent.get('/api/sidebar')).body).toEqual(before)
    // AD-051: sem layout próprio, os compartilhados vêm em `shared`.
    expect(before.shared.map((node: { name: string }) => node.name)).toEqual([
      'A',
      'B',
    ])
  })

  it('SIDE-11 outra sessão do mesmo usuário recebe a mesma sidebar', async () => {
    const t = await setup()
    const a = await t.mine('A', 0)
    const b = await t.mine('B', 1)
    await t.ana.agent.put('/api/sidebar').send({
      items: [
        { type: 'group', id: GROUP_ID, name: 'Grupo', items: [dash(b.id)] },
        dash(a.id),
      ],
    })

    const second = request.agent(t.app.getHttpServer())
    const login = await second
      .post('/api/auth/login')
      .send({ email: 'ana@x.com', password: TEST_PASSWORD })
    expect(login.status).toBe(200)

    expect(outline((await second.get('/api/sidebar')).body)).toEqual([
      'Grupo[B]',
      'A',
    ])
  })

  it('SIDE-13 Admin, Editor e Visualizador gravam a própria sidebar', async () => {
    const t = await setup()
    for (const role of ['ADMIN', 'EDITOR', 'VIEWER'] as const) {
      const who = await signInAs(t.app, t.db, role, `${role}-side@x.com`)
      const response = await who.agent.put('/api/sidebar').send({
        items: [{ type: 'group', id: GROUP_ID, name: 'Meu', items: [] }],
      })
      expect(response.status).toBe(200)
      expect(outline(response.body)).toEqual(['Meu[]'])
    }
  })

  it('SIDE-17 a última gravação da sidebar vale', async () => {
    const t = await setup()
    const a = await t.mine('A', 0)
    const b = await t.mine('B', 1)
    await t.ana.agent
      .put('/api/sidebar')
      .send({ items: [dash(a.id), dash(b.id)] })
    await t.ana.agent
      .put('/api/sidebar')
      .send({ items: [dash(b.id), dash(a.id)] })

    expect(outline((await t.ana.agent.get('/api/sidebar')).body)).toEqual([
      'B',
      'A',
    ])
  })

  it('SIDE-10 dashboard de outro dono enviado no PUT não aparece', async () => {
    const t = await setup()
    const a = await t.mine('A', 0)
    const bia = await signInAs(t.app, t.db, 'EDITOR', 'bia@x.com')
    const secret = await createDashboard(t.db, {
      ownerId: bia.user.id,
      connectionId: t.connection.id,
      name: 'Segredo',
    })

    const secret2 = await createDashboard(t.db, {
      ownerId: bia.user.id,
      connectionId: t.connection.id,
      name: 'Segredo 2',
    })
    const put = await t.ana.agent.put('/api/sidebar').send({
      items: [
        dash(secret.id),
        { type: 'group', id: GROUP_ID, name: 'G', items: [dash(secret2.id)] },
        dash(a.id),
      ],
    })

    expect(put.status).toBe(200)
    expect(outline(put.body)).toEqual(['G[]', 'A'])
    expect(outline((await t.ana.agent.get('/api/sidebar')).body)).toEqual([
      'G[]',
      'A',
    ])
  })
})
