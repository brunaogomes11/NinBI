import { z } from 'zod'
import { MESSAGES } from './messages'

export type SchemaStatus = 'NEVER' | 'READING' | 'READY' | 'FAILED'

export interface ConnectionDto {
  id: string
  name: string
  uri: string
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

const MAX_NAME = 80
const MAX_TEXT = 120

const URI_PATTERN = /^(neo4j|bolt)(\+s|\+ssc)?:\/\/[^\s/?#]+/i

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

export const connectionCreateSchema = z.object({
  name,
  uri,
  database,
  username,
  password: z.string().min(1, MESSAGES.passwordRequired),
})

export const connectionUpdateSchema = z.object({
  name,
  uri,
  database,
  username,
  password: z.string().optional(),
})

export const exampleSettingSchema = z.object({
  kind: z.enum(['LABEL', 'RELATIONSHIP']),
  element: z.string().min(1),
  property: z.string().min(1),
  sendExample: z.boolean(),
})

export type ConnectionCreateInput = z.input<typeof connectionCreateSchema>
export type ConnectionCreate = z.output<typeof connectionCreateSchema>
export type ConnectionUpdateInput = z.input<typeof connectionUpdateSchema>
export type ConnectionUpdate = z.output<typeof connectionUpdateSchema>
export type ExampleSetting = z.infer<typeof exampleSettingSchema>
