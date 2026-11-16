import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { TopBar, TopBarActionProvider } from './TopBar'

/** Janela inteira: a sidebar fica fixa e só o `main` rola na vertical. */
export function AppShell() {
  return (
    <TopBarActionProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TopBarActionProvider>
  )
}
