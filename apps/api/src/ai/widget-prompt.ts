import {
  type BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
import {
  type ConnectionSchemaDto,
  FILTER_TYPE_LABELS,
  type FilterPromptInfo,
  MAPPING_FIELD_LABELS,
  type SchemaPropertyDto,
  VISUALIZATION_LABELS,
  WIDGET_VISUALIZATIONS,
  type WidgetVisualization,
} from '@ninbi/contracts'
import { SQL_DIALECTS } from '../sources/dialects'
import type { PromptDialect } from '../sources/source'

export interface CurrentWidget {
  title: string
  cypher: string | null
  visualization: string
  config: Record<string, unknown>
}

/** Erro de uma tentativa, como o `AiWidgetService` o repassa à correção. */
export interface QueryErrorInfo {
  code: string
  message: string
  /** Código do erro do banco (Neo4j ou SQL), quando houver. */
  dbCode?: string
}

/** Formato do `mapping` de cada visualização (os nomes de campo vêm de `widgetMappingSchemas`). */
const MAPPING_SHAPES: Record<WidgetVisualization, string> = {
  TABLE: 'null',
  LIST: '{"primary":"col","secondary":"col"|null,"values":["col"] (até 2)}',
  AREA: '{"x":"col","series":["col"],"stacked":true|false}',
  BAR: '{"x":"col","series":["col"],"stacked":true|false,"horizontal":true|false}',
  LINE: '{"x":"col","series":["col"]}',
  PIE: '{"category":"col","value":"col","donut":true|false}',
  RADAR: '{"axis":"col","series":["col"]}',
  RADIAL: '{"category":"col","value":"col"}',
  KPI: '{"value":"col","change":"col"|null}',
  MAP: '{"lat":"col","lon":"col","label":"col"|null}',
}

const CYPHER_SYNTAX_OR_SEMANTIC: ReadonlySet<string> = new Set([
  'Neo.ClientError.Statement.SyntaxError',
  'Neo.ClientError.Statement.SemanticError',
])

/** Códigos de erro de sintaxe ou semântica de cada dialeto (FIX-03). */
function syntaxCodes(dialect: PromptDialect): ReadonlySet<string> {
  if (dialect === 'Cypher') return CYPHER_SYNTAX_OR_SEMANTIC
  const sql = Object.values(SQL_DIALECTS).find((d) => d.label === dialect)
  return sql?.syntaxErrorCodes ?? new Set()
}

/** Nome do banco na mensagem de erro de execução. */
const DATABASE_NAMES: Record<PromptDialect, string> = {
  Cypher: 'Neo4j',
  PostgreSQL: 'PostgreSQL',
  MySQL: 'MySQL',
  'T-SQL': 'SQL Server',
}

function property(p: SchemaPropertyDto): string {
  const example =
    p.sendExample && p.example !== null && p.example !== undefined
      ? ` = ${p.example}`
      : ''
  return `- ${p.name}: ${p.types.join(' | ')}${example}`
}

/** Schema inteiro, sem cortes; propriedade com envio desligado vai só com os tipos (AIQ-03, AIQ-04). */
export function serializeSchema(schema: ConnectionSchemaDto): string {
  const lines = ['Labels']
  for (const label of schema.labels) {
    lines.push(`(:${label.name})`, ...label.properties.map(property))
  }
  lines.push('', 'Relacionamentos')
  for (const type of schema.relationshipTypes) {
    lines.push(`[:${type.name}]`)
    for (const { from, to } of type.patterns) {
      lines.push(`(:${from})-[:${type.name}]->(:${to})`)
    }
    lines.push(...type.properties.map(property))
  }
  return lines.join('\n')
}

/** Visualizações aceitas, o formato do mapping e os campos (texto comum aos pedidos de IA). */
export function visualizationGuide(): string[] {
  const visualizations = WIDGET_VISUALIZATIONS.map(
    (code) =>
      `- ${code} (${VISUALIZATION_LABELS[code]}): mapping ${MAPPING_SHAPES[code]}`,
  ).join('\n')
  const fields = Object.entries(MAPPING_FIELD_LABELS)
    .map(([key, label]) => `${key} = ${label}`)
    .join('; ')
  return [
    'Visualizações aceitas e o formato do mapping (col = nome de uma coluna do RETURN):',
    visualizations,
    `Campos do mapping: ${fields}.`,
  ]
}

function systemText(schema: ConnectionSchemaDto): string {
  return [
    'Você escreve consultas Cypher para widgets de dashboard em um banco Neo4j.',
    'Regras:',
    '- Escreva só Cypher de leitura, com uma única instrução e sem ponto e vírgula no fim.',
    '- Dê nome a cada coluna do RETURN com AS.',
    '- Use os parâmetros dos filtros do dashboard quando o pedido falar deles; um parâmetro vazio chega como null.',
    '- Escolha a visualização que melhor mostra o resultado e descreva o mapeamento das colunas.',
    '- O título do widget tem até 80 caracteres, em português.',
    '- Responda só com um objeto JSON: {"cypher": "...", "visualization": "...", "mapping": {...} ou null, "title": "..."}',
    ...visualizationGuide(),
    '',
    serializeSchema(schema),
  ].join('\n')
}

function currentWidgetText(widget: CurrentWidget): string {
  const mapping = (widget.config as { mapping?: unknown }).mapping
  return [
    'Widget atual:',
    `Título: ${widget.title}`,
    `Cypher: ${widget.cypher ?? 'nenhum'}`,
    `Visualização: ${widget.visualization}`,
    `Mapeamento: ${mapping ? JSON.stringify(mapping) : 'nenhum'}`,
  ].join('\n')
}

/** Rótulo, parâmetro e tipo de cada filtro; nunca valores (FLT-20). */
function filtersText(filters: FilterPromptInfo[]): string {
  if (filters.length === 0) return 'Filtros do dashboard: nenhum'
  const lines = filters.map((filter) => {
    const names =
      filter.type === 'DATE_RANGE'
        ? `$${filter.parameter}_inicio e $${filter.parameter}_fim`
        : `$${filter.parameter}`
    return `- ${filter.label}: ${names} (${FILTER_TYPE_LABELS[filter.type]})`
  })
  return ['Filtros do dashboard:', ...lines].join('\n')
}

/** Conversa inicial de uma geração: sistema com regras e schema, e o pedido (AIQ-01, AIQ-05). */
export function buildWidgetMessages(input: {
  schema: ConnectionSchemaDto
  widget: CurrentWidget
  prompt: string
  filters?: FilterPromptInfo[]
}): BaseMessage[] {
  return [
    new SystemMessage(systemText(input.schema)),
    new HumanMessage(
      `${currentWidgetText(input.widget)}\n\n${filtersText(input.filters ?? [])}\n\nPedido: ${input.prompt}`,
    ),
  ]
}

function errorText(error: QueryErrorInfo, dialect: PromptDialect): string {
  if (error.code !== 'QUERY_FAILED') return error.message
  if (error.dbCode && syntaxCodes(dialect).has(error.dbCode)) {
    return error.message
  }
  // A mensagem de execução pode carregar valores do banco: só o código segue (FIX-04, AIQ-06, SQX-13).
  const database = DATABASE_NAMES[dialect]
  return error.dbCode
    ? `Erro de execução no ${database}: ${error.dbCode}`
    : `Erro de execução no ${database}`
}

/** Pede a correção depois de uma tentativa que falhou (FIX-01, FIX-03, FIX-04). */
export function correctionMessage(
  error: QueryErrorInfo,
  dialect: PromptDialect = 'Cypher',
): HumanMessage {
  return new HumanMessage(
    `A consulta falhou com o erro: ${errorText(error, dialect)}. Corrija e responda de novo só com o objeto JSON.`,
  )
}
