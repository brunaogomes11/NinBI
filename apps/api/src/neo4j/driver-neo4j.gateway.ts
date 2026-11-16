import { Injectable } from '@nestjs/common'
import neo4j, { type Session } from 'neo4j-driver'
import {
  type Neo4jConnectionConfig,
  type Neo4jGateway,
  Neo4jGatewayError,
  type Neo4jReadResult,
  Neo4jTimeoutError,
} from './neo4j.gateway'

// SPEC_DEVIATION: os prazos do driver ficam acima do prazo da operação (o design os igualava).
// Reason: com prazos iguais o driver podia falhar antes do nosso temporizador e o erro virava
// Neo4jGatewayError em vez de Neo4jTimeoutError; o prazo da operação é o único que decide.
const DRIVER_TIMEOUT_MARGIN_MS = 5_000

function toGatewayError(error: unknown): Neo4jGatewayError {
  const code = (error as { code?: unknown } | null)?.code
  return new Neo4jGatewayError(
    error instanceof Error ? error.message : String(error),
    typeof code === 'string' ? code : undefined,
  )
}

/** Driver real: um driver por operação, sessão só de leitura, fechado no fim. */
@Injectable()
export class DriverNeo4jGateway implements Neo4jGateway {
  async verify(
    cfg: Neo4jConnectionConfig,
    opts: { timeoutMs: number },
  ): Promise<void> {
    await this.run(cfg, opts.timeoutMs, undefined, async (session) => {
      await session.executeRead((tx) => tx.run('RETURN 1'), {
        timeout: opts.timeoutMs,
      })
    })
  }

  read(
    cfg: Neo4jConnectionConfig,
    cypher: string,
    params: Record<string, unknown>,
    opts: { timeoutMs: number; maxRows?: number; signal?: AbortSignal },
  ): Promise<Neo4jReadResult> {
    return this.run(cfg, opts.timeoutMs, opts.signal, async (session) => {
      // Transação explícita de leitura: o resultado é lido em stream e a transação termina
      // em rollback, então parar em `maxRows` descarta o resto no Neo4j (QRY-08).
      const tx = session.beginTransaction({ timeout: opts.timeoutMs })
      try {
        return await new Promise<Neo4jReadResult>((resolve, reject) => {
          let keys: string[] = []
          const rows: Record<string, unknown>[] = []
          let done = false
          tx.run(cypher, params).subscribe({
            onKeys: (names) => {
              keys = names.map(String)
            },
            onNext: (record) => {
              if (done) return
              rows.push(record.toObject())
              if (opts.maxRows !== undefined && rows.length >= opts.maxRows) {
                done = true
                resolve({ keys, rows })
              }
            },
            onCompleted: () => {
              done = true
              resolve({ keys, rows })
            },
            onError: reject,
          })
        })
      } finally {
        await tx.rollback().catch(() => undefined)
      }
    })
  }

  private async run<T>(
    cfg: Neo4jConnectionConfig,
    timeoutMs: number,
    signal: AbortSignal | undefined,
    work: (session: Session) => Promise<T>,
  ): Promise<T> {
    let driver: ReturnType<typeof neo4j.driver>
    try {
      driver = neo4j.driver(
        cfg.uri,
        neo4j.auth.basic(cfg.username, cfg.password),
        {
          connectionTimeout: timeoutMs + DRIVER_TIMEOUT_MARGIN_MS,
          connectionAcquisitionTimeout: timeoutMs + DRIVER_TIMEOUT_MARGIN_MS,
          maxTransactionRetryTime: 0,
        },
      )
    } catch (error) {
      throw toGatewayError(error)
    }
    const session = driver.session({
      database: cfg.database ?? undefined,
      defaultAccessMode: neo4j.session.READ,
    })

    let timer: NodeJS.Timeout | undefined
    let onAbort: (() => void) | undefined
    let timedOut = false
    const deadline = new Promise<never>((_, reject) => {
      const expire = () => {
        timedOut = true
        reject(new Neo4jTimeoutError())
      }
      timer = setTimeout(expire, timeoutMs)
      if (signal?.aborted) expire()
      else if (signal) {
        onAbort = expire
        signal.addEventListener('abort', onAbort, { once: true })
      }
    })
    const working = work(session)
    working.catch(() => undefined)

    try {
      return await Promise.race([working, deadline])
    } catch (error) {
      throw error instanceof Neo4jTimeoutError ? error : toGatewayError(error)
    } finally {
      clearTimeout(timer)
      if (signal && onAbort) signal.removeEventListener('abort', onAbort)
      const closing = session
        .close()
        .then(() => driver.close())
        .catch(() => undefined)
      // Com o servidor mudo o fechamento pode demorar: só espera quando o prazo não estourou.
      if (!timedOut) await closing
    }
  }
}
