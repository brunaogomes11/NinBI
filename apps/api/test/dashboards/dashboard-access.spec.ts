import type { Role } from '@ninbi/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import type { SessionUser } from '../../src/auth/session.service'
import { CryptoService } from '../../src/crypto/crypto.service'
import { DashboardAccessService } from '../../src/dashboard-access/dashboard-access.service'
import { createConnection, createDashboard, createUser } from '../factories'
import { createTestApp } from '../harness'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup() {
  const test = await createTestApp()
  close = test.close
  const access = test.app.get(DashboardAccessService)
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  const person = async (role: Role, email: string): Promise<SessionUser> => {
    const row = await createUser(test.db, { name: email, email, role })
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      mustChangePassword: false,
    }
  }
  const owner = await person('EDITOR', 'dono@x.com')
  const dashboard = await createDashboard(test.db, {
    ownerId: owner.id,
    connectionId: connection.id,
  })
  return { ...test, access, connection, person, owner, dashboard }
}

async function statusOf(promise: Promise<unknown>) {
  try {
    await promise
    return 200
  } catch (error) {
    return (error as { status: number }).status
  }
}

describe('acesso aos dashboards', () => {
  it('DASH-17 o dono pode ver, editar e excluir', async () => {
    const t = await setup()
    expect(await t.access.find(t.owner, t.dashboard.id)).toMatchObject({
      canView: true,
      canEdit: true,
      canDelete: true,
      ownerId: t.owner.id,
      connectionId: t.connection.id,
    })
    for (const need of ['view', 'edit', 'delete'] as const) {
      expect(
        await statusOf(t.access.assert(t.owner, t.dashboard.id, need)),
      ).toBe(200)
    }
  })

  it('DASH-21 Admin pode ver, editar e excluir dashboard de outro usuário', async () => {
    const t = await setup()
    const admin = await t.person('ADMIN', 'admin@x.com')
    expect(await t.access.find(admin, t.dashboard.id)).toMatchObject({
      canEdit: true,
      canDelete: true,
    })
  })

  it('DASH-13 outro Editor e um Visualizador sem compartilhamento não alcançam o dashboard', async () => {
    const t = await setup()
    for (const user of [
      await t.person('EDITOR', 'outro@x.com'),
      await t.person('VIEWER', 'leitor@x.com'),
    ]) {
      expect(await t.access.find(user, t.dashboard.id)).toBeNull()
      const error = await t.access
        .assert(user, t.dashboard.id, 'view')
        .catch((e: unknown) => e)
      expect(error).toMatchObject({
        status: 404,
        code: 'DASHBOARD_NOT_FOUND',
        message: 'Dashboard não encontrado',
      })
    }
  })

  it('DASH-13 id que não é UUID dá 404', async () => {
    const t = await setup()
    expect(await t.access.find(t.owner, 'nao-e-uuid')).toBeNull()
    expect(await statusOf(t.access.assert(t.owner, 'nao-e-uuid', 'view'))).toBe(
      404,
    )
  })

  it('DASH-19 compartilhamento view dá só ver e assert edit lança 403', async () => {
    const t = await setup()
    const viewer = await t.person('VIEWER', 'leitor@x.com')
    t.shares.grant(viewer.id, t.dashboard.id, 'view')
    expect(await t.access.find(viewer, t.dashboard.id)).toMatchObject({
      canView: true,
      canEdit: false,
      canDelete: false,
    })
    expect(
      await statusOf(t.access.assert(viewer, t.dashboard.id, 'view')),
    ).toBe(200)
    const error = await t.access
      .assert(viewer, t.dashboard.id, 'edit')
      .catch((e: unknown) => e)
    // AD-048: faltar edição responde DASHBOARD_EDIT_FORBIDDEN (ACL-13)
    expect(error).toMatchObject({
      status: 403,
      code: 'DASHBOARD_EDIT_FORBIDDEN',
    })
  })

  it('DASH-19 compartilhamento edit dá ver e editar, mas assert delete lança 403', async () => {
    const t = await setup()
    const editor = await t.person('EDITOR', 'colega@x.com')
    t.shares.grant(editor.id, t.dashboard.id, 'edit')
    expect(await t.access.find(editor, t.dashboard.id)).toMatchObject({
      canEdit: true,
      canDelete: false,
    })
    expect(
      await statusOf(t.access.assert(editor, t.dashboard.id, 'edit')),
    ).toBe(200)
    const error = await t.access
      .assert(editor, t.dashboard.id, 'delete')
      .catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('DASH-01 sidebarDashboardIds devolve os próprios e os compartilhados em ordem de criação, sem os de outros donos', async () => {
    const t = await setup()
    const me = await t.person('EDITOR', 'eu@x.com')
    const other = await t.person('EDITOR', 'outro@x.com')
    const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 12, minute))
    const shared = await createDashboard(t.db, {
      ownerId: other.id,
      connectionId: t.connection.id,
      name: 'Compartilhado',
      createdAt: at(1),
    })
    const second = await createDashboard(t.db, {
      ownerId: me.id,
      connectionId: t.connection.id,
      name: 'Segundo',
      createdAt: at(2),
    })
    const first = await createDashboard(t.db, {
      ownerId: me.id,
      connectionId: t.connection.id,
      name: 'Primeiro',
      createdAt: at(0),
    })
    await createDashboard(t.db, {
      ownerId: other.id,
      connectionId: t.connection.id,
      name: 'Alheio',
      createdAt: at(3),
    })
    t.shares.grant(me.id, shared.id, 'view')

    expect(await t.access.sidebarDashboardIds(me)).toEqual([
      first.id,
      shared.id,
      second.id,
    ])
  })
})
