import neo4j from 'neo4j-driver'
import { describe, expect, it } from 'vitest'
import { toResultValue } from '../../src/queries/result-value'

const { types, int } = neo4j

function jsonOf(value: unknown): unknown {
  const result = toResultValue(value)
  if (result === null || typeof result !== 'object' || result.kind !== 'json') {
    throw new Error(`esperava { kind: 'json' }, veio ${JSON.stringify(result)}`)
  }
  return JSON.parse(result.value)
}

describe('toResultValue', () => {
  it('TBL-06 nó, relacionamento, lista e mapa viram texto JSON', () => {
    const node = new types.Node(int(1), ['Loja'], { nome: 'Centro' }, '4:x:1')
    expect(toResultValue(node)).toMatchObject({ kind: 'json' })
    expect(jsonOf(node)).toEqual({
      labels: ['Loja'],
      properties: { nome: 'Centro' },
    })

    const rel = new types.Relationship(
      int(5),
      int(1),
      int(2),
      'FEZ',
      { desde: 2024 },
      '5:x:5',
      '4:x:1',
      '4:x:2',
    )
    expect(jsonOf(rel)).toEqual({ type: 'FEZ', properties: { desde: 2024 } })

    expect(jsonOf([1, 'a'])).toEqual([1, 'a'])
    expect(jsonOf({ a: { b: 2 } })).toEqual({ a: { b: 2 } })
  })

  it('TBL-08 inteiro acima de 2^53 mantém todos os dígitos', () => {
    expect(toResultValue(int('9007199254740993'))).toEqual({
      kind: 'bigint',
      value: '9007199254740993',
    })
    const mapped = toResultValue({ id: int('9007199254740993') })
    expect(mapped).toMatchObject({ kind: 'json' })
    expect((mapped as { value: string }).value).toContain('9007199254740993')
  })

  it('Integer 42 vira o número 42, null fica null e Date vira texto', () => {
    expect(toResultValue(int(42))).toBe(42)
    expect(toResultValue(null)).toBeNull()
    expect(toResultValue(new types.Date(2024, 2, 5))).toBe('2024-02-05')
  })
})
