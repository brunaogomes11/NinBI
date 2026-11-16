import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { llmSettings } from '../../src/database/schema'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const KEY = 'sk-teste-abcd1234'

async function setup() {
  const test = await createTestApp()
  close = test.close
  const admin = await signInAs(test.app, test.db, 'ADMIN', 'admin@x.com')
  return { ...test, admin }
}

const openai = (overrides: Record<string, unknown> = {}) => ({
  provider: 'OPENAI',
  model: 'gpt-4o',
  apiKey: KEY,
  ...overrides,
})

async function storedRow(t: Awaited<ReturnType<typeof setup>>) {
  const [row] = await t.db
    .select()
    .from(llmSettings)
    .where(eq(llmSettings.id, 1))
  return row
}

describe('configuração do LLM', () => {
  it('LLM-03 salvar grava a chave criptografada', async () => {
    const t = await setup()
    await t.admin.agent.put('/api/llm-config').send(openai()).expect(200)

    const row = await storedRow(t)
    expect(row?.apiKeyEncrypted).toBeTruthy()
    expect(row?.apiKeyEncrypted).not.toContain(KEY)
    expect(t.app.get(CryptoService).decrypt(row?.apiKeyEncrypted ?? '')).toBe(
      KEY,
    )
    expect(row?.updatedBy).toBe(t.admin.user.id)
  })

  it('LLM-04 nenhuma resposta da API contém a chave', async () => {
    const t = await setup()
    const put = await t.admin.agent.put('/api/llm-config').send(openai())
    expect(put.status).toBe(200)
    const get = await t.admin.agent.get('/api/llm-config')
    expect(get.status).toBe(200)
    for (const res of [put, get]) {
      expect(JSON.stringify(res.body)).not.toContain(KEY)
      expect(res.body).toMatchObject({
        configured: true,
        provider: 'OPENAI',
        model: 'gpt-4o',
        baseUrl: null,
        apiKeyLast4: '1234',
      })
      expect(res.body).not.toHaveProperty('apiKey')
      expect(res.body).not.toHaveProperty('apiKeyEncrypted')
    }
  })

  it('LLM-05 salvar com a chave vazia mantém a chave guardada', async () => {
    const t = await setup()
    await t.admin.agent.put('/api/llm-config').send(openai()).expect(200)
    const before = await storedRow(t)

    const res = await t.admin.agent
      .put('/api/llm-config')
      .send(openai({ model: 'gpt-4.1', apiKey: '' }))
      .expect(200)

    const after = await storedRow(t)
    expect(after?.model).toBe('gpt-4.1')
    expect(after?.apiKeyEncrypted).toBe(before?.apiKeyEncrypted)
    expect(t.app.get(CryptoService).decrypt(after?.apiKeyEncrypted ?? '')).toBe(
      KEY,
    )
    expect(res.body.apiKeyLast4).toBe('1234')
  })

  it('LLM-06 URL base vazia responde 400 no campo baseUrl', async () => {
    const t = await setup()
    for (const provider of ['OLLAMA', 'OPENAI_COMPATIBLE']) {
      for (const baseUrl of [undefined, '', '   ']) {
        const res = await t.admin.agent
          .put('/api/llm-config')
          .send({ provider, model: 'llama3', baseUrl })
        expect(res.status).toBe(400)
        expect(res.body.code).toBe('VALIDATION_ERROR')
        expect(res.body.fieldErrors).toEqual({ baseUrl: 'Informe a URL base' })
      }
    }
    expect(await storedRow(t)).toBeUndefined()
  })

  it('LLM-07 provedor com chave obrigatória sem chave responde 400 no campo apiKey', async () => {
    const t = await setup()
    for (const provider of ['OPENAI', 'ANTHROPIC', 'GOOGLE']) {
      const res = await t.admin.agent
        .put('/api/llm-config')
        .send({ provider, model: 'm' })
      expect(res.status).toBe(400)
      expect(res.body.fieldErrors).toEqual({ apiKey: 'Informe a chave de API' })
    }

    await t.admin.agent
      .put('/api/llm-config')
      .send({ provider: 'OLLAMA', model: 'llama3', baseUrl: 'http://h:11434' })
      .expect(200)

    await t.admin.agent.put('/api/llm-config').send(openai()).expect(200)
    const kept = await t.admin.agent
      .put('/api/llm-config')
      .send({ provider: 'ANTHROPIC', model: 'claude', apiKey: '' })
    expect(kept.status).toBe(200)
  })

  it('LLM-08 modelo vazio responde 400 no campo model', async () => {
    const t = await setup()
    const res = await t.admin.agent
      .put('/api/llm-config')
      .send(openai({ model: '  ' }))
    expect(res.status).toBe(400)
    expect(res.body.fieldErrors).toEqual({ model: 'Informe o modelo' })
  })

  it('LLM-12 remover apaga provedor, modelo, URL base e chave', async () => {
    const t = await setup()
    await t.admin.agent.put('/api/llm-config').send(openai()).expect(200)

    await t.admin.agent.delete('/api/llm-config').expect(204)

    expect(await t.db.select().from(llmSettings)).toEqual([])
    const res = await t.admin.agent.get('/api/llm-config').expect(200)
    expect(res.body).toEqual({ configured: false })
  })

  it('LLM-13 Editor e Visualizador recebem 403 na configuração do LLM', async () => {
    const t = await setup()
    for (const role of ['EDITOR', 'VIEWER'] as const) {
      const { agent } = await signInAs(t.app, t.db, role)
      await agent.get('/api/llm-config').expect(403)
      await agent.put('/api/llm-config').send(openai()).expect(403)
      await agent.delete('/api/llm-config').expect(403)
      await agent.post('/api/llm-config/test').send(openai()).expect(403)
    }
  })

  it('AIQ-16 sem provedor o status vem desligado', async () => {
    const t = await setup()
    const editor = await signInAs(t.app, t.db, 'EDITOR')
    const viewer = await signInAs(t.app, t.db, 'VIEWER')

    const off = await editor.agent.get('/api/ai/status').expect(200)
    expect(off.body).toEqual({ configured: false })

    await t.admin.agent.put('/api/llm-config').send(openai()).expect(200)

    const on = await editor.agent.get('/api/ai/status').expect(200)
    expect(on.body).toEqual({ configured: true })
    await viewer.agent.get('/api/ai/status').expect(403)
  })
})
