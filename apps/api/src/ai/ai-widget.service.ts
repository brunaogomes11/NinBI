import { AIMessage, type BaseMessage } from '@langchain/core/messages'
import { Inject, Injectable } from '@nestjs/common'
import {
  AI_MAX_ATTEMPTS,
  type AiWidgetEvent,
  type AiWidgetRequest,
  type ConnectionSchemaDto,
  can,
  MESSAGES,
  type Role,
} from '@ninbi/contracts'
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
import {
  buildWidgetMessages,
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
  schema: ConnectionSchemaDto
  body: AiWidgetBody
}

/** Gera o widget com o LLM e corrige o Cypher até 3 vezes (AIQ-06 a AIQ-13, FIX-01 a FIX-10). */
@Injectable()
export class AiWidgetService {
  constructor(
    @Inject(LlmSettingsService) private readonly settings: LlmSettingsService,
    @Inject(LlmClient) private readonly llm: LlmClient,
    @Inject(SchemaQueryService) private readonly schemas: SchemaQueryService,
    @Inject(QueryService) private readonly queries: QueryService,
  ) {}

  /** Tudo que pode falhar antes de o primeiro byte da resposta sair (AIQ-16, AIQ-17). */
  async prepare(input: {
    userId: string
    role: Role
    /** Conexão do dashboard; vale quando o corpo não traz `connectionId` (AD-134). */
    dashboardConnectionId: string
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
      body: input.body,
    }
  }

  async run(
    prepared: PreparedGeneration,
    emit: (event: AiWidgetEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const { body, snapshot, schema, connectionId, userId } = prepared
    const messages: BaseMessage[] = buildWidgetMessages({
      schema,
      widget: body.widget,
      prompt: body.prompt,
    })
    let lastCypher: string | null = null
    let lastMessage: string = MESSAGES.aiNoCypher

    for (let attempt = 1; attempt <= AI_MAX_ATTEMPTS; attempt++) {
      if (signal.aborted) return
      emit({ type: 'attempt', attempt, maxAttempts: AI_MAX_ATTEMPTS })

      let text: string
      try {
        text = await this.llm.call(snapshot, messages, {
          userId,
          purpose: 'widget',
          attempt,
          signal,
        })
      } catch (error) {
        if (error instanceof LlmCancelledError) return
        if (error instanceof LlmProviderError) {
          emit({
            type: 'provider_error',
            code: error.code,
            message: error.message,
          })
          return
        }
        throw error
      }

      let failure: QueryErrorInfo
      const parsed = parseWidgetReply(text)
      if (!parsed.ok) {
        failure = { code: 'AI_NO_CYPHER', message: MESSAGES.aiNoCypher }
      } else {
        const reply = normalizeWidgetReply(parsed.reply, body.widget)
        lastCypher = reply.cypher
        try {
          const result = await this.queries.run({
            userId,
            connectionId,
            cypher: reply.cypher,
            widgetId: body.widgetId,
            signal,
          })
          emit({
            type: 'done',
            attempts: attempt,
            cypher: reply.cypher,
            visualization: reply.visualization,
            mapping: reply.mapping,
            title: reply.title,
            result,
          })
          return
        } catch (error) {
          if (signal.aborted) return
          if (!(error instanceof AppError)) throw error
          if (error.code === 'NEO4J_UNAVAILABLE') {
            emit({ type: 'stopped', message: error.message })
            return
          }
          failure = {
            code: error.code,
            message: error.message,
            neo4jCode: error.neo4jCode,
          }
        }
      }
      lastMessage = failure.message
      messages.push(new AIMessage(text), correctionMessage(failure))
    }

    emit({
      type: 'failed',
      attempts: AI_MAX_ATTEMPTS,
      cypher: lastCypher,
      message: lastMessage,
    })
  }
}
