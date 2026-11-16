import type { DashboardTabDto } from '@ninbi/contracts'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GroupNameDialog } from '@/features/sidebar/GroupDialogs'
import { cn } from '@/lib/utils'

/** Ações de edição das abas; presentes só em modo de edição. */
export interface TabsEdit {
  onAdd: () => void
  onRename: (tabId: string, name: string) => void
  onRemove: (tabId: string) => void
}

/** Abas do dashboard na ordem; a barra rola na horizontal sem quebrar linha (TAB-08). */
export function DashboardTabsBar({
  tabs,
  activeTabId,
  onSelect,
  edit,
}: {
  tabs: DashboardTabDto[]
  activeTabId: string
  onSelect: (tabId: string) => void
  edit?: TabsEdit
}) {
  const [renaming, setRenaming] = useState<DashboardTabDto | null>(null)
  const [removing, setRemoving] = useState<DashboardTabDto | null>(null)

  function requestRemove(tab: DashboardTabDto) {
    if (tab.widgets.length === 0) edit?.onRemove(tab.id)
    else setRemoving(tab)
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Abas do dashboard"
        className="flex items-center overflow-x-auto whitespace-nowrap border-border border-b"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTabId
          return (
            <div key={tab.id} className="flex shrink-0 items-center">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(tab.id)}
                className={cn(
                  'shrink-0 border-b-2 px-4 py-2 font-medium text-sm transition-colors',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.name}
              </button>
              {edit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Menu da aba ${tab.name}`}
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={() => setRenaming(tab)}>
                      Renomear aba
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={tabs.length === 1}
                      onSelect={() => requestRemove(tab)}
                    >
                      Excluir aba
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
        {edit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 shrink-0"
            onClick={edit.onAdd}
          >
            <Plus aria-hidden="true" />
            Nova aba
          </Button>
        )}
      </div>
      {edit && renaming && (
        <GroupNameDialog
          title="Renomear aba"
          initialName={renaming.name}
          onSubmit={(name) => edit.onRename(renaming.id, name)}
          onClose={() => setRenaming(null)}
        />
      )}
      {edit && (
        <AlertDialog
          open={removing !== null}
          onOpenChange={(open) => !open && setRemoving(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Excluir a aba {removing?.name} e seus {removing?.widgets.length}{' '}
                {removing?.widgets.length === 1 ? 'widget' : 'widgets'}?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => removing && edit.onRemove(removing.id)}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
