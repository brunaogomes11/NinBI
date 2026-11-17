import { describe, expect, it } from 'vitest'
import { toSqlLiteral } from '../../src/schema/sql-literal'

describe('literal SQL', () => {
  it('SCS-14 exemplo de texto, número e data vira literal SQL', () => {
    expect(toSqlLiteral('Ana')).toBe("'Ana'")
    expect(toSqlLiteral("O'Brien")).toBe("'O''Brien'")
    expect(toSqlLiteral('')).toBe("''")
    const long = 'x'.repeat(5000)
    expect(toSqlLiteral(long)).toBe(`'${long}'`)
    expect(toSqlLiteral(42)).toBe('42')
    expect(toSqlLiteral(-3.5)).toBe('-3.5')
    expect(toSqlLiteral(9_007_199_254_740_993n)).toBe('9007199254740993')
    expect(toSqlLiteral({ kind: 'bigint', value: '9007199254740993' })).toBe(
      '9007199254740993',
    )
    expect(toSqlLiteral(true)).toBe('true')
    expect(toSqlLiteral(false)).toBe('false')
    expect(toSqlLiteral('2024-01-31')).toBe("'2024-01-31'")
    expect(toSqlLiteral('2024-01-31T12:30:00.000Z')).toBe(
      "'2024-01-31T12:30:00.000Z'",
    )
    expect(toSqlLiteral(new Date('2024-01-31T12:30:00.000Z'))).toBe(
      "'2024-01-31T12:30:00.000Z'",
    )
    expect(toSqlLiteral(Buffer.from([1, 2, 3]))).toBe("'<binário 3 bytes>'")
    expect(toSqlLiteral('<binário 3 bytes>')).toBe("'<binário 3 bytes>'")
    expect(toSqlLiteral({ a: "it's", b: [1, 2] })).toBe(
      `'{"a":"it''s","b":[1,2]}'`,
    )
    expect(toSqlLiteral({ kind: 'json', value: '{"a":1}' })).toBe(`'{"a":1}'`)
    expect(toSqlLiteral(null)).toBeNull()
    expect(toSqlLiteral(undefined)).toBeNull()
  })
})
