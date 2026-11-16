import type { TeamDto } from '@ninbi/contracts'
import { HttpResponse, http, type RequestHandler } from 'msw'

/** Uma equipe da lista (Comercial, com dois membros e três dashboards, por padrão). */
export function makeTeam(overrides: Partial<TeamDto> = {}): TeamDto {
  const members = overrides.members ?? [
    { id: 'u-2', name: 'Bruno Lima', email: 'bruno@x.com' },
    { id: 'u-3', name: 'Carla Dias', email: 'carla@x.com' },
  ]
  return {
    id: 't-1',
    name: 'Comercial',
    memberCount: members.length,
    members,
    shareCount: 3,
    ...overrides,
  }
}

/** `GET /api/teams` com a lista dada. */
export function teamsHandler(teams: TeamDto[] = []): RequestHandler {
  return http.get('/api/teams', () => HttpResponse.json(teams))
}
