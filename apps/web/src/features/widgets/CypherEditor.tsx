import {
  type QueryLanguage,
  type SqlToken,
  tokenizeSql,
} from '@ninbi/contracts'
import Prism from 'prismjs'
import 'prismjs/components/prism-cypher'
import { useId } from 'react'
import Editor from 'react-simple-code-editor'
import { Label } from '@/components/ui/label'
import { languageLabel } from '@/features/connections/api'

const SQL_KEYWORDS = new Set(
  (
    'all and any as asc between by case cast cross desc distinct else end except exists fetch ' +
    'first from full group having ilike in inner intersect is join left like limit next not ' +
    'null nulls offset on only or order outer over partition recursive right rows select ' +
    'then top union using values when where window with'
  ).split(' '),
)

const SQL_FUNCTIONS = new Set(
  'avg coalesce count date_trunc extract max min nullif row_number rank sum'.split(
    ' ',
  ),
)

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function span(kind: string, text: string): string {
  return `<span class="token ${kind}">${escapeHtml(text)}</span>`
}

/** O texto entre tokens: espaços e comentários `--` e `/* *\/`. */
function gapHtml(gap: string): string {
  return gap
    .split(/(--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))/g)
    .map((part) =>
      part.startsWith('--') || part.startsWith('/*')
        ? span('comment', part)
        : escapeHtml(part),
    )
    .join('')
}

function tokenKind(token: SqlToken, next: string): string | null {
  switch (token.type) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'param':
      return 'variable'
    case 'identifier':
      return 'property'
    case 'word': {
      const word = token.value.toLowerCase()
      if (SQL_KEYWORDS.has(word)) return 'keyword'
      if (SQL_FUNCTIONS.has(word) || next.trimStart().startsWith('(')) {
        return 'function'
      }
      return null
    }
    default:
      return null
  }
}

/** Realce de SQL a partir do tokenizador do contrato; devolve o mesmo texto, com spans. */
function highlightSql(code: string): string {
  let html = ''
  let cursor = 0
  for (const token of tokenizeSql(code)) {
    html += gapHtml(code.slice(cursor, token.start))
    const text = code.slice(token.start, token.end)
    const kind = tokenKind(token, code.slice(token.end, token.end + 8))
    html += kind ? span(kind, text) : escapeHtml(text)
    cursor = token.end
  }
  return html + gapHtml(code.slice(cursor))
}

function highlightCypher(code: string): string {
  return Prism.highlight(code, Prism.languages.cypher, 'cypher')
}

/** Editor de consulta ("Consulta Cypher" ou "Consulta SQL") com realce; as cores dos tokens vêm do tema (`.cypher-editor`). */
export function CypherEditor({
  value,
  onChange,
  language = 'CYPHER',
}: {
  value: string
  onChange: (value: string) => void
  language?: QueryLanguage
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      {/* SPEC_DEVIATION: o rótulo de hoje era "Cypher"; SQX-02 e a task pedem "Consulta Cypher", então os testes existentes trocaram só o texto do rótulo. */}
      <Label htmlFor={id}>{languageLabel(language)}</Label>
      <div className="cypher-editor max-h-64 overflow-auto rounded-control border border-input bg-card-elevated">
        <Editor
          value={value}
          onValueChange={onChange}
          highlight={language === 'SQL' ? highlightSql : highlightCypher}
          padding={12}
          textareaId={id}
          textareaClassName="focus:outline-none"
          className="min-h-32 font-mono text-sm"
        />
      </div>
    </div>
  )
}
