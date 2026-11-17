import { MESSAGES, type WidgetDto } from '@ninbi/contracts'
import { toPng } from 'html-to-image'
import { Download } from 'lucide-react'
import type { RefObject } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  hasWidgetQuery,
  useWidgetResult,
} from '@/features/widgets/useWidgetResult'
import { exportFileName, toCsv } from './csv'
import { downloadBlob, downloadDataUrl } from './download'

/** Marca o que não entra na imagem do card (EXP-06). */
export const EXPORT_IGNORE_ATTRIBUTE = 'data-export-ignore'

function keepInImage(node: unknown): boolean {
  return !(
    node instanceof HTMLElement && node.hasAttribute(EXPORT_IGNORE_ATTRIBUTE)
  )
}

/** "Exportar CSV" e "Exportar PNG" do widget, em visualização (EXP-01 a EXP-08). */
export function WidgetExportMenu({
  dashboardId,
  version,
  widget,
  cardRef,
}: {
  dashboardId: string
  version: number
  widget: WidgetDto
  cardRef: RefObject<HTMLElement | null>
}) {
  // Mesma chave do corpo do card: usa o resultado em cache, sem nova execução.
  const query = useWidgetResult(dashboardId, version, widget)
  const result = hasWidgetQuery(widget) ? query.data : undefined
  const canExport = result !== undefined && result.rows.length > 0

  function exportCsv() {
    if (!result) return
    downloadBlob(
      new Blob([toCsv(result)], { type: 'text/csv;charset=utf-8' }),
      exportFileName(widget.title, new Date(), 'csv'),
    )
  }

  async function exportPng() {
    const card = cardRef.current
    if (!card) return
    try {
      const url = await toPng(card, {
        pixelRatio: 2 * (window.devicePixelRatio || 1),
        filter: keepInImage,
      })
      downloadDataUrl(url, exportFileName(widget.title, new Date(), 'png'))
    } catch {
      toast.error(MESSAGES.exportImageFailed)
    }
  }

  return (
    <div className="absolute top-2 right-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            aria-label={`Exportar widget ${widget.title}`}
            {...{ [EXPORT_IGNORE_ATTRIBUTE]: '' }}
          >
            <Download aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={!canExport} onSelect={exportCsv}>
            Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canExport}
            onSelect={() => void exportPng()}
          >
            Exportar PNG
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
