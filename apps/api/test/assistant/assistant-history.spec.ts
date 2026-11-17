import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { AssistantHistoryService } from '../../src/assistant/assistant-history.service'
import { CryptoService } from '../../src/crypto/crypto.service'
import { assistantMessages } from '../../src/database/schema'
import { createConnection, createDashboard } from '../factories'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const details = {
  changes: ['Aba criada: Vendas'],
  notApplied: [],
  createdWidgets: 0,
  failedWidgets: [],
  discardedWidgets: 0,
}

async function setup() {
  const test = await createTestApp()
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
  const history = test.app.get(AssistantHistoryService)
  const url = (id = dashboard.id) => `/api/dashboards/${id}/assistant/messages`
  return { ...test, connection, owner, dashboard, history, url }
}

describe('conversa do assistente', () => {
  it('HIST-02 conversa volta na ordem em que aconteceu', async () => {
    const t = await setup()
    await t.history.appendUser(t.owner.user.id, t.dashboard.id, 'crie uma aba')
    await t.history.appendAssistant(
      t.owner.user.id,
      t.dashboard.id,
      'Criei a aba.',
      details,
    )
    await t.history.appendUser(t.owner.user.id, t.dashboard.id, 'obrigado')

    const res = await t.owner.agent.get(t.url())
    expect(res.status).toBe(200)
    const body = res.body as {
      role: string
      text: string
      details: unknown
    }[]
    expect(body.map((m) => [m.role, m.text])).toEqual([
      ['USER', 'crie uma aba'],
      ['ASSISTANT', 'Criei a aba.'],
      ['USER', 'obrigado'],
    ])
    expect(body[0]?.details).toBeNull()
    expect(body[1]?.details).toEqual(details)
  })

  it('HIST-03 cada usuário vê só a própria conversa', async () => {
    const t = await setup()
    const bia = await signInAs(t.app, t.db, 'EDITOR', 'bia@x.com')
    const admin = await signInAs(t.app, t.db, 'ADMIN', 'admin@x.com')
    t.shares.grant(bia.user.id, t.dashboard.id, 'edit')
    await t.history.appendUser(t.owner.user.id, t.dashboard.id, 'da Ana')
    await t.history.appendUser(bia.user.id, t.dashboard.id, 'da Bia')

    const ana = await t.owner.agent.get(t.url())
    const biaRes = await bia.agent.get(t.url())
    const adminRes = await admin.agent.get(t.url())
    expect((ana.body as { text: string }[]).map((m) => m.text)).toEqual([
      'da Ana',
    ])
    expect((biaRes.body as { text: string }[]).map((m) => m.text)).toEqual([
      'da Bia',
    ])
    expect(adminRes.status).toBe(200)
    expect(adminRes.body).toEqual([])
  })

  it('HIST-05 limpar apaga só as mensagens do usuário nesse dashboard', async () => {
    const t = await setup()
    const bia = await signInAs(t.app, t.db, 'EDITOR', 'bia@x.com')
    t.shares.grant(bia.user.id, t.dashboard.id, 'edit')
    const other = await createDashboard(t.db, {
      ownerId: t.owner.user.id,
      connectionId: t.connection.id,
      name: 'Outro',
    })
    await t.history.appendUser(t.owner.user.id, t.dashboard.id, 'apagar')
    await t.history.appendUser(t.owner.user.id, other.id, 'fica no outro')
    await t.history.appendUser(bia.user.id, t.dashboard.id, 'fica da Bia')

    const res = await t.owner.agent.delete(t.url())
    expect(res.status).toBe(204)
    const rows = await t.db.select().from(assistantMessages)
    expect(rows.map((r) => r.text).sort()).toEqual([
      'fica da Bia',
      'fica no outro',
    ])
  })

  it('HIST-06 excluir o dashboard apaga as conversas', async () => {
    const t = await setup()
    await t.history.appendUser(t.owner.user.id, t.dashboard.id, 'oi')
    await t.history.appendAssistant(
      t.owner.user.id,
      t.dashboard.id,
      'olá',
      details,
    )

    const res = await t.owner.agent.delete(`/api/dashboards/${t.dashboard.id}`)
    expect(res.status).toBe(204)
    const rows = await t.db
      .select()
      .from(assistantMessages)
      .where(eq(assistantMessages.dashboardId, t.dashboard.id))
    expect(rows).toEqual([])
  })

  it('CHAT-17 Visualizador e quem não edita recebem 403 na conversa', async () => {
    const t = await setup()
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'viz@x.com')
    const reader = await signInAs(t.app, t.db, 'EDITOR', 'leitor@x.com')
    const stranger = await signInAs(t.app, t.db, 'EDITOR', 'fora@x.com')
    t.shares.grant(viewer.user.id, t.dashboard.id, 'edit')
    t.shares.grant(reader.user.id, t.dashboard.id, 'view')

    for (const who of [viewer, reader]) {
      expect((await who.agent.get(t.url())).status).toBe(403)
      expect((await who.agent.delete(t.url())).status).toBe(403)
    }
    expect((await stranger.agent.get(t.url())).status).toBe(404)
    expect((await stranger.agent.delete(t.url())).status).toBe(404)
  })

  it('recent devolve as últimas N em ordem cronológica', async () => {
    const t = await setup()
    for (const text of ['um', 'dois', 'três', 'quatro']) {
      await t.history.appendUser(t.owner.user.id, t.dashboard.id, text)
    }
    const recent = await t.history.recent(t.owner.user.id, t.dashboard.id, 2)
    expect(recent.map((m) => m.text)).toEqual(['três', 'quatro'])
  })
})
