import type { TeamDto } from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { dashboardShares, teamMembers, teams } from '../../src/database/schema'
import { createConnection, createDashboard, createUser } from '../factories'
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
  const admin = await signInAs(test.app, test.db, 'ADMIN', 'admin@x.com')
  const bia = await createUser(test.db, { name: 'Bia', email: 'bia@x.com' })
  const caio = await createUser(test.db, { name: 'Caio', email: 'caio@x.com' })
  return { ...test, admin, bia, caio }
}

const names = (list: TeamDto[]) => list.map((team) => team.name)

describe('equipes', () => {
  it('TEAM-01 lista equipes com nome e número de membros em ordem alfabética', async () => {
    const t = await setup()
    await t.admin.agent
      .post('/api/teams')
      .send({ name: 'zeta', memberIds: [] })
      .expect(201)
    await t.admin.agent
      .post('/api/teams')
      .send({ name: 'Ágil', memberIds: [t.bia.id, t.caio.id] })
      .expect(201)
    await t.admin.agent
      .post('/api/teams')
      .send({ name: 'beta', memberIds: [t.bia.id] })
      .expect(201)

    const res = await t.admin.agent.get('/api/teams').expect(200)
    const list = res.body as TeamDto[]
    expect(names(list)).toEqual(['Ágil', 'beta', 'zeta'])
    expect(list.map((team) => team.memberCount)).toEqual([2, 1, 0])
    expect(list[0]?.members.map((member) => member.name)).toEqual([
      'Bia',
      'Caio',
    ])
  })

  it('TEAM-03 cria a equipe com nome e membros', async () => {
    const t = await setup()
    const created = await t.admin.agent
      .post('/api/teams')
      .send({ name: '  Comercial  ', memberIds: [t.bia.id, t.caio.id] })
      .expect(201)
    expect(created.body).toMatchObject({
      name: 'Comercial',
      memberCount: 2,
      shareCount: 0,
    })

    const list = (await t.admin.agent.get('/api/teams').expect(200))
      .body as TeamDto[]
    expect(list).toHaveLength(1)
    expect(list[0]?.name).toBe('Comercial')
    expect(list[0]?.members.map((member) => member.email)).toEqual([
      'bia@x.com',
      'caio@x.com',
    ])
  })

  it('TEAM-04 nome vazio, longo ou repetido responde 400 no campo nome', async () => {
    const t = await setup()
    await t.admin.agent
      .post('/api/teams')
      .send({ name: 'Comercial', memberIds: [] })
      .expect(201)
    const attempt = (name: string) =>
      t.admin.agent.post('/api/teams').send({ name, memberIds: [] })

    const empty = await attempt('')
    expect(empty.status).toBe(400)
    expect(empty.body.code).toBe('VALIDATION_ERROR')
    expect(empty.body.fieldErrors.name).toBe('Informe o nome')

    const long = await attempt('a'.repeat(41))
    expect(long.status).toBe(400)
    expect(long.body.fieldErrors.name).toBe('O nome pode ter até 40 caracteres')

    const repeated = await attempt('comercial')
    expect(repeated.status).toBe(400)
    expect(repeated.body.fieldErrors.name).toBe(
      'Já existe uma equipe com este nome',
    )

    const ghost = await t.admin.agent.post('/api/teams').send({
      name: 'Outra',
      memberIds: ['00000000-0000-4000-8000-000000000999'],
    })
    expect(ghost.status).toBe(400)
    expect(ghost.body.fieldErrors.memberIds).toBe('Usuário não encontrado')

    const rename = await t.admin.agent
      .post('/api/teams')
      .send({ name: 'Vendas', memberIds: [] })
      .expect(201)
    const clash = await t.admin.agent
      .patch(`/api/teams/${rename.body.id}`)
      .send({ name: 'COMERCIAL' })
    expect(clash.status).toBe(400)
    expect(clash.body.fieldErrors.name).toBe(
      'Já existe uma equipe com este nome',
    )
  })

  it('TEAM-06 renomear a equipe muda o nome na lista', async () => {
    const t = await setup()
    const created = await t.admin.agent
      .post('/api/teams')
      .send({ name: 'Comercial', memberIds: [t.bia.id] })
      .expect(201)
    const patched = await t.admin.agent
      .patch(`/api/teams/${created.body.id}`)
      .send({ name: 'Vendas' })
      .expect(200)
    expect(patched.body).toMatchObject({ name: 'Vendas', memberCount: 1 })
    const list = (await t.admin.agent.get('/api/teams').expect(200))
      .body as TeamDto[]
    expect(names(list)).toEqual(['Vendas'])
  })

  it('TEAM-06 PATCH com memberIds troca a lista inteira de membros', async () => {
    const t = await setup()
    const created = await t.admin.agent
      .post('/api/teams')
      .send({ name: 'Comercial', memberIds: [t.bia.id] })
      .expect(201)
    const patched = await t.admin.agent
      .patch(`/api/teams/${created.body.id}`)
      .send({ memberIds: [t.caio.id] })
      .expect(200)
    expect(patched.body.name).toBe('Comercial')
    expect(
      (patched.body as TeamDto).members.map((member) => member.id),
    ).toEqual([t.caio.id])
    const rows = await t.db.select().from(teamMembers)
    expect(rows.map((row) => row.userId)).toEqual([t.caio.id])
  })

  it('TEAM-07 equipe informa quantos dashboards estão compartilhados com ela', async () => {
    const t = await setup()
    const connection = await createConnection(t.db, t.app.get(CryptoService))
    const team = (
      await t.admin.agent
        .post('/api/teams')
        .send({ name: 'Comercial', memberIds: [] })
        .expect(201)
    ).body as TeamDto
    for (const name of ['A', 'B']) {
      const dashboard = await createDashboard(t.db, {
        ownerId: t.bia.id,
        connectionId: connection.id,
        name,
      })
      await t.db.insert(dashboardShares).values({
        dashboardId: dashboard.id,
        recipientType: 'TEAM',
        teamId: team.id,
        recipientKey: `team:${team.id}`,
        permission: 'view',
        createdBy: t.bia.id,
      })
    }
    const list = (await t.admin.agent.get('/api/teams').expect(200))
      .body as TeamDto[]
    expect(list[0]?.shareCount).toBe(2)
  })

  it('TEAM-08 excluir a equipe apaga a equipe e os compartilhamentos dela', async () => {
    const t = await setup()
    const connection = await createConnection(t.db, t.app.get(CryptoService))
    const team = (
      await t.admin.agent
        .post('/api/teams')
        .send({ name: 'Comercial', memberIds: [t.bia.id] })
        .expect(201)
    ).body as TeamDto
    const dashboard = await createDashboard(t.db, {
      ownerId: t.bia.id,
      connectionId: connection.id,
    })
    await t.db.insert(dashboardShares).values({
      dashboardId: dashboard.id,
      recipientType: 'TEAM',
      teamId: team.id,
      recipientKey: `team:${team.id}`,
      permission: 'view',
      createdBy: t.bia.id,
    })

    await t.admin.agent.delete(`/api/teams/${team.id}`).expect(204)

    expect((await t.admin.agent.get('/api/teams')).body).toEqual([])
    expect(
      await t.db
        .select()
        .from(dashboardShares)
        .where(eq(dashboardShares.teamId, team.id)),
    ).toHaveLength(0)
    expect(await t.db.select().from(teams)).toHaveLength(0)
    expect(await t.db.select().from(teamMembers)).toHaveLength(0)
  })

  it('TEAM-09 Editor e Visualizador recebem 403 nas rotas de equipe', async () => {
    const t = await setup()
    const team = (
      await t.admin.agent
        .post('/api/teams')
        .send({ name: 'Comercial', memberIds: [] })
        .expect(201)
    ).body as TeamDto
    for (const role of ['EDITOR', 'VIEWER'] as const) {
      const other = await signInAs(t.app, t.db, role)
      const calls = [
        await other.agent.get('/api/teams'),
        await other.agent
          .post('/api/teams')
          .send({ name: 'Nova', memberIds: [] }),
        await other.agent
          .patch(`/api/teams/${team.id}`)
          .send({ name: 'Outro' }),
        await other.agent.delete(`/api/teams/${team.id}`),
      ]
      expect(calls.map((res) => res.status)).toEqual([403, 403, 403, 403])
      expect(calls.map((res) => res.body.code)).toEqual([
        'FORBIDDEN',
        'FORBIDDEN',
        'FORBIDDEN',
        'FORBIDDEN',
      ])
    }
    const list = (await t.admin.agent.get('/api/teams')).body as TeamDto[]
    expect(names(list)).toEqual(['Comercial'])
  })

  it('TEAM-06 equipe inexistente dá 404 TEAM_NOT_FOUND no PATCH e no DELETE', async () => {
    const t = await setup()
    const ghost = '00000000-0000-4000-8000-000000000999'
    const patch = await t.admin.agent
      .patch(`/api/teams/${ghost}`)
      .send({ name: 'Vendas' })
    expect(patch.status).toBe(404)
    expect(patch.body.code).toBe('TEAM_NOT_FOUND')
    const del = await t.admin.agent.delete(`/api/teams/${ghost}`)
    expect(del.status).toBe(404)
    expect(del.body.code).toBe('TEAM_NOT_FOUND')
  })
})
