import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import {
  DASHBOARD_SHARE_RESOLVER,
  type DashboardShareResolver,
} from '../../src/dashboard-access/dashboard-share-resolver'
import {
  createConnection,
  createDashboard,
  createShare,
  createTeam,
  createUser,
} from '../factories'
import { createTestApp } from '../harness'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup() {
  const test = await createTestApp({ realShares: true })
  close = test.close
  const resolver = test.app.get<DashboardShareResolver>(
    DASHBOARD_SHARE_RESOLVER,
    { strict: false },
  )
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  const owner = await createUser(test.db, { name: 'Dono', email: 'dono@x.com' })
  const user = await createUser(test.db, { name: 'Ana', email: 'ana@x.com' })
  const dashboard = (name: string, minute: number, ownerId = owner.id) =>
    createDashboard(test.db, {
      ownerId,
      connectionId: connection.id,
      name,
      createdAt: new Date(Date.UTC(2026, 0, 1, 12, minute)),
    })
  return { ...test, resolver, owner, user, dashboard }
}

describe('DbShareResolver', () => {
  it('ACL-01 permissão é a mais alta entre direto, equipes e todos', async () => {
    const t = await setup()
    const direct = await t.dashboard('Direto', 0)
    const viaTeam = await t.dashboard('Equipe', 1)
    const everyone = await t.dashboard('Todos', 2)
    const none = await t.dashboard('Nenhum', 3)
    const foreignTeam = await t.dashboard('Equipe alheia', 4)
    const mine = await createTeam(t.db, {
      name: 'Minha',
      memberIds: [t.user.id],
    })
    const other = await createTeam(t.db, { name: 'Outra' })
    const base = { createdBy: t.owner.id }
    await createShare(t.db, {
      ...base,
      dashboardId: direct.id,
      recipient: { type: 'USER', userId: t.user.id },
      permission: 'view',
    })
    await createShare(t.db, {
      ...base,
      dashboardId: viaTeam.id,
      recipient: { type: 'TEAM', teamId: mine.id },
      permission: 'edit',
    })
    await createShare(t.db, {
      ...base,
      dashboardId: everyone.id,
      recipient: { type: 'EVERYONE' },
      permission: 'view',
    })
    await createShare(t.db, {
      ...base,
      dashboardId: foreignTeam.id,
      recipient: { type: 'TEAM', teamId: other.id },
      permission: 'edit',
    })

    expect(await t.resolver.accessFor(t.user.id, direct.id)).toBe('view')
    expect(await t.resolver.accessFor(t.user.id, viaTeam.id)).toBe('edit')
    expect(await t.resolver.accessFor(t.user.id, everyone.id)).toBe('view')
    expect(await t.resolver.accessFor(t.user.id, none.id)).toBeNull()
    expect(await t.resolver.accessFor(t.user.id, foreignTeam.id)).toBeNull()
  })

  it('ACL-14 Pode ver direto e Pode editar pela equipe dá editar', async () => {
    const t = await setup()
    const dashboard = await t.dashboard('Painel', 0)
    const team = await createTeam(t.db, { memberIds: [t.user.id] })
    await createShare(t.db, {
      dashboardId: dashboard.id,
      recipient: { type: 'USER', userId: t.user.id },
      permission: 'view',
      createdBy: t.owner.id,
    })
    await createShare(t.db, {
      dashboardId: dashboard.id,
      recipient: { type: 'TEAM', teamId: team.id },
      permission: 'edit',
      createdBy: t.owner.id,
    })
    expect(await t.resolver.accessFor(t.user.id, dashboard.id)).toBe('edit')
  })

  it('ACL-15 usuário criado depois do compartilhamento com todos tem acesso', async () => {
    const t = await setup()
    const dashboard = await t.dashboard('Painel', 0)
    await createShare(t.db, {
      dashboardId: dashboard.id,
      recipient: { type: 'EVERYONE' },
      permission: 'view',
      createdBy: t.owner.id,
    })
    const late = await createUser(t.db, { name: 'Tarde', email: 'tarde@x.com' })
    expect(await t.resolver.accessFor(late.id, dashboard.id)).toBe('view')
    expect(await t.resolver.sharedDashboardIds(late.id)).toEqual([dashboard.id])
  })

  it('ACL-04 sharedDashboardIds devolve os compartilhados por qualquer caminho, sem repetição, sem os próprios, em ordem de criação', async () => {
    const t = await setup()
    const team = await createTeam(t.db, { memberIds: [t.user.id] })
    const c = await t.dashboard('C', 2)
    const a = await t.dashboard('A', 0)
    const b = await t.dashboard('B', 1)
    const own = await t.dashboard('Meu', 3, t.user.id)
    await t.dashboard('Oculto', 4)
    const base = { createdBy: t.owner.id }
    // `a` chega por três caminhos e deve aparecer uma vez só
    await createShare(t.db, {
      ...base,
      dashboardId: a.id,
      recipient: { type: 'USER', userId: t.user.id },
      permission: 'view',
    })
    await createShare(t.db, {
      ...base,
      dashboardId: a.id,
      recipient: { type: 'TEAM', teamId: team.id },
      permission: 'view',
    })
    await createShare(t.db, {
      ...base,
      dashboardId: a.id,
      recipient: { type: 'EVERYONE' },
      permission: 'view',
    })
    await createShare(t.db, {
      ...base,
      dashboardId: c.id,
      recipient: { type: 'EVERYONE' },
      permission: 'edit',
    })
    await createShare(t.db, {
      ...base,
      dashboardId: b.id,
      recipient: { type: 'TEAM', teamId: team.id },
      permission: 'view',
    })
    await createShare(t.db, {
      ...base,
      dashboardId: own.id,
      recipient: { type: 'EVERYONE' },
      permission: 'view',
    })

    expect(await t.resolver.sharedDashboardIds(t.user.id)).toEqual([
      a.id,
      b.id,
      c.id,
    ])
  })
})
