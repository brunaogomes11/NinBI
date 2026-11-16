import { MESSAGES } from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http, type RequestHandler } from 'msw'
import { describe, expect, it } from 'vitest'
import { llmConfigHandler, makeLlmSettings } from '@/test/fixtures/llm'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

function openLlmTab(extra: RequestHandler[] = []) {
  return renderApp('/configuracoes/llm', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role: 'ADMIN' })),
      ...extra,
    ],
  })
}

describe('LLM: testar e remover', () => {
  it('LLM-09 Testar mostra Provedor respondendo', async () => {
    const bodies: Record<string, unknown>[] = []
    const { user } = openLlmTab([
      llmConfigHandler(),
      http.post('/api/llm-config/test', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json({ ok: true })
      }),
    ])

    await user.click(await screen.findByRole('combobox', { name: 'Provedor' }))
    await user.click(await screen.findByRole('option', { name: 'Ollama' }))
    await user.type(screen.getByLabelText('Modelo'), 'llama3')
    await user.type(screen.getByLabelText('URL base'), 'http://ollama:11434')
    await user.click(screen.getByRole('button', { name: 'Testar' }))

    expect(await screen.findByText('Provedor respondendo')).toBeVisible()
    expect(bodies).toHaveLength(1)
    expect(bodies[0]).toMatchObject({
      provider: 'OLLAMA',
      model: 'llama3',
      baseUrl: 'http://ollama:11434',
    })
  })

  it('LLM-10 Testar com falha mostra a mensagem do provedor', async () => {
    const { user } = openLlmTab([
      llmConfigHandler(makeLlmSettings()),
      http.post('/api/llm-config/test', () =>
        HttpResponse.json(
          {
            code: 'LLM_PROVIDER_ERROR',
            message: 'Incorrect API key provided',
          },
          { status: 422 },
        ),
      ),
    ])

    await screen.findByLabelText('Modelo')
    await user.click(screen.getByRole('button', { name: 'Testar' }))

    expect(await screen.findByText('Incorrect API key provided')).toBeVisible()
    expect(screen.queryByText('Provedor respondendo')).not.toBeInTheDocument()
  })

  it('LLM-11 Remover configuração pede confirmação', async () => {
    let deletes = 0
    const { user } = openLlmTab([
      llmConfigHandler(makeLlmSettings()),
      http.delete('/api/llm-config', () => {
        deletes += 1
        return new HttpResponse(null, { status: 204 })
      }),
    ])

    await user.click(
      await screen.findByRole('button', { name: 'Remover configuração' }),
    )

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent(MESSAGES.llmRemoveConfirm)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(deletes).toBe(0)
  })

  it('LLM-12 confirmar a remoção limpa o formulário', async () => {
    let deletes = 0
    const { user } = openLlmTab([
      llmConfigHandler(makeLlmSettings({ model: 'gpt-4o' })),
      http.delete('/api/llm-config', () => {
        deletes += 1
        return new HttpResponse(null, { status: 204 })
      }),
    ])

    expect(await screen.findByLabelText('Modelo')).toHaveValue('gpt-4o')
    await user.click(
      screen.getByRole('button', { name: 'Remover configuração' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Remover' }))

    await waitFor(() => expect(deletes).toBe(1))
    await waitFor(() => expect(screen.getByLabelText('Modelo')).toHaveValue(''))
    expect(
      screen.queryByRole('button', { name: 'Remover configuração' }),
    ).not.toBeInTheDocument()
  })
})
