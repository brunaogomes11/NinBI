import { Inject, Injectable } from '@nestjs/common'
import {
  type ConnectionSchemaDto,
  type ExampleSetting,
  MESSAGES,
  type SchemaPropertyDto,
} from '@ninbi/contracts'
import { and, eq } from 'drizzle-orm'
import { AppError } from '../common/app-error'
import {
  connectionNotFound,
  isConnectionId,
} from '../connections/connection-errors'
import { type AppDatabase, DB } from '../database/database.module'
import {
  connectionSchemas,
  connections,
  schemaExampleOptOuts,
} from '../database/schema'
import { SchemaRefreshService } from './schema-refresh.service'
import type { StoredProperty, StoredSchema } from './types'

const collate = (a: string, b: string) =>
  a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
const byName = (a: { name: string }, b: { name: string }) =>
  collate(a.name, b.name)

@Injectable()
export class SchemaQueryService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(SchemaRefreshService)
    private readonly refresh: SchemaRefreshService,
  ) {}

  /** Schema guardado em ordem alfabética, com `sendExample` por propriedade (SCH-15, SCH-22). */
  async get(connectionId: string): Promise<ConnectionSchemaDto> {
    if (!isConnectionId(connectionId)) throw connectionNotFound()
    const [connection] = await this.db
      .select({ name: connections.name })
      .from(connections)
      .where(eq(connections.id, connectionId))
    if (!connection) throw connectionNotFound()

    const state = await this.refresh.state(connectionId)
    const document = await this.document(connectionId)
    const optOuts = await this.db
      .select()
      .from(schemaExampleOptOuts)
      .where(eq(schemaExampleOptOuts.connectionId, connectionId))

    const properties = (
      kind: 'LABEL' | 'RELATIONSHIP',
      element: string,
      list: StoredProperty[],
    ): SchemaPropertyDto[] =>
      [...list].sort(byName).map((property) => ({
        name: property.name,
        types: [...property.types].sort(collate),
        example: property.example,
        sendExample: !optOuts.some(
          (optOut) =>
            optOut.elementKind === kind &&
            optOut.elementName === element &&
            optOut.propertyName === property.name,
        ),
      }))

    return {
      ...state,
      connectionId,
      connectionName: connection.name,
      labels: [...(document?.labels ?? [])].sort(byName).map((label) => ({
        name: label.name,
        properties: properties('LABEL', label.name, label.properties),
      })),
      relationshipTypes: [...(document?.relationshipTypes ?? [])]
        .sort(byName)
        .map((type) => ({
          name: type.name,
          properties: properties('RELATIONSHIP', type.name, type.properties),
          patterns: [...type.patterns].sort(
            (a, b) => collate(a.from, b.from) || collate(a.to, b.to),
          ),
        })),
    }
  }

  /** Grava ou apaga a escolha de enviar o exemplo da propriedade à IA (SCH-22). */
  async setExampleSetting(
    connectionId: string,
    setting: ExampleSetting,
  ): Promise<void> {
    if (!isConnectionId(connectionId)) throw connectionNotFound()
    const [connection] = await this.db
      .select({ id: connections.id })
      .from(connections)
      .where(eq(connections.id, connectionId))
    if (!connection) throw connectionNotFound()

    const document = await this.document(connectionId)
    const elements =
      setting.kind === 'LABEL' ? document?.labels : document?.relationshipTypes
    const exists = (elements ?? []).some(
      (element) =>
        element.name === setting.element &&
        element.properties.some((p) => p.name === setting.property),
    )
    if (!exists) {
      throw new AppError(
        404,
        'SCHEMA_PROPERTY_NOT_FOUND',
        MESSAGES.schemaPropertyNotFound,
      )
    }

    if (setting.sendExample) {
      await this.db
        .delete(schemaExampleOptOuts)
        .where(
          and(
            eq(schemaExampleOptOuts.connectionId, connectionId),
            eq(schemaExampleOptOuts.elementKind, setting.kind),
            eq(schemaExampleOptOuts.elementName, setting.element),
            eq(schemaExampleOptOuts.propertyName, setting.property),
          ),
        )
    } else {
      await this.db
        .insert(schemaExampleOptOuts)
        .values({
          connectionId,
          elementKind: setting.kind,
          elementName: setting.element,
          propertyName: setting.property,
        })
        .onConflictDoNothing()
        .returning()
    }
  }

  private async document(
    connectionId: string,
  ): Promise<StoredSchema | undefined> {
    const [stored] = await this.db
      .select({ document: connectionSchemas.document })
      .from(connectionSchemas)
      .where(eq(connectionSchemas.connectionId, connectionId))
    return stored?.document as StoredSchema | undefined
  }
}
