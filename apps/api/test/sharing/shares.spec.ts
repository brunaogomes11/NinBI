import { Logger } from '@nestjs/common'
import type { DashboardSharesDto, TeamDto } from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { dashboardShares } from '../../src/database/schema'
import {
  createConnection,
  createDashboard,
  createShare,
  createTeam,
  createUser,
} from '../factories'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  vi.restoreAllMocks()
  await close?.()
  close = undefined
})

const TABS = [
  { id: '00000000-0000-4000-8000-0000000000a1', name: 'Aba 1', widgets: [] },
]

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
  const sharesUrl = `${url}/shares`
  const sharesOf = async () =>
    (await owner.agent.get(sharesUrl).expect(200)).body as DashboardSharesDto
  return { ...test, connection, owner, dashboard, url, sharesUrl, sharesOf }
}

const userRecipient = (userId: string) => ({ type: 'USER', userId })

describe('compartilhamentos do dashboard', () => {
  it('SHARE-02 lista de compartilhamentos traz o dono e cada destinatário com a permissão', async () => {
    const t = await setup()
    const ana = await createUser(t.db, { name: 'Ana', email: 'ana@x.com' })
    const bruno = await createUser(t.db, { name: 'Bruno', email: 'b@x.com' })
    const team = await createTeam(t.db, { name: 'Comercial' })
    const base = { dashboardId: t.dashboard.id, createdBy: t.owner.user.id }
    await createShare(t.db, {
      ...base,
      recipient: { type: 'USER', userId: bruno.id },
      permission: 'edit',
    })
    await createShare(t.db, {
      ...base,
      recipient: { type: 'USER', userId: ana.id },
      permission: 'view',
    })
    await createShare(t.db, {
      ...base,
      recipient: { type: 'TEAM', teamId: team.id },
      permission: 'view',
    })
    await createShare(t.db, {
      ...base,
      recipient: { type: 'EVERYONE' },
      permission: 'view',
    })

    const body = await t.sharesOf()
    expect(body.ownerName).toBe(t.owner.user.name)
    expect(body.ownerId).toBe(t.owner.user.id)
    expect(body.shares.map((s) => [s.recipient.type, s.permission])).toEqual([
      ['EVERYONE', 'view'],
      ['TEAM', 'view'],
      ['USER', 'view'],
      ['USER', 'edit'],
    ])
    expect(body.shares[1]?.recipient).toMatchObject({ name: 'Comercial' })
    expect(body.shares[2]?.recipient).toMatchObject({
      name: 'Ana',
      email: 'ana@x.com',
      disabled: false,
    })
  })

  it('SHARE-06 adicionar usuário, equipe e todos grava o compartilhamento na hora', async () => {
    const t = await setup()
    const ana = await signInAs(t.app, t.db, 'EDITOR', 'ana@x.com')
    const bia = await signInAs(t.app, t.db, 'VIEWER', 'bia@x.com')
    const caio = await signInAs(t.app, t.db, 'EDITOR', 'caio@x.com')
    const team = await createTeam(t.db, {
      name: 'Comercial',
      memberIds: [bia.user.id],
    })

    const added = await t.owner.agent
      .post(t.sharesUrl)
      .send({ recipient: userRecipient(ana.user.id), permission: 'edit' })
    expect(added.status).toBe(200)
    expect(
      (added.body as DashboardSharesDto).shares.map((s) => s.recipient.type),
    ).toEqual(['USER'])
    expect((await ana.agent.get(t.url)).status).toBe(200)

    const viaTeam = await t.owner.agent
      .post(t.sharesUrl)
      .send({
        recipient: { type: 'TEAM', teamId: team.id },
        permission: 'view',
      })
    expect(viaTeam.status).toBe(200)
    expect(
      (viaTeam.body as DashboardSharesDto).shares.map((s) => s.recipient.type),
    ).toEqual(['TEAM', 'USER'])
    expect((await bia.agent.get(t.url)).status).toBe(200)

    expect((await caio.agent.get(t.url)).status).toBe(404)
    const everyone = await t.owner.agent
      .post(t.sharesUrl)
      .send({ recipient: { type: 'EVERYONE' }, permission: 'view' })
    expect(
      (everyone.body as DashboardSharesDto).shares.map((s) => s.recipient.type),
    ).toEqual(['EVERYONE', 'TEAM', 'USER'])
    expect((await caio.agent.get(t.url)).status).toBe(200)
  })

  it('SHARE-07 mudar a permissão vale na próxima requisição de quem recebe', async () => {
    const t = await setup()
    const ana = await signInAs(t.app, t.db, 'EDITOR', 'ana@x.com')
    const added = await t.owner.agent
      .post(t.sharesUrl)
      .send({ recipient: userRecipient(ana.user.id), permission: 'edit' })
    const shareId = (added.body as DashboardSharesDto).shares[0]?.id
    const save = () =>
      ana.agent.put(t.url).send({
        version: 1,
        name: 'Renomeado',
        connectionId: t.connection.id,
        tabs: TABS,
      })

    const patched = await t.owner.agent
      .patch(`${t.sharesUrl}/${shareId}`)
      .send({ permission: 'view' })
    expect(patched.status).toBe(200)
    expect((patched.body as DashboardSharesDto).shares[0]?.permission).toBe(
      'view',
    )
    const denied = await save()
    expect(denied.status).toBe(403)
    expect(denied.body.code).toBe('DASHBOARD_EDIT_FORBIDDEN')
  })

  it('SHARE-08 remover o compartilhamento tira o acesso na próxima requisição', async () => {
    const t = await setup()
    const ana = await signInAs(t.app, t.db, 'EDITOR', 'ana@x.com')
    const added = await t.owner.agent
      .post(t.sharesUrl)
      .send({ recipient: userRecipient(ana.user.id), permission: 'view' })
    const shareId = (added.body as DashboardSharesDto).shares[0]?.id
    expect((await ana.agent.get(t.url)).status).toBe(200)

    const removed = await t.owner.agent.delete(`${t.sharesUrl}/${shareId}`)
    expect(removed.status).toBe(200)
    expect((removed.body as DashboardSharesDto).shares).toEqual([])
    expect((await ana.agent.get(t.url)).status).toBe(404)
  })

  it('SHARE-09 destinatário repetido atualiza a linha existente', async () => {
    const t = await setup()
    const ana = await signInAs(t.app, t.db, 'EDITOR', 'ana@x.com')
    const send = (permission: 'view' | 'edit') =>
      t.owner.agent
        .post(t.sharesUrl)
        .send({ recipient: userRecipient(ana.user.id), permission })

    const first = await send('view')
    const second = await send('edit')
    expect(second.status).toBe(200)
    const shares = (second.body as DashboardSharesDto).shares
    expect(shares).toHaveLength(1)
    expect(shares[0]?.permission).toBe('edit')
    expect(shares[0]?.id).toBe((first.body as DashboardSharesDto).shares[0]?.id)
    expect(
      await t.db
        .select()
        .from(dashboardShares)
        .where(eq(dashboardShares.dashboardId, t.dashboard.id)),
    ).toHaveLength(1)
  })

  it('SHARE-10 Visualizador com Pode editar responde 400', async () => {
    const t = await setup()
    const viz = await signInAs(t.app, t.db, 'VIEWER', 'viz@x.com')
    const refused = await t.owner.agent
      .post(t.sharesUrl)
      .send({ recipient: userRecipient(viz.user.id), permission: 'edit' })
    expect(refused.status).toBe(400)
    expect(refused.body.code).toBe('VALIDATION_ERROR')
    expect(refused.body.fieldErrors.recipient).toBe(
      'Visualizadores só podem receber Pode ver',
    )

    const added = await t.owner.agent
      .post(t.sharesUrl)
      .send({ recipient: userRecipient(viz.user.id), permission: 'view' })
    expect(added.status).toBe(200)
    const shareId = (added.body as DashboardSharesDto).shares[0]?.id
    const patched = await t.owner.agent
      .patch(`${t.sharesUrl}/${shareId}`)
      .send({ permission: 'edit' })
    expect(patched.status).toBe(400)
    expect(patched.body.fieldErrors.recipient).toBe(
      'Visualizadores só podem receber Pode ver',
    )
    expect((await t.sharesOf()).shares[0]?.permission).toBe('view')
  })

  it('SHARE-12 quem não é dono nem Admin recebe 403 nos compartilhamentos', async () => {
    const t = await setup()
    const editor = await signInAs(t.app, t.db, 'EDITOR', 'edita@x.com')
    const stranger = await signInAs(t.app, t.db, 'EDITOR', 'longe@x.com')
    const admin = await signInAs(t.app, t.db, 'ADMIN', 'admin@x.com')
    const added = await t.owner.agent.post(t.sharesUrl).send({
      recipient: userRecipient(editor.user.id),
      permission: 'edit',
    })
    const shareId = (added.body as DashboardSharesDto).shares[0]?.id
    const body = {
      recipient: userRecipient(stranger.user.id),
      permission: 'view',
    }

    const forbidden = [
      await editor.agent.get(t.sharesUrl),
      await editor.agent.post(t.sharesUrl).send(body),
      await editor.agent
        .patch(`${t.sharesUrl}/${shareId}`)
        .send({ permission: 'view' }),
      await editor.agent.delete(`${t.sharesUrl}/${shareId}`),
    ]
    expect(forbidden.map((res) => res.status)).toEqual([403, 403, 403, 403])
    expect(forbidden.map((res) => res.body.code)).toEqual([
      'FORBIDDEN',
      'FORBIDDEN',
      'FORBIDDEN',
      'FORBIDDEN',
    ])

    const hidden = [
      await stranger.agent.get(t.sharesUrl),
      await stranger.agent.post(t.sharesUrl).send(body),
      await stranger.agent
        .patch(`${t.sharesUrl}/${shareId}`)
        .send({ permission: 'view' }),
      await stranger.agent.delete(`${t.sharesUrl}/${shareId}`),
    ]
    expect(hidden.map((res) => res.status)).toEqual([404, 404, 404, 404])
    expect(hidden.map((res) => res.body.code)).toEqual([
      'DASHBOARD_NOT_FOUND',
      'DASHBOARD_NOT_FOUND',
      'DASHBOARD_NOT_FOUND',
      'DASHBOARD_NOT_FOUND',
    ])

    const adminView = await admin.agent.get(t.sharesUrl)
    expect(adminView.status).toBe(200)
    expect((adminView.body as DashboardSharesDto).shares).toHaveLength(1)
    expect((await admin.agent.post(t.sharesUrl).send(body)).status).toBe(200)
  })

  it('SHARE-16 usuário desativado continua na lista marcado como desativado', async () => {
    const t = await setup()
    const gone = await createUser(t.db, {
      name: 'Saiu',
      email: 'saiu@x.com',
      status: 'DISABLED',
    })
    await createShare(t.db, {
      dashboardId: t.dashboard.id,
      recipient: { type: 'USER', userId: gone.id },
      permission: 'view',
      createdBy: t.owner.user.id,
    })
    const body = await t.sharesOf()
    expect(body.shares).toHaveLength(1)
    expect(body.shares[0]?.recipient).toMatchObject({
      type: 'USER',
      name: 'Saiu',
      disabled: true,
    })
  })

  it('TEAM-06 compartilhamento mostra o nome novo da equipe', async () => {
    const t = await setup()
    const admin = await signInAs(t.app, t.db, 'ADMIN', 'admin@x.com')
    const team = (
      await admin.agent
        .post('/api/teams')
        .send({ name: 'Comercial', memberIds: [] })
        .expect(201)
    ).body as TeamDto
    await t.owner.agent
      .post(t.sharesUrl)
      .send({
        recipient: { type: 'TEAM', teamId: team.id },
        permission: 'view',
      })
      .expect(200)
    await admin.agent
      .patch(`/api/teams/${team.id}`)
      .send({ name: 'Vendas' })
      .expect(200)
    const body = await t.sharesOf()
    expect(body.shares[0]?.recipient).toMatchObject({
      type: 'TEAM',
      name: 'Vendas',
    })
  })

  it('ACL-11 log registra criação, mudança e remoção com autor, dashboard, destinatário e permissão', async () => {
    const t = await setup()
    const ana = await signInAs(t.app, t.db, 'EDITOR', 'ana@x.com')
    const lines: string[] = []
    vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
      if (typeof message === 'string' && message.startsWith('share '))
        lines.push(message)
    })

    const added = await t.owner.agent
      .post(t.sharesUrl)
      .send({ recipient: userRecipient(ana.user.id), permission: 'view' })
    const shareId = (added.body as DashboardSharesDto).shares[0]?.id
    await t.owner.agent
      .patch(`${t.sharesUrl}/${shareId}`)
      .send({ permission: 'edit' })
    await t.owner.agent.delete(`${t.sharesUrl}/${shareId}`)

    const common = `by=${t.owner.user.id} dashboard=${t.dashboard.id} recipient=user:${ana.user.id}`
    expect(lines).toEqual([
      `share action=created ${common} permission=view`,
      `share action=updated ${common} permission=edit`,
      `share action=removed ${common} permission=edit`,
    ])
  })

  it('SHARE-06 recusa o dono, usuário desativado e equipe inexistente como destinatário com 400', async () => {
    const t = await setup()
    const gone = await createUser(t.db, {
      name: 'Saiu',
      email: 'saiu@x.com',
      status: 'DISABLED',
    })
    const post = (recipient: object) =>
      t.owner.agent.post(t.sharesUrl).send({ recipient, permission: 'view' })

    const owner = await post(userRecipient(t.owner.user.id))
    expect(owner.status).toBe(400)
    expect(owner.body.fieldErrors.recipient).toBe(
      'O dono já tem acesso a este dashboard',
    )
    const disabled = await post(userRecipient(gone.id))
    expect(disabled.status).toBe(400)
    expect(disabled.body.fieldErrors.recipient).toBe('Usuário não encontrado')
    const team = await post({
      type: 'TEAM',
      teamId: '00000000-0000-4000-8000-000000000999',
    })
    expect(team.status).toBe(400)
    expect(team.body.fieldErrors.recipient).toBe('Equipe não encontrada')
    expect((await t.sharesOf()).shares).toEqual([])
  })

  it('SHARE-08 compartilhamento inexistente dá 404 SHARE_NOT_FOUND no PATCH e no DELETE', async () => {
    const t = await setup()
    const ghost = '00000000-0000-4000-8000-000000000999'
    const patch = await t.owner.agent
      .patch(`${t.sharesUrl}/${ghost}`)
      .send({ permission: 'view' })
    expect(patch.status).toBe(404)
    expect(patch.body.code).toBe('SHARE_NOT_FOUND')
    const del = await t.owner.agent.delete(`${t.sharesUrl}/${ghost}`)
    expect(del.status).toBe(404)
    expect(del.body.code).toBe('SHARE_NOT_FOUND')
  })
})
