import { z } from 'zod'
import { MESSAGES } from './messages'
import type { Role } from './roles'

export const SHARE_PERMISSIONS = ['view', 'edit'] as const
export type SharePermission = (typeof SHARE_PERMISSIONS)[number]

export const SHARE_PERMISSION_LABELS: Record<SharePermission, string> = {
  view: MESSAGES.sharePermissionView,
  edit: MESSAGES.sharePermissionEdit,
}

export type ShareRecipientKind =
  | { type: 'USER'; role: Role }
  | { type: 'TEAM' }
  | { type: 'EVERYONE' }

/** O Visualizador só recebe "Pode ver" (SHARE-10). */
export function shareOptionsFor(
  recipient: ShareRecipientKind,
): SharePermission[] {
  if (recipient.type === 'USER' && recipient.role === 'VIEWER') return ['view']
  return ['view', 'edit']
}

export type ShareRecipientInput =
  | { type: 'USER'; userId: string }
  | { type: 'TEAM'; teamId: string }
  | { type: 'EVERYONE' }

export type ShareRecipientDto =
  | {
      type: 'USER'
      id: string
      name: string
      email: string
      role: Role
      disabled: boolean
    }
  | { type: 'TEAM'; id: string; name: string }
  | { type: 'EVERYONE' }

export interface ShareDto {
  id: string
  recipient: ShareRecipientDto
  permission: SharePermission
}

export interface DashboardSharesDto {
  dashboardId: string
  ownerId: string
  ownerName: string
  shares: ShareDto[]
}

export interface ShareCandidatesDto {
  everyone: true
  teams: { id: string; name: string }[]
  users: { id: string; name: string; email: string; role: Role }[]
}

export interface TeamMemberDto {
  id: string
  name: string
  email: string
}

export interface TeamDto {
  id: string
  name: string
  memberCount: number
  members: TeamMemberDto[]
  shareCount: number
}

export const TEAM_NAME_MAX = 40

const teamName = z
  .string()
  .trim()
  .min(1, MESSAGES.nameRequired)
  .max(TEAM_NAME_MAX, MESSAGES.teamNameTooLong)

const memberIds = z
  .array(z.uuid(MESSAGES.userNotFound))
  .refine((ids) => new Set(ids).size === ids.length, {
    message: MESSAGES.validationError,
  })

export const teamCreateSchema = z.object({ name: teamName, memberIds })

export const teamUpdateSchema = z
  .object({ name: teamName.optional(), memberIds: memberIds.optional() })
  .refine(
    (value) => value.name !== undefined || value.memberIds !== undefined,
    { message: MESSAGES.validationError },
  )

const permission = z.enum(SHARE_PERMISSIONS)

const recipientSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('USER'), userId: z.uuid() }),
  z.object({ type: z.literal('TEAM'), teamId: z.uuid() }),
  z.object({ type: z.literal('EVERYONE') }),
])

export const shareUpsertSchema = z.object({
  recipient: recipientSchema,
  permission,
})

export const shareUpdateSchema = z.object({ permission })

export type TeamCreateInput = z.input<typeof teamCreateSchema>
export type TeamUpdateInput = z.input<typeof teamUpdateSchema>
export type ShareUpsertInput = z.input<typeof shareUpsertSchema>
export type ShareUpdateInput = z.input<typeof shareUpdateSchema>
