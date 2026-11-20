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
