import { MESSAGES, type QueryResultDto } from '@ninbi/contracts'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatCell,
  nextSort,
  paginate,
  type SortState,
  sortRows,
} from './table-rules'

function ariaSort(
  sort: SortState | null,
  column: number,
): 'ascending' | 'descending' | 'none' {
  if (sort?.column !== column) return 'none'
  return sort.direction === 'asc' ? 'ascending' : 'descending'
}

function SortIcon({
  sort,
  column,
}: {
  sort: SortState | null
  column: number
}) {
  if (sort?.column !== column) {
    return <ChevronsUpDown aria-hidden="true" className="size-3.5 opacity-50" />
  }
  return sort.direction === 'asc' ? (
    <ArrowUp aria-hidden="true" className="size-3.5" />
  ) : (
    <ArrowDown aria-hidden="true" className="size-3.5" />
  )
}

export function ResultTable({ result }: { result: QueryResultDto }) {
  const [sort, setSort] = useState<SortState | null>(null)
  const [page, setPage] = useState(1)

  const sorted = useMemo(
    () =>
      sort ? sortRows(result.rows, sort.column, sort.direction) : result.rows,
    [result.rows, sort],
  )
  const current = paginate(sorted, page)

  function toggleSort(column: number) {
    setSort((previous) => nextSort(previous, column))
    setPage(1)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {result.truncated ? (
        <p className="text-sm text-muted-foreground">
          {MESSAGES.rowsTruncated(result.rowLimit)}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {result.columns.map((name, column) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: colunas repetidas só se distinguem pela posição
                <TableHead key={column} aria-sort={ariaSort(sort, column)}>
                  <button
                    type="button"
                    onClick={() => toggleSort(column)}
                    className="inline-flex items-center gap-1 font-medium"
                  >
                    {name}
                    <SortIcon sort={sort} column={column} />
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {current.rows.map((row, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: linhas não têm identidade própria
              <TableRow key={index}>
                {row.map((value, column) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: colunas repetidas só se distinguem pela posição
                  <TableCell key={column}>{formatCell(value)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
      {current.pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={current.page <= 1}
            onClick={() => setPage(current.page - 1)}
          >
            Página anterior
          </Button>
          <span>
            Página {current.page} de {current.pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={current.page >= current.pageCount}
            onClick={() => setPage(current.page + 1)}
          >
            Próxima página
          </Button>
        </div>
      ) : null}
    </div>
  )
}
