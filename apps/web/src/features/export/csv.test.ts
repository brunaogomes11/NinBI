import type { QueryResultDto, ResultValue } from '@ninbi/contracts'
import { describe, expect, it } from 'vitest'
import { exportFileName, toCsv } from './csv'

function resultOf(columns: string[], rows: ResultValue[][]): QueryResultDto {
  return { columns, rows, truncated: false, rowLimit: 1000 }
}

function body(csv: string): string[] {
  return csv.slice(1).split('\r\n')
}

describe('csv', () => {
  it('EXP-02 CSV tem cabeçalho e todas as linhas na ordem das colunas', () => {
    const rows = Array.from({ length: 120 }, (_, i): ResultValue[] => [
      `Loja ${i}`,
      i,
      '2025-01-01',
    ])
    const lines = body(toCsv(resultOf(['loja', 'total', 'dia'], rows)))
    expect(lines).toHaveLength(121)
    expect(lines[0]).toBe('loja;total;dia')
    expect(lines[1]).toBe('Loja 0;0;01/01/2025')
    expect(lines[120]).toBe('Loja 119;119;01/01/2025')
    expect(body(toCsv(resultOf(['a', 'a'], [[1, 2]])))).toEqual(['a;a', '1;2'])
  })

  it('EXP-03 CSV em UTF-8 com BOM, ponto e vírgula, vírgula decimal e datas dd/MM/aaaa', () => {
    const csv = toCsv(
      resultOf(
        ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
        [
          [
            1234.56,
            -5,
            { kind: 'bigint', value: '9007199254740993' },
            '2024-02-05',
            '2024-02-05T23:30:00Z',
            null,
            true,
            'São Paulo',
            false,
          ],
        ],
      ),
    )
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(body(csv)[1]).toBe(
      '1234,56;-5;9007199254740993;05/02/2024;05/02/2024;;Sim;São Paulo;Não',
    )
  })

  it('EXP-03 texto que só começa com uma data fica como texto, sem perder o resto', () => {
    const csv = toCsv(
      resultOf(
        ['a', 'b', 'c'],
        [['2026-01-05 reunião', '2026-13-45', '2026-01-05T10:00:00Z']],
      ),
    )
    expect(body(csv)[1]).toBe('2026-01-05 reunião;2026-13-45;05/01/2026')
  })

  it('EXP-04 texto com ponto e vírgula, aspas ou quebra de linha vai entre aspas', () => {
    const csv = toCsv(
      resultOf(['x'], [['a;b'], ['diz "oi"'], ['linha1\nlinha2']]),
    )
    expect(csv.slice(1)).toBe('x\r\n"a;b"\r\n"diz ""oi"""\r\n"linha1\nlinha2"')
  })

  it('EXP-05 texto que começa com igual, mais, menos ou arroba ganha apóstrofo', () => {
    const csv = toCsv(
      resultOf(
        ['=x', 'b'],
        [
          ['=SOMA(A1)', '+1'],
          ['-x', '@cmd'],
          [-5, 7],
        ],
      ),
    )
    expect(body(csv)).toEqual(["'=x;b", "'=SOMA(A1);'+1", "'-x;'@cmd", '-5;7'])
  })

  it('EXP-07 nome do arquivo troca caracteres especiais por hífen e leva a data', () => {
    const date = new Date(2026, 10, 16, 9, 30)
    expect(exportFileName('Vendas por mês', date, 'csv')).toBe(
      'Vendas-por-mês-2026-11-16.csv',
    )
    expect(exportFileName('Top/10: lojas', date, 'png')).toBe(
      'Top-10--lojas-2026-11-16.png',
    )
  })
})
