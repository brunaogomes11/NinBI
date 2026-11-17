import { describe, expect, it } from 'vitest'
import { parseAssistantReply } from '../../src/assistant/assistant-reply'

describe('resposta do plano do assistente', () => {
  it('CHAT-12 texto sem JSON vira resposta sem ações', () => {
    expect(parseAssistantReply('Este dashboard mostra vendas.')).toEqual({
      reply: 'Este dashboard mostra vendas.',
      actions: [],
    })
  })

  it('JSON em cerca com texto antes e depois é lido', () => {
    const text = [
      'Claro, aqui vai:',
      '```json',
      '{"reply":"Renomeei a aba {Vendas}.","actions":[{"type":"rename_tab","tab":"t1","name":"Vendas"}]}',
      '```',
      'Qualquer coisa me avise.',
    ].join('\n')
    expect(parseAssistantReply(text)).toEqual({
      reply: 'Renomeei a aba {Vendas}.',
      actions: [{ type: 'rename_tab', tab: 't1', name: 'Vendas' }],
    })
  })

  it('actions que não é lista vira lista vazia', () => {
    expect(
      parseAssistantReply('{"reply":"ok","actions":{"type":"x"}}'),
    ).toEqual({ reply: 'ok', actions: [] })
  })

  it('reply ausente vira texto vazio', () => {
    expect(
      parseAssistantReply('{"actions":[{"type":"rename_dashboard"}]}'),
    ).toEqual({ reply: '', actions: [{ type: 'rename_dashboard' }] })
  })
})
