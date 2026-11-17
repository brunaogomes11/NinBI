import { SourceTimeoutError } from '../../src/sources/source'

/** A configuração de `SqlConnectionConfig` do design (a T16 cria o tipo em `sql.gateway.ts`). */
export interface FakeSqlConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
}

export interface FakeSqlResult {
  keys: string[]
  rows: unknown[][]
}

/** Linhas como objetos (as chaves da primeira linha viram as colunas) ou o resultado pronto. */
export type FakeSqlRows = Record<string, unknown>[] | FakeSqlResult
type Programmed<T> = T | Error | 'hang'

interface ReadRule {
  match: string | RegExp
  answer: Programmed<FakeSqlRows>
}

export interface FakeSqlCall {
  method: 'verify' | 'read'
  cfg: FakeSqlConfig
  sql?: string
  values?: unknown[]
  opts?: { timeoutMs: number; maxRows?: number }
}

function toResult(rows: FakeSqlRows): FakeSqlResult {
  if (!Array.isArray(rows)) return rows
  const keys = Object.keys(rows[0] ?? {})
  return { keys, rows: rows.map((row) => keys.map((key) => row[key])) }
}

/**
 * SqlGateway de teste com respostas roteirizadas pelo texto da consulta. A
 * regra programada por último vence; o texto casa por `includes` ou pela
 * expressão. `'hang'` espera até `release()`, ou até o prazo e o `signal` da
 * própria chamada.
 */
// SPEC_DEVIATION: a T13 tocou este arquivo (fora do seu `Where`) para que o
// prazo estourado rejeite com `SourceTimeoutError`, o erro de prazo das fontes.
export class FakeSqlGateway {
  readonly calls: FakeSqlCall[] = []
  private verifyAnswer: Programmed<undefined> = undefined
  private readonly rules: ReadRule[] = []
  private readonly hanging = new Set<() => void>()

  whenVerify(answer: 'ok' | Error | 'hang'): void {
    this.verifyAnswer = answer === 'ok' ? undefined : answer
  }

  whenRead(match: string | RegExp, answer: Programmed<FakeSqlRows>): void {
    this.rules.push({ match, answer })
  }

  release(): void {
    for (const resume of this.hanging) resume()
    this.hanging.clear()
  }

  /** As consultas lidas, na ordem. */
  get reads(): string[] {
    return this.calls.flatMap((call) =>
      call.method === 'read' ? [call.sql as string] : [],
    )
  }

  async verify(cfg: FakeSqlConfig, opts: { timeoutMs: number }): Promise<void> {
    this.calls.push({ method: 'verify', cfg })
    await this.answer(this.verifyAnswer, undefined, opts.timeoutMs, undefined)
  }

  async read(
    cfg: FakeSqlConfig,
    sql: string,
    values: unknown[],
    opts: { timeoutMs: number; maxRows?: number; signal?: AbortSignal },
  ): Promise<FakeSqlResult> {
    this.calls.push({
      method: 'read',
      cfg,
      sql,
      values,
      opts: { timeoutMs: opts.timeoutMs, maxRows: opts.maxRows },
    })
    const rule = [...this.rules]
      .reverse()
      .find(({ match }) =>
        typeof match === 'string' ? sql.includes(match) : match.test(sql),
      )
    if (!rule) {
      throw new Error(`FakeSqlGateway: sem resposta programada para: ${sql}`)
    }
    const rows = await this.answer(
      rule.answer,
      { keys: [], rows: [] },
      opts.timeoutMs,
      opts.signal,
    )
    const result = toResult(rows)
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
    if (answer === 'hang') {
      await new Promise<void>((resolve, reject) => {
        const timeout = () => reject(new SourceTimeoutError())
        const timer = setTimeout(timeout, timeoutMs)
        if (signal?.aborted) timeout()
        signal?.addEventListener('abort', timeout, { once: true })
        this.hanging.add(() => {
          clearTimeout(timer)
          signal?.removeEventListener('abort', timeout)
          resolve()
        })
      })
      return afterRelease
    }
    if (answer instanceof Error) throw answer
    return answer
  }
}
