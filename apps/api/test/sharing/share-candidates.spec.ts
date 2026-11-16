import type { ShareCandidatesDto } from '@ninbi/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { users } from '../../src/database/schema'
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
  })
  const search = async (who: { agent: typeof owner.agent }, q?: string) => {
    const suffix = q === undefined ? '' : `?q=${encodeURIComponent(q)}`
    return who.agent.get(
      `/api/dashboards/${dashboard.id}/share-candidates${suffix}`,
    )
  }
  return { ...test, connection, owner, dashboard, search }
}

describe('busca de destinatários', () => {
  it('SHARE-04 busca lista usuários ativos por nome ou e-mail, equipes e Todos da instalação', async () => {
    const t = await setup()
    await createUser(t.db, { name: 'Ana Souza', email: 'souza@x.com' })
    await createUser(t.db, { name: 'Bruno', email: 'bruno.ana@x.com' })
    await createUser(t.db, { name: 'Carlos', email: 'carlos@x.com' })
    await createUser(t.db, {
      name: 'Ana Lima',
      email: 'lima@x.com',
      status: 'DISABLED',
    })
    await createTeam(t.db, { name: 'Banana' })
    await createTeam(t.db, { name: 'Comercial' })

    const res = await t.search(t.owner, 'ANA')
    expect(res.status).toBe(200)
    const body = res.body as ShareCandidatesDto
    expect(body.everyone).toBe(true)
    expect(body.users.map((u) => u.name)).toEqual(['Ana Souza', 'Bruno'])
    expect(body.users[0]).toMatchObject({
      email: 'souza@x.com',
      role: 'EDITOR',
    })
    expect(body.teams.map((team) => team.name)).toEqual(['Banana'])
  })

  it('SHARE-05 busca sem resultado devolve listas vazias', async () => {
    const t = await setup()
    await createUser(t.db, { name: 'Ana Souza', email: 'souza@x.com' })
    await createTeam(t.db, { name: 'Banana' })
    const res = await t.search(t.owner, 'zzz')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ everyone: true, users: [], teams: [] })
  })

  it('SHARE-11 dono fica fora da busca', async () => {
    const t = await setup()
    const admin = await signInAs(t.app, t.db, 'ADMIN', 'admin@x.com')
    await createUser(t.db, { name: 'Outro', email: 'outro@x.com' })

    const own = (await t.search(t.owner, 'dono')).body as ShareCandidatesDto
    expect(own.users).toEqual([])
    const byAdmin = (await t.search(admin, 'dono')).body as ShareCandidatesDto
    expect(byAdmin.users).toEqual([])
    const adminHit = (await t.search(t.owner, 'admin'))
      .body as ShareCandidatesDto
    expect(adminHit.users.map((u) => u.email)).toEqual(['admin@x.com'])
  })

  it('SHARE-04 q com percentual não casa com tudo e q vazio traz os 20 primeiros', async () => {
    const t = await setup()
    await t.db.insert(users).values(
      Array.from({ length: 25 }, (_, i) => ({
        name: `Usuario ${String(i).padStart(2, '0')}`,
        email: `u${i}@x.com`,
        passwordHash: 'x',
        role: 'EDITOR' as const,
      })),
    )
    await createUser(t.db, { name: '100% Real', email: 'cem@x.com' })

    const percent = (await t.search(t.owner, '%')).body as ShareCandidatesDto
    expect(percent.users.map((u) => u.name)).toEqual(['100% Real'])
    const underscore = (await t.search(t.owner, '_')).body as ShareCandidatesDto
    expect(underscore.users).toEqual([])

    const empty = (await t.search(t.owner)).body as ShareCandidatesDto
    expect(empty.users).toHaveLength(20)
    const filtered = (await t.search(t.owner, 'usuario'))
      .body as ShareCandidatesDto
    expect(filtered.users).toHaveLength(20)
    expect(filtered.users[0]?.name).toBe('Usuario 00')
  })

  it('SHARE-12 compartilhamento edit recebe 403 na busca e quem não alcança recebe 404', async () => {
    const t = await setup()
    const editor = await signInAs(t.app, t.db, 'EDITOR', 'edita@x.com')
    const stranger = await signInAs(t.app, t.db, 'EDITOR', 'longe@x.com')
    await createShare(t.db, {
      dashboardId: t.dashboard.id,
      recipient: { type: 'USER', userId: editor.user.id },
      permission: 'edit',
      createdBy: t.owner.user.id,
    })
    const forbidden = await t.search(editor, 'a')
    expect(forbidden.status).toBe(403)
    expect(forbidden.body.code).toBe('FORBIDDEN')
    expect((await t.search(stranger, 'a')).status).toBe(404)
  })
})
