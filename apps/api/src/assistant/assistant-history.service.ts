import { Inject, Injectable } from '@nestjs/common'
import type {
  AssistantMessageDto,
  AssistantReplyDetails,
} from '@ninbi/contracts'
import { and, desc, eq } from 'drizzle-orm'
import { Clock } from '../common/clock'
import { type AppDatabase, DB } from '../database/database.module'
import { type AssistantMessageRow, assistantMessages } from '../database/schema'

function toDto(row: AssistantMessageRow): AssistantMessageDto {
  return {
    id: row.id,
    role: row.role,
    text: row.text,
    details: row.details ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

/** Conversa do assistente por usuário e dashboard (HIST-01 a HIST-06). */
@Injectable()
export class AssistantHistoryService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  private scope(userId: string, dashboardId: string) {
    return and(
      eq(assistantMessages.dashboardId, dashboardId),
      eq(assistantMessages.userId, userId),
    )
  }

  async list(
    userId: string,
    dashboardId: string,
  ): Promise<AssistantMessageDto[]> {
    const rows = await this.db
      .select()
      .from(assistantMessages)
      .where(this.scope(userId, dashboardId))
      .orderBy(assistantMessages.seq)
    return rows.map(toDto)
  }

  /** As últimas `limit` mensagens, em ordem cronológica (CHAT-05). */
  async recent(
    userId: string,
    dashboardId: string,
    limit: number,
  ): Promise<AssistantMessageDto[]> {
    const rows = await this.db
      .select()
      .from(assistantMessages)
      .where(this.scope(userId, dashboardId))
      .orderBy(desc(assistantMessages.seq))
      .limit(limit)
    return rows.reverse().map(toDto)
  }

  async appendUser(
    userId: string,
    dashboardId: string,
    text: string,
  ): Promise<AssistantMessageDto> {
    return this.append(userId, dashboardId, 'USER', text, null)
  }

  async appendAssistant(
    userId: string,
    dashboardId: string,
    text: string,
    details: AssistantReplyDetails,
  ): Promise<AssistantMessageDto> {
    return this.append(userId, dashboardId, 'ASSISTANT', text, details)
  }

  /**
   * "Tentar novamente" (CHAT-21): a mensagem `id` só é reaproveitada se for a mais recente do
   * usuário neste dashboard e do próprio usuário, sem resposta depois dela.
   */
  async retryOf(
    userId: string,
    dashboardId: string,
    id: string,
  ): Promise<AssistantMessageDto | null> {
    const [row] = await this.db
      .select()
      .from(assistantMessages)
      .where(this.scope(userId, dashboardId))
      .orderBy(desc(assistantMessages.seq))
      .limit(1)
    return row && row.id === id && row.role === 'USER' ? toDto(row) : null
  }

  /** Apaga só as mensagens do usuário neste dashboard (HIST-05). */
  async clear(userId: string, dashboardId: string): Promise<void> {
    await this.db
      .delete(assistantMessages)
      .where(this.scope(userId, dashboardId))
  }

  private async append(
    userId: string,
    dashboardId: string,
    role: 'USER' | 'ASSISTANT',
    text: string,
    details: AssistantReplyDetails | null,
  ): Promise<AssistantMessageDto> {
    const [row] = await this.db
      .insert(assistantMessages)
      .values({
        userId,
        dashboardId,
        role,
        text,
        details,
        createdAt: this.clock.now(),
      })
      .returning()
    if (!row) throw new Error('mensagem do assistente não gravada')
    return toDto(row)
  }
}
