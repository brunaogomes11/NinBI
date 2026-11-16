import { MESSAGES } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { delay, HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  everyoneShare,
  makeShares,
  SHARES_URL,
  sharesHandler,
  teamShare,
  userShare,
} from '@/test/fixtures/sharing'
import { renderApp } from '@/test/renderApp'
import { ShareDialog } from './ShareDialog'

function open(...handlers: RequestHandler[]) {
  return renderApp('/', {
    handlers,
    routes: [
      {
        path: '/',
        element: <ShareDialog dashboardId="d-1" onClose={() => {}} />,
      },
    ],
  })
}

const rowOf = async (name: string) => {
  const row = (await screen.findAllByRole('listitem')).find((item) =>
    within(item).queryByText(name),
  )
  if (!row) throw new Error(`linha de ${name} não encontrada`)
  return row
}

describe('ShareDialog', () => {
  it('SHARE-02 tela de compartilhamento mostra o dono e cada linha com a permissão', async () => {
    open(
      sharesHandler([
        everyoneShare('view'),
        teamShare({ name: 'Comercial', permission: 'view' }),
        userShare({ name: 'Bruno Lima', permission: 'edit' }),
      ]),
    )

    expect(await screen.findByText('Dono: Ana Souza')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: MESSAGES.shareTitle }),
    ).toBeInTheDocument()
    const rows = await screen.findAllByRole('listitem')
    expect(
      rows.map((row) => [
        within(row).getByText(/Todos da instalação|Comercial|Bruno Lima/)
          .textContent,
        within(row).getByRole('combobox').textContent,
      ]),
    ).toEqual([
      ['Todos da instalação', 'Pode ver'],
      ['Comercial', 'Pode ver'],
      ['Bruno Lima', 'Pode editar'],
    ])
    expect(screen.getByText('bruno@x.com')).toBeInTheDocument()
  })

  it('SHARE-03 sem compartilhamentos mostra Só você vê este dashboard', async () => {
    open(sharesHandler([]))

    expect(await screen.findByText(MESSAGES.shareEmpty)).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toEqual([])
  })

  it('SHARE-07 mudar a permissão de uma linha envia a nova permissão', async () => {
    const bodies: unknown[] = []
    const { user } = open(
      sharesHandler([teamShare({ name: 'Comercial', permission: 'view' })]),
      http.patch(`${SHARES_URL}/:shareId`, async ({ request, params }) => {
        const body = (await request.json()) as Record<string, unknown>
        bodies.push({ shareId: params.shareId, ...body })
        return HttpResponse.json(
          makeShares([teamShare({ name: 'Comercial', permission: 'edit' })]),
        )
      }),
    )

    const row = await rowOf('Comercial')
    await user.click(within(row).getByRole('combobox'))
    await user.click(
      await screen.findByRole('option', { name: MESSAGES.sharePermissionEdit }),
    )

    await waitFor(() => {
      expect(
        within(screen.getByRole('listitem')).getByRole('combobox'),
      ).toHaveTextContent('Pode editar')
    })
    expect(bodies).toEqual([{ shareId: 's-team', permission: 'edit' }])
  })

  it('SHARE-08 Remover tira a linha da lista', async () => {
    const removed: string[] = []
    const { user } = open(
      sharesHandler([teamShare(), userShare({ name: 'Bruno Lima' })]),
      http.delete(`${SHARES_URL}/:shareId`, ({ params }) => {
        removed.push(String(params.shareId))
        return HttpResponse.json(makeShares([teamShare()]))
      }),
    )

    await user.click(
      await screen.findByRole('button', { name: 'Remover Bruno Lima' }),
    )

    await waitFor(() => {
      expect(screen.queryByText('Bruno Lima')).toBeNull()
    })
    expect(removed).toEqual(['s-user'])
    expect(screen.getByText('Comercial')).toBeInTheDocument()
  })

  it('SHARE-13 esqueleto enquanto a tela carrega', async () => {
    const { baseElement } = open(
      http.get(SHARES_URL, async () => {
        await delay('infinite')
        return HttpResponse.json(makeShares())
      }),
    )

    await screen.findByRole('heading', { name: MESSAGES.shareTitle })
    expect(
      baseElement.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText(MESSAGES.shareEmpty)).toBeNull()
  })

  it('SHARE-14 falha mantém a lista e mostra Não foi possível atualizar o compartilhamento', async () => {
    const { user } = open(
      sharesHandler([teamShare({ name: 'Comercial', permission: 'view' })]),
      http.patch(`${SHARES_URL}/:shareId`, () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 }),
      ),
    )

    const row = await rowOf('Comercial')
    await user.click(within(row).getByRole('combobox'))
    await user.click(
      await screen.findByRole('option', { name: MESSAGES.sharePermissionEdit }),
    )

    expect(
      await screen.findByText(MESSAGES.shareUpdateFailed),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('listitem')).getByRole('combobox'),
    ).toHaveTextContent('Pode ver')
  })

  it('SHARE-14 falha ao carregar mostra a mensagem e Tentar novamente mostra a lista', async () => {
    let calls = 0
    const { user } = open(
      http.get(SHARES_URL, () => {
        calls += 1
        return calls === 1
          ? HttpResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 })
          : HttpResponse.json(makeShares([teamShare({ name: 'Comercial' })]))
      }),
    )

    expect(
      await screen.findByText(MESSAGES.shareUpdateFailed),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Comercial')).toBeInTheDocument()
    expect(screen.queryByText(MESSAGES.shareUpdateFailed)).toBeNull()
  })

  it('SHARE-15 lista rola com o campo de busca fixo', async () => {
    open(sharesHandler([teamShare()]))

    const list = await screen.findByTestId('share-list')
    expect(list).toHaveClass('overflow-y-auto')
    const search = screen.getByTestId('share-search')
    expect(list.contains(search)).toBe(false)
    expect(search.compareDocumentPosition(list)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('SHARE-16 usuário desativado aparece marcado como Desativado', async () => {
    open(
      sharesHandler([
        userShare({ name: 'Bruno Lima', disabled: true }),
        userShare({ id: 's-2', userId: 'u-3', name: 'Carla Dias' }),
      ]),
    )

    const disabledRow = await rowOf('Bruno Lima')
    expect(
      within(disabledRow).getByText(MESSAGES.shareDisabled),
    ).toBeInTheDocument()
    const activeRow = await rowOf('Carla Dias')
    expect(within(activeRow).queryByText(MESSAGES.shareDisabled)).toBeNull()
  })
})
