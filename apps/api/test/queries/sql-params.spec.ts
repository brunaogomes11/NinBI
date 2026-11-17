import { describe, expect, it } from 'vitest'
import { bindSqlParams } from '../../src/queries/sql-params'

describe('bindSqlParams', () => {
  it('SQX-15 $nome vira parâmetro do driver sem colar o valor', () => {
    const sql = 'SELECT * FROM t WHERE a = $nome AND b > $limite'
    const params = { nome: "O'Brien; DROP TABLE t", limite: 10 }
    expect(bindSqlParams(sql, params, 'dollar')).toEqual({
      text: 'SELECT * FROM t WHERE a = $1 AND b > $2',
      values: ["O'Brien; DROP TABLE t", 10],
    })
    expect(bindSqlParams(sql, params, 'question')).toEqual({
      text: 'SELECT * FROM t WHERE a = ? AND b > ?',
      values: ["O'Brien; DROP TABLE t", 10],
    })
    expect(bindSqlParams(sql, params, 'at')).toEqual({
      text: 'SELECT * FROM t WHERE a = @p1 AND b > @p2',
      values: ["O'Brien; DROP TABLE t", 10],
    })

    const repeated = 'SELECT $a AS x, $b AS y, $a AS z'
    expect(bindSqlParams(repeated, { a: 1, b: 2 }, 'dollar')).toEqual({
      text: 'SELECT $1 AS x, $2 AS y, $1 AS z',
      values: [1, 2],
    })
    expect(bindSqlParams(repeated, { a: 1, b: 2 }, 'at')).toEqual({
      text: 'SELECT @p1 AS x, @p2 AS y, @p1 AS z',
      values: [1, 2],
    })
    expect(bindSqlParams(repeated, { a: 1, b: 2 }, 'question')).toEqual({
      text: 'SELECT ? AS x, ? AS y, ? AS z',
      values: [1, 2, 1],
    })

    const untouched =
      'SELECT \'$a\' AS s, "$a" AS i, [$a] AS j, `$a` AS k, $a AS v -- $a\n/* $a */'
    expect(bindSqlParams(untouched, { a: 7 }, 'dollar')).toEqual({
      text: 'SELECT \'$a\' AS s, "$a" AS i, [$a] AS j, `$a` AS k, $1 AS v -- $a\n/* $a */',
      values: [7],
    })
  })

  it('SQX-17 parâmetro sem valor vai como null', () => {
    expect(bindSqlParams('SELECT $a, $b', { a: undefined }, 'dollar')).toEqual({
      text: 'SELECT $1, $2',
      values: [null, null],
    })
    expect(bindSqlParams('SELECT $a', {}, 'question')).toEqual({
      text: 'SELECT ?',
      values: [null],
    })
    // Nome que existe no protótipo de Object também vai como null.
    expect(
      bindSqlParams('SELECT $constructor, $toString', {}, 'dollar'),
    ).toEqual({ text: 'SELECT $1, $2', values: [null, null] })
    expect(
      bindSqlParams('SELECT 1 WHERE $constructor IS NULL', {}, 'at'),
    ).toEqual({ text: 'SELECT 1 WHERE (1 = 1)', values: [] })
  })

  it('SQX-18 $nome IS NULL e IS NOT NULL viram condição constante', () => {
    const sql = 'SELECT 1 WHERE $a IS NULL AND $b is not null'
    expect(bindSqlParams(sql, { a: null, b: null }, 'dollar')).toEqual({
      text: 'SELECT 1 WHERE (1 = 1) AND (1 = 0)',
      values: [],
    })
    expect(bindSqlParams(sql, { a: 'x', b: 3 }, 'dollar')).toEqual({
      text: 'SELECT 1 WHERE (1 = 0) AND (1 = 1)',
      values: [],
    })
    expect(bindSqlParams(sql, {}, 'question')).toEqual({
      text: 'SELECT 1 WHERE (1 = 1) AND (1 = 0)',
      values: [],
    })
    expect(
      bindSqlParams(
        'SELECT 1 WHERE $a IS NULL OR x = $a',
        { a: 5 },
        'question',
      ),
    ).toEqual({ text: 'SELECT 1 WHERE (1 = 0) OR x = ?', values: [5] })
    expect(
      bindSqlParams('SELECT 1 WHERE $a  IS\n  NULL', { a: 1 }, 'at'),
    ).toEqual({ text: 'SELECT 1 WHERE (1 = 0)', values: [] })
  })

  it('SQX-19 lista vira um parâmetro por item e lista vazia vira NULL', () => {
    const sql = 'SELECT * FROM t WHERE id IN ($ids) AND a = $a'
    expect(bindSqlParams(sql, { ids: [1, 2, 3], a: 'x' }, 'dollar')).toEqual({
      text: 'SELECT * FROM t WHERE id IN ($1, $2, $3) AND a = $4',
      values: [1, 2, 3, 'x'],
    })
    expect(bindSqlParams(sql, { ids: [1, 2], a: 'x' }, 'question')).toEqual({
      text: 'SELECT * FROM t WHERE id IN (?, ?) AND a = ?',
      values: [1, 2, 'x'],
    })
    expect(bindSqlParams(sql, { ids: ['p', 'q'], a: 'x' }, 'at')).toEqual({
      text: 'SELECT * FROM t WHERE id IN (@p1, @p2) AND a = @p3',
      values: ['p', 'q', 'x'],
    })
    expect(bindSqlParams(sql, { ids: [], a: 'x' }, 'dollar')).toEqual({
      text: 'SELECT * FROM t WHERE id IN (NULL) AND a = $1',
      values: ['x'],
    })
    expect(
      bindSqlParams('SELECT $ids AS a, $ids AS b', { ids: [1, 2] }, 'question'),
    ).toEqual({ text: 'SELECT ?, ? AS a, ?, ? AS b', values: [1, 2, 1, 2] })
    expect(
      bindSqlParams('SELECT $ids AS a, $ids AS b', { ids: [1, 2] }, 'dollar'),
    ).toEqual({ text: 'SELECT $1, $2 AS a, $1, $2 AS b', values: [1, 2] })
  })

  it('SQX-20 data AAAA-MM-DD vai como texto de data', () => {
    expect(
      bindSqlParams(
        'SELECT * FROM t WHERE d >= $inicio AND d IN ($dias)',
        {
          inicio: { kind: 'date', value: '2024-01-31' },
          dias: [
            { kind: 'date', value: '2024-02-01' },
            { kind: 'date', value: '2024-02-02' },
          ],
        },
        'dollar',
      ),
    ).toEqual({
      text: 'SELECT * FROM t WHERE d >= $1 AND d IN ($2, $3)',
      values: ['2024-01-31', '2024-02-01', '2024-02-02'],
    })
  })

  it('SQX-28 filtro vazio com IS NULL OR IN vira condição verdadeira', () => {
    const sql = 'SELECT * FROM t WHERE ($ids IS NULL OR id IN ($ids))'
    for (const params of [{ ids: null }, {}]) {
      expect(bindSqlParams(sql, params, 'dollar')).toEqual({
        text: 'SELECT * FROM t WHERE ((1 = 1) OR id IN ($1))',
        values: [null],
      })
    }
    expect(bindSqlParams(sql, { ids: [4, 5] }, 'question')).toEqual({
      text: 'SELECT * FROM t WHERE ((1 = 0) OR id IN (?, ?))',
      values: [4, 5],
    })
  })
})
