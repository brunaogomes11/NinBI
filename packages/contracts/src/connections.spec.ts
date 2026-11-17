import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'
import {
  CONNECTION_TYPES,
  CONNECTION_TYPE_LABELS,
  SQL_DEFAULT_PORTS,
  connectionCreateSchema,
  connectionLanguage,
  connectionUpdateSchema,
} from './connections'

function errorsOf(
  schema: ZodType,
  value: unknown,
): Record<string, string> | null {
  const result = schema.safeParse(value)
  if (result.success) return null
  const byField: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.')
    if (!(field in byField)) byField[field] = issue.message
  }
  return byField
}

const valid = {
  name: 'Vendas',
  uri: 'neo4j+s://vendas.exemplo:7687',
  database: '',
  username: 'neo4j',
  password: 's3nha',
}

const withUri = (uri: string) => ({ ...valid, uri })
const withName = (name: string) => ({ ...valid, name })

describe('connection contracts', () => {
  it('CONN-10 aceita os seis esquemas de URI e recusa os demais com URI inválida', () => {
    for (const uri of [
      'neo4j://h',
      'neo4j+s://h',
      'neo4j+ssc://h',
      'bolt://h:7687',
      'bolt+s://h',
      'bolt+ssc://h',
      'BOLT://h',
    ]) {
      expect(errorsOf(connectionCreateSchema, withUri(uri)), uri).toBeNull()
    }
    for (const uri of [
      'http://h',
      'h:7687',
      'neo4j://',
      '',
      'bolt://h junk',
      'bolt://:7687',
    ]) {
      expect(errorsOf(connectionCreateSchema, withUri(uri)), uri).toEqual({
        uri: 'URI inválida',
      })
    }
  })

  it('CONN-11 nome vazio ou com mais de 80 caracteres', () => {
    expect(errorsOf(connectionCreateSchema, withName(''))).toEqual({
      name: 'Informe o nome',
    })
    expect(errorsOf(connectionCreateSchema, withName('   '))).toEqual({
      name: 'Informe o nome',
    })
    expect(errorsOf(connectionCreateSchema, withName('a'.repeat(81)))).toEqual({
      name: 'O nome pode ter até 80 caracteres',
    })
    expect(
      errorsOf(connectionCreateSchema, withName('a'.repeat(80))),
    ).toBeNull()
  })

  it('CONN-11 o nome é guardado sem espaços nas pontas', () => {
    const parsed = connectionCreateSchema.parse(withName('  Vendas  '))
    expect(parsed.name).toBe('Vendas')
  })

  it('CONN-12 banco vazio vira null', () => {
    expect(
      connectionCreateSchema.parse({ ...valid, database: '' }).database,
    ).toBeNull()
    expect(
      connectionCreateSchema.parse({ ...valid, database: '  ' }).database,
    ).toBeNull()
    expect(
      connectionCreateSchema.parse({ ...valid, database: undefined }).database,
    ).toBeNull()
    expect(
      connectionCreateSchema.parse({ ...valid, database: 'vendas' }).database,
    ).toBe('vendas')
  })

  it('CONN-06 usuário e senha vazios recebem a mensagem do campo', () => {
    expect(
      errorsOf(connectionCreateSchema, { ...valid, username: '' }),
    ).toEqual({ username: 'Informe o usuário' })
    expect(
      errorsOf(connectionCreateSchema, { ...valid, password: '' }),
    ).toEqual({ password: 'Informe a senha' })
  })

  it('CONN-15 a edição aceita senha vazia e ausente', () => {
    expect(
      errorsOf(connectionUpdateSchema, { ...valid, password: '' }),
    ).toBeNull()
    const { password: _password, ...withoutPassword } = valid
    expect(errorsOf(connectionUpdateSchema, withoutPassword)).toBeNull()
  })
})

const validSql = {
  type: 'POSTGRES',
  name: 'Sortify',
  host: 'db.exemplo',
  port: 5432,
  database: 'sortify',
  ssl: false,
  username: 'leitor',
  password: 's3nha',
}

describe('connection contracts: fontes SQL', () => {
  it('SRC-01 tipos de conexão na ordem da spec', () => {
    expect([...CONNECTION_TYPES]).toEqual([
      'NEO4J',
      'POSTGRES',
      'MYSQL',
      'SQLSERVER',
    ])
    expect(
      CONNECTION_TYPES.map((type) => CONNECTION_TYPE_LABELS[type]),
    ).toEqual(['Neo4j', 'PostgreSQL', 'MySQL', 'SQL Server'])
    expect(connectionLanguage('NEO4J')).toBe('CYPHER')
    expect(connectionLanguage('MYSQL')).toBe('SQL')
  })

  it('SRC-03 porta padrão de cada tipo SQL', () => {
    expect(SQL_DEFAULT_PORTS).toEqual({
      POSTGRES: 5432,
      MYSQL: 3306,
      SQLSERVER: 1433,
    })
  })

  it('SRC-09 host vazio, com espaços ou com :// é recusado', () => {
    for (const host of ['', '   ', 'meu host', 'tcp://h', 'h ']) {
      const expected = host.trim() === 'h' ? null : { host: 'Host inválido' }
      expect(
        errorsOf(connectionCreateSchema, { ...validSql, host }),
        host,
      ).toEqual(expected)
    }
    expect(errorsOf(connectionCreateSchema, validSql)).toBeNull()
    expect(
      errorsOf(connectionUpdateSchema, { ...validSql, host: 'a b' }),
    ).toEqual({
      host: 'Host inválido',
    })
  })

  it('SRC-10 porta fora de 1 a 65535 é recusada', () => {
    for (const port of [0, -1, 65536, 1.5, Number.NaN, '5432', null]) {
      expect(
        errorsOf(connectionCreateSchema, { ...validSql, port }),
        String(port),
      ).toEqual({
        port: 'Porta inválida',
      })
    }
    for (const port of [1, 65535]) {
      expect(errorsOf(connectionCreateSchema, { ...validSql, port })).toBeNull()
    }
  })

  it('SRC-11 banco vazio em conexão SQL é recusado', () => {
    for (const database of ['', '   ']) {
      expect(
        errorsOf(connectionCreateSchema, { ...validSql, database }),
      ).toEqual({
        database: 'Informe o banco',
      })
    }
    expect(
      errorsOf(connectionCreateSchema, { ...validSql, database: undefined }),
    ).toEqual({ database: 'Informe o banco' })
  })

  it('SRC-19 nome inválido de conexão SQL usa a mensagem do nome', () => {
    expect(errorsOf(connectionCreateSchema, { ...validSql, name: '' })).toEqual(
      {
        name: 'Informe o nome',
      },
    )
    expect(
      errorsOf(connectionCreateSchema, { ...validSql, name: 'a'.repeat(81) }),
    ).toEqual({ name: 'O nome pode ter até 80 caracteres' })
  })

  it('SRC-19 conexão SQL válida mantém tipo, host, porta e SSL', () => {
    const parsed = connectionCreateSchema.parse({ ...validSql, ssl: true })
    expect(parsed).toMatchObject({
      type: 'POSTGRES',
      host: 'db.exemplo',
      port: 5432,
      ssl: true,
    })
  })

  it('SMG-01 criação sem tipo vale Neo4j e mantém a URI', () => {
    const parsed = connectionCreateSchema.parse(valid)
    expect(parsed.type).toBe('NEO4J')
    expect(parsed).toMatchObject({ uri: valid.uri, username: 'neo4j' })
    expect(
      connectionUpdateSchema.parse({ ...valid, password: undefined }).type,
    ).toBe('NEO4J')
    expect(
      errorsOf(connectionCreateSchema, { ...valid, type: 'NEO4J', uri: 'x' }),
    ).toEqual({ uri: 'URI inválida' })
  })
})
