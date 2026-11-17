import { afterEach, describe, expect, it } from 'vitest'
import { correctionMessage } from '../../src/ai/widget-prompt'
import type { AppError } from '../../src/common/app-error'
import { CryptoService } from '../../src/crypto/crypto.service'
import { QueryService } from '../../src/queries/query.service'
import { SourceGatewayError } from '../../src/sources/source'
import { createConnection } from '../factories'
import { createTestApp } from '../harness'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const text = (message: { content: unknown }) => String(message.content)

describe('código de erro do banco para a IA', () => {
  it('SQX-13 dbCode segue ao prompt e erro de execução SQL vai só com o código', async () => {
    const t = await createTestApp()
    close = t.close
    const connection = await createConnection(t.db, t.app.get(CryptoService), {
      name: 'Vendas SQL',
      type: 'POSTGRES',
    })
    t.sql.POSTGRES.whenRead(
      'SELECT',
      new SourceGatewayError('division by zero em 42', '22012'),
    )
    const error = (await t.app
      .get(QueryService)
      .run({ userId: 'u1', connectionId: connection.id, cypher: 'SELECT 1/0' })
      .catch((e: unknown) => e)) as AppError
    expect(error.code).toBe('QUERY_FAILED')
    expect(error.dbCode).toBe('22012')
    expect(Object.keys(error)).not.toContain('neo4jCode')

    // Erro de execução: só o código, nunca a mensagem com valores do banco.
    const execution = text(
      correctionMessage(
        { code: error.code, message: error.message, dbCode: error.dbCode },
        'PostgreSQL',
      ),
    )
    expect(execution).toContain('Erro de execução no PostgreSQL: 22012')
    expect(execution).not.toContain('division by zero')

    // Erro de sintaxe ou semântico do dialeto: a mensagem segue inteira.
    const syntax = [
      ['PostgreSQL', '42601', 'syntax error at or near "FORM"'],
      ['PostgreSQL', '42P01', 'relation "nada" does not exist'],
      ['MySQL', '1064', 'You have an error in your SQL syntax'],
      ['MySQL', '1054', "Unknown column 'x' in 'field list'"],
      ['T-SQL', '102', "Incorrect syntax near 'FORM'."],
      ['T-SQL', '208', "Invalid object name 'nada'."],
    ] as const
    for (const [dialect, dbCode, message] of syntax) {
      expect(
        text(
          correctionMessage({ code: 'QUERY_FAILED', message, dbCode }, dialect),
        ),
      ).toContain(message)
    }

    // O código de sintaxe de um dialeto não vale para outro.
    const mysqlInPostgres = text(
      correctionMessage(
        { code: 'QUERY_FAILED', message: 'segredo 99', dbCode: '1064' },
        'PostgreSQL',
      ),
    )
    expect(mysqlInPostgres).not.toContain('segredo')

    const tsql = text(
      correctionMessage(
        {
          code: 'QUERY_FAILED',
          message: 'Arithmetic overflow 77',
          dbCode: '8115',
        },
        'T-SQL',
      ),
    )
    expect(tsql).toContain('Erro de execução no SQL Server: 8115')
    expect(tsql).not.toContain('77')

    // Sem dialeto, vale o Neo4j de antes.
    expect(
      text(correctionMessage({ code: 'QUERY_FAILED', message: 'x 1' })),
    ).toContain('Erro de execução no Neo4j')
  })
})
