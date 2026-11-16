import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  connections,
  dashboardShares,
  dashboards,
  teamMembers,
  teams,
  users,
} from '../../src/database/schema'
import { createTestDb } from '../db'

async function seed() {
  const { db, client } = await createTestDb()
  const [owner, member] = await db
    .insert(users)
    .values([
      { name: 'Ana', email: 'ana@x.com', passwordHash: 'x', role: 'EDITOR' },
      { name: 'Bia', email: 'bia@x.com', passwordHash: 'x', role: 'VIEWER' },
    ])
    .returning()
  const [connection] = await db
    .insert(connections)
    .values({
      name: 'Vendas',
      uri: 'neo4j://h',
      username: 'neo4j',
      passwordEncrypted: 'v1:a:b:c',
    })
    .returning()
  if (!owner || !member || !connection) throw new Error('seed falhou')
  const [dashboard] = await db
    .insert(dashboards)
    .values({ name: 'Painel', ownerId: owner.id, connectionId: connection.id })
    .returning()
  const [team] = await db
    .insert(teams)
    .values({ name: 'Comercial' })
    .returning()
  if (!dashboard || !team) throw new Error('seed falhou')
  await db.insert(teamMembers).values({ teamId: team.id, userId: member.id })
  return { db, client, owner, member, dashboard, team }
}

describe('tabelas de compartilhamento', () => {
  it('SHARE-18 apagar o dashboard apaga os compartilhamentos dele', async () => {
    const { db, client, owner, member, dashboard } = await seed()
    await db.insert(dashboardShares).values({
      dashboardId: dashboard.id,
      recipientType: 'USER',
      userId: member.id,
      recipientKey: `user:${member.id}`,
      permission: 'view',
      createdBy: owner.id,
    })
    await db.delete(dashboards).where(eq(dashboards.id, dashboard.id))
    expect(await db.select().from(dashboardShares)).toHaveLength(0)
    await client.close()
  })

  it('TEAM-08 apagar a equipe apaga os compartilhamentos feitos com ela', async () => {
    const { db, client, owner, dashboard, team } = await seed()
    await db.insert(dashboardShares).values({
      dashboardId: dashboard.id,
      recipientType: 'TEAM',
      teamId: team.id,
      recipientKey: `team:${team.id}`,
      permission: 'edit',
      createdBy: owner.id,
    })
    await db.delete(teams).where(eq(teams.id, team.id))
    expect(await db.select().from(dashboardShares)).toHaveLength(0)
    expect(await db.select().from(teamMembers)).toHaveLength(0)
    await client.close()
  })

  it('SHARE-09 índice único impede duas linhas para o mesmo destinatário', async () => {
    const { db, client, owner, member, dashboard } = await seed()
    const row = {
      dashboardId: dashboard.id,
      recipientType: 'USER' as const,
      userId: member.id,
      recipientKey: `user:${member.id}`,
      permission: 'view' as const,
      createdBy: owner.id,
    }
    await db.insert(dashboardShares).values(row)
    await expect(
      db.insert(dashboardShares).values({ ...row, permission: 'edit' }),
    ).rejects.toThrow()
    expect(await db.select().from(dashboardShares)).toHaveLength(1)
    await client.close()
  })

  it('TEAM-04 índice único recusa nome de equipe repetido sem diferenciar maiúsculas', async () => {
    const { db, client } = await seed()
    await expect(
      db.insert(teams).values({ name: 'comercial' }),
    ).rejects.toThrow()
    await client.close()
  })

  it('SHARE-06 check recusa destinatário incoerente com o tipo', async () => {
    const { db, client, owner, dashboard, team } = await seed()
    const base = {
      dashboardId: dashboard.id,
      permission: 'view' as const,
      createdBy: owner.id,
    }
    await expect(
      db.insert(dashboardShares).values({
        ...base,
        recipientType: 'USER',
        recipientKey: 'user:sem-id',
      }),
    ).rejects.toThrow()
    await expect(
      db.insert(dashboardShares).values({
        ...base,
        recipientType: 'EVERYONE',
        teamId: team.id,
        recipientKey: 'everyone',
      }),
    ).rejects.toThrow()
    await db.insert(dashboardShares).values({
      ...base,
      recipientType: 'EVERYONE',
      recipientKey: 'everyone',
    })
    expect(await db.select().from(dashboardShares)).toHaveLength(1)
    await client.close()
  })
})
