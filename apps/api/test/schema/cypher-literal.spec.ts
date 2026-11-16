import neo4j from 'neo4j-driver'
import { describe, expect, it } from 'vitest'
import {
  escapeIdentifier,
  toCypherLiteral,
} from '../../src/schema/cypher-literal'

const { types } = neo4j

describe('literal Cypher', () => {
  it('SCH-27 data, ponto, lista e mapa viram literal Cypher', () => {
    expect(
      toCypherLiteral(types.Date.fromStandardDate(new Date(2024, 1, 5))),
    ).toBe("date('2024-02-05')")
    expect(
      toCypherLiteral(new types.DateTime(2024, 2, 5, 10, 30, 0, 0, 3600)),
    ).toBe("datetime('2024-02-05T10:30:00+01:00')")
    expect(
      toCypherLiteral(
        new types.DateTime(
          2024,
          2,
          5,
          10,
          30,
          0,
          0,
          undefined,
          'Europe/Berlin',
        ),
      ),
    ).toBe("datetime('2024-02-05T10:30:00[Europe/Berlin]')")
    expect(
      toCypherLiteral(new types.LocalDateTime(2024, 2, 5, 10, 30, 0, 0)),
    ).toBe("localdatetime('2024-02-05T10:30:00')")
    expect(toCypherLiteral(new types.Time(10, 30, 0, 0, 3600))).toBe(
      "time('10:30:00+01:00')",
    )
    expect(toCypherLiteral(new types.LocalTime(10, 30, 5, 0))).toBe(
      "localtime('10:30:05')",
    )
    expect(toCypherLiteral(new types.Duration(1, 2, 3, 0))).toBe(
      "duration('P1M2DT3S')",
    )
    expect(
      toCypherLiteral(new types.Point(neo4j.int(4326), -46.63, -23.55)),
    ).toBe('point({srid: 4326, x: -46.63, y: -23.55})')
    expect(
      toCypherLiteral(new types.Point(neo4j.int(4979), -46.63, -23.55, 760)),
    ).toBe('point({srid: 4979, x: -46.63, y: -23.55, z: 760})')
    expect(toCypherLiteral([1, 'a'])).toBe("[1, 'a']")
    expect(toCypherLiteral([neo4j.int(1), 'a'])).toBe("[1, 'a']")
    expect(toCypherLiteral({ nome: 'Ana', 'tem espaço': neo4j.int(1) })).toBe(
      "{nome: 'Ana', `tem espaço`: 1}",
    )
    expect(
      toCypherLiteral({
        lista: [{ ponto: [neo4j.int(1), null] }],
        ativo: true,
      }),
    ).toBe('{lista: [{ponto: [1, null]}], ativo: true}')
  })

  it('SCH-27 número decimal e inteiro do Neo4j', () => {
    expect(toCypherLiteral(12.5)).toBe('12.5')
    expect(toCypherLiteral(neo4j.int(12))).toBe('12')
  })

  it('SCH-04 literal não corta texto longo', () => {
    const long = 'x'.repeat(100_000)
    const literal = toCypherLiteral(long)
    expect(literal).toBe(`'${long}'`)
    expect(literal).toHaveLength(100_002)
  })

  it('SCH-04 aspas e barras são escapadas', () => {
    expect(toCypherLiteral("O'Brien")).toBe("'O\\'Brien'")
    expect(toCypherLiteral('a\\b')).toBe("'a\\\\b'")
  })

  it('SCH-04 inteiro acima de 2^53 sai sem perda', () => {
    expect(toCypherLiteral(neo4j.int('9007199254740993'))).toBe(
      '9007199254740993',
    )
  })

  it('SCH-04 nulo e booleano', () => {
    expect(toCypherLiteral(null)).toBe('null')
    expect(toCypherLiteral(false)).toBe('false')
  })

  it('SCH-02 escapeIdentifier dobra a crase interna', () => {
    expect(escapeIdentifier('a`b')).toBe('`a``b`')
    expect(escapeIdentifier('Pedido')).toBe('`Pedido`')
  })
})
