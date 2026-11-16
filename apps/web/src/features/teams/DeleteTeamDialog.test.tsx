import { MESSAGES, type TeamDto } from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeTeam } from '@/test/fixtures/teams'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
  usersHandler,
} from '@/test/renderApp'

function setup() {
  const state = {
    teams: [
      makeTeam({ id: 't-1', name: 'Comercial', shareCount: 3 }),
    ] as TeamDto[],
    deleted: [] as string[],
  }
  const app = renderApp('/configuracoes/usuarios', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      usersHandler([]),
      http.get('/api/teams', () => HttpResponse.json(state.teams)),
      http.delete('/api/teams/:id', ({ params }) => {
        state.deleted.push(String(params.id))
        state.teams = state.teams.filter((team) => team.id !== params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    ],
  })
  return { ...app, state }
}

async function openDeleteDialog(user: ReturnType<typeof setup>['user']) {
  await user.click(
    await screen.findByRole('button', { name: 'Ações da equipe Comercial' }),
  )
  await user.click(
    await screen.findByRole('menuitem', { name: MESSAGES.deleteTeam }),
  )
}

describe('DeleteTeamDialog', () => {
  it('TEAM-07 Excluir equipe pede confirmação com o nome e o número de dashboards', async () => {
    const { user, state } = setup()

    await openDeleteDialog(user)

    expect(
      await screen.findByText(
        'Excluir a equipe Comercial? 3 dashboards deixarão de estar compartilhados com ela.',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull()
    })
    expect(state.deleted).toEqual([])
    expect(screen.getByText('Comercial')).toBeInTheDocument()
  })

  it('TEAM-08 confirmar a exclusão tira a equipe da lista', async () => {
    const { user, state } = setup()

    await openDeleteDialog(user)
    await user.click(await screen.findByRole('button', { name: 'Excluir' }))

    await waitFor(() => {
      expect(state.deleted).toEqual(['t-1'])
    })
    expect(await screen.findByText(MESSAGES.teamsEmpty)).toBeInTheDocument()
    expect(screen.queryByText('Comercial')).toBeNull()
  })
})
