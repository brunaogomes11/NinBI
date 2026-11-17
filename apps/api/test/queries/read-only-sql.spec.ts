import { describe, expect, it } from 'vitest'
import { validateReadOnlySql } from '../../src/queries/read-only-sql'

const notSelect = {
  ok: false,
  code: 'QUERY_NOT_SELECT',
  message:
    'Somente consultas de leitura são permitidas. Comece por SELECT ou WITH',
}

const blocked = (clause: string) => ({
  ok: false,
  code: 'QUERY_WRITE_BLOCKED',
  message: `Somente consultas de leitura são permitidas. Cláusula bloqueada: ${clause}`,
  clause,
})

describe('validateReadOnlySql', () => {
  it('SQX-05 consulta que não começa por SELECT ou WITH é recusada', () => {
    for (const sql of [
      'DELETE FROM users',
      'SHOW TABLES',
      'VALUES (1)',
      '',
      '   ',
      '-- só comentário',
      '(SELECT 1)',
    ]) {
      expect(validateReadOnlySql(sql), sql).toEqual(notSelect)
    }
    for (const sql of [
      'SELECT 1',
      '  select * from users',
      '-- comentário\n/* outro */ SELECT 1',
      'WITH t AS (SELECT 1 AS a) SELECT a FROM t',
      'SELECT 1;',
    ]) {
      expect(validateReadOnlySql(sql), sql).toEqual({ ok: true })
    }
  })

  it('SQX-06 palavra bloqueada fora de strings e comentários é recusada com a cláusula', () => {
    const cases: [string, string][] = [
      [
        'WITH x AS (INSERT INTO t VALUES (1) RETURNING *) SELECT * FROM x',
        'INSERT',
      ],
      ['WITH x AS (UPDATE t SET a = 1 RETURNING *) SELECT * FROM x', 'UPDATE'],
      ['WITH x AS (DELETE FROM t RETURNING *) SELECT * FROM x', 'DELETE'],
      ['WITH x AS (MERGE INTO t USING s ON true) SELECT 1', 'MERGE'],
      ['SELECT 1 FROM t WHERE DROP', 'DROP'],
      ['SELECT ALTER FROM t', 'ALTER'],
      ['SELECT CREATE FROM t', 'CREATE'],
      ['SELECT 1 TRUNCATE t', 'TRUNCATE'],
      ['SELECT 1 GRANT', 'GRANT'],
      ['SELECT 1 REVOKE', 'REVOKE'],
      ['SELECT 1 EXEC sp_who', 'EXEC'],
      ['SELECT 1 EXECUTE sp_who', 'EXECUTE'],
      ['SELECT 1 CALL proc()', 'CALL'],
      ['SELECT 1 COPY t TO stdout', 'COPY'],
      ['SELECT 1 SET x = 1', 'SET'],
      ['SELECT 1 DO $x', 'DO'],
      ['SELECT * INTO nova FROM t', 'INTO'],
      ['SELECT 1 DECLARE @a INT', 'DECLARE'],
      ["SELECT 1 WAITFOR DELAY '00:00:05'", 'WAITFOR'],
      ["SELECT * FROM OPENROWSET('x', 'y', 'z')", 'OPENROWSET'],
      ["SELECT * FROM OPENQUERY(srv, 'SELECT 1')", 'OPENQUERY'],
      ['SELECT 1 LOCK TABLE t', 'LOCK'],
      ['SELECT * FROM t FOR UPDATE', 'FOR UPDATE'],
    ]
    for (const [sql, clause] of cases) {
      expect(validateReadOnlySql(sql), sql).toEqual(blocked(clause))
    }
    expect(validateReadOnlySql('SELECT * FROM t FOR SHARE')).toEqual({
      ok: true,
    })
    // Nome qualificado sem aspas também é recusado; com aspas, é aceito (SQX-08).
    const qualified: [string, string][] = [
      ['SELECT t.set, t.update FROM t', 'SET'],
      ['SELECT t.update FROM t', 'UPDATE'],
      ['SELECT * FROM public.delete', 'DELETE'],
      ['SELECT u.id FROM users u WHERE u.into = 1', 'INTO'],
    ]
    for (const [sql, clause] of qualified) {
      expect(validateReadOnlySql(sql), sql).toEqual(blocked(clause))
    }
  })

  it('SQX-07 palavras bloqueadas valem sem diferenciar maiúsculas', () => {
    for (const sql of [
      'with x as (delete from t returning *) select * from x',
      'WITH x AS (Delete FROM t RETURNING *) SELECT * FROM x',
      'select * from t for update',
    ]) {
      const result = validateReadOnlySql(sql)
      expect(result.ok, sql).toBe(false)
      if (!result.ok) expect(result.code).toBe('QUERY_WRITE_BLOCKED')
    }
    expect(validateReadOnlySql('select * from t for update')).toEqual(
      blocked('FOR UPDATE'),
    )
    expect(validateReadOnlySql('select 1 dElEtE')).toEqual(blocked('DELETE'))
  })

  it('SQX-08 palavra bloqueada em string, comentário, identificador ou nome maior é aceita', () => {
    for (const sql of [
      "SELECT 'DELETE FROM t' AS a",
      "SELECT N'DROP TABLE t' AS a",
      "SELECT E'INSERT \\' UPDATE' AS a",
      'SELECT 1 -- DELETE FROM t',
      'SELECT 1 /* DROP TABLE t */',
      'SELECT "update" FROM t',
      'SELECT [delete] FROM t',
      'SELECT `insert` FROM t',
      'SELECT created_at, updated_at, deleted, inserted_by FROM t',
      'SELECT t."set", t."update" FROM t',
      'SELECT u.`delete` FROM users u WHERE u.`into` = 1',
      'SELECT u.[set], [public].[delete] FROM users u',
      'SELECT $update AS a',
    ]) {
      expect(validateReadOnlySql(sql), sql).toEqual({ ok: true })
    }
  })

  it('SQX-09 mais de uma instrução separada por ponto e vírgula é recusada', () => {
    const multiple = {
      ok: false,
      code: 'QUERY_MULTIPLE_STATEMENTS',
      message: 'Envie uma consulta por vez',
    }
    expect(validateReadOnlySql('SELECT 1; SELECT 2')).toEqual(multiple)
    expect(validateReadOnlySql('SELECT 1; DELETE FROM t')).toEqual(multiple)
    expect(validateReadOnlySql('SELECT 1;;')).toEqual(multiple)
    expect(validateReadOnlySql("SELECT ';' AS a; ")).toEqual({ ok: true })
    expect(validateReadOnlySql('SELECT 1; -- fim')).toEqual({ ok: true })
  })

  it('SQX-09 no MySQL comentário # e escape \\ não escondem a segunda instrução', () => {
    const multiple = {
      ok: false,
      code: 'QUERY_MULTIPLE_STATEMENTS',
      message: 'Envie uma consulta por vez',
    }
    const BS = String.fromCharCode(92)
    expect(
      validateReadOnlySql(
        "SELECT 1 # '\n; DELETE FROM t WHERE 1=1 #'",
        'MYSQL',
      ),
    ).toEqual(multiple)
    expect(
      validateReadOnlySql(`SELECT 'x${BS}' , '; DELETE FROM t -- '`, 'MYSQL'),
    ).toEqual(multiple)
    expect(validateReadOnlySql('SELECT 1 --1; DELETE FROM t', 'MYSQL')).toEqual(
      multiple,
    )
    expect(
      validateReadOnlySql('SELECT 1 /*! ; DELETE FROM t */', 'MYSQL'),
    ).toEqual(multiple)
    expect(
      validateReadOnlySql("SELECT 'it''s', 'a\\'b' # fim", 'MYSQL'),
    ).toEqual({ ok: true })
    expect(validateReadOnlySql('SELECT 1 -- ; DELETE', 'MYSQL')).toEqual({
      ok: true,
    })
  })

  it('SQX-06 no MySQL palavra bloqueada depois de # ou de escape \\ é recusada', () => {
    const BS = String.fromCharCode(92)
    expect(
      validateReadOnlySql(
        `SELECT 'a${BS}' , ' FROM t WHERE DROP -- '`,
        'MYSQL',
      ),
    ).toEqual(blocked('DROP'))
    expect(
      validateReadOnlySql("SELECT 1 # x\nINTO OUTFILE '/tmp/x'", 'MYSQL'),
    ).toEqual(blocked('INTO'))
  })

  it('SQX-09 texto entre $$ ou $tag$ é recusado em qualquer banco', () => {
    const dollar = (delimiter: string) => ({
      ok: false,
      code: 'QUERY_WRITE_BLOCKED',
      message: `Texto entre ${delimiter} não é aceito; use aspas simples`,
      clause: delimiter,
    })
    for (const dialect of [
      undefined,
      'POSTGRES',
      'MYSQL',
      'SQLSERVER',
    ] as const) {
      expect(
        validateReadOnlySql("SELECT $$it's$$; DELETE FROM t", dialect),
      ).toEqual(dollar('$$'))
      expect(
        validateReadOnlySql(
          "SELECT $a$'$a$; DELETE FROM t WHERE 1=1; SELECT '1'",
          dialect,
        ),
      ).toEqual(dollar('$a$'))
      expect(validateReadOnlySql('SELECT $$x$$', dialect)).toEqual(dollar('$$'))
      expect(
        validateReadOnlySql('SELECT \'$$\', "$a$" FROM t -- $b$', dialect),
      ).toEqual({ ok: true })
      expect(
        validateReadOnlySql('SELECT * FROM t WHERE a = $a AND b = $b', dialect),
      ).toEqual({ ok: true })
    }
  })

  it('SQX-12 consulta SQL com mais de 20.000 caracteres é recusada', () => {
    const limit = `SELECT '${'a'.repeat(20_000 - 'SELECT '.length - 2)}'`
    expect(limit).toHaveLength(20_000)
    expect(validateReadOnlySql(limit)).toEqual({ ok: true })
    expect(validateReadOnlySql(`${limit} `)).toEqual({
      ok: false,
      code: 'QUERY_TOO_LONG',
      message: 'A consulta passa de 20.000 caracteres',
    })
  })
})
