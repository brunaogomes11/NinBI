import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { attachPoolErrorLogger } from '../../src/database/pool-error-logger'

describe('pool de produção', () => {
  it('registra o erro de conexão ociosa em vez de derrubar o processo', () => {
    const pool = new EventEmitter()
    const logger = { error: vi.fn() }
    attachPoolErrorLogger(pool as never, logger)

    expect(() =>
      pool.emit(
        'error',
        new Error('terminating connection due to administrator command'),
      ),
    ).not.toThrow()
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('terminating connection'),
    )
  })
})
