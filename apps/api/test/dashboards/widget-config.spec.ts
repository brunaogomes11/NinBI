import { MESSAGES } from '@ninbi/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { createConnection } from '../factories'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

async function setup() {
  const test = await createTestApp()
  close = test.close
  const connection = await createConnection(
    test.db,
    test.app.get(CryptoService),
  )
  const owner = await signInAs(test.app, test.db, 'EDITOR', 'dono@x.com')
  const created = await owner.agent
    .post('/api/dashboards')
    .send({ name: 'Vendas', connectionId: connection.id })
  const id: string = created.body.id
  return { ...test, connection, owner, id, url: `/api/dashboards/${id}` }
}

const widget = (
  n: number,
  visualization: string,
  config: Record<string, unknown>,
) => ({
  id: uuid(100 + n),
  title: `Widget ${n}`,
  cypher: 'MATCH (n) RETURN n',
  visualization,
  config,
  layout: { x: 0, y: n * 4, w: 4, h: 4 },
})

describe('visualização e mapeamento do widget', () => {
  it('VIZ-15 salvar grava a visualização e o mapeamento de cada widget', async () => {
    const t = await setup()
    const widgets = [
      widget(1, 'BAR', {
        mapping: {
          x: 'mes',
          series: ['vendas', 'custo'],
          stacked: true,
          horizontal: false,
        },
      }),
      widget(2, 'PIE', {
        mapping: { category: 'mes', value: 'vendas', donut: true },
      }),
      widget(3, 'MAP', {
        mapping: { lat: 'lat', lon: 'lon', label: 'nome' },
      }),
      widget(4, 'TABLE', {}),
    ]
    const saved = await t.owner.agent.put(t.url).send({
      version: 1,
      name: 'Vendas',
      connectionId: t.connection.id,
      tabs: [{ id: uuid(1), name: 'Geral', widgets }],
    })
    expect(saved.status).toBe(200)

    const pick = (body: { tabs: { widgets: { id: string }[] }[] }) =>
      Object.fromEntries(
        body.tabs[0].widgets.map((w) => {
          const full = w as unknown as {
            visualization: string
            config: unknown
          }
          return [w.id, [full.visualization, full.config]]
        }),
      )
    const expected = Object.fromEntries(
      widgets.map((w) => [w.id, [w.visualization, w.config]]),
    )

    const owned = await t.owner.agent.get(t.url)
    expect(pick(owned.body)).toEqual(expected)

    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'viu@x.com')
    t.shares.grant(viewer.user.id, t.id, 'view')
    const shared = await viewer.agent.get(t.url)
    expect(shared.status).toBe(200)
    expect(pick(shared.body)).toEqual(expected)
    expect(
      shared.body.tabs[0].widgets.map((w: { cypher: unknown }) => w.cypher),
    ).toEqual([null, null, null, null])
  })

  it('VIZ-15 config inválido para a visualização responde 400 e mantém a versão', async () => {
    const t = await setup()
    const rejected = await t.owner.agent.put(t.url).send({
      version: 1,
      name: 'Vendas',
      connectionId: t.connection.id,
      tabs: [
        {
          id: uuid(1),
          name: 'Geral',
          widgets: [widget(1, 'BAR', { mapping: { series: ['vendas'] } })],
        },
      ],
    })
    expect(rejected.status).toBe(400)
    expect(rejected.body.code).toBe('VALIDATION_ERROR')
    expect(JSON.stringify(rejected.body)).toContain(
      MESSAGES.invalidWidgetConfig,
    )

    const opened = await t.owner.agent.get(t.url)
    expect(opened.body.version).toBe(1)
    expect(
      opened.body.tabs.flatMap((tab: { widgets: unknown[] }) => tab.widgets),
    ).toEqual([])
  })
})
