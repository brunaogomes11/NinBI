import type {
  DashboardSharesDto,
  ShareCandidatesDto,
  ShareDto,
} from '@ninbi/contracts'
import { HttpResponse, http, type RequestHandler } from 'msw'

export const SHARES_URL = '/api/dashboards/d-1/shares'

export const everyoneShare = (
  permission: ShareDto['permission'] = 'view',
): ShareDto => ({
  id: 's-everyone',
  recipient: { type: 'EVERYONE' },
  permission,
})

export const teamShare = (
  overrides: { id?: string; name?: string } & Partial<
    Pick<ShareDto, 'permission'>
  > = {},
): ShareDto => ({
  id: overrides.id ?? 's-team',
  recipient: { type: 'TEAM', id: 't-1', name: overrides.name ?? 'Comercial' },
  permission: overrides.permission ?? 'view',
})

export const userShare = (
  overrides: {
    id?: string
    userId?: string
    name?: string
    email?: string
    role?: 'ADMIN' | 'EDITOR' | 'VIEWER'
    disabled?: boolean
    permission?: ShareDto['permission']
  } = {},
): ShareDto => ({
  id: overrides.id ?? 's-user',
  recipient: {
    type: 'USER',
    id: overrides.userId ?? 'u-2',
    name: overrides.name ?? 'Bruno Lima',
    email: overrides.email ?? 'bruno@x.com',
    role: overrides.role ?? 'EDITOR',
    disabled: overrides.disabled ?? false,
  },
  permission: overrides.permission ?? 'edit',
})

/** A lista de compartilhamentos do dashboard `d-1`, de Ana Souza, com as linhas dadas. */
export function makeShares(shares: ShareDto[] = []): DashboardSharesDto {
  return {
    dashboardId: 'd-1',
    ownerId: 'user-ana',
    ownerName: 'Ana Souza',
    shares,
  }
}

/** `GET` da lista de compartilhamentos do dashboard `d-1`. */
export function sharesHandler(shares: ShareDto[] = []): RequestHandler {
  return http.get(SHARES_URL, () => HttpResponse.json(makeShares(shares)))
}

export function makeCandidates(
  overrides: Partial<ShareCandidatesDto> = {},
): ShareCandidatesDto {
  return { everyone: true, teams: [], users: [], ...overrides }
}
