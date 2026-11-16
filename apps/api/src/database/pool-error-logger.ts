import { Logger } from '@nestjs/common'
import type { Pool } from 'pg'

/**
 * O `pg.Pool` emite `error` quando um cliente ocioso perde a conexão (por
 * exemplo, o PostgreSQL reinicia). Sem listener, o Node derruba o processo.
 * O pool descarta o cliente e abre outro quando precisar.
 */
export function attachPoolErrorLogger(
  pool: Pick<Pool, 'on'>,
  logger: Pick<Logger, 'error'> = new Logger('Database'),
): void {
  pool.on('error', (error) => {
    logger.error(`Conexão ociosa do pool falhou: ${error.message}`)
  })
}
