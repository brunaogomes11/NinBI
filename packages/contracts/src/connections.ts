import { z } from 'zod'
import { MESSAGES } from './messages'

export const CONNECTION_TYPES = [
  'NEO4J',
  'POSTGRES',
  'MYSQL',
  'SQLSERVER',
] as const
export type ConnectionType = (typeof CONNECTION_TYPES)[number]

export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  NEO4J: 'Neo4j',
  POSTGRES: 'PostgreSQL',
  MYSQL: 'MySQL',
  SQLSERVER: 'SQL Server',
}

export const SQL_DEFAULT_PORTS = {
  POSTGRES: 5432,
  MYSQL: 3306,
  SQLSERVER: 1433,
} as const

export type QueryLanguage = 'CYPHER' | 'SQL'

export function connectionLanguage(type: ConnectionType): QueryLanguage {
  return type === 'NEO4J' ? 'CYPHER' : 'SQL'
}

export type SchemaStatus = 'NEVER' | 'READING' | 'READY' | 'FAILED'

export interface ConnectionDto {
  id: string
  name: string
  type: ConnectionType
  uri: string | null
  host: string | null
  port: number | null
  ssl: boolean
  database: string | null
  username: string
  schemaStatus: SchemaStatus
  schemaReadAt: string | null
}

export interface SchemaStateDto {
  status: SchemaStatus
  readAt: string | null
  startedAt: string | null
  error: string | null
}

export interface SchemaPropertyDto {
  name: string
  types: string[]
  example: string | null
  sendExample: boolean
}

export interface SchemaElementDto {
  name: string
  properties: SchemaPropertyDto[]
}

export interface SchemaPatternDto {
  from: string
  to: string
}

export interface ConnectionSchemaDto extends SchemaStateDto {
  connectionId: string
  connectionName: string
  labels: SchemaElementDto[]
  relationshipTypes: (SchemaElementDto & { patterns: SchemaPatternDto[] })[]
}

// SPEC_DEVIATION: a task cita schemas.ts, mas ConnectionSchemaDto e
// exampleSettingSchema vivem em connections.ts; o schema relacional fica junto.
export interface RelationalColumnDto {
  name: string
  type: string
  example: string | null
  sendExample: boolean
}

export interface RelationalForeignKeyDto {
  from: { table: string; columns: string[] }
  to: { table: string; columns: string[] }
}

export interface RelationalTableDto {
  name: string
  isView: boolean
  columns: RelationalColumnDto[]
}

export interface RelationalSchemaDto extends SchemaStateDto {
  kind: 'RELATIONAL'
  connectionId: string
  connectionName: string
  tables: RelationalTableDto[]
  foreignKeys: RelationalForeignKeyDto[]
}

export type SchemaDto = ConnectionSchemaDto | RelationalSchemaDto

export function isRelationalSchema(dto: SchemaDto): dto is RelationalSchemaDto {
  return 'kind' in dto && dto.kind === 'RELATIONAL'
}

const MAX_NAME = 80
const MAX_TEXT = 120

const URI_PATTERN =
  /^(neo4j|bolt)(\+s|\+ssc)?:\/\/(\[[0-9a-f:.]+\]|[^\s/?#:[\]]+)(:\d+)?$/i

const name = z
  .string()
  .trim()
  .min(1, MESSAGES.connectionNameRequired)
  .max(MAX_NAME, MESSAGES.connectionNameTooLong)

const uri = z.string().trim().regex(URI_PATTERN, MESSAGES.connectionUriInvalid)

const database = z
  .string()
  .trim()
  .max(MAX_TEXT)
  .nullish()
  .transform((value) => value || null)

const username = z
  .string()
  .trim()
  .min(1, MESSAGES.connectionUsernameRequired)
  .max(MAX_TEXT)

const neo4jFields = { name, uri, database, username }

const host = z
  .string()
  .trim()
  .min(1, MESSAGES.connectionHostInvalid)
  .refine(
    (value) => !/\s/.test(value) && !value.includes('://'),
    MESSAGES.connectionHostInvalid,
  )

const port = z
  .number(MESSAGES.connectionPortInvalid)
  .int(MESSAGES.connectionPortInvalid)
  .min(1, MESSAGES.connectionPortInvalid)
  .max(65535, MESSAGES.connectionPortInvalid)

const sqlDatabase = z
  .string(MESSAGES.connectionDatabaseRequired)
  .trim()
  .min(1, MESSAGES.connectionDatabaseRequired)
  .max(MAX_TEXT)

const sqlFields = {
  name,
  host,
  port,
  database: sqlDatabase,
  ssl: z.boolean(),
  username,
}

const SQL_TYPES = ['POSTGRES', 'MYSQL', 'SQLSERVER'] as const

/** Conexão sem `type` vale Neo4j (formato anterior à feature fontes-sql). */
const withDefaultType = (value: unknown) =>
  typeof value === 'object' && value !== null && !('type' in value)
    ? { ...value, type: 'NEO4J' }
    : value

export const connectionCreateSchema = z.preprocess(
  withDefaultType,
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('NEO4J'),
      ...neo4jFields,
      password: z.string().min(1, MESSAGES.passwordRequired),
    }),
    z.object({
      type: z.enum(SQL_TYPES),
      ...sqlFields,
      password: z.string().min(1, MESSAGES.passwordRequired),
    }),
  ]),
)

export const connectionUpdateSchema = z.preprocess(
  withDefaultType,
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('NEO4J'),
      ...neo4jFields,
      password: z.string().optional(),
    }),
    z.object({
      type: z.enum(SQL_TYPES),
      ...sqlFields,
      password: z.string().optional(),
    }),
  ]),
)

export const exampleSettingSchema = z.object({
  kind: z.enum(['LABEL', 'RELATIONSHIP', 'TABLE']),
  element: z.string().min(1),
  property: z.string().min(1),
  sendExample: z.boolean(),
})

export type ConnectionCreateInput = z.input<typeof connectionCreateSchema>
export type ConnectionCreate = z.output<typeof connectionCreateSchema>
export type ConnectionUpdateInput = z.input<typeof connectionUpdateSchema>
export type ConnectionUpdate = z.output<typeof connectionUpdateSchema>
export type ExampleSetting = z.infer<typeof exampleSettingSchema>
