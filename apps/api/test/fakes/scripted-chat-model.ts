import {
  type BaseChatModelCallOptions,
  SimpleChatModel,
} from '@langchain/core/language_models/chat_models'
import type { BaseMessage } from '@langchain/core/messages'

export type ScriptedItem = string | Error | 'hang'

/** Estado compartilhado pelos modelos criados pelo mesmo factory de teste. */
export interface ScriptState {
  items: ScriptedItem[]
  calls: BaseMessage[][]
  waiters: Set<() => void>
}

export function createScriptState(items: ScriptedItem[] = []): ScriptState {
  return { items, calls: [], waiters: new Set() }
}

/**
 * Modelo de chat de teste: cada chamada guarda as mensagens em `calls` e consome o próximo
 * item do roteiro. `'hang'` espera até o `signal` abortar (a chamada rejeita) ou até
 * `release()`; liberada, a mesma chamada segue com o item seguinte do roteiro.
 */
export class ScriptedChatModel extends SimpleChatModel {
  readonly state: ScriptState

  constructor(script: ScriptedItem[] | ScriptState = []) {
    super({})
    this.state = Array.isArray(script) ? createScriptState(script) : script
  }

  get calls(): BaseMessage[][] {
    return this.state.calls
  }

  release(): void {
    for (const resolve of [...this.state.waiters]) resolve()
  }

  _llmType(): string {
    return 'scripted'
  }

  async _call(
    messages: BaseMessage[],
    options: BaseChatModelCallOptions,
  ): Promise<string> {
    this.state.calls.push(messages)
    let item = this.state.items.shift()
    if (item === 'hang') {
      await this.waitForRelease(options.signal)
      item = this.state.items.shift()
    }
    if (item === undefined) throw new Error('roteiro esgotado')
    if (item instanceof Error) throw item
    return item
  }

  private waitForRelease(signal: AbortSignal | undefined): Promise<void> {
    return new Promise((resolve, reject) => {
      const done = () => {
        this.state.waiters.delete(release)
        signal?.removeEventListener('abort', onAbort)
      }
      const release = () => {
        done()
        resolve()
      }
      const onAbort = () => {
        done()
        reject(signal?.reason ?? new Error('abortado'))
      }
      if (signal?.aborted) return onAbort()
      this.state.waiters.add(release)
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }
}
