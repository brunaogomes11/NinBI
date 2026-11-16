import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

function renderHome() {
  return renderApp('/', {
    handlers: [setupStatusHandler(false), sessionHandler(makeUser())],
  })
}

describe('AppShell', () => {
  it('SHELL-01 shell mostra sidebar, barra superior e área de conteúdo em tema escuro', async () => {
    const { container } = renderHome()

    const sidebar = await screen.findByRole('navigation')
    expect(sidebar).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('dark')
    expect(main.querySelector('[data-slot="card"]')).toHaveClass('bg-card')
    expect(container.querySelectorAll('main')).toHaveLength(1)
  })

  it('SHELL-07 sem dashboards a página inicial mostra Nenhum dashboard ainda', async () => {
    renderHome()

    expect(
      await screen.findByRole('heading', { name: 'Nenhum dashboard ainda' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Nenhum dashboard ainda')
  })

  it('SHELL-10 sidebar fixa e só a área de conteúdo rola', async () => {
    renderHome()
    const sidebar = await screen.findByRole('navigation')
    const main = screen.getByRole('main')
    const root = sidebar.parentElement as HTMLElement

    expect(root).toHaveClass('h-screen', 'overflow-hidden')
    expect(sidebar).toHaveClass('w-60', 'shrink-0')
    expect(sidebar.className).not.toMatch(/overflow/)
    expect(main).toHaveClass('overflow-y-auto', 'overflow-x-hidden')
    // a única área rolável dentro da sidebar é a lista de dashboards
    expect(sidebar.querySelectorAll('.overflow-y-auto')).toHaveLength(1)
    expect(sidebar.contains(main)).toBe(false)
  })
})
