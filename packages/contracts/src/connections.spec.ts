import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'
import { connectionCreateSchema, connectionUpdateSchema } from './connections'

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
    for (const uri of ['http://h', 'h:7687', 'neo4j://', '']) {
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
