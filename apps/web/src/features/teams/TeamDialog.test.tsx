import { MESSAGES, type TeamDto } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeTeam } from '@/test/fixtures/teams'
import {
  makeUser,
  makeUserRow,
  renderApp,
  sessionHandler,
  setupStatusHandler,
  usersHandler,
} from '@/test/renderApp'

const USERS = [
  makeUserRow({ id: 'u-1', name: 'Ana Souza', email: 'ana@x.com' }),
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
  }),
  makeUserRow({
    id: 'u-4',
    name: 'Davi Reis',
    email: 'davi@x.com',
    status: 'DISABLED',
  }),
]

/** Equipes em memória: `POST` e `PATCH` gravam, e `GET` devolve o estado atual. */
function setup(initial: TeamDto[] = []) {
  const state = { teams: initial, bodies: [] as unknown[] }
  const handlers = [
    setupStatusHandler(false),
    sessionHandler(makeUser()),
    usersHandler(USERS),
    http.get('/api/teams', () => HttpResponse.json(state.teams)),
    http.post('/api/teams', async ({ request }) => {
      const body = (await request.json()) as {
        name: string
        memberIds: string[]
      }
      state.bodies.push(body)
      if (body.name.toLowerCase() === 'comercial' && state.teams.length) {
        return HttpResponse.json(
          {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            fieldErrors: { name: MESSAGES.teamNameTaken },
          },
          { status: 400 },
        )
      }
      const members = USERS.filter((u) => body.memberIds.includes(u.id))
      const team = makeTeam({ id: 't-new', name: body.name, members })
      state.teams = [...state.teams, team]
      return HttpResponse.json(team, { status: 201 })
    }),
    http.patch('/api/teams/:id', async ({ request, params }) => {
      const body = (await request.json()) as {
        name: string
        memberIds: string[]
      }
      state.bodies.push(body)
      const members = USERS.filter((u) => body.memberIds.includes(u.id))
      state.teams = state.teams.map((team) =>
        team.id === params.id
          ? { ...team, name: body.name, members, memberCount: members.length }
          : team,
      )
      return HttpResponse.json(state.teams.find((t) => t.id === params.id))
    }),
  ]
  const app = renderApp('/configuracoes/usuarios', { handlers })
  return { ...app, state }
}

const nameField = () => screen.findByRole('textbox', { name: 'Nome' })

describe('TeamDialog', () => {
  it('TEAM-03 Nova equipe com nome e membros aparece na lista', async () => {
    const { user, state } = setup()

    await user.click(
      await screen.findByRole('button', { name: MESSAGES.newTeam }),
    )
    await user.type(await nameField(), 'Comercial')
    await user.click(
      await screen.findByRole('checkbox', { name: /Bruno Lima/ }),
    )
    await user.click(screen.getByRole('checkbox', { name: /Carla Dias/ }))
    // usuário desativado não é oferecido como membro
    expect(screen.queryByRole('checkbox', { name: /Davi Reis/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    const row = (await screen.findByText('Comercial')).closest('tr')
    expect(row).not.toBeNull()
    expect(
      within(row as HTMLElement)
        .getAllByRole('cell')
        .slice(0, 2)
        .map((cell) => cell.textContent),
    ).toEqual(['Comercial', '2'])
    expect(state.bodies).toEqual([
      { name: 'Comercial', memberIds: ['u-2', 'u-3'] },
    ])
  })

  it('TEAM-04 nome inválido ou repetido mostra a mensagem no campo Nome', async () => {
    const { user, state } = setup([makeTeam({ name: 'Comercial' })])

    await user.click(
      await screen.findByRole('button', { name: MESSAGES.newTeam }),
    )
    await user.click(await screen.findByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText(MESSAGES.nameRequired)).toBeInTheDocument()

    await user.type(await nameField(), 'a'.repeat(41))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(
      await screen.findByText(MESSAGES.teamNameTooLong),
    ).toBeInTheDocument()
    expect(state.bodies).toEqual([])

    const field = await nameField()
    await user.clear(field)
    await user.type(field, 'comercial')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText(MESSAGES.teamNameTaken)).toBeInTheDocument()
    expect(state.bodies).toHaveLength(1)
  })

  it('TEAM-05 Editar equipe envia os membros marcados', async () => {
    const { user, state } = setup([makeTeam({ name: 'Comercial' })])

    await user.click(
      await screen.findByRole('button', { name: 'Ações da equipe Comercial' }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: MESSAGES.editTeam }),
    )
    const bruno = await screen.findByRole('checkbox', { name: /Bruno Lima/ })
    expect(bruno).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Carla Dias/ })).toBeChecked()
    await user.click(bruno)
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(state.bodies).toEqual([{ name: 'Comercial', memberIds: ['u-3'] }])
    })
    const row = (await screen.findByText('Comercial')).closest('tr')
    await waitFor(() => {
      expect(
        within(row as HTMLElement).getAllByRole('cell')[1]?.textContent,
      ).toBe('1')
    })
  })

  it('TEAM-06 renomear a equipe mostra o novo nome na lista', async () => {
    const { user } = setup([makeTeam({ name: 'Comercial' })])

    await user.click(
      await screen.findByRole('button', { name: 'Ações da equipe Comercial' }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: MESSAGES.editTeam }),
    )
    const field = await nameField()
    await user.clear(field)
    await user.type(field, 'Vendas')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Vendas')).toBeInTheDocument()
    expect(screen.queryByText('Comercial')).toBeNull()
  })
})
