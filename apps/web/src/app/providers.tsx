import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useLayoutEffect } from 'react'
import { SESSION_QUERY_KEY } from '@/features/auth/useSession'
import { onUnauthorized } from '@/lib/api'
import { ThemeProvider } from '@/theme/ThemeProvider'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
}

export function AppProviders({
  client,
  children,
}: {
  client: QueryClient
  children: ReactNode
}) {
  // Um 401 fora do login e da consulta da sessão encerra a sessão em cache;
  // `RequireAuth` então leva ao login guardando a página atual.
  useLayoutEffect(
    () => onUnauthorized(() => client.setQueryData(SESSION_QUERY_KEY, null)),
    [client],
  )

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  )
}
