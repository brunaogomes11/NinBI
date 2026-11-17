import { describe, expect, it } from 'vitest'
import { tokenizeSql } from './sql-tokens'

const BS = String.fromCharCode(92)

const words = (sql: string) =>
  tokenizeSql(sql)
    .filter((token) => token.type === 'word')
    .map((token) => token.value)

const params = (sql: string) =>
  tokenizeSql(sql)
    .filter((token) => token.type === 'param')
    .map((token) => token.value)

describe('sql tokens', () => {
  it('SQX-08 comentários e strings de SQL ficam fora das palavras', () => {
    expect(words("SELECT 'DROP TABLE x' FROM t -- DELETE")).toEqual([
      'SELECT',
      'FROM',
      't',
    ])
    expect(words('SELECT 1 /* UPDATE\n x */ FROM t')).toEqual([
      'SELECT',
      'FROM',
      't',
    ])
    expect(words("SELECT 'it''s DROP', 2")).toEqual(['SELECT'])
    expect(words(`SELECT N'DROP', E'a${BS}'DROP', e'x' FROM t`)).toEqual([
      'SELECT',
      'FROM',
      't',
    ])
    expect(words('SELECT "DROP", [DELETE], `INSERT` FROM t')).toEqual([
      'SELECT',
      'FROM',
      't',
    ])
    expect(words('SELECT created_at, one FROM t')).toEqual([
      'SELECT',
      'created_at',
      'one',
      'FROM',
      't',
    ])
  })

  it('SQX-08 tokens trazem tipo, valor e posição', () => {
    expect(tokenizeSql("SELECT 'a'; -- x\n1")).toEqual([
      { type: 'word', value: 'SELECT', start: 0, end: 6 },
      { type: 'string', value: "'a'", start: 7, end: 10 },
      { type: 'semicolon', value: ';', start: 10, end: 11 },
      { type: 'number', value: '1', start: 17, end: 18 },
    ])
    expect(tokenizeSql('a.[b c]').map((token) => token.type)).toEqual([
      'word',
      'symbol',
      'identifier',
    ])
  })

  it('SQX-16 $nome em string, comentário ou identificador não é parâmetro', () => {
    expect(params('SELECT \'$falso\', "$a", [$b], `$c` -- $d')).toEqual([])
    expect(params('SELECT 1 /* $e */ WHERE x = $real')).toEqual(['real'])
    expect(params(`SELECT E'${BS}' $x' FROM t`)).toEqual([])
    expect(params("SELECT N'$x', 'it''s $y' FROM t")).toEqual([])
  })

  it('SQX-08 no MySQL # comenta a linha e \\ escapa dentro de strings', () => {
    const mysql = (sql: string) =>
      tokenizeSql(sql, { dialect: 'MYSQL' })
        .filter((token) => token.type === 'word')
        .map((token) => token.value)
    const commentHide = "SELECT 1 # '\n; DELETE FROM t WHERE 1=1 #'"
    expect(mysql(commentHide)).toEqual([
      'SELECT',
      'DELETE',
      'FROM',
      't',
      'WHERE',
    ])
    expect(
      tokenizeSql(commentHide, { dialect: 'MYSQL' }).map((t) => t.type),
    ).toContain('semicolon')
    const escapeHide = `SELECT 'x${BS}' , '; DELETE FROM t -- '`
    expect(mysql(escapeHide)).toEqual(['SELECT', 'DELETE', 'FROM', 't'])
    expect(mysql(`SELECT "a${BS}" DROP" FROM t`)).toEqual([
      'SELECT',
      'FROM',
      't',
    ])
    // `--` sem espaço depois não é comentário no MySQL.
    expect(mysql('SELECT 1 --1; DELETE FROM t')).toEqual([
      'SELECT',
      'DELETE',
      'FROM',
      't',
    ])
    expect(mysql('SELECT 1 -- DELETE')).toEqual(['SELECT'])
    // `/*! ... */` é executado pelo MySQL, então o corpo é lido como SQL.
    expect(mysql('SELECT 1 /*!50000 DELETE */ FROM t')).toEqual([
      'SELECT',
      'DELETE',
      'FROM',
      't',
    ])
    // Sem dialeto, nada muda: # é símbolo e \ não escapa.
    expect(words(commentHide)).toEqual(['SELECT'])
    expect(words(escapeHide)).toEqual(['SELECT'])
  })

  it('SQX-09 $$ e $tag$ viram um delimitador só, fora de strings e comentários', () => {
    const symbols = (sql: string) =>
      tokenizeSql(sql)
        .filter((token) => token.type === 'symbol')
        .map((token) => token.value)
    expect(symbols("SELECT $$it's$$; DELETE FROM t")).toEqual(['$$'])
    expect(
      symbols("SELECT $a$'$a$; DELETE FROM t WHERE 1=1; SELECT '1'"),
    ).toEqual(['$a$'])
    expect(params("SELECT $a$'$a$; DELETE FROM t")).toEqual([])
    expect(symbols('SELECT \'$$\', "$a$" -- $b$')).toEqual([','])
    expect(params('SELECT $a, $b FROM t')).toEqual(['a', 'b'])
  })

  it('SQX-16 $1 e $$ não são parâmetros e $nome é', () => {
    expect(params('SELECT $1, $$, $nome, $_x2')).toEqual(['nome', '_x2'])
    expect(params('SELECT $$ $a $$')).toEqual(['a'])
    const [token] = tokenizeSql('$nome')
    expect(token).toEqual({ type: 'param', value: 'nome', start: 0, end: 5 })
  })
})
