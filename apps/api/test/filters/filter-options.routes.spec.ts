import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { Neo4jGatewayError } from '../../src/neo4j/neo4j.gateway'
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

const OPTIONS_CYPHER = 'MATCH (c:Categoria) RETURN c.nome, c.id'

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
  const saved = await owner.agent.put(url).send({
    version: 1,
    name: 'Vendas',
    connectionId: connection.id,
    tabs: [{ id: uuid(1), name: 'Geral', widgets: [] }],
    filters: [
      {
        id: uuid(11),
        label: 'Categoria',
        parameter: 'categoria',
        type: 'SINGLE_SELECT',
        options: { source: 'QUERY', cypher: OPTIONS_CYPHER },
        defaultValue: null,
      },
      {
        id: uuid(12),
        label: 'Tamanho',
        parameter: 'tamanho',
        type: 'MULTI_SELECT',
        options: { source: 'STATIC', values: ['P', 'M', 'G'] },
        defaultValue: [],
      },
      {
        id: uuid(13),
        label: 'Busca',
        parameter: 'busca',
        type: 'TEXT',
        options: null,
        defaultValue: null,
      },
    ],
  })
  expect(saved.status).toBe(200)
  test.neo4j.whenRead('MATCH (c:Categoria)', [
    { 'c.nome': 'Eletrônicos', 'c.id': 1 },
    { 'c.nome': 'Livros', 'c.id': 2 },
    { 'c.nome': 'Jogos', 'c.id': 3 },
  ])
  const viewer = await signInAs(test.app, test.db, 'VIEWER', 'ver@x.com')
  test.shares.grant(viewer.user.id, created.body.id, 'view')
  return {
    ...test,
    owner,
    viewer,
    connection,
    saved: (filterId: string) => `${url}/filters/${filterId}/options`,
    draft: `${url}/filter-options`,
  }
}

describe('opções dos filtros', () => {
  it('FLT-06 opções vêm da primeira coluna da consulta sob a validação somente leitura', async () => {
    const t = await setup()
    const res = await t.owner.agent.post(t.saved(uuid(11))).send({})
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      options: ['Eletrônicos', 'Livros', 'Jogos'],
      truncated: false,
    })
    const call = t.neo4j.calls.at(-1)
    expect(call?.method).toBe('read')
    expect(call?.cypher).toBe(OPTIONS_CYPHER)
    expect(call?.opts?.timeoutMs).toBeGreaterThan(0)
    expect(call?.opts?.maxRows).toBe(5001)

    const blocked = await t.owner.agent
      .post(t.draft)
      .send({ cypher: 'CREATE (n) RETURN n' })
    expect(blocked.status).toBe(400)
    expect(blocked.body.code).toBe('QUERY_WRITE_BLOCKED')
    expect(t.neo4j.calls.filter((c) => c.cypher?.includes('CREATE'))).toEqual(
      [],
    )
  })

  it('FLT-29 quem só vê carrega as opções do filtro salvo', async () => {
    const t = await setup()
    const res = await t.viewer.agent.post(t.saved(uuid(11))).send({})
    expect(res.status).toBe(200)
    expect(res.body.options).toEqual(['Eletrônicos', 'Livros', 'Jogos'])
    const fixed = await t.viewer.agent.post(t.saved(uuid(12))).send({})
    expect(fixed.body).toEqual({ options: ['P', 'M', 'G'], truncated: false })
  })

  it('FLT-30 quem só vê recebe 403 nas opções do rascunho', async () => {
    const t = await setup()
    const res = await t.viewer.agent
      .post(t.draft)
      .send({ cypher: 'MATCH (c:Categoria) RETURN c.nome' })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('DASHBOARD_EDIT_FORBIDDEN')
    expect(t.neo4j.calls).toEqual([])
  })

  it('FLT-23 falha da consulta de opções responde com o erro da consulta', async () => {
    const t = await setup()
    t.neo4j.whenRead(
      'MATCH (c:Categoria)',
      new Neo4jGatewayError('Variável x não definida'),
    )
    const viewer = await t.viewer.agent.post(t.saved(uuid(11))).send({})
    expect(viewer.status).toBe(422)
    expect(viewer.body.message).toBe('Não foi possível carregar este widget')
    const owner = await t.owner.agent.post(t.saved(uuid(11))).send({})
    expect(owner.status).toBe(422)
    expect(owner.body.message).toBe('Variável x não definida')
  })

  it('FLT-23 filtro inexistente ou sem opções dá 404 FILTER_NOT_FOUND e quem não alcança dá 404 DASHBOARD_NOT_FOUND', async () => {
    const t = await setup()
    const missing = await t.owner.agent.post(t.saved(uuid(99))).send({})
    expect(missing.status).toBe(404)
    expect(missing.body.code).toBe('FILTER_NOT_FOUND')
    const text = await t.owner.agent.post(t.saved(uuid(13))).send({})
    expect(text.body.code).toBe('FILTER_NOT_FOUND')

    const stranger = await signInAs(t.app, t.db, 'EDITOR', 'outro@x.com')
    const saved = await stranger.agent.post(t.saved(uuid(11))).send({})
    expect(saved.status).toBe(404)
    expect(saved.body.code).toBe('DASHBOARD_NOT_FOUND')
    const draft = await stranger.agent
      .post(t.draft)
      .send({ cypher: 'RETURN 1' })
    expect(draft.status).toBe(404)
    expect(draft.body.code).toBe('DASHBOARD_NOT_FOUND')
  })
})
