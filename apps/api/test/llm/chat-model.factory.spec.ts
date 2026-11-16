import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatOllama } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'
import { describe, expect, it } from 'vitest'
import {
  LangChainChatModelFactory,
  type LlmSnapshot,
} from '../../src/llm/chat-model.factory'

const factory = new LangChainChatModelFactory()

const snapshot = (overrides: Partial<LlmSnapshot>): LlmSnapshot => ({
  provider: 'OPENAI',
  model: 'modelo-x',
  baseUrl: null,
  apiKey: 'sk-teste-1234',
  ...overrides,
})

// Os campos lidos abaixo são as propriedades públicas das instâncias do LangChain.
function retriesOf(model: unknown): number | undefined {
  return (model as { caller?: { maxRetries?: number } }).caller?.maxRetries
}

describe('ChatModelFactory', () => {
  it('LLM-14 ChatModelFactory cria o modelo de cada provedor no backend', () => {
    const openai = factory.create(snapshot({ provider: 'OPENAI' }))
    expect(openai).toBeInstanceOf(ChatOpenAI)
    expect((openai as ChatOpenAI).model).toBe('modelo-x')
    expect(retriesOf(openai)).toBe(0)

    const anthropic = factory.create(snapshot({ provider: 'ANTHROPIC' }))
    expect(anthropic).toBeInstanceOf(ChatAnthropic)
    expect((anthropic as ChatAnthropic).model).toBe('modelo-x')
    expect(retriesOf(anthropic)).toBe(0)

    const google = factory.create(snapshot({ provider: 'GOOGLE' }))
    expect(google).toBeInstanceOf(ChatGoogleGenerativeAI)
    expect((google as ChatGoogleGenerativeAI).model).toBe('modelo-x')
    expect(retriesOf(google)).toBe(0)

    const ollama = factory.create(
      snapshot({
        provider: 'OLLAMA',
        apiKey: null,
        baseUrl: 'http://ollama.local:11434',
      }),
    )
    expect(ollama).toBeInstanceOf(ChatOllama)
    expect((ollama as ChatOllama).baseUrl).toBe('http://ollama.local:11434')
    expect((ollama as ChatOllama).model).toBe('modelo-x')
    expect(retriesOf(ollama)).toBe(0)

    const compatible = factory.create(
      snapshot({
        provider: 'OPENAI_COMPATIBLE',
        apiKey: null,
        baseUrl: 'http://vllm.local:8000/v1',
      }),
    )
    expect(compatible).toBeInstanceOf(ChatOpenAI)
    expect(
      (compatible as unknown as { clientConfig: { baseURL?: string } })
        .clientConfig.baseURL,
    ).toBe('http://vllm.local:8000/v1')
    expect(retriesOf(compatible)).toBe(0)
  })
})
