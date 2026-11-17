import type { QueryResultDto, ResultValue } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import { optionsFromResult } from '../../src/filters/filter-options'

const result = (rows: ResultValue[][], columns = ['nome']): QueryResultDto => ({
  columns,
  rows,
  truncated: false,
  rowLimit: 5000,
})

describe('optionsFromResult', () => {
  it('FLT-24 mais de 1000 valores usa os primeiros 1000', () => {
    const many = Array.from({ length: 1500 }, (_, i) => [`v${i}`])
    const out = optionsFromResult(result(many))
    expect(out.options).toHaveLength(1000)
    expect(out.options[0]).toBe('v0')
    expect(out.options[999]).toBe('v999')
    expect(out.truncated).toBe(true)

    const exact = optionsFromResult(result(many.slice(0, 1000)))
    expect(exact.options).toHaveLength(1000)
    expect(exact.truncated).toBe(false)
  })

  it('FLT-24 nulos e repetidos são descartados na ordem da primeira aparição', () => {
    const out = optionsFromResult(
      result([['b'], [null], ['a'], ['b'], [1], ['a'], [1]]),
    )
    expect(out.options).toEqual(['b', 'a', 1])
  })

  it('FLT-24 o número 1 e o texto "1" são a mesma opção', () => {
    const out = optionsFromResult(result([[1], ['1'], ['a'], [true], ['true']]))
    expect(out.options).toEqual([1, 'a', true])
  })

  it('FLT-24 bigint e json viram o texto e só a primeira coluna conta', () => {
    const out = optionsFromResult(
      result(
        [
          [{ kind: 'bigint', value: '9007199254740993' }, 'x'],
          [{ kind: 'json', value: '{"a":1}' }, 'y'],
        ],
        ['id', 'outra'],
      ),
    )
    expect(out.options).toEqual(['9007199254740993', '{"a":1}'])
    expect(optionsFromResult(result([], [])).options).toEqual([])
  })
})
