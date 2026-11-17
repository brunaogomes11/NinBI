import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { ConnectionType } from '@ninbi/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Source } from '../../src/sources/source'
import { SOURCES, SourceRegistry } from '../../src/sources/source-registry'

function fakeSource(type: ConnectionType): Source {
  return {
    type,
    language: type === 'NEO4J' ? 'CYPHER' : 'SQL',
    dialect: type === 'NEO4J' ? 'Cypher' : 'PostgreSQL',
    verify: async () => undefined,
    validate: () => ({ ok: true }),
    parameterNames: () => [],
    run: async () => ({ keys: [], rows: [] }),
    readSchema: async () => ({ labels: [], relationshipTypes: [] }),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('registro de fontes', () => {
  it('SRC-22 registro sem fonte para um tipo falha com Driver não encontrado', async () => {
    const logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined)
    const partial = ['NEO4J', 'POSTGRES', 'MYSQL'].map((type) =>
      fakeSource(type as ConnectionType),
    )

    expect(() => new SourceRegistry(partial)).toThrow(
      'Driver não encontrado: SQLSERVER',
    )
    expect(logged).toHaveBeenCalledWith('Driver não encontrado: SQLSERVER')

    // Na inicialização do Nest, a falha derruba a compilação do módulo.
    logged.mockClear()
    const boot = Test.createTestingModule({
      providers: [
        { provide: SOURCES, useValue: [fakeSource('NEO4J')] },
        SourceRegistry,
      ],
    }).compile()
    await expect(boot).rejects.toThrow('Driver não encontrado: POSTGRES')
    expect(logged).toHaveBeenCalledWith('Driver não encontrado: POSTGRES')

    // Com uma fonte por tipo, o registro devolve a fonte do tipo pedido.
    const complete = ['NEO4J', 'POSTGRES', 'MYSQL', 'SQLSERVER'].map((type) =>
      fakeSource(type as ConnectionType),
    )
    const registry = new SourceRegistry(complete)
    expect(registry.for('MYSQL')).toBe(complete[2])
    expect(registry.for('NEO4J')).toBe(complete[0])
  })
})
