import type { DashboardTabDto } from '@ninbi/contracts'
import { cn } from '@/lib/utils'

/** Abas do dashboard na ordem; a barra rola na horizontal sem quebrar linha (TAB-08). */
export function DashboardTabsBar({
  tabs,
  activeTabId,
  onSelect,
}: {
  tabs: DashboardTabDto[]
  activeTabId: string
  onSelect: (tabId: string) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Abas do dashboard"
      className="flex overflow-x-auto whitespace-nowrap border-border border-b"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTabId
        return (
          <button
            key={tab.id}
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
        )
      })}
    </div>
  )
}
