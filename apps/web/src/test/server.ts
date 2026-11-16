import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

// A sidebar de toda tela autenticada busca `GET /api/sidebar`: por padrão ela vem vazia.
export const server = setupServer(
  http.get('/api/sidebar', () => HttpResponse.json({ items: [] })),
)
