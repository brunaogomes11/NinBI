import type { McpToolDto } from '@ninbi/contracts'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { expect, it } from 'vitest'
import { sidebarHandler } from '@/test/fixtures/dashboards'
import { makeUser, renderApp, sessionHandler, setupStatusHandler } from '@/test/renderApp'

const sourceId = 'a1111111-1111-4111-8111-111111111111'
const tool: McpToolDto = {
  name: 'list',
  enabled: true,
  inputSchema: { type: 'object', properties: { state: { type: 'string' } } },
  lists: ['chamados', 'equipes'].map((name) => ({
    path: [name],
    columns: [{ name: 'equipe', type: 'string' }],
  })),
}

it('Admin cadastra uma conexão e habilita ferramenta tabular', async () => {
  const endpoint = 'https://mcp.example/stream'
  const updates: unknown[] = []
  let current: {
    id: string
    name: string
    endpoint: string
    enabledTools: string[]
  }[] = []
  const { user } = renderApp('/configuracoes/conexoes', {
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role: 'ADMIN' })),
      sidebarHandler(),
      http.get('/api/connections', () => HttpResponse.json([])),
      http.get('/api/mcp/connections', () => HttpResponse.json(current)),
      http.post('/api/mcp/connections', async ({ request }) => {
        const values = (await request.json()) as {
          name: string
          endpoint: string
        }
        current = [{ id: sourceId, ...values, enabledTools: [] }]
        return HttpResponse.json(current[0], { status: 201 })
      }),
      http.get(`/api/mcp/connections/${sourceId}/tools`, () =>
        HttpResponse.json([
          {
            ...tool,
            enabled: current[0]?.enabledTools.includes(tool.name) ?? false,
          },
        ]),
      ),
      http.patch(`/api/mcp/connections/${sourceId}`, async ({ request }) => {
        const values = (await request.json()) as { enabledTools: string[] }
        updates.push(values)
        current = current.map((item) => ({ ...item, ...values }))
        return HttpResponse.json(current[0])
      }),
    ],
  })
  await user.type(
    await screen.findByLabelText('Nome da conexão MCP'),
    'Chamados',
  )
  await user.type(screen.getByLabelText('URL do servidor MCP'), endpoint)
  await user.click(screen.getByRole('button', { name: 'Cadastrar MCP' }))
  const checkbox = await screen.findByRole('checkbox', { name: 'list' })
  expect(checkbox).not.toBeChecked()
  await user.click(checkbox)
  await waitFor(() => expect(checkbox).toBeChecked())
  expect(current).toEqual([
    { id: sourceId, name: 'Chamados', endpoint, enabledTools: ['list'] },
  ])
  expect(updates).toEqual([{ enabledTools: ['list'] }])
})
