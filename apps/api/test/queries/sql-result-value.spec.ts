import { describe, expect, it } from 'vitest'
import {
  toSqlResultValue,
  uniqueColumnNames,
} from '../../src/queries/sql-result-value'

describe('toSqlResultValue', () => {
  it('SQX-21 tipos do resultado SQL viram ResultValue', () => {
    expect(toSqlResultValue(null)).toBeNull()
    expect(toSqlResultValue(undefined)).toBeNull()
    expect(toSqlResultValue(true)).toBe(true)
    expect(toSqlResultValue(false)).toBe(false)
    expect(toSqlResultValue(42)).toBe(42)
    expect(toSqlResultValue(-3.25)).toBe(-3.25)
    expect(toSqlResultValue('texto')).toBe('texto')
    expect(toSqlResultValue('2024-01-31')).toBe('2024-01-31')
    expect(toSqlResultValue('2024-01-31T12:30:00.000Z')).toBe(
      '2024-01-31T12:30:00.000Z',
    )
    expect(toSqlResultValue('7c9e6679-7425-40de-944b-e07fc1f90ae7')).toBe(
      '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    )
    expect(toSqlResultValue(12n)).toBe(12)
    expect(toSqlResultValue('12.50', { decimal: true })).toBe(12.5)
    expect(toSqlResultValue({ a: 1, b: [true, null, 'x'] })).toEqual({
      kind: 'json',
      value: '{"a":1,"b":[true,null,"x"]}',
    })
    expect(toSqlResultValue([1, 2])).toEqual({ kind: 'json', value: '[1,2]' })
  })

  it('SQX-22 inteiro fora do intervalo vira bigint e decimal inexato vira texto', () => {
    expect(toSqlResultValue(9_007_199_254_740_991n)).toBe(9_007_199_254_740_991)
    expect(toSqlResultValue(9_007_199_254_740_993n)).toEqual({
      kind: 'bigint',
      value: '9007199254740993',
    })
    expect(toSqlResultValue(-9_223_372_036_854_775_808n)).toEqual({
      kind: 'bigint',
      value: '-9223372036854775808',
    })
    expect(toSqlResultValue({ big: 9_007_199_254_740_993n })).toEqual({
      kind: 'json',
      value: '{"big":9007199254740993}',
    })
    expect(toSqlResultValue('0.1', { decimal: true })).toBe(0.1)
    expect(toSqlResultValue('-0.0000001', { decimal: true })).toBe(-0.0000001)
    expect(toSqlResultValue('100.000', { decimal: true })).toBe(100)
    expect(
      toSqlResultValue('12345678901234567890.123456789', { decimal: true }),
    ).toBe('12345678901234567890.123456789')
    expect(toSqlResultValue('0.12345678901234567891', { decimal: true })).toBe(
      '0.12345678901234567891',
    )
    expect(toSqlResultValue('NaN', { decimal: true })).toBe('NaN')
  })

  it('SQX-27 binário vira <binário N bytes>', () => {
    expect(toSqlResultValue(Buffer.from([1, 2, 3]))).toBe('<binário 3 bytes>')
    expect(toSqlResultValue(Buffer.alloc(0))).toBe('<binário 0 bytes>')
    expect(toSqlResultValue(new Uint8Array(5))).toBe('<binário 5 bytes>')
  })
})

describe('uniqueColumnNames', () => {
  it('SQX-23 colunas repetidas ganham _2 e _3', () => {
    expect(uniqueColumnNames(['id', 'nome', 'id', 'id', 'nome'])).toEqual([
      'id',
      'nome',
      'id_2',
      'id_3',
      'nome_2',
    ])
    expect(uniqueColumnNames(['a', 'b'])).toEqual(['a', 'b'])
    expect(uniqueColumnNames(['a', 'a_2', 'a'])).toEqual(['a', 'a_2', 'a_3'])
  })
})
