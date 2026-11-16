import { HumanMessage } from '@langchain/core/messages'
import { afterEach, describe, expect, it } from 'vitest'
import { llmSettings } from '../../src/database/schema'
import { FakeChatModelFactory } from '../fakes/fake-chat-model.factory'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

async function setup() {
  const chatModels = new FakeChatModelFactory()
  const test = await createTestApp({ chatModels })
  close = test.close
  const admin = await signInAs(test.app, test.db, 'ADMIN', 'admin@x.com')
  return { ...test, admin, chatModels }
}

describe('teste do provedor de LLM', () => {
  it('LLM-09 testar envia um pedido mínimo sem schema e responde ok', async () => {
    const t = await setup()
    await t.admin.agent
      .put('/api/llm-config')
      .send({
        provider: 'OPENAI',
        model: 'gpt-guardado',
        apiKey: 'sk-guardada-9999',
      })
      .expect(200)
    const before = await t.db.select().from(llmSettings)
    t.chatModels.script('ok')

    const res = await t.admin.agent
      .post('/api/llm-config/test')
      .send({ provider: 'OPENAI', model: 'gpt-novo', apiKey: '' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(t.chatModels.created).toEqual([
      {
        provider: 'OPENAI',
        model: 'gpt-novo',
        baseUrl: null,
        apiKey: 'sk-guardada-9999',
      },
    ])
    expect(t.chatModels.calls).toHaveLength(1)
    const sent = t.chatModels.calls[0] ?? []
    expect(sent).toHaveLength(1)
    expect(sent[0]).toBeInstanceOf(HumanMessage)
    expect(sent[0]?.content).toBe('Responda apenas: ok')
    expect(String(sent[0]?.content)).not.toContain('Labels')
    expect(await t.db.select().from(llmSettings)).toEqual(before)
  })

  it('LLM-10 teste com falha responde 422 com a mensagem do provedor', async () => {
    const t = await setup()
    t.chatModels.script(
      Object.assign(new Error('Incorrect API key provided'), { status: 401 }),
    )

    const res = await t.admin.agent
      .post('/api/llm-config/test')
      .send({ provider: 'OPENAI', model: 'gpt-4o', apiKey: 'sk-errada-0000' })

    expect(res.status).toBe(422)
    expect(res.body.code).toBe('LLM_PROVIDER_ERROR')
    expect(res.body.message).toBe('Incorrect API key provided')
    expect(await t.db.select().from(llmSettings)).toEqual([])
  })

  it('LLM-09 testar sem chave digitada não reaproveita a chave guardada para outro provedor ou URL base', async () => {
    const t = await setup()
    await t.admin.agent
      .put('/api/llm-config')
      .send({
        provider: 'OPENAI',
        model: 'gpt-guardado',
        apiKey: 'sk-guardada-9999',
      })
      .expect(200)
    t.chatModels.script('ok', 'ok')

    for (const other of [
      { provider: 'ANTHROPIC', model: 'claude-novo', apiKey: '' },
      {
        provider: 'OPENAI',
        model: 'gpt-guardado',
        apiKey: '',
        baseUrl: 'https://proprio.exemplo/v1',
      },
    ]) {
      const res = await t.admin.agent.post('/api/llm-config/test').send(other)
      expect(res.status).toBe(400)
      expect(res.body.fieldErrors.apiKey).toBeDefined()
    }
    expect(t.chatModels.created).toEqual([])

    const typed = await t.admin.agent.post('/api/llm-config/test').send({
      provider: 'ANTHROPIC',
      model: 'claude-novo',
      apiKey: 'sk-digitada-1111',
    })
    expect(typed.status).toBe(200)
  })

  it('LLM-10 a chave em uso nunca volta na mensagem do provedor', async () => {
    const t = await setup()
    t.chatModels.script(
      Object.assign(new Error('Incorrect API key provided: sk-vaza-4242.'), {
        status: 401,
      }),
    )

    const res = await t.admin.agent
      .post('/api/llm-config/test')
      .send({ provider: 'OPENAI', model: 'gpt-4o', apiKey: 'sk-vaza-4242' })

    expect(res.status).toBe(422)
    expect(res.body.message).toBe('Incorrect API key provided: ***.')
    expect(JSON.stringify(res.body)).not.toContain('sk-vaza-4242')
  })
})
