import { describe, expect, it } from 'vitest'
import {
  MYSQL_DIALECT,
  POSTGRES_DIALECT,
  SQLSERVER_DIALECT,
} from '../../src/sources/dialects'

const DIALECTS = [POSTGRES_DIALECT, MYSQL_DIALECT, SQLSERVER_DIALECT]
const SYSTEM_SCHEMAS = [
  'information_schema',
  'pg_catalog',
  'pg_toast',
  'sys',
  'INFORMATION_SCHEMA',
  'mysql',
  'performance_schema',
]

/** Os nomes de cada lista `NOT IN (...)` da consulta. */
function excludedLists(sql: string): string[][] {
  return [...sql.matchAll(/NOT IN \(([^)]*)\)/g)].map((match) =>
    (match[1] as string).split(',').map((item) => item.trim().slice(1, -1)),
  )
}

describe('dialetos SQL', () => {
  it('SCS-03 consultas de catálogo excluem os schemas do sistema', () => {
    for (const dialect of DIALECTS) {
      for (const [kind, sql] of Object.entries(dialect.catalogQueries)) {
        const lists = excludedLists(sql)
        expect(lists.length, `${dialect.label} ${kind}`).toBeGreaterThan(0)
        for (const list of lists) {
          expect(list, `${dialect.label} ${kind}`).toEqual(
            expect.arrayContaining(SYSTEM_SCHEMAS),
          )
        }
      }
    }
    expect(POSTGRES_DIALECT.catalogQueries.tables).toContain('pg_catalog.')
    expect(POSTGRES_DIALECT.catalogQueries.tables).toContain('format_type')
    expect(POSTGRES_DIALECT.catalogQueries.foreignKeys).toContain(
      'pg_catalog.pg_constraint',
    )
    for (const sql of Object.values(MYSQL_DIALECT.catalogQueries)) {
      expect(sql).toContain('INFORMATION_SCHEMA.')
      expect(sql).toContain('TABLE_SCHEMA = DATABASE()')
    }
    expect(SQLSERVER_DIALECT.catalogQueries.tables).toContain(
      'INFORMATION_SCHEMA.COLUMNS',
    )
    expect(SQLSERVER_DIALECT.catalogQueries.foreignKeys).toContain(
      'sys.foreign_key_columns',
    )
  })

  it('SCS-06 dialetos declaram nomes qualificados só no PostgreSQL e no SQL Server', () => {
    expect(POSTGRES_DIALECT.qualifiedNames).toBe(true)
    expect(SQLSERVER_DIALECT.qualifiedNames).toBe(true)
    expect(MYSQL_DIALECT.qualifiedNames).toBe(false)
  })

  it('quote dobra o fechamento do identificador nos três dialetos e sampleQuery usa LIMIT ou TOP conforme o dialeto', () => {
    expect(POSTGRES_DIALECT.quote('a')).toBe('"a"')
    expect(POSTGRES_DIALECT.quote('a"b')).toBe('"a""b"')
    expect(MYSQL_DIALECT.quote('a')).toBe('`a`')
    expect(MYSQL_DIALECT.quote('a`b')).toBe('`a``b`')
    expect(SQLSERVER_DIALECT.quote('a')).toBe('[a]')
    expect(SQLSERVER_DIALECT.quote('a]b')).toBe('[a]]b]')
    expect(SQLSERVER_DIALECT.quote('a[b')).toBe('[a[b]')

    const table = { schema: 'vendas', name: 'pedidos' }
    expect(POSTGRES_DIALECT.sampleQuery(table, 100)).toBe(
      'SELECT * FROM "vendas"."pedidos" LIMIT 100',
    )
    expect(MYSQL_DIALECT.sampleQuery(table, 100)).toBe(
      'SELECT * FROM `pedidos` LIMIT 100',
    )
    expect(SQLSERVER_DIALECT.sampleQuery(table, 100)).toBe(
      'SELECT TOP 100 * FROM [vendas].[pedidos]',
    )
    expect(POSTGRES_DIALECT.sampleQuery({ schema: 'a"b', name: 't' }, 5)).toBe(
      'SELECT * FROM "a""b"."t" LIMIT 5',
    )
    expect(() => MYSQL_DIALECT.sampleQuery(table, 0)).toThrow(RangeError)

    expect(POSTGRES_DIALECT.placeholder).toBe('dollar')
    expect(MYSQL_DIALECT.placeholder).toBe('question')
    expect(SQLSERVER_DIALECT.placeholder).toBe('at')
    expect(DIALECTS.map((d) => d.label)).toEqual([
      'PostgreSQL',
      'MySQL',
      'T-SQL',
    ])
    expect(DIALECTS.map((d) => d.defaultPort)).toEqual([5432, 3306, 1433])
    expect([...POSTGRES_DIALECT.syntaxErrorCodes]).toEqual([
      '42601',
      '42703',
      '42P01',
    ])
    expect([...MYSQL_DIALECT.syntaxErrorCodes]).toEqual([
      '1064',
      '1054',
      '1146',
    ])
    expect([...SQLSERVER_DIALECT.syntaxErrorCodes]).toEqual([
      '102',
      '207',
      '208',
    ])
  })
})
