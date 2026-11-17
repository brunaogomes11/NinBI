import { type ExampleSetting, MESSAGES } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeRelationalSchema, schemaHandler } from '@/test/fixtures/schema'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
  usersHandler,
} from '@/test/renderApp'

function openSql(
  schema = makeRelationalSchema(),
  role: 'ADMIN' | 'EDITOR' = 'ADMIN',
) {
  const puts: ExampleSetting[] = []
  const view = renderApp('/configuracoes/conexoes/c-1', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role })),
      usersHandler(),
      schemaHandler(schema),
      http.put(
        '/api/connections/:id/schema/example-settings',
        async ({ request }) => {
          puts.push((await request.json()) as ExampleSetting)
          return new HttpResponse(null, { status: 204 })
        },
      ),
    ],
  })
  return { ...view, puts }
}

describe('TableSchemaView', () => {
  it('SCS-12 schema SQL mostra Tabelas com views marcadas e Relações', async () => {
    openSql()

    expect(
      await screen.findByRole('heading', { name: 'Tabelas' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Relações' }),
    ).toBeInTheDocument()
    const list = screen.getByTestId('schema-element-list')
    expect(
      within(list)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      'public.cliente',
      'public.pedido',
      'public.pedidos_abertos (visão)',
    ])
    expect(
      within(list).getByText('public.pedido.cliente_id → public.cliente.id'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Última leitura: 16/11/2026, 14:30'),
    ).toBeInTheDocument()
  })

  it('SCS-13 tabela selecionada mostra colunas e chaves estrangeiras', async () => {
    const view = openSql()

    await view.user.click(
      await screen.findByRole('button', { name: 'public.pedido' }),
    )

    for (const header of ['Coluna', 'Tipo', 'Exemplo']) {
      expect(
        screen.getByRole('columnheader', { name: header }),
      ).toBeInTheDocument()
    }
    expect(screen.getByRole('cell', { name: 'cliente_id' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'criado_em' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Chaves estrangeiras' }),
    ).toBeInTheDocument()
    const keys = screen.getByRole('heading', { name: 'Chaves estrangeiras' })
      .parentElement as HTMLElement
    expect(
      within(keys).getByText('public.pedido.cliente_id → public.cliente.id'),
    ).toBeInTheDocument()
  })

  it('SCS-14 exemplo aparece como literal SQL', async () => {
    const view = openSql()

    await view.user.click(
      await screen.findByRole('button', { name: 'public.pedido' }),
    )

    expect(screen.getByRole('cell', { name: '10' })).toBeInTheDocument()
    expect(
      screen.getByRole('cell', { name: "'2024-02-05'" }),
    ).toBeInTheDocument()
    const obs = screen.getByRole('row', { name: /obs/ })
    expect(within(obs).getByText('sem exemplo')).toBeInTheDocument()

    await view.user.click(
      screen.getByRole('button', { name: 'public.cliente' }),
    )
    expect(screen.getByRole('cell', { name: "'Ana'" })).toBeInTheDocument()
  })

  it('SCS-15 banco sem tabelas mostra Este banco não tem dados', async () => {
    openSql(makeRelationalSchema({ tables: [], foreignKeys: [] }))

    expect(await screen.findByText(MESSAGES.schemaEmpty)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Tabelas' }),
    ).not.toBeInTheDocument()
  })

  it('SCS-16 Admin desliga Enviar exemplo à IA de uma coluna', async () => {
    const view = openSql()

    await view.user.click(
      await screen.findByRole('button', { name: 'public.cliente' }),
    )
    const row = screen.getByRole('row', { name: /nome/ })
    const toggle = within(row).getByRole('switch', {
      name: 'Enviar exemplo à IA',
    })
    expect(toggle).toBeChecked()
    await view.user.click(toggle)

    await waitFor(() =>
      expect(view.puts).toEqual([
        {
          kind: 'TABLE',
          element: 'public.cliente',
          property: 'nome',
          sendExample: false,
        },
      ]),
    )
    await waitFor(() =>
      expect(
        within(screen.getByRole('row', { name: /nome/ })).getByRole('switch', {
          name: 'Enviar exemplo à IA',
        }),
      ).not.toBeChecked(),
    )
    expect(screen.getByText('exemplo não enviado')).toBeInTheDocument()
  })

  it('SCS-16 Editor vê o controle desabilitado', async () => {
    const view = openSql(makeRelationalSchema(), 'EDITOR')

    await view.user.click(
      await screen.findByRole('button', { name: 'public.cliente' }),
    )

    for (const toggle of screen.getAllByRole('switch')) {
      expect(toggle).toBeDisabled()
    }
  })
})
