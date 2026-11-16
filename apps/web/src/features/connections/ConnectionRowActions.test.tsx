import type { ConnectionDto } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeConnection } from '@/test/fixtures/connections'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
  usersHandler,
} from '@/test/renderApp'

function openConnections() {
  let connections: ConnectionDto[] = [
    makeConnection(),
    makeConnection({ id: 'c-2', name: 'Estoque' }),
  ]
  const deleted: string[] = []
  const view = renderApp('/configuracoes/conexoes', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      usersHandler(),
      http.get('/api/connections', () => HttpResponse.json(connections)),
      http.delete('/api/connections/:id', ({ params }) => {
        const id = String(params.id)
        deleted.push(id)
        connections = connections.filter((connection) => connection.id !== id)
        return new HttpResponse(null, { status: 204 })
      }),
    ],
  })
  return { ...view, deleted }
}

async function clickRowButton(
  view: ReturnType<typeof openConnections>,
  rowName: string,
  button: string,
) {
  const row = (await screen.findByRole('link', { name: rowName })).closest(
    'tr',
  ) as HTMLElement
  await view.user.click(within(row).getByRole('button', { name: button }))
}

describe('ConnectionRowActions', () => {
  it('CONN-17 Excluir pede confirmação com o nome da conexão', async () => {
    const view = openConnections()

    await clickRowButton(view, 'Vendas', 'Excluir')

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent(
      'Excluir a conexão Vendas? O schema guardado também será apagado.',
    )
    expect(
      within(dialog).getByRole('button', { name: 'Excluir' }),
    ).toBeInTheDocument()

    await view.user.click(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    )

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(view.deleted).toEqual([])
    expect(screen.getByText('Vendas')).toBeInTheDocument()
  })

  it('CONN-18 confirmar a exclusão tira a conexão da lista', async () => {
    const view = openConnections()

    await clickRowButton(view, 'Vendas', 'Excluir')
    const dialog = await screen.findByRole('alertdialog')
    await view.user.click(
      within(dialog).getByRole('button', { name: 'Excluir' }),
    )

    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Vendas' }),
      ).not.toBeInTheDocument(),
    )
    expect(view.deleted).toEqual(['c-1'])
    expect(screen.getByRole('link', { name: 'Estoque' })).toBeInTheDocument()
  })
})
