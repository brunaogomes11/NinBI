import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { HumanMessage } from '@langchain/core/messages'
import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LlmSnapshot } from '../../src/llm/chat-model.factory'
import {
  LLM_CALL_TIMEOUT_MS,
  LlmCancelledError,
  LlmClient,
  LlmProviderError,
} from '../../src/llm/llm-client'
import { FakeChatModelFactory } from '../fakes/fake-chat-model.factory'
import { createTestApp } from '../harness'

const snapshot: LlmSnapshot = {
  provider: 'OPENAI',
  model: 'gpt-teste',
  baseUrl: null,
  apiKey: 'sk-teste-1234',
}

const ctx = { userId: 'user-1', purpose: 'widget' as const, attempt: 1 }
const messages = () => [new HumanMessage('texto-do-schema-secreto')]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LlmClient', () => {
  it('AIQ-23 chamada sem resposta em 60 s vira tempo esgotado', async () => {
    const factory = new FakeChatModelFactory()
    factory.script('hang')
    const client = new LlmClient(factory, 50)
    const error = await client.call(snapshot, messages(), ctx).catch((e) => e)
    expect(error).toBeInstanceOf(LlmProviderError)
    expect(error.code).toBe('AI_PROVIDER_TIMEOUT')
    expect(error.message).toBe('O provedor de IA não respondeu em 60 s')

    const test = await createTestApp()
    try {
      expect(test.app.get(LLM_CALL_TIMEOUT_MS)).toBe(60000)
    } finally {
      await test.close()
    }
  })

  it('abortar o signal do usuário dá LlmCancelledError', async () => {
    const factory = new FakeChatModelFactory()
    factory.script('hang')
    const client = new LlmClient(factory, 5000)
    const controller = new AbortController()
    const pending = client
      .call(snapshot, messages(), { ...ctx, signal: controller.signal })
      .catch((e) => e)
    await new Promise((resolve) => setTimeout(resolve, 10))
    controller.abort()
    expect(await pending).toBeInstanceOf(LlmCancelledError)
  })

  it('texto devolvido em partes é concatenado', async () => {
    const parts = {
      invoke: async () => ({
        content: [
          { type: 'text', text: 'um ' },
          { type: 'text', text: 'dois' },
        ],
      }),
    } as unknown as BaseChatModel
    const client = new LlmClient({ create: () => parts }, 1000)
    expect(await client.call(snapshot, messages(), ctx)).toBe('um dois')
  })

  it('AIQ-27 log de cada chamada tem usuário, provedor, modelo, tentativa, duração e resultado sem chave nem schema', async () => {
    const lines: string[] = []
    vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
      lines.push(String(message))
    })
    const factory = new FakeChatModelFactory()
    factory.script(
      'resposta',
      Object.assign(new Error('Incorrect API key sk-teste-1234'), {
        status: 401,
      }),
    )
    const client = new LlmClient(factory, 1000)
    await client.call(snapshot, messages(), ctx)
    await client
      .call(snapshot, messages(), { ...ctx, attempt: 2 })
      .catch(() => undefined)

    const aiLines = lines.filter((line) => line.startsWith('ai call'))
    expect(aiLines).toHaveLength(2)
    expect(aiLines[0]).toMatch(
      /^ai call purpose=widget user=user-1 provider=OPENAI model=gpt-teste attempt=1 durationMs=\d+ result=ok$/,
    )
    expect(aiLines[1]).toMatch(/attempt=2 durationMs=\d+ result=auth$/)
    for (const line of lines) {
      expect(line).not.toContain('sk-teste-1234')
      expect(line).not.toContain('texto-do-schema-secreto')
    }
  })

  it('AIQ-27 a chave em uso é trocada por *** na mensagem do provedor e no log', async () => {
    const lines: string[] = []
    vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
      lines.push(String(message))
    })
    const factory = new FakeChatModelFactory()
    factory.script(
      Object.assign(new Error('boom sk-teste-1234 e de novo sk-teste-1234'), {
        status: 500,
      }),
    )
    const client = new LlmClient(factory, 1000)
    const error = await client.call(snapshot, messages(), ctx).catch((e) => e)

    expect(error).toBeInstanceOf(LlmProviderError)
    expect(error.providerMessage).toBe('boom *** e de novo ***')
    expect(error.message).not.toContain('sk-teste-1234')
    expect(error.message).toContain('***')
    for (const line of lines) expect(line).not.toContain('sk-teste-1234')
  })
})
