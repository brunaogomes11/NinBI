import { MESSAGES } from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
import { connectionsHandler, makeConnection } from '@/test/fixtures/connections'
import { makeSchema, schemaHandler } from '@/test/fixtures/schema'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
  usersHandler,
} from '@/test/renderApp'

function openSchemaPage(
  schema: Parameters<typeof schemaHandler>[0] = makeSchema(),
  extra: RequestHandler[] = [],
) {
  return renderApp('/configuracoes/conexoes/c-1', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      usersHandler(),
      schemaHandler(schema),
      ...extra,
    ],
  })
}

describe('SchemaPage', () => {
  it('SCH-15 schema mostra labels e tipos na ordem e a data da última leitura', async () => {
    const view = renderApp('/configuracoes/conexoes', {
      handlers: [
        setupStatusHandler(false),
        sessionHandler(makeUser()),
        usersHandler(),
        connectionsHandler([makeConnection()]),
        schemaHandler(),
      ],
    })

    await view.user.click(await screen.findByRole('link', { name: 'Vendas' }))

    expect(
      await screen.findByRole('heading', { name: 'Labels' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Tipos de relacionamento' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Vendas' })).toBeInTheDocument()
    expect(
      screen.getByText('Última leitura: 16/11/2026, 14:30'),
    ).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.textContent)
        .filter((text) =>
          ['Cliente', 'Pedido', 'Produto', 'CONTEM', 'FEZ'].includes(
            text ?? '',
          ),
        ),
    ).toEqual(['Cliente', 'Pedido', 'Produto', 'CONTEM', 'FEZ'])
    expect(screen.getByRole('button', { name: 'Cliente' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('SCH-07 clicar em Atualizar schema mostra a nova data de leitura', async () => {
    let current = makeSchema()
    let posts = 0
    const view = openSchemaPage(
      () => current,
      [
        http.post('/api/connections/:id/schema/refresh', () => {
          posts += 1
          current = makeSchema({ readAt: '2026-11-16T18:45:00Z' })
          return HttpResponse.json(
            {
              status: 'READING',
              readAt: '2026-11-16T17:30:00Z',
              startedAt: '2026-11-16T18:44:59Z',
              error: null,
            },
            { status: 202 },
          )
        }),
      ],
    )

    expect(
      await screen.findByText('Última leitura: 16/11/2026, 14:30'),
    ).toBeInTheDocument()
    await view.user.click(
      screen.getByRole('button', { name: 'Atualizar schema' }),
    )

    expect(
      await screen.findByText('Última leitura: 16/11/2026, 15:45'),
    ).toBeInTheDocument()
    expect(posts).toBe(1)
  })

  it('SCH-08 Lendo schema com o botão desabilitado', async () => {
    openSchemaPage(
      makeSchema({ status: 'READING', startedAt: '2026-11-16T18:00:00Z' }),
    )

    expect(await screen.findByText('Lendo schema...')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Atualizar schema' }),
    ).toBeDisabled()
  })

  it('SCH-09 falha mostra Não foi possível ler o schema com a mensagem e o schema anterior', async () => {
    openSchemaPage(
      makeSchema({
        status: 'FAILED',
        error: 'Neo.ClientError.Security.Forbidden',
      }),
    )

    expect(
      await screen.findByText(MESSAGES.schemaLoadFailed),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Neo.ClientError.Security.Forbidden'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pedido' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Atualizar schema' }),
    ).toBeEnabled()
  })

  it('SCH-19 banco sem labels mostra Este banco não tem dados', async () => {
    openSchemaPage(makeSchema({ labels: [], relationshipTypes: [] }))

    expect(await screen.findByText(MESSAGES.schemaEmpty)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Labels' }),
    ).not.toBeInTheDocument()
  })

  it('SCH-20 lista e tabela rolam separadas com cabeçalho fixo', async () => {
    openSchemaPage()

    const list = await screen.findByTestId('schema-element-list')
    const scroll = await screen.findByTestId('schema-properties-scroll')
    expect(list).toHaveClass('overflow-y-auto')
    expect(scroll).toHaveClass('overflow-y-auto')

    const listColumn = list.parentElement as HTMLElement
    const tableColumn = scroll.closest('[data-slot="card"]') as HTMLElement
    expect(listColumn).not.toBe(tableColumn)
    expect(listColumn.parentElement).toBe(tableColumn.parentElement)

    const stickyHeaders = document.querySelectorAll('thead.sticky')
    expect(stickyHeaders).toHaveLength(1)
    expect(stickyHeaders[0]).toHaveClass('top-0')
    expect(listColumn.querySelector('.sticky')).toBeNull()
  })

  it('SCH-17 tipo de relacionamento escolhido na página troca a tabela e mostra os pares', async () => {
    const view = openSchemaPage()

    await view.user.click(await screen.findByRole('button', { name: 'CONTEM' }))

    await waitFor(() =>
      expect(
        screen.getByText('(:Pedido)-[:CONTEM]->(:Produto)'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByRole('cell', { name: 'quantidade' })).toBeInTheDocument()
  })
})
