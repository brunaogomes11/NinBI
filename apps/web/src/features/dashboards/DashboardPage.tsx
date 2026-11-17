import {
  can,
  type DashboardDto,
  type DashboardFilter,
  extractParameterNames,
  MESSAGES,
} from '@ninbi/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, RefreshCw, Share2, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
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
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAiStatus } from '@/features/ai/api'
import { useAiGenerations } from '@/features/ai/useAiGenerations'
import { AssistantPanel } from '@/features/assistant/AssistantPanel'
import { useAssistantMessages } from '@/features/assistant/api'
import { useAssistant } from '@/features/assistant/useAssistant'
import { useSession } from '@/features/auth/useSession'
import { useConnections } from '@/features/connections/api'
import { FilterBar } from '@/features/filters/FilterBar'
import { FilterEditorDialog } from '@/features/filters/FilterEditorDialog'
import {
  FilterSessionProvider,
  useFilterParams,
  useFilterSession,
} from '@/features/filters/filter-session'
import { widgetsUsingFilter } from '@/features/filters/filter-values'
import { RemoveFilterDialog } from '@/features/filters/RemoveFilterDialog'
import {
  RefreshControl,
  useLastUpdate,
} from '@/features/refresh/RefreshControl'
import { useAutoRefresh } from '@/features/refresh/useAutoRefresh'
import { ShareDialog } from '@/features/sharing/ShareDialog'
import { TopBarAction } from '@/features/shell/TopBar'
import {
  hasWidgetQuery,
  widgetResultKey,
} from '@/features/widgets/useWidgetResult'
import { WidgetEditorDialog } from '@/features/widgets/WidgetEditorDialog'
import { ApiError } from '@/lib/api'
import { useDashboard } from './api'
import { DashboardGrid } from './DashboardGrid'
import { DashboardTabsBar } from './DashboardTabsBar'
import { DeleteDashboardDialog } from './DeleteDashboardDialog'
import {
  addFilter,
  addTab,
  addWidget,
  type DashboardDraft,
  removeFilter,
  removeTab,
  removeWidget,
  renameTab,
  setConnection,
  setLayout,
  setName,
  setRefreshInterval,
  updateFilter,
  updateWidget,
} from './draft'
import { useDashboardEditor } from './useDashboardEditor'

function NotFound() {
  return (
    <Card className="items-start gap-3 rounded-card p-6">
      <h1 className="font-semibold text-xl">{MESSAGES.dashboardNotFound}</h1>
      <Link to="/" className="text-accent-text underline">
        Ir para a página inicial
      </Link>
    </Card>
  )
}

const ASSISTANT_OPEN_KEY = 'ninbi-assistant-open'

function readAssistantOpen(): boolean {
  try {
    return localStorage.getItem(ASSISTANT_OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeAssistantOpen(open: boolean) {
  try {
    localStorage.setItem(ASSISTANT_OPEN_KEY, open ? '1' : '0')
  } catch {
    // sem armazenamento o painel só não lembra (CHAT-03)
  }
}

/** A descrição de "Descrever para a IA" que veio na navegação (GEN-02). */
function promptFromState(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null
  const prompt = (state as { assistantPrompt?: unknown }).assistantPrompt
  return typeof prompt === 'string' && prompt.trim() !== '' ? prompt : null
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'DASHBOARD_NOT_FOUND'
}

/** Qualquer 404 `DASHBOARD_NOT_FOUND` de uma consulta deste dashboard troca a página pela mensagem (DASH-15). */
function useNotFoundWatcher(dashboardId: string, onNotFound: () => void) {
  const queryClient = useQueryClient()
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (
          event.type === 'updated' &&
          event.action.type === 'error' &&
          event.query.queryKey[1] === dashboardId &&
          isNotFound(event.action.error)
        ) {
          onNotFound()
        }
      }),
    [queryClient, dashboardId, onNotFound],
  )
}

/** Campos "Nome" e "Conexão" do dashboard, só em edição (EDIT-08). */
function DashboardEditFields({
  draft,
  onChange,
}: {
  draft: DashboardDraft
  onChange: (apply: (current: DashboardDraft) => DashboardDraft) => void
}) {
  const connections = useConnections()
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor="dashboard-name">Nome</Label>
        <Input
          id="dashboard-name"
          autoComplete="off"
          value={draft.name}
          onChange={(event) => {
            const name = event.target.value
            onChange((current) => setName(current, name))
          }}
        />
      </div>
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor="dashboard-connection">Conexão</Label>
        <Select
          value={draft.connectionId}
          onValueChange={(connectionId) =>
            onChange((current) => setConnection(current, connectionId))
          }
        >
          <SelectTrigger id="dashboard-connection" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(connections.data ?? []).map((connection) => (
              <SelectItem key={connection.id} value={connection.id}>
                {connection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

type DashboardEditor = ReturnType<typeof useDashboardEditor>

function DashboardViewBody({
  dashboard,
  editor,
  onNotFound,
}: {
  dashboard: DashboardDto
  editor: DashboardEditor
  onNotFound: () => void
}) {
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const { user: sessionUser } = useSession()
  const [selectedTabId, setSelectedTabId] = useState(dashboard.tabs[0]?.id)
  useNotFoundWatcher(dashboard.id, onNotFound)
  const { draft } = editor
  const tabs = draft ? draft.tabs : dashboard.tabs
  const shownTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0]
  const edit = draft ? { connectionId: draft.connectionId } : undefined
  const [filterDialog, setFilterDialog] = useState<{
    filter: DashboardFilter | null
  } | null>(null)
  const [removingFilter, setRemovingFilter] = useState<DashboardFilter | null>(
    null,
  )
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null)
  const editingWidget = shownTab?.widgets.find(
    (widget) => widget.id === editingWidgetId,
  )
  const [aiFailure, setAiFailure] = useState<{
    widgetId: string
    cypher: string | null
    message: string
  } | null>(null)
  const [newWidgetId, setNewWidgetId] = useState<string | null>(null)
  const canUseAi = sessionUser ? can(sessionUser.role, 'ai.use') : false
  const aiStatus = useAiStatus(draft !== null && canUseAi)
  const canUseAssistant = canUseAi && dashboard.permissions.edit
  const location = useLocation()
  const navigate = useNavigate()
  const initialPrompt = useRef<string | null>(promptFromState(location.state))
  const [assistantOpen, setAssistantOpen] = useState(
    () => initialPrompt.current !== null || readAssistantOpen(),
  )
  // A conversa carrega antes do primeiro envio, para a mensagem aceita não se perder (GEN-02).
  const conversation = useAssistantMessages(
    dashboard.id,
    canUseAssistant && (assistantOpen || initialPrompt.current !== null),
  )
  const assistant = useAssistant({
    dashboardId: dashboard.id,
    draft,
    setDraft: editor.change,
    ensureEditing: () => {
      if (!draft) editor.start()
    },
    editing: draft !== null,
  })
  const conversationReady = conversation.status === 'success'
  const { send: sendToAssistant } = assistant
  // O pedido inicial sai uma vez e a navegação perde o estado, então recarregar não reenvia (GEN-02).
  useEffect(() => {
    const prompt = initialPrompt.current
    if (!prompt || !canUseAssistant || !conversationReady) return
    initialPrompt.current = null
    writeAssistantOpen(true)
    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: null },
    )
    sendToAssistant(prompt)
  }, [
    canUseAssistant,
    conversationReady,
    navigate,
    location.pathname,
    location.search,
    sendToAssistant,
  ])
  const ai = useAiGenerations({
    dashboardId: dashboard.id,
    draft,
    setDraft: editor.change,
    editing: draft !== null,
    assistantBusy: assistant.running,
    onFailed: (widgetId, failure) => {
      setAiFailure({ widgetId, ...failure })
      setEditingWidgetId(widgetId)
    },
  })

  const session = useFilterSession()
  const { setInterval: setSessionInterval } = session
  // O intervalo salvo vira o da sessão (ao abrir e depois de salvar a edição).
  useEffect(() => {
    setSessionInterval(dashboard.refreshIntervalSec)
  }, [dashboard.refreshIntervalSec, setSessionInterval])
  const filterValues = useFilterParams()
  const activeKeys = (shownTab?.widgets ?? [])
    .filter((widget) => hasWidgetQuery(widget, edit))
    .map((widget) =>
      widgetResultKey(
        dashboard.id,
        dashboard.version,
        widget,
        edit,
        filterValues,
      ),
    )
  useAutoRefresh({
    intervalSec: session.intervalSec,
    paused: draft !== null,
    resetKey: session.paramsVersion,
    queryKeys: activeKeys,
  })
  const updatedAt = useLastUpdate(activeKeys)

  function refresh() {
    for (const widget of shownTab?.widgets ?? []) {
      void queryClient.invalidateQueries({
        queryKey: widgetResultKey(
          dashboard.id,
          dashboard.version,
          widget,
          edit,
          filterValues,
        ),
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {dashboard.permissions.edit && (
        <TopBarAction>
          {draft ? (
            <Button
              type="button"
              disabled={editor.saving}
              onClick={editor.save}
              className="bg-[image:var(--gradient-brand)] text-primary-foreground"
            >
              Salvar
            </Button>
          ) : (
            <Button
              type="button"
              onClick={editor.start}
              className="bg-[image:var(--gradient-brand)] text-primary-foreground"
            >
              Editar
            </Button>
          )}
        </TopBarAction>
      )}
      <FilterBar
        dashboardId={dashboard.id}
        version={dashboard.version}
        filters={draft?.filters ?? dashboard.filters}
        edit={
          draft && dashboard.permissions.edit
            ? {
                connectionId: draft.connectionId,
                onNew: () => setFilterDialog({ filter: null }),
                onEdit: (filter) => setFilterDialog({ filter }),
                onRemove: setRemovingFilter,
              }
            : undefined
        }
      />
      {draft && filterDialog && (
        <FilterEditorDialog
          dashboardId={dashboard.id}
          connectionId={draft.connectionId}
          filter={filterDialog.filter}
          otherFilters={draft.filters}
          onApply={(filter) =>
            editor.change((current) =>
              filterDialog.filter
                ? updateFilter(current, filterDialog.filter.id, filter)
                : addFilter(current, filter),
            )
          }
          onClose={() => setFilterDialog(null)}
        />
      )}
      {draft && removingFilter && (
        <RemoveFilterDialog
          filter={removingFilter}
          widgetCount={widgetsUsingFilter(
            removingFilter,
            draft.tabs.flatMap((tab) =>
              tab.widgets.map((widget) => ({
                parameters: extractParameterNames(widget.cypher ?? ''),
              })),
            ),
          )}
          onConfirm={() => {
            editor.change((current) => removeFilter(current, removingFilter.id))
            setRemovingFilter(null)
          }}
          onClose={() => setRemovingFilter(null)}
        />
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h1 className="min-w-0 truncate font-semibold text-xl">
            {draft ? draft.name : dashboard.name}
          </h1>
          {sessionUser && dashboard.ownerId !== sessionUser.id && (
            <span className="text-muted-foreground text-sm">
              {MESSAGES.sharedBy(dashboard.ownerName)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {draft && (
            <Button
              type="button"
              variant="outline"
              onClick={editor.requestDiscard}
            >
              Descartar
            </Button>
          )}
          {dashboard.permissions.share && !draft && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShareOpen(true)}
            >
              <Share2 aria-hidden="true" />
              {MESSAGES.shareTitle}
            </Button>
          )}
          {canUseAssistant && (
            <Button
              type="button"
              variant="outline"
              aria-pressed={assistantOpen}
              onClick={() => {
                setAssistantOpen(!assistantOpen)
                writeAssistantOpen(!assistantOpen)
              }}
            >
              <Sparkles aria-hidden="true" />
              {MESSAGES.assistantToggle}
            </Button>
          )}
          <RefreshControl
            value={draft ? draft.refreshIntervalSec : session.intervalSec}
            onChange={(sec) =>
              draft
                ? editor.change((current) => setRefreshInterval(current, sec))
                : session.setInterval(sec)
            }
            updatedAt={updatedAt}
          />
          <Button type="button" variant="outline" onClick={refresh}>
            <RefreshCw aria-hidden="true" />
            Atualizar
          </Button>
          {dashboard.permissions.delete && !draft && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setDeleteOpen(true)}>
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {shareOpen && (
        <ShareDialog
          dashboardId={dashboard.id}
          onClose={() => setShareOpen(false)}
        />
      )}
      <DeleteDashboardDialog
        dashboard={dashboard}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onNotFound={onNotFound}
      />
      {draft && <DashboardEditFields draft={draft} onChange={editor.change} />}
      {editor.saveError && (
        <p role="alert" className="text-destructive text-sm">
          {editor.saveError}
        </p>
      )}
      <div className="flex items-start gap-4">
        <div
          data-slot="dashboard-main"
          className="flex min-w-0 flex-1 flex-col gap-4"
        >
          {shownTab && (
            <>
              <DashboardTabsBar
                tabs={tabs}
                activeTabId={shownTab.id}
                onSelect={setSelectedTabId}
                edit={
                  draft
                    ? {
                        onAdd: () => {
                          const id = crypto.randomUUID()
                          editor.change((current) => addTab(current, id))
                          setSelectedTabId(id)
                        },
                        onRename: (tabId, name) =>
                          editor.change((current) =>
                            renameTab(current, tabId, name),
                          ),
                        onRemove: (tabId) =>
                          editor.change((current) => removeTab(current, tabId)),
                      }
                    : undefined
                }
              />
              <DashboardGrid
                key={shownTab.id}
                dashboardId={dashboard.id}
                version={dashboard.version}
                widgets={shownTab.widgets}
                edit={
                  draft && shownTab
                    ? {
                        connectionId: draft.connectionId,
                        onLayoutChange: (layouts) =>
                          editor.change((current) =>
                            setLayout(current, shownTab.id, layouts),
                          ),
                        onEditWidget: setEditingWidgetId,
                        ai: canUseAi
                          ? {
                              available: aiStatus.data?.configured === true,
                              busy: assistant.running,
                              stateOf: ai.stateOf,
                              start: (widgetId, prompt) =>
                                void ai.start(widgetId, prompt),
                              cancel: ai.cancel,
                            }
                          : undefined,
                        onRemoveWidget: (widgetId) =>
                          editor.change((current) =>
                            removeWidget(current, shownTab.id, widgetId),
                          ),
                        onAddWidget: () => {
                          const id = crypto.randomUUID()
                          editor.change((current) =>
                            addWidget(current, shownTab.id, id),
                          )
                          setEditingWidgetId(id)
                          setNewWidgetId(id)
                        },
                      }
                    : undefined
                }
              />
              {editingWidget && draft && (
                <WidgetEditorDialog
                  key={editingWidget.id}
                  dashboardId={dashboard.id}
                  connectionId={draft.connectionId}
                  widget={editingWidget}
                  initialCypher={
                    aiFailure?.widgetId === editingWidget.id
                      ? (aiFailure.cypher ?? undefined)
                      : undefined
                  }
                  initialError={
                    aiFailure?.widgetId === editingWidget.id
                      ? aiFailure.message
                      : undefined
                  }
                  onApply={(changes) =>
                    editor.change((current) =>
                      updateWidget(
                        current,
                        shownTab.id,
                        editingWidget.id,
                        changes,
                      ),
                    )
                  }
                  ai={
                    canUseAi && newWidgetId === editingWidget.id
                      ? {
                          available: aiStatus.data?.configured === true,
                          state: ai.stateOf(editingWidget.id),
                          onStart: (prompt) => {
                            setAiFailure(null)
                            void ai.start(editingWidget.id, prompt)
                          },
                          onCancel: () => ai.cancel(editingWidget.id),
                        }
                      : undefined
                  }
                  onClose={() => {
                    setEditingWidgetId(null)
                    setNewWidgetId(null)
                    setAiFailure(null)
                  }}
                />
              )}
            </>
          )}
        </div>
        {canUseAssistant && assistantOpen && (
          <AssistantPanel
            dashboardId={dashboard.id}
            assistant={assistant}
            onClose={() => {
              setAssistantOpen(false)
              writeAssistantOpen(false)
            }}
          />
        )}
      </div>
      <AlertDialog
        open={editor.discardOpen}
        onOpenChange={editor.setDiscardOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{MESSAGES.discardChanges}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={editor.confirmDiscard}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={editor.blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && editor.blocker.state === 'blocked') {
            editor.blocker.reset()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{MESSAGES.leaveWithoutSaving}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (editor.blocker.state === 'blocked') editor.blocker.proceed()
              }}
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DashboardView(props: {
  dashboard: DashboardDto
  onNotFound: () => void
}) {
  // Em edição a sessão acompanha os filtros do rascunho (FLT-17, FLT-19).
  const editor = useDashboardEditor(props.dashboard, props.onNotFound)
  return (
    <FilterSessionProvider
      filters={editor.draft?.filters ?? props.dashboard.filters}
      refreshIntervalSec={props.dashboard.refreshIntervalSec}
    >
      <DashboardViewBody {...props} editor={editor} />
    </FilterSessionProvider>
  )
}

export function DashboardPage() {
  const { dashboardId = '' } = useParams()
  const dashboard = useDashboard(dashboardId)
  const [goneId, setGoneId] = useState<string | null>(null)

  if (
    goneId === dashboardId ||
    (dashboard.isError && isNotFound(dashboard.error))
  ) {
    return <NotFound />
  }
  if (dashboard.isError) {
    return (
      <Card className="items-start gap-3 rounded-card p-6">
        <p role="alert" className="text-destructive">
          {dashboard.error.message}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => dashboard.refetch()}
        >
          Tentar novamente
        </Button>
      </Card>
    )
  }
  if (!dashboard.data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  return (
    <DashboardView
      key={dashboard.data.id}
      dashboard={dashboard.data}
      onNotFound={() => setGoneId(dashboardId)}
    />
  )
}
