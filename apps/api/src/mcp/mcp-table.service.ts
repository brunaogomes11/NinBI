import { Inject, Injectable } from '@nestjs/common'
import type {
  McpCall,
  McpColumnType,
  McpListDto,
  McpToolDto,
  QueryResultDto,
  ResultValue,
} from '@ninbi/contracts'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { AppError } from '../common/app-error'
import { loadQueryLimits } from '../config/env'
import { McpClientService } from './mcp-client.service'
import { McpConnectionsService } from './mcp-connections.service'

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function schemaNode(value: unknown, root: unknown) {
  let node = record(value)
  const seen = new Set<string>()
  while (typeof node?.$ref === 'string') {
    const ref = node.$ref
    if (!ref.startsWith('#/') || seen.has(ref)) return undefined
    seen.add(ref)
    node = record(
      ref
        .slice(2)
        .split('/')
        .reduce<unknown>((value, segment) => {
          const key = segment.replaceAll('~1', '/').replaceAll('~0', '~')
          const object = record(value)
          return object && Object.hasOwn(object, key) ? object[key] : undefined
        }, root),
    )
  }
  return node
}

function columnType(schema: unknown, root: unknown): McpColumnType | undefined {
  const field = schemaNode(schema, root)
  if (Array.isArray(field?.anyOf) && field.anyOf.length === 2) {
    const [first, second] = field.anyOf.map((item) => schemaNode(item, root))
    if (first?.type === 'null' && !second?.anyOf)
      return columnType(second, root)
    if (second?.type === 'null' && !first?.anyOf) return columnType(first, root)
  }
  const type =
    Array.isArray(field?.type) &&
    field.type.length === 2 &&
    field.type.includes('null')
      ? field.type.find((item) => item !== 'null')
      : field?.type
  if (
    type === 'string' &&
    (field?.format === 'date' || field?.format === 'date-time')
  )
    return field.format
  return type === 'boolean' ||
    type === 'integer' ||
    type === 'number' ||
    type === 'string'
    ? type
    : undefined
}

export function tabularLists(
  schema: unknown,
  path: string[] = [],
  root: unknown = schema,
): McpListDto[] {
  const node = schemaNode(schema, root)
  if (!node || path.length > 12) return []
  if (node.type === 'array') {
    const fields = Object.entries(
      record(schemaNode(node.items, root)?.properties) ?? {},
    )
    const columns = fields.flatMap(([name, field]) => {
      const type = columnType(field, root)
      return type ? [{ name, type }] : []
    })
    return fields.length && columns.length === fields.length
      ? [{ path, columns }]
      : []
  }
  return Object.entries(record(node.properties) ?? {}).flatMap(([key, child]) =>
    tabularLists(child, [...path, key], root),
  )
}

function invalidResult() {
  return new AppError(
    422,
    'MCP_RESULT_INVALID',
    'A resposta MCP não corresponde à lista tabular selecionada.',
  )
}

export function toMcpTable(
  output: unknown,
  list: McpListDto,
  rowLimit: number,
): QueryResultDto {
  const rows = list.path.reduce<unknown>((value, segment) => {
    const object = record(value)
    return object && Object.hasOwn(object, segment)
      ? object[segment]
      : undefined
  }, output)
  if (!Array.isArray(rows)) throw invalidResult()
  return {
    columns: list.columns.map(({ name }) => name),
    columnTypes: list.columns.map(({ type }) => type),
    rows: rows.slice(0, rowLimit).map((row) => {
      const object = record(row)
      if (!object) throw invalidResult()
      return list.columns.map(({ name }) => {
        const value: unknown = Object.hasOwn(object, name) ? object[name] : null
        if (
          value === null ||
          typeof value === 'string' ||
          (typeof value === 'number' && Number.isFinite(value)) ||
          typeof value === 'boolean'
        )
          return value satisfies ResultValue
        throw invalidResult()
      })
    }),
    truncated: rows.length > rowLimit,
    rowLimit,
  }
}

function validates(schema: object, value: unknown): boolean {
  const validator = new Ajv2020({
    strict: false,
    ownProperties: true,
    validateSchema: false,
  })
  addFormats(validator)
  try {
    return validator.validate(schema, value)
  } catch {
    return false
  }
}

@Injectable()
export class McpTableService {
  constructor(
    @Inject(McpClientService) private readonly client: McpClientService,
    @Inject(McpConnectionsService)
    private readonly connections: Pick<McpConnectionsService, 'get'>,
  ) {}

  async tools(id: string): Promise<McpToolDto[]> {
    const connection = await this.connections.get(id)
    const tools = await this.client.listTools(connection.endpoint)
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      enabled:
        connection.enabledTools.includes(tool.name) &&
        tool.annotations?.readOnlyHint !== false,
      readOnlyHint: tool.annotations?.readOnlyHint,
      inputSchema: tool.inputSchema,
      lists: tabularLists(tool.outputSchema),
    }))
  }

  async execute(
    call: McpCall,
    args: Record<string, unknown>,
  ): Promise<QueryResultDto> {
    const connection = await this.connections.get(call.connectionId)
    const forbidden = () =>
      new AppError(
        403,
        'FORBIDDEN',
        'A ferramenta MCP não está habilitada para leitura.',
      )
    if (!connection.enabledTools.includes(call.tool)) throw forbidden()
    return this.client.run(connection.endpoint, async (client) => {
      const { tools } = await client.listTools()
      const tool = tools.find((item) => item.name === call.tool)
      if (!tool || tool.annotations?.readOnlyHint === false) throw forbidden()
      if (!validates(tool.inputSchema, args)) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Os argumentos não correspondem ao esquema da ferramenta MCP.',
        )
      }
      const list = tabularLists(tool.outputSchema).find(
        ({ path }) => JSON.stringify(path) === JSON.stringify(call.listPath),
      )
      if (!tool.outputSchema || !list) throw invalidResult()
      const result = await client
        .callTool({ name: tool.name, arguments: args })
        .catch((error: unknown) => {
          if (
            error instanceof Error &&
            /schema|structured content|structuredContent/i.test(error.message)
          )
            throw invalidResult()
          throw error
        })
      if (!('content' in result) || result.isError)
        throw new AppError(
          422,
          'QUERY_FAILED',
          'A ferramenta MCP devolveu um erro.',
        )
      if (!validates(tool.outputSchema, result.structuredContent))
        throw invalidResult()
      return toMcpTable(
        result.structuredContent,
        list,
        loadQueryLimits().maxRows,
      )
    })
  }
}
