import { type ConnectionDto, MESSAGES } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
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

type Respond = (body: Record<string, unknown>) => Response | Promise<Response>

const UNAUTHORIZED =
  'Neo.ClientError.Security.Unauthorized: The client is unauthorized'

/** Lista que cresce quando o POST dá certo e muda quando o PATCH dá certo, como o servidor real. */
function openConnections(respond?: Respond) {
  const connections: ConnectionDto[] = [makeConnection()]
  const posts: Record<string, unknown>[] = []
  const patches: Record<string, unknown>[] = []
  const view = renderApp('/configuracoes/conexoes', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser()),
      usersHandler(),
      http.get('/api/connections', () => HttpResponse.json(connections)),
      http.post('/api/connections', async ({ request }) => {
        const body = (await request.json()) as Record<string, string | null>
        posts.push(body)
        if (respond) return respond(body)
        connections.push(
          makeConnection({
            id: 'c-new',
            name: String(body.name),
            uri: String(body.uri),
            database: body.database as string | null,
          }),
        )
        return HttpResponse.json(connections.at(-1), { status: 201 })
      }),
      http.patch('/api/connections/:id', async ({ request }) => {
        const body = (await request.json()) as Record<string, string | null>
        patches.push(body)
        if (respond) return respond(body)
        const current = connections[0] as ConnectionDto
        connections[0] = { ...current, name: String(body.name) }
        return HttpResponse.json(connections[0])
      }),
    ],
  })
  return { ...view, posts, patches, connections }
}

type View = ReturnType<typeof openConnections>

async function openNew(view: View) {
  await view.user.click(
    await screen.findByRole('button', { name: 'Nova conexão' }),
  )
  return screen.findByRole('dialog')
}

async function openEdit(view: View) {
  await view.user.click(await screen.findByRole('button', { name: 'Editar' }))
  return screen.findByRole('dialog')
}

async function fill(
  view: View,
  values: {
    name?: string
    uri?: string
    database?: string
    username?: string
    password?: string
  },
) {
  const labels = {
    name: 'Nome',
    uri: 'URI',
    database: 'Banco',
    username: 'Usuário',
    password: 'Senha',
  } as const
  for (const [key, label] of Object.entries(labels)) {
    const value = values[key as keyof typeof labels]
    if (value) await view.user.type(screen.getByLabelText(label), value)
  }
}

const validValues = {
  name: 'Estoque',
  uri: 'bolt://estoque.exemplo:7687',
  database: 'estoque',
  username: 'neo4j',
  password: 'segredo-123',
}

const neo4jError = (code: string, message: string) => () =>
  HttpResponse.json({ code, message }, { status: 422 })

describe('ConnectionFormDialog', () => {
  it('CONN-07 nova conexão enviada aparece na lista', async () => {
    const view = openConnections()
    await openNew(view)

    await fill(view, validValues)
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    const table = within(await screen.findByRole('table'))
    expect(await table.findByText('Estoque')).toBeInTheDocument()
    expect(table.getByText('estoque')).toBeInTheDocument()
    expect(view.posts).toEqual([validValues])
  })

  it('CONN-08 erro do Neo4j aparece com o formulário preenchido', async () => {
    const view = openConnections(neo4jError('NEO4J_UNAVAILABLE', UNAUTHORIZED))
    await openNew(view)

    await fill(view, validValues)
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(UNAUTHORIZED)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Estoque')
    expect(screen.getByLabelText('URI')).toHaveValue(validValues.uri)
    expect(screen.getByLabelText('Banco')).toHaveValue('estoque')
    expect(screen.getByLabelText('Usuário')).toHaveValue('neo4j')
    expect(screen.getByLabelText('Senha')).toHaveValue('segredo-123')
  })

  it('CONN-09 prazo esgotado mostra Não foi possível conectar em 10 s', async () => {
    const view = openConnections(
      neo4jError('NEO4J_TIMEOUT', MESSAGES.connectionVerifyTimeout),
    )
    await openNew(view)

    await fill(view, validValues)
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText('Não foi possível conectar em 10 s'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('CONN-10 URI inválida mostra a mensagem no campo sem enviar', async () => {
    const view = openConnections()
    await openNew(view)

    await fill(view, { ...validValues, uri: 'http://x' })
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('URI inválida')).toBeInTheDocument()
    expect(screen.getByLabelText('URI')).toHaveAccessibleDescription(
      'URI inválida',
    )
    expect(view.posts).toHaveLength(0)
  })

  it('CONN-11 nome repetido mostra Já existe uma conexão com este nome no campo Nome', async () => {
    const view = openConnections(() =>
      HttpResponse.json(
        {
          code: 'CONNECTION_NAME_TAKEN',
          message: MESSAGES.connectionNameTaken,
          fieldErrors: { name: MESSAGES.connectionNameTaken },
        },
        { status: 409 },
      ),
    )
    await openNew(view)

    await fill(view, { ...validValues, name: 'VENDAS' })
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    const message = await screen.findByText(
      'Já existe uma conexão com este nome',
    )
    expect(message).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveAccessibleDescription(
      'Já existe uma conexão com este nome',
    )

    // Nome com 81 caracteres: a mensagem aparece sem enviar.
    const posted = view.posts.length
    await view.user.clear(screen.getByLabelText('Nome'))
    await view.user.click(screen.getByLabelText('Nome'))
    await view.user.paste('a'.repeat(81))
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(
      await screen.findByText('O nome pode ter até 80 caracteres'),
    ).toBeInTheDocument()
    expect(view.posts).toHaveLength(posted)
  })

  it('CONN-15 editar com Senha vazia não envia senha', async () => {
    const view = openConnections()
    await openEdit(view)

    expect(screen.getByLabelText('Nome')).toHaveValue('Vendas')
    expect(screen.getByLabelText('Senha')).toHaveValue('')
    expect(
      screen.getByText('Deixe em branco para manter a senha atual'),
    ).toBeInTheDocument()
    await view.user.clear(screen.getByLabelText('Nome'))
    await view.user.type(screen.getByLabelText('Nome'), 'Vendas Brasil')
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(await screen.findByText('Vendas Brasil')).toBeInTheDocument()
    expect(view.patches).toEqual([
      {
        name: 'Vendas Brasil',
        uri: 'neo4j+s://vendas.exemplo:7687',
        database: null,
        username: 'neo4j',
      },
    ])
    expect(view.patches[0]).not.toHaveProperty('password')
  })

  it('CONN-16 edição reprovada mostra o erro do Neo4j', async () => {
    const view = openConnections(neo4jError('NEO4J_UNAVAILABLE', UNAUTHORIZED))
    await openEdit(view)

    await view.user.type(screen.getByLabelText('Senha'), 'nova-senha')
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(UNAUTHORIZED)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Vendas')
    expect(view.patches[0]).toMatchObject({ password: 'nova-senha' })
  })

  it('CONN-20 Salvar fica desabilitado durante o teste e a gravação', async () => {
    const view = openConnections(async () => {
      await delay('infinite')
      return HttpResponse.json({}, { status: 201 })
    })
    await openNew(view)

    await fill(view, validValues)
    await view.user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled(),
    )
  })
})
