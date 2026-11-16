import { z } from 'zod'
import { MAX_CYPHER_LENGTH, type QueryResultDto } from './dashboards'
import { MESSAGES } from './messages'
import type { WidgetVisualization } from './widget-config'

export const AI_PROMPT_MAX = 4000
export const AI_MAX_ATTEMPTS = 4
const WIDGET_TITLE_MAX = 80

export const aiWidgetRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, MESSAGES.aiPromptRequired)
    .max(AI_PROMPT_MAX, MESSAGES.aiPromptTooLong),
  widgetId: z.uuid(),
  connectionId: z.uuid().optional(),
  widget: z.object({
    title: z.string().max(WIDGET_TITLE_MAX),
    cypher: z.string().max(MAX_CYPHER_LENGTH).nullable(),
    visualization: z.string(),
    config: z.record(z.string(), z.unknown()),
  }),
})

export type AiWidgetRequest = z.input<typeof aiWidgetRequestSchema>

export type AiProviderErrorCode =
  | 'AI_PROVIDER_AUTH'
  | 'AI_PROVIDER_RATE_LIMIT'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_PROVIDER_CONTEXT'
  | 'AI_PROVIDER_FAILED'

export type AiWidgetEvent =
  | { type: 'attempt'; attempt: number; maxAttempts: number }
  | {
      type: 'done'
      attempts: number
      cypher: string
      visualization: WidgetVisualization
      mapping: Record<string, unknown> | null
      title: string
      result: QueryResultDto
    }
  | {
      type: 'failed'
      attempts: number
      cypher: string | null
      message: string
    }
  | { type: 'provider_error'; code: AiProviderErrorCode; message: string }
  | { type: 'stopped'; message: string }
