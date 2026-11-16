import { ChatAnthropic } from '@langchain/anthropic'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatOllama } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'
import { Injectable } from '@nestjs/common'
import type { LlmProvider } from '@ninbi/contracts'

/** Configuração do provedor lida uma vez; quem gera guarda esta cópia até o fim (LLM-15). */
export interface LlmSnapshot {
  provider: LlmProvider
  model: string
  baseUrl: string | null
  apiKey: string | null
}

export interface ChatModelFactory {
  create(snapshot: LlmSnapshot): BaseChatModel
}

export const CHAT_MODEL_FACTORY = Symbol('CHAT_MODEL_FACTORY')

const NO_KEY_PLACEHOLDER = 'sem-chave'

/** `maxRetries: 0`: o provedor que falha para a geração, sem nova tentativa automática. */
@Injectable()
export class LangChainChatModelFactory implements ChatModelFactory {
  create(s: LlmSnapshot): BaseChatModel {
    const common = { model: s.model, temperature: 0, maxRetries: 0 }
    switch (s.provider) {
      case 'OPENAI':
        return new ChatOpenAI({ ...common, apiKey: s.apiKey ?? undefined })
      case 'ANTHROPIC':
        return new ChatAnthropic({ ...common, apiKey: s.apiKey ?? undefined })
      case 'GOOGLE':
        return new ChatGoogleGenerativeAI({
          ...common,
          apiKey: s.apiKey ?? undefined,
        })
      case 'OLLAMA':
        return new ChatOllama({ ...common, baseUrl: s.baseUrl ?? undefined })
      case 'OPENAI_COMPATIBLE':
        return new ChatOpenAI({
          ...common,
          apiKey: s.apiKey ?? NO_KEY_PLACEHOLDER,
          configuration: { baseURL: s.baseUrl ?? undefined },
        })
    }
  }
}
