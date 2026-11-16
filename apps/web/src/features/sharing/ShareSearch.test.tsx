import { MESSAGES, type ShareCandidatesDto } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  makeCandidates,
  makeShares,
  SHARES_URL,
  sharesHandler,
  teamShare,
  userShare,
} from '@/test/fixtures/sharing'
import { renderApp } from '@/test/renderApp'
import { ShareDialog } from './ShareDialog'

const CANDIDATES_URL = '/api/dashboards/d-1/share-candidates'

const ANA = {
  id: 'u-5',
  name: 'Ana Souza',
  email: 'ana@x.com',
  role: 'EDITOR' as const,
}

function candidatesHandler(
  candidates: ShareCandidatesDto,
  queries: string[] = [],
): RequestHandler {
  return http.get(CANDIDATES_URL, ({ request }) => {
    queries.push(new URL(request.url).searchParams.get('q') ?? '')
    return HttpResponse.json(candidates)
  })
}

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

const searchBox = () =>
  screen.findByRole('searchbox', { name: MESSAGES.shareSearchLabel })

const results = async () =>
  within(await screen.findByRole('list', { name: 'Resultados da busca' }))

describe('ShareSearch', () => {
  it('SHARE-04 digitar na busca lista usuários, equipes e Todos da instalação', async () => {
    const queries: string[] = []
    const { user } = open(
      sharesHandler([]),
      candidatesHandler(
        makeCandidates({
          teams: [{ id: 't-9', name: 'Banana' }],
          users: [ANA],
        }),
        queries,
      ),
    )

    await user.type(await searchBox(), 'ana')

    const list = await results()
    expect(list.getByText(MESSAGES.shareEveryone)).toBeInTheDocument()
    expect(list.getByText('Banana')).toBeInTheDocument()
    expect(list.getByText('Ana Souza')).toBeInTheDocument()
    expect(list.getByText('ana@x.com')).toBeInTheDocument()
    // a busca espera o fim da digitação: uma só requisição, com o texto inteiro
    expect(queries).toEqual(['ana'])
  })

  it('SHARE-05 busca sem resultado mostra Nenhum usuário ou equipe encontrado', async () => {
    const { user } = open(
      sharesHandler([]),
      candidatesHandler(makeCandidates()),
    )

    await user.type(await searchBox(), 'zzz')

    expect(
      await screen.findByText(MESSAGES.shareSearchEmpty),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('list', { name: 'Resultados da busca' }),
    ).toBeNull()
  })

  it('SHARE-06 Adicionar grava o compartilhamento e mostra a linha', async () => {
    const bodies: unknown[] = []
    const { user } = open(
      sharesHandler([]),
      candidatesHandler(makeCandidates({ users: [ANA] })),
      http.post(SHARES_URL, async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json(
          makeShares([
            userShare({
              id: 's-new',
              userId: 'u-5',
              name: 'Ana Souza',
              email: 'ana@x.com',
              permission: 'edit',
            }),
          ]),
        )
      }),
    )

    const box = await searchBox()
    await user.type(box, 'ana')
    const list = await results()
    await user.click(
      list.getByRole('combobox', { name: 'Permissão para Ana Souza' }),
    )
    await user.click(
      await screen.findByRole('option', { name: MESSAGES.sharePermissionEdit }),
    )
    await user.click(list.getByRole('button', { name: 'Adicionar Ana Souza' }))

    const shares = within(
      await screen.findByRole('list', { name: 'Compartilhamentos' }),
    )
    expect(await shares.findByText('Ana Souza')).toBeInTheDocument()
    expect(shares.getByRole('combobox')).toHaveTextContent('Pode editar')
    expect(bodies).toEqual([
      { recipient: { type: 'USER', userId: 'u-5' }, permission: 'edit' },
    ])
    await waitFor(() => {
      expect(box).toHaveValue('')
    })
  })

  it('SHARE-09 adicionar destinatário que já está na lista atualiza a linha', async () => {
    const { user } = open(
      sharesHandler([teamShare({ name: 'Comercial', permission: 'view' })]),
      candidatesHandler(
        makeCandidates({ teams: [{ id: 't-1', name: 'Comercial' }] }),
      ),
      http.post(SHARES_URL, () =>
        HttpResponse.json(
          makeShares([teamShare({ name: 'Comercial', permission: 'edit' })]),
        ),
      ),
    )

    await user.type(await searchBox(), 'com')
    const list = await results()
    await user.click(
      list.getByRole('combobox', { name: 'Permissão para Comercial' }),
    )
    await user.click(
      await screen.findByRole('option', { name: MESSAGES.sharePermissionEdit }),
    )
    await user.click(list.getByRole('button', { name: 'Adicionar Comercial' }))

    await waitFor(() => {
      const rows = within(
        screen.getByRole('list', { name: 'Compartilhamentos' }),
      ).getAllByRole('listitem')
      expect(rows).toHaveLength(1)
      expect(
        within(rows[0] as HTMLElement).getByText('Comercial'),
      ).toBeVisible()
      expect(
        within(rows[0] as HTMLElement).getByRole('combobox'),
      ).toHaveTextContent('Pode editar')
    })
  })

  it('SHARE-10 Visualizador só tem a opção Pode ver', async () => {
    const { user } = open(
      sharesHandler([
        userShare({
          name: 'Vera Alves',
          email: 'vera@x.com',
          role: 'VIEWER',
          permission: 'view',
        }),
      ]),
      candidatesHandler(
        makeCandidates({
          users: [
            {
              id: 'u-7',
              name: 'Vitor Neves',
              email: 'vitor@x.com',
              role: 'VIEWER',
            },
          ],
        }),
      ),
    )

    const row = within(
      await screen.findByRole('list', { name: 'Compartilhamentos' }),
    ).getByRole('listitem')
    await user.click(within(row).getByRole('combobox'))
    expect(
      (await screen.findAllByRole('option')).map(
        (option) => option.textContent,
      ),
    ).toEqual(['Pode ver'])
    await user.keyboard('{Escape}')

    await user.type(await searchBox(), 'vi')
    const list = await results()
    await user.click(
      list.getByRole('combobox', { name: 'Permissão para Vitor Neves' }),
    )
    expect(
      (await screen.findAllByRole('option')).map(
        (option) => option.textContent,
      ),
    ).toEqual(['Pode ver'])
  })

  it('SHARE-14 falha ao adicionar mantém a lista e mostra a mensagem', async () => {
    const { user } = open(
      sharesHandler([teamShare({ name: 'Comercial' })]),
      candidatesHandler(makeCandidates({ users: [ANA] })),
      http.post(SHARES_URL, () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 }),
      ),
    )

    await user.type(await searchBox(), 'ana')
    const list = await results()
    await user.click(list.getByRole('button', { name: 'Adicionar Ana Souza' }))

    expect(
      await screen.findByText(MESSAGES.shareUpdateFailed),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Compartilhamentos' })).getByText(
        'Comercial',
      ),
    ).toBeInTheDocument()
  })
})
