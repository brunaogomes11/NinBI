import { type AssistantMessageDto, MESSAGES } from '@ninbi/contracts'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/providers'
import { server } from '@/test/server'
import { AssistantPanel } from './AssistantPanel'

const MESSAGES_URL = '/api/dashboards/d-1/assistant/messages'

const stored: AssistantMessageDto[] = [
  {
    id: 'u1',
    role: 'USER',
    text: 'primeira pergunta',
    details: null,
    createdAt: '2026-11-17T10:00:00Z',
  },
  {
    id: 'a1',
    role: 'ASSISTANT',
    text: 'primeira resposta',
    details: {
      changes: [],
      notApplied: [],
      createdWidgets: 0,
      failedWidgets: [],
      discardedWidgets: 0,
    },
    createdAt: '2026-11-17T10:00:05Z',
  },
]

const idle = {
  send: vi.fn(),
  retry: vi.fn(),
  cancel: vi.fn(),
  undo: vi.fn(),
  running: false,
  progress: null,
  failure: null,
  undoMessageId: null,
}

function setup(
  options: { messages?: AssistantMessageDto[]; configured?: boolean } = {},
) {
  const calls = { deletes: 0 }
  let current = options.messages ?? stored
  server.use(
    http.get('/api/ai/status', () =>
      HttpResponse.json({ configured: options.configured ?? true }),
    ),
    http.get(MESSAGES_URL, () => HttpResponse.json(current)),
    http.delete(MESSAGES_URL, () => {
      calls.deletes += 1
      current = []
      return new Response(null, { status: 204 })
    }),
  )
  const client = createQueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <AssistantPanel dashboardId="d-1" assistant={idle} onClose={() => {}} />
    </QueryClientProvider>,
  )
  return { calls, client, ...view }
}

describe('AssistantPanel', () => {
  it('HIST-04 Limpar conversa pede confirmação com Apagar toda a conversa deste dashboard?', async () => {
    const user = userEvent.setup()
    const { calls } = setup()
    await screen.findByText('primeira resposta')
    await user.click(screen.getByRole('button', { name: 'Limpar conversa' }))
    expect(
      await screen.findByText('Apagar toda a conversa deste dashboard?'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() =>
      expect(
        screen.queryByText('Apagar toda a conversa deste dashboard?'),
      ).not.toBeInTheDocument(),
    )
    expect(calls.deletes).toBe(0)
    expect(screen.getByText('primeira resposta')).toBeInTheDocument()
  })

  it('HIST-05 confirmar a limpeza apaga a conversa do painel', async () => {
    const user = userEvent.setup()
    const { calls } = setup()
    await screen.findByText('primeira resposta')
    await user.click(screen.getByRole('button', { name: 'Limpar conversa' }))
    await user.click(await screen.findByRole('button', { name: 'Apagar' }))
    expect(await screen.findByText(MESSAGES.assistantEmpty)).toBeInTheDocument()
    expect(calls.deletes).toBe(1)
    expect(screen.queryByText('primeira resposta')).not.toBeInTheDocument()
  })

  it('CHAT-19 conversa rola com a mais recente embaixo e o campo fixo', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    const { client } = setup()
    await screen.findByText('primeira resposta')
    const list = screen
      .getByText('primeira resposta')
      .closest('ol') as HTMLElement
    const container = list.parentElement as HTMLElement
    expect(container).toHaveClass('overflow-y-auto')
    expect(container).toHaveClass('flex-1')
    const field = screen.getByLabelText('Mensagem')
    expect(container.contains(field)).toBe(false)
    expect(
      container.compareDocumentPosition(field) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    scroll.mockClear()
    client.setQueryData<AssistantMessageDto[]>(
      ['assistant', 'd-1'],
      [
        ...stored,
        { ...(stored[0] as AssistantMessageDto), id: 'u2', text: 'nova' },
      ],
    )
    await screen.findByText('nova')
    await waitFor(() => expect(scroll).toHaveBeenCalled())
    const target = scroll.mock.contexts.at(-1) as HTMLElement
    expect(target.textContent).toContain('nova')
    scroll.mockRestore()
  })

  it('sem provedor o composer fica desabilitado com Nenhum provedor de IA configurado', async () => {
    setup({ configured: false })
    expect(
      await screen.findByText('Nenhum provedor de IA configurado'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Mensagem')).toBeDisabled()
  })

  it('enviar chama send com o texto e limpa o campo', async () => {
    const user = userEvent.setup()
    idle.send.mockClear()
    setup()
    await screen.findByText('primeira resposta')
    await user.type(screen.getByLabelText('Mensagem'), 'troque{Enter}')
    expect(idle.send).toHaveBeenCalledWith('troque')
    expect(screen.getByLabelText('Mensagem')).toHaveValue('')
  })
})
