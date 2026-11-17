import { describe, expect, it } from 'vitest'
import {
  Neo4jGatewayError,
  Neo4jTimeoutError,
} from '../../src/neo4j/neo4j.gateway'
import {
  SourceGatewayError,
  SourceTimeoutError,
} from '../../src/sources/source'

describe('contrato da fonte', () => {
  it('SRC-22 erros do Neo4j são SourceTimeoutError e SourceGatewayError', () => {
    const timeout = new Neo4jTimeoutError()
    expect(timeout).toBeInstanceOf(Neo4jTimeoutError)
    expect(timeout).toBeInstanceOf(SourceTimeoutError)
    expect(timeout).toBeInstanceOf(Error)
    expect(timeout.name).toBe('Neo4jTimeoutError')
    expect(timeout.message).toBe('O Neo4j não respondeu no prazo')
    expect(new Neo4jTimeoutError('outra').message).toBe('outra')

    const failure = new Neo4jGatewayError('recusado', 'ServiceUnavailable')
    expect(failure).toBeInstanceOf(Neo4jGatewayError)
    expect(failure).toBeInstanceOf(SourceGatewayError)
    expect(failure).toBeInstanceOf(Error)
    expect(failure.name).toBe('Neo4jGatewayError')
    expect(failure.message).toBe('recusado')
    expect(failure.code).toBe('ServiceUnavailable')
    expect(new Neo4jGatewayError('sem código').code).toBeUndefined()

    // O caminho contrário: os erros genéricos não passam por erros do Neo4j.
    const sourceTimeout = new SourceTimeoutError()
    expect(sourceTimeout).not.toBeInstanceOf(Neo4jTimeoutError)
    expect(sourceTimeout.name).toBe('SourceTimeoutError')
    expect(sourceTimeout.message).toBe('O banco não respondeu no prazo')
    const sourceFailure = new SourceGatewayError('falhou', 'ECONNRESET')
    expect(sourceFailure).not.toBeInstanceOf(Neo4jGatewayError)
    expect(sourceFailure.name).toBe('SourceGatewayError')
    expect(sourceFailure.code).toBe('ECONNRESET')
    // Um erro de prazo não é erro do banco, e vice-versa.
    expect(timeout).not.toBeInstanceOf(SourceGatewayError)
    expect(failure).not.toBeInstanceOf(SourceTimeoutError)
  })
})
