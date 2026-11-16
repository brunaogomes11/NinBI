import { describe, expect, it } from 'vitest'
import { extractParameterNames } from './cypher-tokens'

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
})
