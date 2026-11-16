import { LLM_PROVIDER_LABELS, LLM_PROVIDERS, MESSAGES } from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { llmConfigHandler, makeLlmSettings } from '@/test/fixtures/llm'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'

function openLlmTab(extra: ReturnType<typeof http.get>[] = []) {
  return renderApp('/configuracoes/llm', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role: 'ADMIN' })),
      ...extra,
    ],
  })
}

/** `PUT /api/llm-config` que guarda os corpos recebidos. */
function putRecorder(response?: () => Response) {
  const bodies: Record<string, unknown>[] = []
  const handler = http.put('/api/llm-config', async ({ request }) => {
    bodies.push((await request.json()) as Record<string, unknown>)
    return response?.() ?? HttpResponse.json(makeLlmSettings())
  })
  return { bodies, handler }
}

const save = (user: ReturnType<typeof renderApp>['user']) =>
  user.click(screen.getByRole('button', { name: 'Salvar' }))

async function pickProvider(
  user: ReturnType<typeof renderApp>['user'],
  label: string,
) {
  await user.click(await screen.findByRole('combobox', { name: 'Provedor' }))
  await user.click(await screen.findByRole('option', { name: label }))
}

describe('LlmSettingsTab', () => {
  it('LLM-01 aba LLM mostra Provedor, Modelo, Chave de API e URL base', async () => {
    openLlmTab([llmConfigHandler()])

    expect(
      await screen.findByRole('combobox', { name: 'Provedor' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Modelo')).toBeInTheDocument()
    expect(screen.getByLabelText('Chave de API')).toBeInTheDocument()
    expect(screen.getByLabelText('URL base')).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'LLM', selected: true }),
    ).toBeVisible()
  })

  it('LLM-02 select Provedor oferece os cinco provedores na ordem', async () => {
    const { user } = openLlmTab([llmConfigHandler()])

    await user.click(await screen.findByRole('combobox', { name: 'Provedor' }))

    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(
      LLM_PROVIDERS.map((provider) => LLM_PROVIDER_LABELS[provider]),
    )
    expect(options.map((option) => option.textContent)).toEqual([
      'OpenAI',
      'Anthropic',
      'Google Gemini',
      'Ollama',
      'Compatível com OpenAI',
    ])
  })

  it('LLM-04 campo da chave mostra só os 4 últimos caracteres', async () => {
    openLlmTab([llmConfigHandler(makeLlmSettings({ apiKeyLast4: '1234' }))])

    const key = await screen.findByLabelText('Chave de API')

    expect(key).toHaveValue('')
    expect(key).toHaveAttribute('placeholder', '••••1234')
    expect(document.body.textContent).not.toContain('sk-teste')
    expect(document.body.textContent).not.toContain('abcd')
  })

  it('LLM-05 salvar sem digitar a chave não envia chave', async () => {
    const put = putRecorder()
    const { user } = openLlmTab([
      llmConfigHandler(makeLlmSettings()),
      put.handler,
    ])

    const model = await screen.findByLabelText('Modelo')
    expect(screen.getByText(MESSAGES.llmKeepKeyHint)).toBeVisible()
    await user.clear(model)
    await user.type(model, 'gpt-4.1')
    await save(user)

    await waitFor(() => expect(put.bodies).toHaveLength(1))
    expect(put.bodies[0]).toMatchObject({
      provider: 'OPENAI',
      model: 'gpt-4.1',
      apiKey: '',
    })
  })

  it('LLM-06 URL base vazia mostra Informe a URL base', async () => {
    const put = putRecorder()
    const { user } = openLlmTab([llmConfigHandler(), put.handler])

    await pickProvider(user, 'Ollama')
    await user.type(screen.getByLabelText('Modelo'), 'llama3')
    await save(user)

    expect(await screen.findByText('Informe a URL base')).toBeVisible()
    expect(put.bodies).toHaveLength(0)
  })

  it('LLM-07 sem chave mostra Informe a chave de API no campo', async () => {
    const put = putRecorder(() =>
      HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: MESSAGES.validationError,
          fieldErrors: { apiKey: 'Informe a chave de API' },
        },
        { status: 400 },
      ),
    )
    const { user } = openLlmTab([llmConfigHandler(), put.handler])

    await user.type(await screen.findByLabelText('Modelo'), 'gpt-4o')
    await save(user)
    expect(await screen.findByText('Informe a chave de API')).toBeVisible()
    expect(put.bodies).toHaveLength(0)

    await user.type(screen.getByLabelText('Chave de API'), 'sk-qualquer')
    await save(user)
    await waitFor(() => expect(put.bodies).toHaveLength(1))
    expect(await screen.findByText('Informe a chave de API')).toBeVisible()
  })

  it('LLM-08 modelo vazio mostra Informe o modelo', async () => {
    const put = putRecorder()
    const { user } = openLlmTab([llmConfigHandler(), put.handler])

    await screen.findByLabelText('Modelo')
    await save(user)

    expect(await screen.findByText('Informe o modelo')).toBeVisible()
    expect(put.bodies).toHaveLength(0)
  })
})
