import type { SidebarDto } from '@ninbi/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { createConnection, createDashboard } from '../factories'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const GROUP_ID = '00000000-0000-4000-8000-0000000000a1'
const dash = (id: string) => ({ type: 'dashboard' as const, id })

function outline(sidebar: SidebarDto): string[] {
  return sidebar.items.map((item) =>
    item.type === 'dashboard'
      ? item.name
      : `${item.name}[${item.items.map((child) => child.name).join(',')}]`,
  )
}

async function setup() {
  const test = await createTestApp({ realShares: true })
  close = test.close
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  const owner = await signInAs(test.app, test.db, 'EDITOR', 'dono@x.com')
  const guest = await signInAs(test.app, test.db, 'EDITOR', 'conv@x.com')
  const make = (name: string, minute: number) =>
    createDashboard(test.db, {
      ownerId: owner.user.id,
      connectionId: connection.id,
      name,
      createdAt: new Date(Date.UTC(2026, 0, 1, 12, minute)),
    })
  const share = (dashboardId: string, userId: string) =>
    owner.agent
      .post(`/api/dashboards/${dashboardId}/shares`)
      .send({ recipient: { type: 'USER', userId }, permission: 'view' })
      .expect(200)
  return { ...test, connection, owner, guest, make, share }
}

describe('sidebar com compartilhados', () => {
  it('ACL-04 dashboard compartilhado aparece em Compartilhados comigo', async () => {
    const t = await setup()
    const shared = await t.make('Vendas', 0)
    await t.share(shared.id, t.guest.user.id)

    const body = (await t.guest.agent.get('/api/sidebar').expect(200))
      .body as SidebarDto

    expect(body.shared).toEqual([
      { type: 'dashboard', id: shared.id, name: 'Vendas' },
    ])
    expect(body.items).toEqual([])
  })

  it('ACL-05 compartilhado gravado na sidebar sai de Compartilhados comigo', async () => {
    const t = await setup()
    const shared = await t.make('Vendas', 0)
    await t.share(shared.id, t.guest.user.id)

    await t.guest.agent
      .put('/api/sidebar')
      .send({
        items: [
          {
            type: 'group',
            id: GROUP_ID,
            name: 'Comercial',
            items: [dash(shared.id)],
          },
        ],
      })
      .expect(200)

    const body = (await t.guest.agent.get('/api/sidebar').expect(200))
      .body as SidebarDto
    expect(outline(body)).toEqual(['Comercial[Vendas]'])
    expect(body.shared).toEqual([])
  })

  it('ACL-09 acesso perdido tira o dashboard da sidebar e dos grupos', async () => {
    const t = await setup()
    const shared = await t.make('Vendas', 0)
    const created = await t.share(shared.id, t.guest.user.id)
    const shareId = created.body.shares[0].id
    await t.guest.agent
      .put('/api/sidebar')
      .send({
        items: [
          {
            type: 'group',
            id: GROUP_ID,
            name: 'Comercial',
            items: [dash(shared.id)],
          },
        ],
      })
      .expect(200)

    await t.owner.agent
      .delete(`/api/dashboards/${shared.id}/shares/${shareId}`)
      .expect(200)

    const after = (await t.guest.agent.get('/api/sidebar').expect(200))
      .body as SidebarDto
    expect(outline(after)).toEqual(['Comercial[]'])
    expect(after.shared).toEqual([])

    await t.share(shared.id, t.guest.user.id)
    const again = (await t.guest.agent.get('/api/sidebar').expect(200))
      .body as SidebarDto
    expect(outline(again)).toEqual(['Comercial[]'])
    expect(again.shared.map((node) => node.name)).toEqual(['Vendas'])
  })

  it('ACL-10 sem compartilhados a seção vem vazia', async () => {
    const t = await setup()
    const own = await t.make('Meu', 0)
    await t.share(own.id, t.guest.user.id)
    await t.owner.agent.get('/api/sidebar').expect(200)

    const ownerBody = (await t.owner.agent.get('/api/sidebar').expect(200))
      .body as SidebarDto
    expect(ownerBody.shared).toEqual([])
    const none = await signInAs(t.app, t.db, 'EDITOR', 'solo@x.com')
    expect((await none.agent.get('/api/sidebar').expect(200)).body).toEqual({
      items: [],
      shared: [],
    })
  })

  it('ACL-10 dashboards próprios novos continuam no fim de items', async () => {
    const t = await setup()
    const a = await t.make('A', 0)
    await t.owner.agent
      .put('/api/sidebar')
      .send({ items: [dash(a.id)] })
      .expect(200)
    await t.make('B', 1)

    const body = (await t.owner.agent.get('/api/sidebar').expect(200))
      .body as SidebarDto
    expect(outline(body)).toEqual(['A', 'B'])
    expect(body.shared).toEqual([])
  })
})
