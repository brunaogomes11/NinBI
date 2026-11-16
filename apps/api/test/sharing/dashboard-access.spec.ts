import type { DashboardDto } from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { DashboardAccessService } from '../../src/dashboard-access/dashboard-access.service'
import { dashboardShares, dashboards } from '../../src/database/schema'
import { createConnection, createDashboard, createShare } from '../factories'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

const TABS = [
  { id: '00000000-0000-4000-8000-0000000000a1', name: 'Aba 1', widgets: [] },
]

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup() {
  const test = await createTestApp({ realShares: true })
  close = test.close
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  const owner = await signInAs(test.app, test.db, 'EDITOR', 'dono@x.com')
  const dashboard = await createDashboard(test.db, {
    ownerId: owner.user.id,
    connectionId: connection.id,
    name: 'Painel',
  })
  const url = `/api/dashboards/${dashboard.id}`
  const grant = (
    userId: string,
    permission: 'view' | 'edit',
    dashboardId = dashboard.id,
  ) =>
    createShare(test.db, {
      dashboardId,
      recipient: { type: 'USER', userId },
      permission,
      createdBy: owner.user.id,
    })
  return { ...test, connection, owner, dashboard, url, grant }
}

describe('permissão por dashboard', () => {
  it('ACL-02 Visualizador com compartilhamento de edição só vê', async () => {
    const t = await setup()
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'viz@x.com')
    await t.grant(viewer.user.id, 'edit')

    const res = await viewer.agent.get(t.url)
    expect(res.status).toBe(200)
    expect((res.body as DashboardDto).permissions.edit).toBe(false)

    const put = await viewer.agent.put(t.url).send({
      version: 1,
      name: 'Hackeado',
      connectionId: t.connection.id,
      tabs: TABS,
    })
    expect(put.status).toBe(403)
    const [row] = await t.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, t.dashboard.id))
    expect(row?.name).toBe('Painel')
  })

  it('ACL-02 Visualizador com compartilhamento de edição só vê: dono Visualizador só vê', async () => {
    const t = await setup()
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'viz@x.com')
    const own = await createDashboard(t.db, {
      ownerId: viewer.user.id,
      connectionId: t.connection.id,
      name: 'Do Visualizador',
    })
    const url = `/api/dashboards/${own.id}`

    const res = await viewer.agent.get(url)
    expect(res.status).toBe(200)
    expect((res.body as DashboardDto).permissions).toEqual({
      edit: false,
      delete: false,
      share: false,
    })

    const put = await viewer.agent.put(url).send({
      version: 1,
      name: 'Hackeado',
      connectionId: t.connection.id,
      tabs: TABS,
    })
    expect(put.status).toBe(403)
    const [row] = await t.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, own.id))
    expect(row?.name).toBe('Do Visualizador')
  })

  it('SHARE-01 só o dono e os Admins têm permissão de compartilhar', async () => {
    const t = await setup()
    const admin = await signInAs(t.app, t.db, 'ADMIN', 'admin@x.com')
    const editor = await signInAs(t.app, t.db, 'EDITOR', 'edita@x.com')
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'viz@x.com')
    await t.grant(editor.user.id, 'edit')
    await t.grant(viewer.user.id, 'view')

    const shareOf = async (who: { agent: typeof admin.agent }) =>
      ((await who.agent.get(t.url)).body as DashboardDto).permissions.share
    expect(await shareOf(t.owner)).toBe(true)
    expect(await shareOf(admin)).toBe(true)
    expect(await shareOf(editor)).toBe(false)
    expect(await shareOf(viewer)).toBe(false)
  })

  it('ACL-13 gravar sem permissão de edição responde Você não tem mais permissão', async () => {
    const t = await setup()
    const editor = await signInAs(t.app, t.db, 'EDITOR', 'edita@x.com')
    const share = await t.grant(editor.user.id, 'edit')
    const opened = (await editor.agent.get(t.url)).body as DashboardDto
    expect(opened.permissions.edit).toBe(true)

    await t.db
      .update(dashboardShares)
      .set({ permission: 'view' })
      .where(eq(dashboardShares.id, share.id))

    const put = await editor.agent.put(t.url).send({
      version: opened.version,
      name: 'Novo nome',
      connectionId: t.connection.id,
      tabs: TABS,
    })
    expect(put.status).toBe(403)
    expect(put.body.code).toBe('DASHBOARD_EDIT_FORBIDDEN')
    expect(put.body.message).toBe(
      'Você não tem mais permissão para editar este dashboard',
    )
    const [row] = await t.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, t.dashboard.id))
    expect(row?.name).toBe('Painel')
    expect(row?.version).toBe(1)
  })

  it('SHARE-01 assert share para compartilhamento de edição lança 403 FORBIDDEN', async () => {
    const t = await setup()
    const editor = await signInAs(t.app, t.db, 'EDITOR', 'edita@x.com')
    await t.grant(editor.user.id, 'edit')
    const access = t.app.get(DashboardAccessService, { strict: false })
    const session = {
      id: editor.user.id,
      name: editor.user.name,
      email: editor.user.email,
      role: editor.user.role,
      mustChangePassword: false,
    }

    await expect(
      access.assert(session, t.dashboard.id, 'share'),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
    const ownerSession = {
      ...session,
      id: t.owner.user.id,
      role: 'EDITOR' as const,
    }
    await expect(
      access.assert(ownerSession, t.dashboard.id, 'share'),
    ).resolves.toMatchObject({ canShare: true })
  })
})
