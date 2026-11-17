import { balancedEnd } from '../ai/widget-reply'

export interface AssistantReply {
  reply: string
  actions: unknown[]
}

function planObject(text: string): Record<string, unknown> | null {
  for (let start = text.indexOf('{'); start >= 0; ) {
    const end = balancedEnd(text, start)
    if (end >= 0) {
      try {
        const parsed: unknown = JSON.parse(text.slice(start, end + 1))
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          ('reply' in parsed || 'actions' in parsed)
        ) {
          return parsed as Record<string, unknown>
        }
      } catch {
        // este trecho não é JSON: tenta o próximo `{`
      }
    }
    start = text.indexOf('{', start + 1)
  }
  return null
}

/** Lê o plano do modelo: objeto JSON com ou sem cercas; sem JSON, o texto é a resposta (CHAT-12). */
export function parseAssistantReply(text: string): AssistantReply {
  const plan = planObject(text)
  if (!plan) return { reply: text.trim(), actions: [] }
  return {
    reply: typeof plan.reply === 'string' ? plan.reply.trim() : '',
    actions: Array.isArray(plan.actions) ? plan.actions : [],
  }
}
