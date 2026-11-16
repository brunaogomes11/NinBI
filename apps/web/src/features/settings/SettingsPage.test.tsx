import type { Role } from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { connectionsHandler } from '@/test/fixtures/connections'
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

function openSettings(path: string, role: Role = 'ADMIN') {
  return renderApp(path, {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role })),
      connectionsHandler(),
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
        connectionsHandler(),
        usersHandler(),
      ],
    })

    await user.click(await screen.findByRole('link', { name: 'Configurações' }))

    expect(
      await screen.findByRole('heading', { name: 'Configurações' }),
    ).toBeInTheDocument()
    // Com a aba "Conexões" ligada (AD-041), ela é a primeira e abre selecionada; "Usuários" está ao lado.
    expect(screen.getByRole('tab', { name: 'Conexões' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Usuários' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(router.state.location.pathname).toBe('/configuracoes/conexoes')
  })

  it('CFG-02 abas na ordem Conexões, Usuários, Dashboards, LLM', async () => {
    expect(SETTINGS_TABS.map((tab) => tab.label)).toEqual([
      'Conexões',
      'Usuários',
      'Dashboards',
      'LLM',
    ])

    // Com "Conexões" e "Dashboards" ligadas (AD-041, AD-046): o Admin vê Conexões, Usuários e Dashboards; o Editor, só Conexões.
    const admin = openSettings('/configuracoes/conexoes')
    expect(
      (await screen.findAllByRole('tab')).map((tab) => tab.textContent),
    ).toEqual(['Conexões', 'Usuários', 'Dashboards'])
    admin.unmount()

    const editor = openSettings('/configuracoes/conexoes', 'EDITOR')
    expect(
      (await screen.findAllByRole('tab')).map((tab) => tab.textContent),
    ).toEqual(['Conexões'])
    editor.unmount()

    for (const tab of SETTINGS_TABS) tab.available = true
    openSettings('/configuracoes/usuarios')
    const tabs = await screen.findAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Conexões',
      'Usuários',
      'Dashboards',
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
      expect(router.state.location.pathname).toBe('/configuracoes/conexoes'),
    )
  })
})
