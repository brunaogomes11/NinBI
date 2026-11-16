import { describe, expect, it } from 'vitest'
import { formatDateTime, formatNumber, formatValue } from './format'

describe('format', () => {
  it('VIZ-17 números no formato 1.234,56 e datas em dd/MM/aaaa', () => {
    expect(formatNumber(1234.56)).toBe('1.234,56')
    expect(formatNumber(4999.95)).toBe('4.999,95')
    expect(formatNumber(20)).toBe('20')
    expect(formatNumber(0.125)).toBe('0,13')
    expect(formatNumber(-5)).toBe('-5')

    expect(formatValue(1234.56)).toBe('1.234,56')
    expect(formatValue('2024-02-05')).toBe('05/02/2024')
    expect(formatValue('2024-02-05T23:30:00Z')).toBe('05/02/2024')
    expect(formatValue({ kind: 'bigint', value: '9007199254740993' })).toBe(
      '9.007.199.254.740.993',
    )
    expect(formatValue(null)).toBe('—')
    expect(formatValue(true)).toBe('Sim')
    expect(formatValue(false)).toBe('Não')
    expect(formatValue('Centro')).toBe('Centro')
    expect(formatValue({ kind: 'json', value: '{"a":1}' })).toBe('{"a":1}')
  })

  it('VIZ-17 formatDateTime continua mostrando dia, mês, ano e hora', () => {
    expect(formatDateTime('2026-11-16T17:30:00Z')).toBe('16/11/2026, 14:30')
  })
})
