import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { BaseMessage } from '@langchain/core/messages'
import type {
  ChatModelFactory,
  LlmSnapshot,
} from '../../src/llm/chat-model.factory'
import {
  createScriptState,
  ScriptedChatModel,
  type ScriptedItem,
} from './scripted-chat-model'

/**
 * ChatModelFactory de teste: nenhuma chamada sai da máquina. Todos os modelos criados
 * consomem o mesmo roteiro e guardam as mensagens no mesmo `calls`.
 */
export class FakeChatModelFactory implements ChatModelFactory {
  private readonly state = createScriptState()
  /** Cada configuração recebida em `create`, na ordem. */
  readonly created: LlmSnapshot[] = []
  /** O último modelo criado. */
  model: ScriptedChatModel | null = null

  /** Acrescenta itens ao roteiro: texto devolve, `Error` lança, `'hang'` espera. */
  script(...items: ScriptedItem[]): void {
    this.state.items.push(...items)
  }

  /** Mensagens de todas as chamadas feitas a modelos deste factory. */
  get calls(): BaseMessage[][] {
    return this.state.calls
  }

  release(): void {
    for (const resolve of [...this.state.waiters]) resolve()
  }

  create(snapshot: LlmSnapshot): BaseChatModel {
    this.created.push(snapshot)
    this.model = new ScriptedChatModel(this.state)
    return this.model
  }
}
