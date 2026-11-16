import { HumanMessage } from '@langchain/core/messages'
import { describe, expect, it } from 'vitest'
import { FakeChatModelFactory } from '../fakes/fake-chat-model.factory'
import { ScriptedChatModel } from '../fakes/scripted-chat-model'

describe('ScriptedChatModel', () => {
  it('o roteiro devolve textos na ordem e lança o erro roteirizado', async () => {
    const model = new ScriptedChatModel(['primeiro', new Error('boom')])
    const first = await model.invoke([new HumanMessage('a')])
    expect(first.content).toBe('primeiro')
    await expect(model.invoke([new HumanMessage('b')])).rejects.toThrow('boom')
    await expect(model.invoke([new HumanMessage('c')])).rejects.toThrow(
      'roteiro esgotado',
    )
  })

  it('calls guarda as mensagens de cada chamada', async () => {
    const model = new ScriptedChatModel(['x', 'y'])
    await model.invoke([new HumanMessage('olá')])
    await model.invoke([new HumanMessage('de novo')])
    expect(model.calls).toHaveLength(2)
    expect(model.calls[0]?.[0]?.content).toBe('olá')
    expect(model.calls[1]?.[0]?.content).toBe('de novo')
  })

  it("'hang' termina quando o signal aborta", async () => {
    const model = new ScriptedChatModel(['hang'])
    const controller = new AbortController()
    const pending = model.invoke([new HumanMessage('a')], {
      signal: controller.signal,
    })
    const settled = pending.then(
      () => 'resolveu',
      () => 'rejeitou',
    )
    controller.abort()
    expect(await settled).toBe('rejeitou')
  })

  it("release() libera o 'hang' e a chamada segue com o próximo item", async () => {
    const factory = new FakeChatModelFactory()
    factory.script('hang', 'depois')
    const model = factory.create({
      provider: 'OPENAI',
      model: 'm',
      baseUrl: null,
      apiKey: null,
    })
    const pending = model.invoke([new HumanMessage('a')])
    await new Promise((resolve) => setTimeout(resolve, 10))
    factory.release()
    expect((await pending).content).toBe('depois')
    expect(factory.created).toHaveLength(1)
    expect(factory.model).toBe(model)
    expect(factory.calls).toHaveLength(1)
  })
})
