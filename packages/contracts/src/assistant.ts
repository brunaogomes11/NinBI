import { z } from 'zod'
import type { AiProviderErrorCode } from './ai'
import {
  MAX_CYPHER_LENGTH,
  type QueryResultDto,
  type WidgetLayout,
} from './dashboards'
import { type DashboardFilter, FILTER_TYPES } from './filters'
import { MESSAGES } from './messages'
import type { WidgetVisualization } from './widget-config'

export const ASSISTANT_MESSAGE_MAX = 4000
export const ASSISTANT_HISTORY_LIMIT = 20
export const ASSISTANT_MAX_NEW_WIDGETS = 20

export const assistantDescriptionSchema = z
  .string()
  .trim()
  .min(1, MESSAGES.assistantDescriptionRequired)
  .max(ASSISTANT_MESSAGE_MAX, MESSAGES.assistantDescriptionTooLong)

export const assistantMessageSchema = z
  .string()
  .trim()
  .min(1, MESSAGES.assistantDescriptionRequired)
  .max(ASSISTANT_MESSAGE_MAX, MESSAGES.assistantMessageTooLong)

// Só os campos de CHAT-05: z.object descarta o resto (CHAT-06).
const layoutShape = z.object({
  x: z.number().int(),
  y: z.number().int(),
  w: z.number().int(),
  h: z.number().int(),
})

export const assistantDraftSchema = z.object({
  name: z.string().max(80),
  connectionId: z.uuid(),
  tabs: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string().max(40),
        widgets: z
          .array(
            z.object({
              id: z.uuid(),
              title: z.string().max(80),
              cypher: z.string().max(MAX_CYPHER_LENGTH).nullable(),
              visualization: z.string(),
              mapping: z.record(z.string(), z.unknown()).nullable(),
              layout: layoutShape,
            }),
          )
          .max(200),
      }),
    )
    .min(1)
    .max(50),
  filters: z
    .array(
      z.object({
        id: z.uuid(),
        label: z.string().max(40),
        parameter: z.string().max(40),
        type: z.enum(FILTER_TYPES),
      }),
    )
    .max(30),
})

export type AssistantDraft = z.infer<typeof assistantDraftSchema>

export const assistantRequestSchema = z.object({
  message: assistantMessageSchema,
  retryOf: z.uuid().optional(),
  draft: assistantDraftSchema,
})

export type AssistantRequest = z.input<typeof assistantRequestSchema>

export type AssistantRole = 'USER' | 'ASSISTANT'

export interface AssistantReplyDetails {
  changes: string[]
  notApplied: string[]
  createdWidgets: number
  failedWidgets: string[]
  discardedWidgets: number
}

export interface AssistantMessageDto {
  id: string
  role: AssistantRole
  text: string
  details: AssistantReplyDetails | null
  createdAt: string
}

export type WidgetLayoutDto = WidgetLayout

export type AssistantAction =
  | { type: 'create_tab'; tabId: string; name: string }
  | { type: 'rename_tab'; tabId: string; name: string }
  | { type: 'remove_tab'; tabId: string }
  | {
      type: 'create_widget'
      tabId: string
      widgetId: string
      title: string
      cypher: string | null
      visualization: WidgetVisualization
      mapping: Record<string, unknown> | null
      layout: WidgetLayoutDto
      result: QueryResultDto | null
      error: string | null
    }
  | {
      type: 'update_widget'
      widgetId: string
      title?: string
      cypher?: string | null
      visualization?: WidgetVisualization
      mapping?: Record<string, unknown> | null
      result: QueryResultDto | null
      error: string | null
    }
  | { type: 'remove_widget'; widgetId: string }
  | { type: 'set_layout'; widgetId: string; layout: WidgetLayoutDto }
  | { type: 'create_filter'; filter: DashboardFilter }
  | { type: 'update_filter'; filter: DashboardFilter }
  | { type: 'remove_filter'; filterId: string }
  | { type: 'rename_dashboard'; name: string }

export type AssistantEvent =
  | { type: 'accepted'; userMessage: AssistantMessageDto }
  | { type: 'planned'; widgetsTotal: number }
  | { type: 'widget'; index: number; total: number; attempt: number }
  | { type: 'done'; reply: AssistantMessageDto; actions: AssistantAction[] }
  | { type: 'provider_error'; code: AiProviderErrorCode; message: string }
  | { type: 'error'; message: string }
