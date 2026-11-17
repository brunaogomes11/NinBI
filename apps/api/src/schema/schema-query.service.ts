import { Inject, Injectable } from '@nestjs/common'
import {
  type ConnectionSchemaDto,
  type ExampleSetting,
  MESSAGES,
  type RelationalSchemaDto,
  type SchemaDto,
  type SchemaPropertyDto,
  type SchemaStateDto,
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
import type {
  StoredProperty,
  StoredRelationalSchema,
  StoredSchema,
} from './types'

const collate = (a: string, b: string) =>
  a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
const byName = (a: { name: string }, b: { name: string }) =>
  collate(a.name, b.name)

type OptOut = typeof schemaExampleOptOuts.$inferSelect
type StoredDocument = StoredSchema | StoredRelationalSchema

function isRelationalDocument(
  document: StoredDocument | undefined,
): document is StoredRelationalSchema {
  return (
    document !== undefined &&
    'kind' in document &&
    document.kind === 'RELATIONAL'
  )
}

@Injectable()
export class SchemaQueryService {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    @Inject(SchemaRefreshService)
    private readonly refresh: SchemaRefreshService,
  ) {}

  /**
   * Schema guardado em ordem alfabética, com `sendExample` por propriedade ou
   * coluna (SCH-15, SCH-22, SCS-12, SCS-16): o grafo como antes e, para uma
   * conexão SQL, o `RelationalSchemaDto`.
   */
  async get(connectionId: string): Promise<SchemaDto> {
    if (!isConnectionId(connectionId)) throw connectionNotFound()
    const [connection] = await this.db
      .select({ name: connections.name, type: connections.type })
      .from(connections)
      .where(eq(connections.id, connectionId))
    if (!connection) throw connectionNotFound()

    const state = await this.refresh.state(connectionId)
    const document = await this.document(connectionId)
    const optOuts = await this.db
      .select()
      .from(schemaExampleOptOuts)
      .where(eq(schemaExampleOptOuts.connectionId, connectionId))
    const header = { ...state, connectionId, connectionName: connection.name }

    if (connection.type !== 'NEO4J') {
      return relationalDto(
        header,
        isRelationalDocument(document) ? document : undefined,
        optOuts,
      )
    }
    return graphDto(
      header,
      isRelationalDocument(document) ? undefined : document,
      optOuts,
    )
  }

  /** Grava ou apaga a escolha de enviar o exemplo da propriedade ou coluna à IA (SCH-22, SCS-16). */
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
    if (!exists(document, setting)) {
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
  ): Promise<StoredDocument | undefined> {
    const [stored] = await this.db
      .select({ document: connectionSchemas.document })
      .from(connectionSchemas)
      .where(eq(connectionSchemas.connectionId, connectionId))
    return stored?.document as StoredDocument | undefined
  }
}

type Header = SchemaStateDto & { connectionId: string; connectionName: string }

function sendExample(
  optOuts: OptOut[],
  kind: OptOut['elementKind'],
  element: string,
  property: string,
): boolean {
  return !optOuts.some(
    (optOut) =>
      optOut.elementKind === kind &&
      optOut.elementName === element &&
      optOut.propertyName === property,
  )
}

function graphDto(
  header: Header,
  document: StoredSchema | undefined,
  optOuts: OptOut[],
): ConnectionSchemaDto {
  const properties = (
    kind: 'LABEL' | 'RELATIONSHIP',
    element: string,
    list: StoredProperty[],
  ): SchemaPropertyDto[] =>
    [...list].sort(byName).map((property) => ({
      name: property.name,
      types: [...property.types].sort(collate),
      example: property.example,
      sendExample: sendExample(optOuts, kind, element, property.name),
    }))

  return {
    ...header,
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

/** Tabelas e colunas em ordem alfabética, com as chaves estrangeiras (SCS-12). */
function relationalDto(
  header: Header,
  document: StoredRelationalSchema | undefined,
  optOuts: OptOut[],
): RelationalSchemaDto {
  const key = (fk: StoredRelationalSchema['foreignKeys'][number]) =>
    `${fk.from.table}\u0000${fk.from.columns.join(',')}\u0000${fk.to.table}\u0000${fk.to.columns.join(',')}`
  return {
    kind: 'RELATIONAL',
    ...header,
    tables: [...(document?.tables ?? [])].sort(byName).map((table) => ({
      name: table.name,
      isView: table.isView,
      columns: [...table.columns].sort(byName).map((column) => ({
        name: column.name,
        type: column.type,
        example: column.example,
        sendExample: sendExample(optOuts, 'TABLE', table.name, column.name),
      })),
    })),
    foreignKeys: [...(document?.foreignKeys ?? [])]
      .sort((a, b) => collate(key(a), key(b)))
      .map((fk) => ({
        from: { table: fk.from.table, columns: [...fk.from.columns] },
        to: { table: fk.to.table, columns: [...fk.to.columns] },
      })),
  }
}

function exists(
  document: StoredDocument | undefined,
  setting: ExampleSetting,
): boolean {
  if (document === undefined) return false
  if (isRelationalDocument(document)) {
    return (
      setting.kind === 'TABLE' &&
      document.tables.some(
        (table) =>
          table.name === setting.element &&
          table.columns.some((column) => column.name === setting.property),
      )
    )
  }
  if (setting.kind === 'TABLE') return false
  const elements =
    setting.kind === 'LABEL' ? document.labels : document.relationshipTypes
  return elements.some(
    (element) =>
      element.name === setting.element &&
      element.properties.some((p) => p.name === setting.property),
  )
}
