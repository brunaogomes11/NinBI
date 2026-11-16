import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
  usersHandler,
} from '@/test/renderApp'
import { SETTINGS_TABS } from './settingsTabs'

const initialAvailability = SETTINGS_TABS.map((tab) => tab.available)

afterEach(() => {
  SETTINGS_TABS.forEach((tab, index) => {
    tab.available = initialAvailability[index]
  })
})

function openSettings(path: string) {
  return renderApp(path, {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      usersHandler(),
    ],
  })
}

describe('SettingsPage', () => {
  it('CFG-01 clicar em Configurações mostra a página com a aba Usuários', async () => {
    const { user, router } = renderApp('/', {
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser()),
        usersHandler(),
      ],
    })

    await user.click(await screen.findByRole('link', { name: 'Configurações' }))

    expect(
      await screen.findByRole('heading', { name: 'Configurações' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Usuários' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(router.state.location.pathname).toBe('/configuracoes/usuarios')
  })

  it('CFG-02 abas na ordem Conexões, Usuários, LLM', async () => {
    expect(SETTINGS_TABS.map((tab) => tab.label)).toEqual([
      'Conexões',
      'Usuários',
      'LLM',
    ])

    // Nesta feature só "Usuários" tem conteúdo.
    const first = openSettings('/configuracoes/usuarios')
    expect(await screen.findAllByRole('tab')).toHaveLength(1)
    expect(screen.getByRole('tab', { name: 'Usuários' })).toBeInTheDocument()
    first.unmount()

    for (const tab of SETTINGS_TABS) tab.available = true
    openSettings('/configuracoes/usuarios')
    const tabs = await screen.findAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Conexões',
      'Usuários',
      'LLM',
    ])
  })

  it('CFG-03 aba escolhida fica na URL e continua aberta ao recarregar', async () => {
    for (const tab of SETTINGS_TABS) tab.available = true
    const first = openSettings('/configuracoes/usuarios')

    await first.user.click(await screen.findByRole('tab', { name: 'LLM' }))

    await waitFor(() =>
      expect(first.router.state.location.pathname).toBe('/configuracoes/llm'),
    )
    expect(screen.getByRole('tab', { name: 'LLM' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    first.unmount()

    openSettings('/configuracoes/llm')
    expect(
      await screen.findByRole('tab', { name: 'LLM', selected: true }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Usuários' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('CFG-01 /configuracoes abre a primeira aba visível', async () => {
    const { router } = openSettings('/configuracoes')

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/configuracoes/usuarios'),
    )
  })
})
