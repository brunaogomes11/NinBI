import type { ExampleSetting, Role } from '@ninbi/contracts'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { SESSION_QUERY_KEY } from '@/features/auth/useSession'
import { makeSchema, schemaHandler } from '@/test/fixtures/schema'
import {
  makeUser,
  renderApp,
  sessionHandler,
  setupStatusHandler,
} from '@/test/renderApp'
import { useConnectionSchema } from './api'
import { ExampleToggle } from './ExampleToggle'
import { SchemaPropertiesTable } from './SchemaPropertiesTable'

function ClienteProperties() {
  const schema = useConnectionSchema('c-1')
  if (!schema.data) return null
  const cliente = schema.data.labels[0]
  return (
    <SchemaPropertiesTable
      element={cliente}
      renderAction={(property) => (
        <ExampleToggle
          connectionId="c-1"
          kind="LABEL"
          element={cliente.name}
          property={property}
        />
      )}
    />
  )
}

function openToggles(role: Role = 'ADMIN') {
  const puts: ExampleSetting[] = []
  const view = renderApp('/', {
    routes: [{ path: '/', element: <ClienteProperties /> }],
    handlers: [
      setupStatusHandler(false),
      sessionHandler(makeUser({ role })),
      schemaHandler(makeSchema()),
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

async function toggleOf(property: string): Promise<HTMLElement> {
  const row = (await screen.findByRole('cell', { name: property })).closest(
    'tr',
  ) as HTMLElement
  return within(row).getByRole('switch', { name: 'Enviar exemplo à IA' })
}

describe('ExampleToggle', () => {
  it('SCH-22 desligar Enviar exemplo à IA mostra exemplo não enviado', async () => {
    const view = openToggles('ADMIN')

    const toggle = await toggleOf('email')
    expect(toggle).toBeChecked()
    await view.user.click(toggle)

    await waitFor(() =>
      expect(view.puts).toEqual([
        {
          kind: 'LABEL',
          element: 'Cliente',
          property: 'email',
          sendExample: false,
        },
      ]),
    )
    const row = screen.getByRole('cell', { name: 'email' }).closest('tr')
    expect(
      await within(row as HTMLElement).findByText('exemplo não enviado'),
    ).toBeInTheDocument()
    expect(await toggleOf('email')).not.toBeChecked()
    expect(
      within(
        screen.getByRole('cell', { name: 'nome' }).closest('tr') as HTMLElement,
      ).queryByText('exemplo não enviado'),
    ).not.toBeInTheDocument()
  })

  it('SCH-24 controle Enviar exemplo à IA desabilitado para Editor', async () => {
    const editor = openToggles('EDITOR')
    await waitFor(() =>
      expect(editor.queryClient.getQueryData(SESSION_QUERY_KEY)).toMatchObject({
        role: 'EDITOR',
      }),
    )
    expect(await toggleOf('email')).toBeDisabled()
    editor.unmount()

    openToggles('ADMIN')
    const toggle = await toggleOf('email')
    await waitFor(() => expect(toggle).toBeEnabled())
  })
})
