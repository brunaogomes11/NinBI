import type { DashboardDto } from '@ninbi/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { dashboardTabs, widgets } from '../../src/database/schema'
import { createConnection, createDashboard } from '../factories'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

describe('tipo da conexão no dashboard', () => {
  it('SMG-05 dashboard devolve o tipo da conexão', async () => {
    const t = await createTestApp()
    close = t.close
    const crypto = t.app.get(CryptoService)
    const owner = await signInAs(t.app, t.db, 'EDITOR', 'dono@x.com')
    const graph = await createConnection(t.db, crypto, { name: 'Grafo' })
    const sql = await createConnection(t.db, crypto, {
      name: 'Sortify',
      type: 'POSTGRES',
    })

    const cases = [
      {
        connection: graph,
        type: 'NEO4J',
        query:
          "MATCH (c) WHERE c.uf = $uf AND c.x = '$falso' // $comentario\nRETURN c",
        parameters: ['uf'],
      },
      {
        connection: sql,
        type: 'POSTGRES',
        query:
          'SELECT \'$texto\' AS a, "$ident" FROM clientes -- $comentario\nWHERE cidade = $cidade AND id IN ($ids) /* $bloco */',
        parameters: ['cidade', 'ids'],
      },
    ] as const

    for (const [index, item] of cases.entries()) {
      const dashboard = await createDashboard(t.db, {
        ownerId: owner.user.id,
        connectionId: item.connection.id,
        name: `Painel ${index}`,
      })
      const tabId = uuid(100 + index)
      await t.db.insert(dashboardTabs).values({
        id: tabId,
        dashboardId: dashboard.id,
        name: 'Aba 1',
        position: 0,
      })
      await t.db.insert(widgets).values({
        id: uuid(200 + index),
        dashboardId: dashboard.id,
        tabId,
        title: 'W',
        cypher: item.query,
        x: 0,
        y: 0,
        w: 4,
        h: 4,
      })

      const response = await owner.agent.get(`/api/dashboards/${dashboard.id}`)
      expect(response.status).toBe(200)
      const body = response.body as DashboardDto
      expect(body.connectionType).toBe(item.type)
      expect(body.connectionId).toBe(item.connection.id)
      expect(body.tabs[0]?.widgets[0]?.parameters).toEqual(item.parameters)
    }
  })
})
