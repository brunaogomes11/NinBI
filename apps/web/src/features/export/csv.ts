import type { QueryResultDto, ResultValue } from '@ninbi/contracts'
import { formatDate } from '@/lib/format'

const BOM = '﻿'

/** Texto de uma célula; `isText` marca o que pode ser lido como fórmula. */
function cellText(value: ResultValue): { text: string; isText: boolean } {
  if (value === null) return { text: '', isText: false }
  if (typeof value === 'number') {
    return { text: String(value).replace('.', ','), isText: false }
  }
  if (typeof value === 'boolean') {
    return { text: value ? 'Sim' : 'Não', isText: false }
  }
  if (typeof value === 'object') {
    return { text: value.value, isText: value.kind === 'json' }
  }
  // Só o valor inteiro que é data vira dd/MM/aaaa; texto com prefixo de data fica como veio.
  const date = formatDate(value)
  if (date !== value) return { text: date, isText: false }
  return { text: value, isText: true }
}

function escapeField(raw: string, isText: boolean): string {
  const safe = isText && /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** CSV para o Excel em português: BOM, `;`, vírgula decimal, `\r\n` (AD-107). */
export function toCsv(result: QueryResultDto): string {
  const header = result.columns.map((name) => escapeField(name, true))
  const lines = result.rows.map((row) =>
    result.columns
      .map((_, index) => {
        const { text, isText } = cellText(row[index] ?? null)
        return escapeField(text, isText)
      })
      .join(';'),
  )
  return BOM + [header.join(';'), ...lines].join('\r\n')
}

/** `Vendas por mês` em 16/11/2026 vira `Vendas-por-mês-2026-11-16.csv`. */
export function exportFileName(
  title: string,
  date: Date,
  ext: 'csv' | 'png',
): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${title.replace(/[^\p{L}\p{N}-]/gu, '-')}-${day}.${ext}`
}
