import { z } from 'zod'

const endpoint = z
  .string()
  .trim()
  .max(2048)
  .pipe(z.url({ protocol: /^https?$/ }))
  .refine(
    (value) => /^https?:\/\/[^/@?#\\\s]+(?:\/[^?#\\\s]*)?$/i.test(value),
    'Informe uma URL HTTP(S) sem credenciais, parâmetros ou fragmento',
  )

const name = z.string().trim().min(1).max(80)
const enabledTools = z.array(z.string().min(1).max(128)).max(250)

export const mcpConnectionCreateSchema = z.strictObject({ name, endpoint })
export const mcpConnectionUpdateSchema = z.strictObject({
  name: name.optional(),
  endpoint: endpoint.optional(),
  enabledTools: enabledTools.optional(),
})

export type McpConnectionCreate = z.infer<typeof mcpConnectionCreateSchema>
export type McpConnectionUpdate = z.infer<typeof mcpConnectionUpdateSchema>

export interface McpConnectionDto {
  id: string
  name: string
  endpoint?: string
  enabledTools?: string[]
}

export interface McpToolDto {
  name: string
  description?: string
  enabled: boolean
  readOnlyHint?: boolean
  inputSchema: Record<string, unknown>
  lists: McpListDto[]
}

export type McpColumnType =
  | 'boolean'
  | 'integer'
  | 'number'
  | 'string'
  | 'date'
  | 'date-time'

export interface McpListDto {
  path: string[]
  columns: { name: string; type: McpColumnType }[]
}

const argumentName = z.string().min(1).max(128)
export const mcpCallSchema = z.strictObject({
  connectionId: z.uuid(),
  tool: z.string().min(1).max(128),
  listPath: z.array(z.string().min(1).max(128)).max(12),
  arguments: z.record(argumentName, z.json()),
  filterBindings: z.record(argumentName, z.string().min(1).max(128)),
})

export type McpCall = z.infer<typeof mcpCallSchema>
