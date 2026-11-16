import {
  type Neo4jConnectionConfig,
  type Neo4jGateway,
  type Neo4jReadResult,
  Neo4jTimeoutError,
} from '../../src/neo4j/neo4j.gateway'

export type FakeRows = Record<string, unknown>[] | Neo4jReadResult
type Programmed<T> = T | Error | 'hang'

interface ReadRule {
  match: string | RegExp
  answer: Programmed<FakeRows>
}

export interface FakeCall {
  method: 'verify' | 'read'
  cfg: Neo4jConnectionConfig
  cypher?: string
  params?: Record<string, unknown>
  opts?: { timeoutMs: number; maxRows?: number }
}

/**
 * Neo4jGateway de teste. `'hang'` deixa a chamada esperando até `release()`, ou até o
 * prazo e o `signal` da própria chamada, que valem como no driver real. `hold()` faz toda
 * chamada esperar `release()` e depois responder como foi programado.
 */
export class FakeNeo4jGateway implements Neo4jGateway {
  readonly calls: FakeCall[] = []
  private verifyAnswer: Programmed<undefined> = undefined
  private readonly rules: ReadRule[] = []
  private gate: Promise<void> | null = null
  private openGate: (() => void) | null = null
  private readonly hanging = new Set<() => void>()

  whenVerify(answer: 'ok' | Error | 'hang'): void {
    this.verifyAnswer = answer === 'ok' ? undefined : answer
  }

  /** A regra programada por último vence; o texto casa por `includes`. */
  whenRead(match: string | RegExp, answer: Programmed<FakeRows>): void {
    this.rules.push({ match, answer })
  }

  /** Daqui em diante cada chamada espera `release()` antes de responder. */
  hold(): void {
    this.gate = new Promise<void>((resolve) => {
      this.openGate = resolve
    })
  }

  release(): void {
    this.openGate?.()
    this.gate = null
    this.openGate = null
    for (const resume of this.hanging) resume()
    this.hanging.clear()
  }

  async verify(
    cfg: Neo4jConnectionConfig,
    opts: { timeoutMs: number },
  ): Promise<void> {
    this.calls.push({ method: 'verify', cfg })
    await this.answer(this.verifyAnswer, undefined, opts.timeoutMs, undefined)
  }

  async read(
    cfg: Neo4jConnectionConfig,
    cypher: string,
    params: Record<string, unknown>,
    opts: { timeoutMs: number; maxRows?: number; signal?: AbortSignal },
  ): Promise<Neo4jReadResult> {
    this.calls.push({
      method: 'read',
      cfg,
      cypher,
      params,
      opts: { timeoutMs: opts.timeoutMs, maxRows: opts.maxRows },
    })
    const rule = [...this.rules]
      .reverse()
      .find(({ match }) =>
        typeof match === 'string' ? cypher.includes(match) : match.test(cypher),
      )
    if (!rule) {
      throw new Error(
        `FakeNeo4jGateway: sem resposta programada para: ${cypher}`,
      )
    }
    const rows = await this.answer(rule.answer, [], opts.timeoutMs, opts.signal)
    const result: Neo4jReadResult = Array.isArray(rows)
      ? { keys: Object.keys(rows[0] ?? {}), rows }
      : rows
    return opts.maxRows === undefined
      ? result
      : { ...result, rows: result.rows.slice(0, opts.maxRows) }
  }

  private async answer<T>(
    answer: Programmed<T>,
    afterRelease: T,
    timeoutMs: number,
    signal: AbortSignal | undefined,
  ): Promise<T> {
    await this.wait(this.gate, timeoutMs, signal)
    if (answer === 'hang') {
      await this.wait(
        new Promise<void>((resolve) => this.hanging.add(resolve)),
        timeoutMs,
        signal,
      )
      return afterRelease
    }
    if (answer instanceof Error) throw answer
    return answer
  }

  private wait(
    promise: Promise<void> | null,
    timeoutMs: number,
    signal: AbortSignal | undefined,
  ): Promise<void> {
    if (!promise) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Neo4jTimeoutError()), timeoutMs)
      const onAbort = () => reject(new Neo4jTimeoutError())
      if (signal?.aborted) onAbort()
      signal?.addEventListener('abort', onAbort, { once: true })
      promise.then(() => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        resolve()
      })
    })
  }
}
