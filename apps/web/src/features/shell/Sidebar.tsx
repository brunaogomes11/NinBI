import { Settings } from 'lucide-react'
import { NavLink } from 'react-router'
import { useSession } from '@/features/auth/useSession'
import { visibleSettingsTabs } from '@/features/settings/settingsTabs'
import { SidebarDashboards } from '@/features/sidebar/SidebarDashboards'
import { cn } from '@/lib/utils'
import { BrandMark } from './BrandMark'
import { ThemeToggle } from './ThemeToggle'

/** Classes de um item da sidebar; o ativo ganha o gradiente da marca. */
export function sidebarItemClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-3 rounded-control px-3 py-2.5 font-medium text-sm transition-colors',
    isActive
      ? 'bg-[image:var(--gradient-brand)] text-primary-foreground'
      : 'text-muted-foreground hover:bg-card-elevated hover:text-foreground',
  )
}

export function Sidebar() {
  const { user } = useSession()
  const showSettings = !!user && visibleSettingsTabs(user.role).length > 0

  return (
    <nav
      aria-label="Barra lateral"
      className="flex w-60 shrink-0 flex-col gap-4 border-border border-r bg-sidebar p-4"
    >
      <BrandMark className="px-2 pt-1" />
      <ThemeToggle />
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <SidebarDashboards />
      </div>
      {showSettings && (
        <NavLink to="/configuracoes" className={sidebarItemClass}>
          <Settings className="size-4" aria-hidden="true" />
          Configurações
        </NavLink>
      )}
    </nav>
  )
}
