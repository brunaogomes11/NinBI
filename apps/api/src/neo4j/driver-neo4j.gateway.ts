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
      const result = await session.executeRead((tx) => tx.run(cypher, params), {
        timeout: opts.timeoutMs,
      })
      const records =
        opts.maxRows === undefined
          ? result.records
          : result.records.slice(0, opts.maxRows)
      return {
        keys: result.records[0]?.keys.map(String) ?? [],
        rows: records.map((record) => record.toObject()),
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
