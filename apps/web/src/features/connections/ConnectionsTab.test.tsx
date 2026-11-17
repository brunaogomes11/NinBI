import { MESSAGES, type Role } from '@ninbi/contracts'
import { screen, within } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeConnection } from '@/test/fixtures/connections'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
  usersHandler,
} from '@/test/renderApp'

function openConnections(
  handler: ReturnType<typeof http.get>,
  role: Role = 'ADMIN',
) {
  return renderApp('/configuracoes/conexoes', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role })),
      usersHandler(),
      handler,
    ],
  })
}

const listHandler = (body: unknown[]) =>
  http.get('/api/connections', () => HttpResponse.json(body))

describe('ConnectionsTab', () => {
  it('CONN-01 aba Conexões mostra nome, URI, banco e última leitura para Admin e Editor', async () => {
    for (const role of ['ADMIN', 'EDITOR'] as const) {
      const { user, unmount } = renderApp('/', {
        handlers: [
          setupStatusHandler(false),
          sessionHandler(makeUser({ role })),
          listHandler([
            makeConnection(),
            makeConnection({
              id: 'c-2',
              name: 'Estoque',
              database: 'estoque',
              schemaReadAt: null,
              schemaStatus: 'NEVER',
            }),
            makeConnection({
              id: 'c-3',
              name: 'Logística',
              schemaStatus: 'READING',
              schemaReadAt: null,
            }),
          ]),
        ],
      })

      await user.click(
        await screen.findByRole('link', { name: 'Configurações' }),
      )
      await screen.findByText('Vendas')

      const rows = screen.getAllByRole('row').slice(1)
      const cells = rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .slice(0, 4)
          .map((cell) => cell.textContent),
      )
      expect(cells).toEqual([
        [
          'Vendas',
          'neo4j+s://vendas.exemplo:7687',
          'Padrão do servidor',
          '16/11/2026, 14:30',
        ],
        ['Estoque', 'neo4j+s://vendas.exemplo:7687', 'estoque', 'Nunca lido'],
        [
          'Logística',
          'neo4j+s://vendas.exemplo:7687',
          'Padrão do servidor',
          'Lendo schema...',
        ],
      ])
      expect(
        screen
          .getAllByRole('columnheader')
          .slice(0, 4)
          .map((header) => header.textContent),
      ).toEqual(['Nome', 'URI', 'Banco', 'Última leitura do schema'])
      expect(screen.getByRole('link', { name: 'Vendas' })).toHaveAttribute(
        'href',
        '/configuracoes/conexoes/c-1',
      )
      unmount()
    }
  })

  it('CONN-02 sem conexões mostra Nenhuma conexão cadastrada', async () => {
    openConnections(listHandler([]))

    expect(
      await screen.findByText('Nenhuma conexão cadastrada'),
    ).toBeInTheDocument()
  })

  it('CONN-03 linhas de esqueleto enquanto a lista carrega', async () => {
    const { container } = openConnections(
      http.get('/api/connections', async () => {
        await delay('infinite')
        return HttpResponse.json([])
      }),
    )

    await screen.findByRole('columnheader', { name: 'Nome' })
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText('Vendas')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Nenhuma conexão cadastrada'),
    ).not.toBeInTheDocument()
  })

  it('CONN-04 erro mostra Não foi possível carregar as conexões e Tentar novamente recarrega', async () => {
    let calls = 0
    const { user } = openConnections(
      http.get('/api/connections', () => {
        calls += 1
        if (calls === 1) {
          return HttpResponse.json(
            { code: 'INTERNAL_ERROR', message: MESSAGES.internalError },
            { status: 500 },
          )
        }
        return HttpResponse.json([makeConnection({ name: 'Recarregada' })])
      }),
    )

    expect(
      await screen.findByText('Não foi possível carregar as conexões'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Recarregada')).toBeInTheDocument()
    expect(
      screen.queryByText('Não foi possível carregar as conexões'),
    ).not.toBeInTheDocument()
  })

  it('CONN-05 Nova conexão, Editar e Excluir só aparecem para Admin', async () => {
    const admin = openConnections(listHandler([makeConnection()]))
    await screen.findByText('Vendas')
    expect(
      screen.getByRole('button', { name: 'Nova conexão' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
    admin.unmount()

    openConnections(listHandler([makeConnection()]), 'EDITOR')
    await screen.findByText('Vendas')
    expect(
      screen.queryByRole('button', { name: 'Nova conexão' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Editar' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Excluir' }),
    ).not.toBeInTheDocument()
  })

  it('SRC-15 lista mostra o tipo e host:porta das conexões SQL', async () => {
    openConnections(
      listHandler([
        makeConnection(),
        makeConnection({
          id: 'c-2',
          name: 'Estoque',
          type: 'POSTGRES',
          uri: null,
          host: 'db.exemplo',
          port: 5432,
          database: 'estoque',
        }),
        makeConnection({
          id: 'c-3',
          name: 'Faturas',
          type: 'SQLSERVER',
          uri: null,
          host: 'sql.exemplo',
          port: 1433,
          database: 'faturas',
        }),
      ]),
    )

    await screen.findByText('Estoque')
    const rows = screen.getAllByRole('row').slice(1)
    const cells = rows.map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    )
    const type = screen
      .getAllByRole('columnheader')
      .findIndex((header) => header.textContent === 'Tipo')
    expect(type).toBeGreaterThan(-1)
    expect(cells.map((row) => [row[0], row[1], row[type]])).toEqual([
      ['Vendas', 'neo4j+s://vendas.exemplo:7687', 'Neo4j'],
      ['Estoque', 'db.exemplo:5432', 'PostgreSQL'],
      ['Faturas', 'sql.exemplo:1433', 'SQL Server'],
    ])
  })
})
