import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import neo4j, { type Driver, isDate } from 'neo4j-driver'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const SEED_FILE = resolve(__dirname, '../../../infra/neo4j/seed.cypher')

// Mesmos valores do neo4j do docker-compose.dev.yml.
const BOLT_URL = 'bolt://localhost:7688'
const AUTH = neo4j.auth.basic('neo4j', 'ninbi-dev-password')

function seedStatements(): string[] {
  return readFileSync(SEED_FILE, 'utf-8')
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
}

let driver: Driver

beforeAll(() => {
  driver = neo4j.driver(BOLT_URL, AUTH)
})

afterAll(async () => {
  await driver.close()
})

async function counts() {
  const result = await driver.executeQuery(
    `RETURN
       COUNT { (:Loja) } AS lojas,
       COUNT { (:Categoria) } AS categorias,
       COUNT { (:Produto) } AS produtos,
       COUNT { (:Cliente) } AS clientes,
       COUNT { (:Pedido) } AS pedidos,
       COUNT { (:NinbiSeed) } AS marcadores,
       COUNT { ()-[:CONTEM]->() } AS itens`,
  )
  const row = result.records[0]
  if (!row) throw new Error('sem resposta do Neo4j')
  const read = (key: string) =>
    (row.get(key) as { toNumber(): number }).toNumber()
  return {
    lojas: read('lojas'),
    categorias: read('categorias'),
    produtos: read('produtos'),
    clientes: read('clientes'),
    pedidos: read('pedidos'),
    marcadores: read('marcadores'),
    itens: read('itens'),
  }
}

describe('dataset de exemplo do Neo4j', () => {
  it('FND-02 seed carrega o dataset e não duplica ao rodar de novo', async () => {
    const before = await counts()
    expect(before).toMatchObject({
      lojas: 12,
      categorias: 6,
      produtos: 60,
      clientes: 200,
      pedidos: 2000,
      marcadores: 1,
    })

    const lojas = await driver.executeQuery(
      'MATCH (l:Loja) RETURN l.latitude AS latitude, l.longitude AS longitude',
    )
    expect(lojas.records).toHaveLength(12)
    for (const record of lojas.records) {
      expect(typeof record.get('latitude')).toBe('number')
      expect(typeof record.get('longitude')).toBe('number')
    }

    const pedidos = await driver.executeQuery(
      'MATCH (p:Pedido) RETURN p.data AS data, p.valorTotal AS valorTotal',
    )
    expect(pedidos.records).toHaveLength(2000)
    for (const record of pedidos.records) {
      expect(isDate(record.get('data'))).toBe(true)
      expect(record.get('valorTotal')).toBeGreaterThan(0)
    }

    const statements = seedStatements()
    expect(statements.length).toBeGreaterThan(1)
    for (const statement of statements) {
      await driver.executeQuery(statement)
    }

    expect(await counts()).toEqual(before)
  })
})
