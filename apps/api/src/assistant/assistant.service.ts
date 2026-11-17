import { randomUUID } from 'node:crypto'
import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  type AiProviderErrorCode,
  ASSISTANT_HISTORY_LIMIT,
  type AssistantAction,
  type AssistantDraft,
  type AssistantEvent,
  type AssistantMessageDto,
  type assistantRequestSchema,
  type ConnectionSchemaDto,
  can,
  type DashboardFilter,
  filtersForPrompt,
  MESSAGES,
  type QueryResultDto,
  type Role,
} from '@ninbi/contracts'
import type { z } from 'zod'
import { AiWidgetService, type GenerateInput } from '../ai/ai-widget.service'
import { AppError } from '../common/app-error'
import type { LlmSnapshot } from '../llm/chat-model.factory'
import {
  LlmCancelledError,
  LlmClient,
  LlmProviderError,
} from '../llm/llm-client'
import { LlmSettingsService } from '../llm/llm-settings.service'
import { QueryService } from '../queries/query.service'
import { SchemaQueryService } from '../schema/schema-query.service'
import { AssistantHistoryService } from './assistant-history.service'
import { buildAssistantMessages, serializeDraft } from './assistant-prompt'
import { parseAssistantReply } from './assistant-reply'
import { type PendingAction, resolveActions } from './resolve-actions'

export type AssistantBody = z.output<typeof assistantRequestSchema>

export interface PreparedAssistantRequest {
  userId: string
  dashboardId: string
  /** Cópia da configuração no início: o pedido inteiro usa esta (LLM-15). */
  snapshot: LlmSnapshot
  connectionId: string
  schema: ConnectionSchemaDto
  body: AssistantBody
}

const NOTHING_CHANGED = 'Nenhuma mudança foi feita.'

type LogResult = 'ok' | 'provider_error' | 'cancelled' | 'error'

type WidgetPending = Extract<
  PendingAction,
  { type: 'create_widget' | 'update_widget' }
>

/** Cria widget ou muda o Cypher de um existente: passa pelo laço de geração. */
const needsGeneration = (action: PendingAction): boolean =>
  action.type === 'create_widget' ||
  (action.type === 'update_widget' && action.prompt !== undefined)

/** Atende uma mensagem do chat: plano do LLM, ações resolvidas e um widget gerado por vez (AD-121, AD-122). */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger('Assistant')

  constructor(
    @Inject(LlmSettingsService) private readonly settings: LlmSettingsService,
    @Inject(LlmClient) private readonly llm: LlmClient,
    @Inject(SchemaQueryService) private readonly schemas: SchemaQueryService,
    @Inject(QueryService) private readonly queries: QueryService,
    @Inject(AiWidgetService) private readonly widgets: AiWidgetService,
    @Inject(AssistantHistoryService)
    private readonly history: AssistantHistoryService,
  ) {}

  /** Tudo que pode falhar antes de o primeiro byte da resposta sair (CHAT-27). */
  async prepare(input: {
    userId: string
    role: Role
    dashboardId: string
    /** Conexão salva do dashboard; o rascunho pode trazer outra (AD-134). */
    dashboardConnectionId: string
    body: AssistantBody
  }): Promise<PreparedAssistantRequest> {
    const snapshot = await this.settings.snapshot()
    if (!snapshot) {
      throw new AppError(409, 'LLM_NOT_CONFIGURED', MESSAGES.llmNotConfigured)
    }
    const connectionId = input.body.draft.connectionId
    if (
      connectionId !== input.dashboardConnectionId &&
      !can(input.role, 'connections.read')
    ) {
      throw new AppError(403, 'FORBIDDEN', MESSAGES.forbiddenRoute)
    }
    const schema = await this.schemas.get(connectionId)
    if (schema.readAt === null) {
      throw new AppError(409, 'SCHEMA_NOT_READ', MESSAGES.aiSchemaNotRead)
    }
    return {
      userId: input.userId,
      dashboardId: input.dashboardId,
      snapshot,
      connectionId,
      schema,
      body: input.body,
    }
  }

  async run(
    prepared: PreparedAssistantRequest,
    emit: (event: AssistantEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const started = Date.now()
    let actionCount = 0
    let widgetErrors = 0
    let result: LogResult = 'ok'
    try {
      const outcome = await this.execute(prepared, emit, signal)
      actionCount = outcome.actions
      widgetErrors = outcome.widgetErrors
      result = outcome.result
    } catch (error) {
      if (error instanceof LlmCancelledError || signal.aborted) {
        result = 'cancelled'
      } else {
        result = 'error'
        this.logger.error(
          `pedido interrompido: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
        )
        if (!signal.aborted) {
          emit({ type: 'error', message: MESSAGES.internalError })
        }
      }
    }
    this.logger.log(
      `assistant request user=${prepared.userId} dashboard=${prepared.dashboardId} actions=${actionCount} widgetErrors=${widgetErrors} durationMs=${Date.now() - started} result=${result}`,
    )
  }

  private async execute(
    prepared: PreparedAssistantRequest,
    emit: (event: AssistantEvent) => void,
    signal: AbortSignal,
  ): Promise<{ result: LogResult; actions: number; widgetErrors: number }> {
    const { userId, dashboardId, snapshot, schema, connectionId, body } =
      prepared
    const { draft } = body
    const providerError = (error: {
      code: AiProviderErrorCode
      message: string
    }) => {
      emit({ type: 'provider_error', code: error.code, message: error.message })
      return { result: 'provider_error' as const, actions: 0, widgetErrors: 0 }
    }

    // 1. a mensagem do usuário fica gravada, mesmo que o pedido seja cancelado (HIST-01)
    const userMessage = await this.history.appendUser(
      userId,
      dashboardId,
      body.message,
    )
    emit({ type: 'accepted', userMessage })

    // 2. o plano: schema, rascunho com refs, as mensagens recentes e a nova (CHAT-05)
    const recent = await this.history.recent(
      userId,
      dashboardId,
      ASSISTANT_HISTORY_LIMIT + 1,
    )
    const earlier = recent
      .filter((message) => message.id !== userMessage.id)
      .slice(-ASSISTANT_HISTORY_LIMIT)
    const messages = buildAssistantMessages({
      schema,
      draft,
      history: earlier,
      message: body.message,
    })
    let planText: string
    try {
      planText = await this.llm.call(snapshot, messages, {
        userId,
        purpose: 'assistant',
        attempt: null,
        signal,
      })
    } catch (error) {
      if (error instanceof LlmProviderError) return providerError(error)
      throw error
    }

    // 3. o plano vira ações com refs resolvidas e ids novos
    const parsed = parseAssistantReply(planText)
    const plan = resolveActions(
      draft,
      serializeDraft(draft).refs,
      parsed.actions,
      randomUUID,
    )
    const total = plan.actions.filter(needsGeneration).length
    emit({ type: 'planned', widgetsTotal: total })

    // 4. um widget por vez, cada um pelo laço de ia-cypher (GEN-05)
    const filters = this.filtersAfter(draft, plan.actions)
    const actions: AssistantAction[] = []
    const failedWidgets: string[] = []
    let index = 0
    for (const action of plan.actions) {
      if (action.type === 'update_widget' && !needsGeneration(action)) {
        // 5. sem novo Cypher: o resultado vem do Cypher atual (CHAT-08)
        const run = await this.runCurrent(
          action.currentCypher,
          userId,
          connectionId,
          signal,
        )
        actions.push({
          type: 'update_widget',
          widgetId: action.widgetId,
          ...(action.title !== undefined && { title: action.title }),
          ...(action.visualization !== undefined && {
            visualization: action.visualization,
          }),
          ...(action.mapping !== undefined && { mapping: action.mapping }),
          result: run.result,
          error: run.error,
        })
        continue
      }
      if (action.type === 'create_widget' || action.type === 'update_widget') {
        index += 1
        const current = index
        const generated = await this.generateWidget(action, {
          draft,
          userId,
          snapshot,
          schema,
          connectionId,
          filters,
          signal,
          onAttempt: (attempt) =>
            emit({ type: 'widget', index: current, total, attempt }),
        })
        if (generated.kind === 'provider_error') {
          return providerError(generated)
        }
        if (generated.error !== null) {
          failedWidgets.push(generated.title)
        }
        actions.push(generated.action)
        continue
      }
      actions.push(action)
    }

    // 6. resposta gravada e entregue; cancelar antes disso não deixa nada
    if (signal.aborted) throw new LlmCancelledError()
    const details = {
      changes: plan.changes,
      notApplied: plan.notApplied,
      createdWidgets: actions.filter((a) => a.type === 'create_widget').length,
      failedWidgets,
      discardedWidgets: plan.discardedWidgets,
    }
    const text =
      parsed.reply !== ''
        ? parsed.reply
        : plan.changes.length > 0
          ? plan.changes.join('\n')
          : NOTHING_CHANGED
    const reply: AssistantMessageDto = await this.history.appendAssistant(
      userId,
      dashboardId,
      text,
      details,
    )
    emit({ type: 'done', reply, actions })
    return {
      result: 'ok',
      actions: actions.length,
      widgetErrors: failedWidgets.length,
    }
  }

  /** Filtros do rascunho depois das ações do plano, para os widgets novos já poderem usá-los. */
  private filtersAfter(draft: AssistantDraft, actions: PendingAction[]) {
    const filters: Pick<
      DashboardFilter,
      'id' | 'label' | 'parameter' | 'type'
    >[] = draft.filters.map(({ id, label, parameter, type }) => ({
      id,
      label,
      parameter,
      type,
    }))
    for (const action of actions) {
      if (action.type === 'create_filter') {
        filters.push(action.filter)
      } else if (action.type === 'update_filter') {
        const at = filters.findIndex((f) => f.id === action.filter.id)
        const found = filters[at]
        if (found) {
          filters[at] = {
            ...found,
            ...(action.filter.label !== undefined && {
              label: action.filter.label,
            }),
            ...(action.filter.parameter !== undefined && {
              parameter: action.filter.parameter,
            }),
            ...(action.filter.type !== undefined && {
              type: action.filter.type,
            }),
          }
        }
      } else if (action.type === 'remove_filter') {
        const at = filters.findIndex((f) => f.id === action.filterId)
        if (at >= 0) filters.splice(at, 1)
      }
    }
    return filtersForPrompt(filters)
  }

  private async generateWidget(
    action: WidgetPending,
    ctx: {
      draft: AssistantDraft
      userId: string
      snapshot: LlmSnapshot
      schema: ConnectionSchemaDto
      connectionId: string
      filters: GenerateInput['filters']
      signal: AbortSignal
      onAttempt: (attempt: number) => void
    },
  ): Promise<
    | { kind: 'provider_error'; code: AiProviderErrorCode; message: string }
    | {
        kind: 'ready'
        title: string
        error: string | null
        action: AssistantAction
      }
  > {
    const existing =
      action.type === 'update_widget'
        ? ctx.draft.tabs
            .flatMap((tab) => tab.widgets)
            .find((widget) => widget.id === action.widgetId)
        : undefined
    const requested = action.title ?? existing?.title ?? ''
    const outcome = await this.widgets.generate({
      userId: ctx.userId,
      snapshot: ctx.snapshot,
      schema: ctx.schema,
      connectionId: ctx.connectionId,
      widgetId: action.widgetId,
      widget: {
        title: requested,
        cypher: existing?.cypher ?? null,
        visualization: existing?.visualization ?? 'TABLE',
        config: existing?.mapping ? { mapping: existing.mapping } : {},
      },
      prompt: (action as { prompt?: string }).prompt ?? '',
      filters: ctx.filters,
      purpose: 'assistant',
      signal: ctx.signal,
      onAttempt: ctx.onAttempt,
    })
    if (outcome.kind === 'provider_error') {
      return outcome
    }
    const done = outcome.kind === 'done'
    const cypher =
      outcome.kind === 'done' || outcome.kind === 'failed'
        ? outcome.cypher
        : null
    const title = done ? outcome.title : requested
    const visualization = done ? outcome.visualization : 'TABLE'
    const mapping = done ? outcome.mapping : null
    const result = done ? outcome.result : null
    const error = done ? null : outcome.message
    if (action.type === 'create_widget') {
      return {
        kind: 'ready',
        title: action.title,
        error,
        action: {
          type: 'create_widget',
          tabId: action.tabId,
          widgetId: action.widgetId,
          title,
          cypher,
          visualization,
          mapping,
          layout: action.layout,
          result,
          error,
        },
      }
    }
    return {
      kind: 'ready',
      title: requested,
      error,
      action: {
        type: 'update_widget',
        widgetId: action.widgetId,
        title,
        ...(cypher !== null && { cypher }),
        visualization,
        mapping,
        result,
        error,
      },
    }
  }

  private async runCurrent(
    cypher: string | null,
    userId: string,
    connectionId: string,
    signal: AbortSignal,
  ): Promise<{ result: QueryResultDto | null; error: string | null }> {
    if (cypher === null) return { result: null, error: null }
    try {
      const result = await this.queries.run({
        userId,
        connectionId,
        cypher,
        signal,
      })
      return { result, error: null }
    } catch (error) {
      if (signal.aborted) throw new LlmCancelledError()
      if (error instanceof AppError) {
        return { result: null, error: error.message }
      }
      throw error
    }
  }
}
