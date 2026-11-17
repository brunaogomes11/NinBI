import type { DashboardFilter } from '@ninbi/contracts'
import { MoreHorizontal, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TopBarFilters } from '@/features/shell/TopBar'
import { FilterControl } from './FilterControl'
import { useFilterSession } from './filter-session'

/** Só em modo de edição, para quem pode editar: criar, editar e remover filtros (FLT-18). */
export interface FilterBarEdit {
  connectionId: string
  onNew: () => void
  onEdit: (filter: DashboardFilter) => void
  onRemove: (filter: DashboardFilter) => void
}

function ChipMenu({
  filter,
  edit,
}: {
  filter: DashboardFilter
  edit: FilterBarEdit
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 rounded-full"
          aria-label={`Ações do filtro ${filter.label}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => edit.onEdit(filter)}>
          Editar filtro
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => edit.onRemove(filter)}>
          Remover filtro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Chips dos filtros do dashboard, no slot de filtros da barra superior, em todas as abas (FLT-07, FLT-08). */
export function FilterBar({
  dashboardId,
  version,
  filters,
  edit,
}: {
  dashboardId: string
  version: number
  filters: DashboardFilter[]
  edit?: FilterBarEdit
}) {
  const session = useFilterSession()
  if (filters.length === 0 && !edit) return null
  return (
    <TopBarFilters>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <FilterControl
            key={filter.id}
            filter={filter}
            value={session.values[filter.id] ?? null}
            onChange={(value) => session.setValue(filter.id, value)}
            source={{
              dashboardId,
              version,
              edit: edit ? { connectionId: edit.connectionId } : undefined,
            }}
            actions={edit && <ChipMenu filter={filter} edit={edit} />}
          />
        ))}
        {filters.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={session.clearAll}
          >
            Limpar filtros
          </Button>
        )}
        {edit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={edit.onNew}
          >
            <Plus aria-hidden="true" />
            Novo filtro
          </Button>
        )}
      </div>
    </TopBarFilters>
  )
}
