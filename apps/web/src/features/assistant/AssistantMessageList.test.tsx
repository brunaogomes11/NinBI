import {
  type AssistantMessageDto,
  type AssistantReplyDetails,
  MESSAGES,
} from '@ninbi/contracts'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AssistantMessageList } from './AssistantMessageList'

const details: AssistantReplyDetails = {
  changes: [],
  notApplied: [],
  createdWidgets: 0,
  failedWidgets: [],
  discardedWidgets: 0,
}

function reply(
  id: string,
  text: string,
  override: Partial<AssistantReplyDetails> = {},
): AssistantMessageDto {
  return {
    id,
    role: 'ASSISTANT',
    text,
    details: { ...details, ...override },
    createdAt: '2026-11-17T10:00:05Z',
  }
}

function mine(id: string, text: string): AssistantMessageDto {
  return {
    id,
    role: 'USER',
    text,
    details: null,
    createdAt: '2026-11-17T10:00:00Z',
  }
}

function renderList(
  props: Partial<Parameters<typeof AssistantMessageList>[0]> = {},
) {
  const handlers = {
    onReload: vi.fn(),
    onUndo: vi.fn(),
    onRetry: vi.fn(),
  }
  render(
    <AssistantMessageList
      status="success"
      messages={[]}
      undoMessageId={null}
      failure={null}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('AssistantMessageList', () => {
  it('HIST-07 conversa carregando mostra esqueleto', () => {
    const { container } = render(
      <AssistantMessageList
        status="pending"
        messages={[]}
        onReload={() => {}}
        undoMessageId={null}
        onUndo={() => {}}
        failure={null}
        onRetry={() => {}}
      />,
    )
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0)
  })

  it('HIST-08 conversa que não carrega mostra Não foi possível carregar a conversa e Tentar novamente', async () => {
    const user = userEvent.setup()
    const { onReload } = renderList({ status: 'error' })
    expect(screen.getByText(MESSAGES.assistantLoadFailed)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('CHAT-20 conversa vazia mostra Descreva o que você quer ver ou mudar neste dashboard', () => {
    renderList()
    expect(
      screen.getByText('Descreva o que você quer ver ou mudar neste dashboard'),
    ).toBeInTheDocument()
  })

  it('CHAT-09 resposta mostra o texto e a lista do que mudou', () => {
    renderList({
      messages: [
        mine('u1', 'troque para linha'),
        reply('a1', 'Troquei o gráfico.', {
          changes: ['Widget alterado: Vendas'],
          notApplied: ['Não aplicado: w9 não existe'],
        }),
      ],
    })
    expect(screen.getByText('Troquei o gráfico.')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    const texts = items.map((item) => item.textContent)
    expect(texts).toContain('Widget alterado: Vendas')
    expect(texts).toContain('Não aplicado: w9 não existe')
  })

  it('GEN-07 resposta mostra os widgets criados e os títulos com erro', () => {
    renderList({
      messages: [
        reply('a1', 'Pronto.', {
          createdWidgets: 3,
          failedWidgets: ['Ranking de lojas'],
        }),
      ],
    })
    expect(screen.getByText('3 widgets criados')).toBeInTheDocument()
    expect(
      screen.getByText('Widgets com erro: Ranking de lojas'),
    ).toBeInTheDocument()
  })

  it('GEN-12 resposta mostra quantos widgets foram descartados', () => {
    renderList({
      messages: [reply('a1', 'Pronto.', { discardedWidgets: 3 })],
    })
    expect(
      screen.getByText('3 widgets descartados: o limite é 20 por pedido'),
    ).toBeInTheDocument()
  })

  it('CHAT-10 Desfazer aparece só na resposta indicada', async () => {
    const user = userEvent.setup()
    const { onUndo } = renderList({
      messages: [
        mine('u1', 'um'),
        reply('a1', 'Primeira.', { changes: ['Aba criada: A'] }),
        mine('u2', 'dois'),
        reply('a2', 'Segunda.', { changes: ['Aba criada: B'] }),
      ],
      undoMessageId: 'a2',
    })
    const buttons = screen.getAllByRole('button', { name: 'Desfazer' })
    expect(buttons).toHaveLength(1)
    const item = buttons[0]?.closest('li')
    expect(item && within(item).getByText('Segunda.')).toBeInTheDocument()
    await user.click(buttons[0] as HTMLElement)
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('HIST-09 respostas antigas aparecem sem Desfazer', () => {
    renderList({
      messages: [reply('a1', 'Antiga.', { changes: ['Aba criada: A'] })],
      undoMessageId: null,
    })
    expect(
      screen.queryByRole('button', { name: 'Desfazer' }),
    ).not.toBeInTheDocument()
  })

  it('CHAT-21 falha mostra a mensagem do provedor e Tentar novamente na mensagem do usuário', async () => {
    const user = userEvent.setup()
    const { onRetry } = renderList({
      messages: [mine('u1', 'troque'), mine('u2', 'outra')],
      failure: {
        userMessageId: 'u2',
        text: 'outra',
        message: 'O provedor de IA recusou a chave configurada',
      },
    })
    const item = screen.getByText('outra').closest('li') as HTMLElement
    expect(
      within(item).getByText('O provedor de IA recusou a chave configurada'),
    ).toBeInTheDocument()
    expect(
      within(
        screen.getByText('troque').closest('li') as HTMLElement,
      ).queryByRole('button', { name: 'Tentar novamente' }),
    ).not.toBeInTheDocument()
    await user.click(
      within(item).getByRole('button', { name: 'Tentar novamente' }),
    )
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('CHAT-21 falha de pedido não aceito mostra a mensagem e Tentar novamente ao fim da conversa', async () => {
    const user = userEvent.setup()
    const { onRetry } = renderList({
      messages: [],
      failure: {
        userMessageId: null,
        text: 'oi',
        message: MESSAGES.aiSchemaNotRead,
      },
    })
    expect(screen.getByText(MESSAGES.aiSchemaNotRead)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('mensagens na ordem recebida', () => {
    renderList({
      messages: [mine('u1', 'primeira'), reply('a1', 'segunda')],
    })
    const text = screen.getAllByRole('listitem').map((i) => i.textContent)
    expect(text[0]).toContain('primeira')
    expect(text[1]).toContain('segunda')
  })
})
