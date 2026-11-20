import { AIMessage, type BaseMessage } from '@langchain/core/messages'
import { Inject, Injectable } from '@nestjs/common'
import {
  AI_MAX_ATTEMPTS,
  type AiProviderErrorCode,
  type AiWidgetEvent,
  type AiWidgetRequest,
  can,
  type FilterPromptInfo,
  MESSAGES,
  type QueryResultDto,
  type Role,
  type SchemaDto,
  type WidgetVisualization,
} from '@ninbi/contracts'
import { eq } from 'drizzle-orm'
import { AppError } from '../common/app-error'
import { type AppDatabase, DB } from '../database/database.module'
import { connections } from '../database/schema'
import type { LlmSnapshot } from '../llm/chat-model.factory'
import {
  LlmCancelledError,
  LlmClient,
  LlmProviderError,
} from '../llm/llm-client'
import { LlmSettingsService } from '../llm/llm-settings.service'
import { QueryService } from '../queries/query.service'
import { SchemaQueryService } from '../schema/schema-query.service'
import type { PromptDialect } from '../sources/source'
import { SourceRegistry } from '../sources/source-registry'
import {
  buildWidgetMessages,
  type CurrentWidget,
  correctionMessage,
  type QueryErrorInfo,
} from './widget-prompt'
import { normalizeWidgetReply, parseWidgetReply } from './widget-reply'

export type AiWidgetBody = AiWidgetRequest

export interface PreparedGeneration {
  userId: string
  /** Cópia da configuração no início: a geração inteira usa esta (LLM-15). */
  snapshot: LlmSnapshot
  connectionId: string
  schema: SchemaDto
  /** Idioma da consulta que o modelo escreve, o da fonte da conexão (SAI-01). */
  dialect: PromptDialect
  body: AiWidgetBody
}

export interface GenerateInput {
  userId: string
  snapshot: LlmSnapshot
  schema: SchemaDto
  /** Sem ele, Cypher: o assistente (`ia-dashboard`) só conhece o Neo4j. */
  dialect?: PromptDialect
  connectionId: string
  widget: CurrentWidget
  /** Só para o log da consulta. */
  widgetId?: string
  prompt: string
  filters: FilterPromptInfo[]
  purpose: 'widget' | 'assistant'
  signal: AbortSignal
  onAttempt?: (attempt: number) => void
}

export type WidgetGenerationOutcome =
  | {
      kind: 'done'
      attempts: number
      cypher: string
      visualization: WidgetVisualization
      mapping: Record<string, unknown> | null
      title: string
      result: QueryResultDto
    }
  | { kind: 'failed'; attempts: number; cypher: string | null; message: string }
  | { kind: 'stopped'; message: string }
  | { kind: 'provider_error'; code: AiProviderErrorCode; message: string }

/** Gera o widget com o LLM e corrige o Cypher até 3 vezes (AIQ-06 a AIQ-13, FIX-01 a FIX-10). */
@Injectable()
export class AiWidgetService {
  constructor(
    @Inject(LlmSettingsService) private readonly settings: LlmSettingsService,
    @Inject(LlmClient) private readonly llm: LlmClient,
    @Inject(SchemaQueryService) private readonly schemas: SchemaQueryService,
    @Inject(QueryService) private readonly queries: QueryService,
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(SourceRegistry) private readonly sources: SourceRegistry,
  ) {}

  /** Tudo que pode falhar antes de o primeiro byte da resposta sair (AIQ-16, AIQ-17). */
  async prepare(input: {
    userId: string
    role: Role
    /** Conexão do dashboard; vale quando o corpo não traz `connectionId` (AD-134). */
    dashboardConnectionId: string | null
    body: AiWidgetBody
  }): Promise<PreparedGeneration> {
    const snapshot = await this.settings.snapshot()
    if (!snapshot) {
      throw new AppError(409, 'LLM_NOT_CONFIGURED', MESSAGES.llmNotConfigured)
    }
    // Em edição, a conexão é a do rascunho (AD-134): quem a escolhe precisa poder lê-la.
    if (
      input.body.connectionId !== undefined &&
      !can(input.role, 'connections.read')
    ) {
      throw new AppError(403, 'FORBIDDEN', MESSAGES.forbiddenRoute)
    }
    const connectionId = input.body.connectionId ?? input.dashboardConnectionId
    if (!connectionId)
      throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.connectionRequired)
    const schema = await this.schemas.get(connectionId)
    // "Lido" é ter documento guardado, em qualquer estado (AD-085).
    if (schema.readAt === null) {
      throw new AppError(409, 'SCHEMA_NOT_READ', MESSAGES.aiSchemaNotRead)
    }
    return {
      userId: input.userId,
      snapshot,
      connectionId,
      schema,
      dialect: await this.dialectOf(connectionId),
      body: input.body,
    }
  }

  /** O dialeto da fonte do tipo da conexão (SAI-01, SAI-03). */
  private async dialectOf(connectionId: string): Promise<PromptDialect> {
    const [connection] = await this.db
      .select({ type: connections.type })
      .from(connections)
      .where(eq(connections.id, connectionId))
    return this.sources.for(connection?.type ?? 'NEO4J').dialect
  }

  /**
   * O laço de até 4 chamadas, sem HTTP: valida, executa e corrige o Cypher (AD-084). Cancelar lança
   * `LlmCancelledError`; o chamador decide o que fazer.
   */
  async generate(input: GenerateInput): Promise<WidgetGenerationOutcome> {
    const { snapshot, schema, connectionId, userId, signal } = input
    const dialect = input.dialect ?? 'Cypher'
    const messages: BaseMessage[] = buildWidgetMessages({
      schema,
      dialect,
      widget: input.widget,
      prompt: input.prompt,
      filters: input.filters,
    })
    let lastCypher: string | null = null
    let lastMessage: string = MESSAGES.aiNoCypher

    for (let attempt = 1; attempt <= AI_MAX_ATTEMPTS; attempt++) {
      if (signal.aborted) throw new LlmCancelledError()
      input.onAttempt?.(attempt)

      let text: string
      try {
        text = await this.llm.call(snapshot, messages, {
          userId,
          purpose: input.purpose,
          attempt,
          signal,
        })
      } catch (error) {
        if (error instanceof LlmProviderError) {
          return {
            kind: 'provider_error',
            code: error.code,
            message: error.message,
          }
        }
        throw error
      }

      let failure: QueryErrorInfo
      const parsed = parseWidgetReply(text)
      if (!parsed.ok) {
        failure = { code: 'AI_NO_CYPHER', message: MESSAGES.aiNoCypher }
      } else {
        const reply = normalizeWidgetReply(parsed.reply, input.widget)
        lastCypher = reply.cypher
        try {
          const result = await this.queries.run({
            userId,
            connectionId,
            cypher: reply.cypher,
            widgetId: input.widgetId,
            signal,
          })
          return {
            kind: 'done',
            attempts: attempt,
            cypher: reply.cypher,
            visualization: reply.visualization,
            mapping: reply.mapping,
            title: reply.title,
            result,
          }
        } catch (error) {
          if (signal.aborted) throw new LlmCancelledError()
          if (!(error instanceof AppError)) throw error
          // Banco fora do ar não se corrige com outra consulta (FIX, SQX-14).
          if (
            error.code === 'NEO4J_UNAVAILABLE' ||
            error.code === 'SOURCE_UNAVAILABLE'
          ) {
            return { kind: 'stopped', message: error.message }
          }
          failure = {
            code: error.code,
            message: error.message,
            dbCode: error.dbCode,
          }
        }
      }
      lastMessage = failure.message
      messages.push(new AIMessage(text), correctionMessage(failure, dialect))
    }

    return {
      kind: 'failed',
      attempts: AI_MAX_ATTEMPTS,
      cypher: lastCypher,
      message: lastMessage,
    }
  }

  async run(
    prepared: PreparedGeneration,
    emit: (event: AiWidgetEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const { body, snapshot, schema, dialect, connectionId, userId } = prepared
    let outcome: WidgetGenerationOutcome
    try {
      outcome = await this.generate({
        userId,
        snapshot,
        schema,
        dialect,
        connectionId,
        widget: body.widget,
        widgetId: body.widgetId,
        prompt: body.prompt,
        filters: body.filters ?? [],
        purpose: 'widget',
        signal,
        onAttempt: (attempt) =>
          emit({ type: 'attempt', attempt, maxAttempts: AI_MAX_ATTEMPTS }),
      })
    } catch (error) {
      if (error instanceof LlmCancelledError) return
      throw error
    }
    switch (outcome.kind) {
      case 'done':
        emit({
          type: 'done',
          attempts: outcome.attempts,
          cypher: outcome.cypher,
          visualization: outcome.visualization,
          mapping: outcome.mapping,
          title: outcome.title,
          result: outcome.result,
        })
        return
      case 'failed':
        emit({
          type: 'failed',
          attempts: outcome.attempts,
          cypher: outcome.cypher,
          message: outcome.message,
        })
        return
      case 'stopped':
        emit({ type: 'stopped', message: outcome.message })
        return
      case 'provider_error':
        emit({
          type: 'provider_error',
          code: outcome.code,
          message: outcome.message,
        })
    }
  }
}
