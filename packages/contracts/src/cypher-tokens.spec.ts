import { describe, expect, it } from 'vitest'
import { extractParameterNames } from './cypher-tokens'

const NL = String.fromCharCode(10)

describe('cypher tokens', () => {
  it('FLT-09 extractParameterNames acha os parâmetros fora de strings e comentários', () => {
    expect(
      extractParameterNames(
        "MATCH (n) WHERE n.c = $categoria AND n.d >= $periodo_inicio RETURN '$falso' // $comentario",
      ),
    ).toEqual(['categoria', 'periodo_inicio'])
    expect(
      extractParameterNames('RETURN $categoria, $categoria, $outro'),
    ).toEqual(['categoria', 'outro'])
    expect(extractParameterNames('MATCH (n) RETURN n.`$crase`')).toEqual([])
  })

  it('SMG-03 extractParameterNames sem linguagem segue o Cypher', () => {
    const cypher = [
      'MATCH (n) WHERE n.a = $a // $c',
      "RETURN '$b', $a, $d",
    ].join(NL)
    expect(extractParameterNames(cypher)).toEqual(['a', 'd'])
    expect(extractParameterNames(cypher, 'CYPHER')).toEqual(['a', 'd'])
    // Em Cypher `$1` ainda é parâmetro e `//` é comentário; em SQL não.
    expect(extractParameterNames('RETURN $1, $x')).toEqual(['1', 'x'])
  })

  it('SQX-16 extractParameterNames em SQL usa o tokenizador de SQL', () => {
    expect(extractParameterNames('SELECT $a, $b', 'SQL')).toEqual(['a', 'b'])
    expect(extractParameterNames('SELECT $a, $b, $a', 'SQL')).toEqual([
      'a',
      'b',
    ])
    expect(
      extractParameterNames(
        ["SELECT '$x', $1, $$ -- $y", ', $z'].join(NL),
        'SQL',
      ),
    ).toEqual(['z'])
  })
})
