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

  it('SQX-16 $1 e $$ não são parâmetros e $nome é', () => {
    expect(params('SELECT $1, $$, $nome, $_x2')).toEqual(['nome', '_x2'])
    expect(params('SELECT $$ $a $$')).toEqual(['a'])
    const [token] = tokenizeSql('$nome')
    expect(token).toEqual({ type: 'param', value: 'nome', start: 0, end: 5 })
  })
})
