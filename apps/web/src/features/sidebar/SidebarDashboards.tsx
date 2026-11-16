import {
  can,
  MESSAGES,
  type SidebarDashboardNode,
  type SidebarGroupNode,
} from '@ninbi/contracts'
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  MoreHorizontal,
  Plus,
} from 'lucide-react'
import { type DragEvent, useRef, useState } from 'react'
import { NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/useSession'
import { useSaveSidebar, useSidebar } from '@/features/dashboards/api'
import { NewDashboardDialog } from '@/features/dashboards/NewDashboardDialog'
import { sidebarItemClass } from '@/features/shell/Sidebar'
import { GroupNameDialog } from './GroupDialogs'
import {
  addGroup,
  type DropTarget,
  moveItem,
  removeGroup,
  renameGroup,
} from './layout'

export const COLLAPSED_STORAGE_KEY = 'ninbi-sidebar-collapsed'

function readCollapsed(): string[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? '[]',
    )
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

function writeCollapsed(ids: string[]) {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // sem armazenamento: o grupo só não lembra o estado
  }
}

/** Arrastar nativo: `draggable` e `dropOn` ligam um elemento ao arraste da lista. */
interface Dnd {
  draggable: (id: string) => {
    draggable: true
    onDragStart: (event: DragEvent) => void
  }
  dropOn: (target: DropTarget) => {
    onDragOver: (event: DragEvent) => void
    onDrop: (event: DragEvent) => void
  }
}

function DashboardItem({
  node,
  dnd,
  dropTarget = true,
}: {
  node: SidebarDashboardNode
  dnd: Dnd
  dropTarget?: boolean
}) {
  return (
    <NavLink
      to={`/dashboards/${node.id}`}
      className={sidebarItemClass}
      {...dnd.draggable(node.id)}
      {...(dropTarget ? dnd.dropOn({ before: node.id }) : {})}
    >
      <span title={node.name} className="min-w-0 truncate">
        {node.name}
      </span>
    </NavLink>
  )
}

function GroupSection({
  group,
  collapsed,
  onToggle,
  onRename,
  onRemove,
  dnd,
}: {
  group: SidebarGroupNode
  collapsed: boolean
  onToggle: () => void
  onRename: () => void
  onRemove: () => void
  dnd: Dnd
}) {
  const Chevron = collapsed ? ChevronRight : ChevronDown
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={!collapsed}
          onClick={onToggle}
          {...dnd.draggable(group.id)}
          {...dnd.dropOn({ intoGroup: group.id })}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-control px-3 py-2 text-left font-medium text-muted-foreground text-sm hover:bg-card-elevated hover:text-foreground"
        >
          <Chevron className="size-4 shrink-0" aria-hidden="true" />
          <span title={group.name} className="min-w-0 truncate">
            {group.name}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Ações do grupo ${group.name}`}
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onRename}>
              Renomear grupo
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRemove}>
              Excluir grupo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!collapsed && (
        <div className="flex flex-col gap-1 pl-3">
          {group.items.length === 0 ? (
            <p className="px-3 py-1 text-muted-foreground text-sm">
              {MESSAGES.groupEmpty}
            </p>
          ) : (
            group.items.map((item) => (
              <DashboardItem key={item.id} node={item} dnd={dnd} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

/** Dashboards soltos e grupos do usuário, dentro da área que rola da sidebar. */
export function SidebarDashboards() {
  const { user } = useSession()
  const sidebar = useSidebar()
  const save = useSaveSidebar()
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed)
  const [newDashboardOpen, setNewDashboardOpen] = useState(false)
  const dragged = useRef<string | null>(null)
  const [groupDialog, setGroupDialog] = useState<
    { mode: 'new' } | { mode: 'rename'; group: SidebarGroupNode } | null
  >(null)
  const canCreate = !!user && can(user.role, 'dashboards.create')

  function toggle(groupId: string) {
    const next = collapsed.includes(groupId)
      ? collapsed.filter((id) => id !== groupId)
      : [...collapsed, groupId]
    setCollapsed(next)
    writeCollapsed(next)
  }

  const dnd: Dnd = {
    draggable: (id) => ({
      draggable: true,
      onDragStart: (event) => {
        event.stopPropagation()
        dragged.current = id
        event.dataTransfer?.setData('text/plain', id)
      },
    }),
    dropOn: (target) => ({
      onDragOver: (event) => event.preventDefault(),
      onDrop: (event) => {
        event.preventDefault()
        event.stopPropagation()
        const id = dragged.current
        dragged.current = null
        if (!id || !sidebar.data) return
        const next = moveItem(sidebar.data, id, target)
        if (next !== sidebar.data) save.mutate(next)
      },
    }),
  }

  return (
    <div className="flex min-h-full flex-col gap-1">
      {newDashboardOpen && (
        <NewDashboardDialog open onOpenChange={setNewDashboardOpen} />
      )}
      {groupDialog && (
        <GroupNameDialog
          title={groupDialog.mode === 'new' ? 'Novo grupo' : 'Renomear grupo'}
          initialName={
            groupDialog.mode === 'rename' ? groupDialog.group.name : ''
          }
          onClose={() => setGroupDialog(null)}
          onSubmit={(name) => {
            if (!sidebar.data) return
            save.mutate(
              groupDialog.mode === 'new'
                ? addGroup(sidebar.data, crypto.randomUUID(), name)
                : renameGroup(sidebar.data, groupDialog.group.id, name),
            )
          }}
        />
      )}
      <div className="flex flex-col gap-1 pb-2">
        {canCreate && (
          <Button
            type="button"
            variant="ghost"
            className="justify-start"
            onClick={() => setNewDashboardOpen(true)}
          >
            <Plus aria-hidden="true" />
            Novo dashboard
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          className="justify-start"
          onClick={() => setGroupDialog({ mode: 'new' })}
        >
          <FolderPlus aria-hidden="true" />
          Novo grupo
        </Button>
      </div>
      {sidebar.isError ? (
        <div className="flex flex-col items-start gap-2 px-1">
          <p role="alert" className="text-destructive text-sm">
            {MESSAGES.dashboardsLoadFailed}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => sidebar.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : !sidebar.data ? (
        <div className="flex flex-col gap-2 px-1">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (
        <>
          {sidebar.data.items.map((item) =>
            item.type === 'group' ? (
              <GroupSection
                key={item.id}
                group={item}
                collapsed={collapsed.includes(item.id)}
                onToggle={() => toggle(item.id)}
                onRename={() => setGroupDialog({ mode: 'rename', group: item })}
                onRemove={() =>
                  sidebar.data &&
                  save.mutate(removeGroup(sidebar.data, item.id))
                }
                dnd={dnd}
              />
            ) : (
              <DashboardItem key={item.id} node={item} dnd={dnd} />
            ),
          )}
          {sidebar.data.shared.length > 0 && (
            <section
              aria-labelledby="sidebar-shared-title"
              className="mt-2 flex flex-col gap-1"
            >
              <h2
                id="sidebar-shared-title"
                className="px-3 py-1 font-medium text-muted-foreground text-xs"
              >
                {MESSAGES.sharedWithMe}
              </h2>
              {sidebar.data.shared.map((item) => (
                <DashboardItem
                  key={item.id}
                  node={item}
                  dnd={dnd}
                  dropTarget={false}
                />
              ))}
            </section>
          )}
          <div
            data-testid="sidebar-end"
            className="min-h-8 flex-1"
            {...dnd.dropOn({ rootEnd: true })}
          />
        </>
      )}
    </div>
  )
}
