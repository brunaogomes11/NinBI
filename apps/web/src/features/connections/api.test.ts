import { describe, expect, it } from 'vitest'
import {
  connectionTypeLabel,
  defaultPortFor,
  queryLabel,
  queryLanguage,
} from './api'

describe('connections api helpers', () => {
  it('SQX-02 rótulo e linguagem da consulta por tipo de conexão', () => {
    expect(queryLabel('NEO4J')).toBe('Consulta Cypher')
    expect(queryLanguage('NEO4J')).toBe('CYPHER')
    for (const type of ['POSTGRES', 'MYSQL', 'SQLSERVER'] as const) {
      expect(queryLabel(type)).toBe('Consulta SQL')
      expect(queryLanguage(type)).toBe('SQL')
    }
    expect(connectionTypeLabel('SQLSERVER')).toBe('SQL Server')
    expect(connectionTypeLabel('POSTGRES')).toBe('PostgreSQL')
    expect(defaultPortFor('POSTGRES')).toBe(5432)
    expect(defaultPortFor('MYSQL')).toBe(3306)
    expect(defaultPortFor('SQLSERVER')).toBe(1433)
    expect(defaultPortFor('NEO4J')).toBeNull()
  })
})
