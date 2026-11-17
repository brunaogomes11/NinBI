import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
import {
  ASSISTANT_MAX_NEW_WIDGETS,
  type AssistantDraft,
  type AssistantMessageDto,
  FILTER_TYPE_LABELS,
  type SchemaDto,
} from '@ninbi/contracts'
import { serializeSchema, visualizationGuide } from '../ai/widget-prompt'
import type { PromptDialect } from '../sources/source'

export type RefKind = 'tab' | 'widget' | 'filter'

/** Refs curtas (`t1`, `w1`, `f1`) do prompt e o id real de cada uma (AD-123). */
export type DraftRefs = Record<string, { kind: RefKind; id: string }>

/** Nome do banco de cada dialeto, no texto de sistema (ASQ-03). */
const DATABASE_NAMES: Record<PromptDialect, string> = {
  Cypher: 'Neo4j',
  PostgreSQL: 'PostgreSQL',
  MySQL: 'MySQL',
  'T-SQL': 'SQL Server',
}

/** Rótulo e cerca do bloco de código da consulta de um widget (ASQ-04). */
function queryLanguage(dialect: PromptDialect): {
  label: string
  fence: string
} {
  return dialect === 'Cypher'
    ? { label: 'Cypher', fence: 'cypher' }
    : { label: 'SQL', fence: 'sql' }
}

/** Cerca de crases mais longa que qualquer sequência de crases da consulta, no mínimo 3 (ASQ-04). */
function fenceFor(query: string): string {
  const longest = Math.max(
    0,
    ...(query.match(/`+/g) ?? []).map((run) => run.length),
  )
  return '`'.repeat(Math.max(3, longest + 1))
}

/**
 * Estrutura do rascunho com refs curtas; nunca valores de filtro nem
 * resultados (CHAT-05, CHAT-06). A consulta sai na linguagem da conexão (ASQ-04).
 */
export function serializeDraft(
  draft: AssistantDraft,
  dialect: PromptDialect = 'Cypher',
): {
  text: string
  refs: DraftRefs
} {
  const language = queryLanguage(dialect)
  const refs: DraftRefs = {}
  const lines = [`Dashboard: "${draft.name}"`, '', 'Abas e widgets:']
  let widgetNumber = 0
  draft.tabs.forEach((tab, tabIndex) => {
    const tabRef = `t${tabIndex + 1}`
    refs[tabRef] = { kind: 'tab', id: tab.id }
    lines.push(`${tabRef} "${tab.name}"`)
    for (const widget of tab.widgets) {
      const ref = `w${++widgetNumber}`
      refs[ref] = { kind: 'widget', id: widget.id }
      const { x, y, w, h } = widget.layout
      const fence = fenceFor(widget.cypher ?? '')
      const query =
        widget.cypher === null
          ? 'nenhum'
          : `${fence}${language.fence}\n${widget.cypher}\n${fence}`
      lines.push(
        `  ${ref} "${widget.title}" visualização=${widget.visualization} posição x=${x} y=${y} tamanho ${w}x${h}`,
        `  ${language.label}: ${query}`,
        `  Mapeamento: ${widget.mapping ? JSON.stringify(widget.mapping) : 'nenhum'}`,
      )
    }
  })
  lines.push('', 'Filtros:')
  if (draft.filters.length === 0) lines.push('nenhum')
  draft.filters.forEach((filter, index) => {
    const ref = `f${index + 1}`
    refs[ref] = { kind: 'filter', id: filter.id }
    lines.push(`${ref} "${filter.label}" $${filter.parameter} ${filter.type}`)
  })
  return { text: lines.join('\n'), refs }
}

function systemText(schema: SchemaDto, dialect: PromptDialect): string {
  const filterTypes = Object.entries(FILTER_TYPE_LABELS)
    .map(([code, label]) => `${code} (${label})`)
    .join(', ')
  return [
    `Você é o assistente de um dashboard de dados em ${DATABASE_NAMES[dialect]}: conversa com o usuário e altera o dashboard por ações.`,
    'Responda só com um objeto JSON: {"reply": "texto em português", "actions": [...]}. Sem ações, use "actions": [].',
    'Você não vê resultados de consultas nem valores dos filtros: nunca responda com dados, só com o que mudou.',
    'Refs: t1.. são abas, w1.. são widgets e f1.. são filtros do rascunho enviado. Uma aba nova ganha uma "ref" própria (ex.: "nova") para os widgets seguintes a citarem em "tab".',
    'Ações permitidas (e só elas):',
    '- create_tab {"type":"create_tab","ref":"nome-curto","name":"..."}',
    '- rename_tab {"type":"rename_tab","tab":"t1","name":"..."}',
    '- remove_tab {"type":"remove_tab","tab":"t1"}',
    '- create_widget {"type":"create_widget","tab":"t1","title":"...","prompt":"o que o widget mostra","layout":{"x":0,"y":0,"w":4,"h":4}} (layout é opcional)',
    '- update_widget {"type":"update_widget","widget":"w1","title":"...","visualization":"BAR","mapping":{...},"prompt":"..."} (todos os campos menos "widget" são opcionais)',
    '- remove_widget {"type":"remove_widget","widget":"w1"}',
    '- move_widget {"type":"move_widget","widget":"w1","x":0,"y":0}',
    '- resize_widget {"type":"resize_widget","widget":"w1","w":6,"h":4}',
    '- create_filter {"type":"create_filter","label":"...","parameter":"nome_sem_espacos","filterType":"um tipo abaixo","options":...,"defaultValue":...}',
    '- update_filter {"type":"update_filter","filter":"f1","label":"...","parameter":"...","options":...}',
    '- remove_filter {"type":"remove_filter","filter":"f1"}',
    '- rename_dashboard {"type":"rename_dashboard","name":"..."}',
    `Tipos de filtro: ${filterTypes}.`,
    '"prompt" descreve o widget para quem escreve a consulta; ele é obrigatório para criar um widget e para mudar a consulta de um widget existente.',
    'Um widget novo ocupa no mínimo 2x2 na grade de 12 colunas.',
    'Um dashboard novo já tem uma aba vazia t1: renomeie e use essa aba.',
    `Crie no máximo ${ASSISTANT_MAX_NEW_WIDGETS} widgets novos por pedido.`,
    ...visualizationGuide(),
    '',
    serializeSchema(schema),
  ].join('\n')
}

function historyMessage(message: AssistantMessageDto): BaseMessage {
  if (message.role === 'USER') return new HumanMessage(message.text)
  const changes = message.details?.changes ?? []
  const text =
    changes.length > 0
      ? `${message.text}\nMudanças feitas:\n${changes.map((change) => `- ${change}`).join('\n')}`
      : message.text
  return new AIMessage(text)
}

/**
 * Pedido do plano: regras e schema, a conversa recente, o rascunho e a
 * mensagem nova (CHAT-05). O `dialect` é o da fonte da conexão do rascunho;
 * sem ele, Neo4j e Cypher como antes (ASQ-01 a ASQ-04).
 */
export function buildAssistantMessages(input: {
  schema: SchemaDto
  dialect?: PromptDialect
  draft: AssistantDraft
  history: AssistantMessageDto[]
  message: string
}): BaseMessage[] {
  const dialect = input.dialect ?? 'Cypher'
  return [
    new SystemMessage(systemText(input.schema, dialect)),
    ...input.history.map(historyMessage),
    new HumanMessage(
      `${serializeDraft(input.draft, dialect).text}\n\nMensagem: ${input.message}`,
    ),
  ]
}
