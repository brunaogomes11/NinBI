import type {
  TeamCreateInput,
  TeamDto,
  TeamUpdateInput,
} from '@ninbi/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export const TEAMS_QUERY_KEY = ['teams'] as const

export function useTeams() {
  return useQuery({
    queryKey: TEAMS_QUERY_KEY,
    queryFn: () => apiFetch<TeamDto[]>('/api/teams'),
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: TeamCreateInput) =>
      apiFetch<TeamDto>('/api/teams', { method: 'POST', body: values }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY }),
  })
}

export function useUpdateTeam(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: TeamUpdateInput) =>
      apiFetch<TeamDto>(`/api/teams/${id}`, { method: 'PATCH', body: values }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY }),
  })
}

export function useDeleteTeam(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch(`/api/teams/${id}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEY }),
  })
}
