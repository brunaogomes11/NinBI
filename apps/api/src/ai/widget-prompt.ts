import {
  type BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
import {
  FILTER_TYPE_LABELS,
  type FilterPromptInfo,
  isRelationalSchema,
  MAPPING_FIELD_LABELS,
  type RelationalColumnDto,
  type RelationalSchemaDto,
  type SchemaDto,
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

function column(c: RelationalColumnDto): string {
  const example =
    c.sendExample && c.example !== null && c.example !== undefined
      ? ` = ${c.example}`
      : ''
  return `- ${c.name}: ${c.type}${example}`
}

/** Tabelas, colunas com o tipo e o exemplo permitido, e as chaves estrangeiras (SAI-02). */
function serializeRelational(schema: RelationalSchemaDto): string {
  const lines = ['Tabelas']
  for (const table of schema.tables) {
    lines.push(
      table.isView ? `${table.name} (visão)` : table.name,
      ...table.columns.map(column),
    )
  }
  lines.push('', 'Chaves estrangeiras')
  const side = (ref: { table: string; columns: string[] }) =>
    ref.columns.map((name) => `${ref.table}.${name}`).join(', ')
  for (const { from, to } of schema.foreignKeys) {
    lines.push(`${side(from)} → ${side(to)}`)
  }
  return lines.join('\n')
}

/**
 * Schema inteiro, sem cortes; propriedade ou coluna com envio desligado vai só
 * com o tipo (AIQ-03, AIQ-04, SAI-02). O grafo sai como antes.
 */
export function serializeSchema(schema: SchemaDto): string {
  if (isRelationalSchema(schema)) return serializeRelational(schema)
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

/** O pedido de SQL no dialeto do banco (SAI-01). */
function sqlSystemText(schema: SchemaDto, dialect: PromptDialect): string {
  return [
    `Você escreve consultas ${dialect} para widgets de dashboard em um banco ${DATABASE_NAMES[dialect]}.`,
    'Regras:',
    '- Escreva só SQL de leitura, começando por SELECT ou WITH, com uma única instrução e sem ponto e vírgula no fim.',
    '- Dê nome a cada coluna do resultado com AS.',
    '- Use os nomes das tabelas como aparecem no schema; textos entre aspas simples, nunca entre $$.',
    '- Use os parâmetros dos filtros do dashboard quando o pedido falar deles; um parâmetro vazio chega como null.',
    '- Escolha a visualização que melhor mostra o resultado e descreva o mapeamento das colunas.',
    '- O título do widget tem até 80 caracteres, em português.',
    `- Responda só com um objeto JSON, com a consulta ${dialect} no campo "cypher": {"cypher": "...", "visualization": "...", "mapping": {...} ou null, "title": "..."}`,
    ...visualizationGuide(),
    '',
    serializeSchema(schema),
  ].join('\n')
}

function systemText(schema: SchemaDto, dialect: PromptDialect): string {
  if (dialect !== 'Cypher') return sqlSystemText(schema, dialect)
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

function currentWidgetText(
  widget: CurrentWidget,
  dialect: PromptDialect,
): string {
  const mapping = (widget.config as { mapping?: unknown }).mapping
  const language = dialect === 'Cypher' ? 'Cypher' : 'SQL'
  return [
    'Widget atual:',
    `Título: ${widget.title}`,
    `${language}: ${widget.cypher ?? 'nenhum'}`,
    `Visualização: ${widget.visualization}`,
    `Mapeamento: ${mapping ? JSON.stringify(mapping) : 'nenhum'}`,
  ].join('\n')
}

/** Rótulo, parâmetro e tipo de cada filtro; nunca valores (FLT-20, SAI-06). */
function filtersText(
  filters: FilterPromptInfo[],
  dialect: PromptDialect,
): string {
  if (filters.length === 0) return 'Filtros do dashboard: nenhum'
  const lines = filters.map((filter) => {
    const names =
      filter.type === 'DATE_RANGE'
        ? `$${filter.parameter}_inicio e $${filter.parameter}_fim`
        : `$${filter.parameter}`
    return `- ${filter.label}: ${names} (${FILTER_TYPE_LABELS[filter.type]})`
  })
  const sqlUsage =
    dialect === 'Cypher'
      ? []
      : [
          'Em SQL, use um parâmetro de valor único como `$nome IS NULL OR coluna = $nome` e um de lista como `$nome IS NULL OR coluna IN ($nome)`.',
        ]
  return ['Filtros do dashboard:', ...lines, ...sqlUsage].join('\n')
}

/** Conversa inicial de uma geração: sistema com regras e schema, e o pedido (AIQ-01, AIQ-05, SAI-01). */
export function buildWidgetMessages(input: {
  schema: SchemaDto
  /** Idioma da consulta (o `dialect` da fonte da conexão); sem ele, Cypher como antes. */
  dialect?: PromptDialect
  widget: CurrentWidget
  prompt: string
  filters?: FilterPromptInfo[]
}): BaseMessage[] {
  const dialect = input.dialect ?? 'Cypher'
  return [
    new SystemMessage(systemText(input.schema, dialect)),
    new HumanMessage(
      `${currentWidgetText(input.widget, dialect)}\n\n${filtersText(input.filters ?? [], dialect)}\n\nPedido: ${input.prompt}`,
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
