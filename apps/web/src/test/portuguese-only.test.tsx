import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  makeUser,
  makeUserRow,
  noSessionHandler,
  renderApp,
  sessionHandler,
  setupStatusHandler,
  usersHandler,
} from './renderApp'

/** Rótulos em inglês que nenhuma tela pode mostrar (SHELL-09). */
const FORBIDDEN_LABELS = [
  'Login',
  'Sign in',
  'Log out',
  'Logout',
  'Password',
  'Email address',
  'Settings',
  'Users',
  'Save',
  'Cancel',
  'Name',
  'Role',
  'Status',
  'Active',
  'Disabled',
  'Loading',
  'Retry',
  'Dark',
  'Light',
  'Submit',
  'Close',
  'Notifications',
]

const FORBIDDEN = new RegExp(
  `(^|[^\\p{L}])(${FORBIDDEN_LABELS.join('|')})(?![\\p{L}])`,
  'u',
)

const TEXT_ATTRIBUTES = ['aria-label', 'placeholder', 'title', 'alt']

/** Todo texto visível ou lido por leitor de tela na tela atual, incluindo diálogos e menus abertos. */
function visibleStrings(): string[] {
  const found: string[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    if (parent?.closest('script, style')) continue
    const text = node.textContent?.trim()
    if (text) found.push(text)
  }
  for (const element of document.body.querySelectorAll('*')) {
    for (const attribute of TEXT_ATTRIBUTES) {
      const value = element.getAttribute(attribute)
      if (value) found.push(value)
    }
  }
  return found
}

function expectPortugueseOnly() {
  const offending = visibleStrings().filter((text) => FORBIDDEN.test(text))
  expect(offending).toEqual([])
}

const admin = makeUser()
const listHandlers = [
  setupStatusHandler(false),
  sessionHandler(admin),
  usersHandler([
    makeUserRow(),
    makeUserRow({
      id: 'u-2',
      name: 'Bruno Lima',
      email: 'bruno@x.com',
      role: 'EDITOR',
    }),
    makeUserRow({
      id: 'u-3',
      name: 'Carla Dias',
      email: 'carla@x.com',
      role: 'VIEWER',
      status: 'DISABLED',
    }),
  ]),
]

describe('interface em português', () => {
  it('SHELL-09 telas não mostram rótulos em inglês', async () => {
    // primeiro acesso
    const setup = renderApp('/primeiro-acesso', {
      handlers: [setupStatusHandler(true), noSessionHandler()],
    })
    await screen.findByRole('heading', { name: 'Criar administrador' })
    expectPortugueseOnly()
    setup.unmount()

    // entrar
    const login = renderApp('/entrar', {
      handlers: [setupStatusHandler(false), noSessionHandler()],
    })
    await screen.findByRole('heading', { name: 'Entrar' })
    expectPortugueseOnly()
    login.unmount()

    // definir nova senha
    const initial = renderApp('/definir-senha', {
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser({ mustChangePassword: true })),
      ],
    })
    await screen.findByRole('heading', { name: 'Definir nova senha' })
    expectPortugueseOnly()
    initial.unmount()

    // página sem permissão
    const forbidden = renderApp('/configuracoes/usuarios', {
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser({ role: 'VIEWER' })),
      ],
    })
    await screen.findByText('Você não tem permissão para acessar esta página')
    expectPortugueseOnly()
    forbidden.unmount()

    // página inicial, com o menu do usuário e o diálogo de alterar senha
    const home = renderApp('/', {
      handlers: [setupStatusHandler(false), sessionHandler(admin)],
    })
    await screen.findByRole('heading', { name: 'Nenhum dashboard ainda' })
    expectPortugueseOnly()
    await home.user.click(screen.getByRole('button', { name: /Ana Souza/ }))
    await screen.findByRole('menuitem', { name: 'Alterar senha' })
    expectPortugueseOnly()
    await home.user.click(
      screen.getByRole('menuitem', { name: 'Alterar senha' }),
    )
    await screen.findByRole('dialog')
    expectPortugueseOnly()
    home.unmount()

    // configurações / usuários: lista, diálogo de novo usuário e menu da linha
    const users = renderApp('/configuracoes/usuarios', {
      handlers: listHandlers,
    })
    await screen.findByText('Bruno Lima')
    expectPortugueseOnly()
    await users.user.click(screen.getByRole('button', { name: 'Novo usuário' }))
    await screen.findByRole('dialog')
    expectPortugueseOnly()
    await users.user.click(screen.getByRole('combobox', { name: 'Papel' }))
    await screen.findByRole('option', { name: 'Editor' })
    expectPortugueseOnly()
    users.unmount()

    // ações por usuário: menu, alterar papel, redefinir senha e desativar
    const rows = renderApp('/configuracoes/usuarios', {
      handlers: listHandlers,
    })
    await rows.user.click(
      await screen.findByRole('button', { name: 'Ações de Bruno Lima' }),
    )
    await screen.findByRole('menuitem', { name: 'Alterar papel' })
    expectPortugueseOnly()
    await rows.user.click(
      screen.getByRole('menuitem', { name: 'Alterar papel' }),
    )
    await screen.findByRole('dialog')
    expectPortugueseOnly()
    await rows.user.keyboard('{Escape}')
    await rows.user.click(
      await screen.findByRole('button', { name: 'Ações de Bruno Lima' }),
    )
    await rows.user.click(
      await screen.findByRole('menuitem', { name: 'Redefinir senha' }),
    )
    await screen.findByRole('dialog')
    expectPortugueseOnly()
    await rows.user.keyboard('{Escape}')
    await rows.user.click(
      await screen.findByRole('button', { name: 'Ações de Bruno Lima' }),
    )
    await rows.user.click(
      await screen.findByRole('menuitem', { name: 'Desativar' }),
    )
    await screen.findByRole('alertdialog')
    expectPortugueseOnly()
    rows.unmount()

    // erro ao carregar a lista
    const failed = renderApp('/configuracoes/usuarios', {
      handlers: [
        setupStatusHandler(false),
        sessionHandler(admin),
        http.get('/api/users', () =>
          HttpResponse.json(
            { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro inesperado.' },
            { status: 500 },
          ),
        ),
      ],
    })
    await screen.findByText('Não foi possível carregar os usuários')
    expectPortugueseOnly()
    failed.unmount()
  })
})
