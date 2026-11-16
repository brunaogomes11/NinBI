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

const CYPHER =
  'MATCH (c:Categoria) WHERE c.nome = $categoria AND c.uf = $uf AND c.d >= $periodo_inicio AND c.d <= $periodo_fim RETURN c'

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
  const url = `/api/dashboards/${created.body.id}`
  const widgetId = uuid(100)
  const saved = await owner.agent.put(url).send({
    version: 1,
    name: 'Vendas',
    connectionId: connection.id,
    tabs: [
      {
        id: uuid(1),
        name: 'Geral',
        widgets: [
          {
            id: widgetId,
            title: 'W',
            cypher: CYPHER,
            visualization: 'TABLE',
            config: {},
            layout: { x: 0, y: 0, w: 4, h: 4 },
          },
        ],
      },
    ],
    filters: [
      {
        id: uuid(11),
        label: 'Categoria',
        parameter: 'categoria',
        type: 'TEXT',
        options: null,
        defaultValue: null,
      },
      {
        id: uuid(12),
        label: 'Período',
        parameter: 'periodo',
        type: 'DATE_RANGE',
        options: null,
        defaultValue: { start: null, end: null },
      },
    ],
  })
  expect(saved.status).toBe(200)
  test.neo4j.whenRead('MATCH (c:Categoria)', [{ c: 1 }])
  const lastParams = () =>
    test.neo4j.calls.filter((c) => c.method === 'read').at(-1)?.params
  return {
    ...test,
    owner,
    lastParams,
    widgetUrl: `${url}/widgets/${widgetId}/run`,
    textUrl: `${url}/query`,
  }
}

describe('parâmetros da execução de widget salvo', () => {
  it('FLT-28 parâmetro que não é de um filtro é ignorado na execução do widget salvo', async () => {
    const t = await setup()
    const res = await t.owner.agent
      .post(t.widgetUrl)
      .send({ params: { categoria: 'Livros', uf: 'SP', extra: 1 } })
    expect(res.status).toBe(200)
    expect(t.lastParams()).toEqual({
      categoria: 'Livros',
      uf: null,
      periodo_inicio: null,
      periodo_fim: null,
    })
  })

  it('FLT-28 filtro de intervalo de datas deixa passar periodo_inicio e periodo_fim', async () => {
    const t = await setup()
    const res = await t.owner.agent.post(t.widgetUrl).send({
      params: {
        periodo_inicio: { kind: 'date', value: '2025-01-01' },
        periodo_fim: { kind: 'date', value: '2025-03-31' },
        periodo: 'x',
      },
    })
    expect(res.status).toBe(200)
    const params = t.lastParams() as Record<string, { toString(): string }>
    expect(String(params.periodo_inicio)).toBe('2025-01-01')
    expect(String(params.periodo_fim)).toBe('2025-03-31')
    expect(Object.keys(params).sort()).toEqual([
      'categoria',
      'periodo_fim',
      'periodo_inicio',
      'uf',
    ])
  })

  it('FLT-28 a rota de texto de quem edita repassa qualquer parâmetro', async () => {
    const t = await setup()
    const res = await t.owner.agent
      .post(t.textUrl)
      .send({ cypher: CYPHER, params: { uf: 'SP' } })
    expect(res.status).toBe(200)
    expect(t.lastParams()).toMatchObject({ uf: 'SP', categoria: null })
  })
})
