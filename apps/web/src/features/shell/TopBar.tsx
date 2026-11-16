import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { UserMenu } from './UserMenu'

interface TopBarActionContextValue {
  /** Elemento do slot da barra; null até a barra montar. */
  slot: HTMLElement | null
  setSlot: (element: HTMLElement | null) => void
}

const TopBarActionContext = createContext<TopBarActionContextValue | null>(null)

/** Envolve a barra e as páginas: é por ele que uma página põe a sua ação na barra. */
export function TopBarActionProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const value = useMemo(() => ({ slot, setSlot }), [slot])
  return (
    <TopBarActionContext.Provider value={value}>
      {children}
    </TopBarActionContext.Provider>
  )
}

function useTopBarContext(): TopBarActionContextValue {
  const value = useContext(TopBarActionContext)
  if (!value) {
    throw new Error('A barra superior precisa de um TopBarActionProvider')
  }
  return value
}

/** O elemento onde a ação principal da página aparece; null enquanto a barra não montou. */
export function useTopBarAction(): HTMLElement | null {
  return useTopBarContext().slot
}

/** Mostra `children` no slot da barra superior enquanto a página está montada. */
export function TopBarAction({ children }: { children: ReactNode }) {
  const slot = useTopBarAction()
  return slot ? createPortal(children, slot) : null
}

export function TopBar() {
  const { setSlot } = useTopBarContext()
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 px-6 py-4">
      <UserMenu />
      <div ref={setSlot} className="flex items-center gap-2" />
    </header>
  )
}
