import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'
import { MESSAGES } from './messages'
import {
  shareOptionsFor,
  shareUpsertSchema,
  teamCreateSchema,
  teamUpdateSchema,
} from './sharing'

function errorsOf(
  schema: ZodType,
  value: unknown,
): Record<string, string> | null {
  const result = schema.safeParse(value)
  if (result.success) return null
  const byField: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.')
    if (!(field in byField)) byField[field] = issue.message
  }
  return byField
}

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

describe('sharing contracts', () => {
  it('TEAM-04 nome da equipe vazio ou com mais de 40 caracteres', () => {
    const create = (name: string) => ({ name, memberIds: [] })
    expect(errorsOf(teamCreateSchema, create(''))).toEqual({
      name: 'Informe o nome',
    })
    expect(errorsOf(teamCreateSchema, create('   '))).toEqual({
      name: 'Informe o nome',
    })
    expect(errorsOf(teamCreateSchema, create('a'.repeat(41)))).toEqual({
      name: 'O nome pode ter até 40 caracteres',
    })
    expect(errorsOf(teamCreateSchema, create('a'.repeat(40)))).toBeNull()
  })

  it('SHARE-10 Visualizador só recebe Pode ver nas opções', () => {
    expect(shareOptionsFor({ type: 'USER', role: 'VIEWER' })).toEqual(['view'])
    expect(shareOptionsFor({ type: 'USER', role: 'EDITOR' })).toEqual([
      'view',
      'edit',
    ])
    expect(shareOptionsFor({ type: 'USER', role: 'ADMIN' })).toEqual([
      'view',
      'edit',
    ])
    expect(shareOptionsFor({ type: 'TEAM' })).toEqual(['view', 'edit'])
    expect(shareOptionsFor({ type: 'EVERYONE' })).toEqual(['view', 'edit'])
  })

  it('TEAM-07 a confirmação de exclusão traz o nome e o número de dashboards', () => {
    expect(MESSAGES.teamDeleteConfirm('Comercial', 3)).toBe(
      'Excluir a equipe Comercial? 3 dashboards deixarão de estar compartilhados com ela.',
    )
  })

  it('ACL-08 sharedBy traz o nome do dono', () => {
    expect(MESSAGES.sharedBy('Ana Souza')).toBe('Compartilhado por Ana Souza')
  })

  it('SHARE-06 shareUpsertSchema recusa type desconhecido e USER sem userId', () => {
    expect(
      errorsOf(shareUpsertSchema, {
        recipient: { type: 'GROUP' },
        permission: 'view',
      }),
    ).not.toBeNull()
    expect(
      errorsOf(shareUpsertSchema, {
        recipient: { type: 'USER' },
        permission: 'view',
      }),
    ).not.toBeNull()
    expect(
      errorsOf(shareUpsertSchema, {
        recipient: { type: 'USER', userId: id(1) },
        permission: 'edit',
      }),
    ).toBeNull()
    expect(
      errorsOf(shareUpsertSchema, {
        recipient: { type: 'EVERYONE' },
        permission: 'view',
      }),
    ).toBeNull()
  })

  it('TEAM-06 teamUpdateSchema vazio é recusado e membros repetidos também', () => {
    expect(errorsOf(teamUpdateSchema, {})).not.toBeNull()
    expect(errorsOf(teamUpdateSchema, { name: 'Vendas' })).toBeNull()
    expect(errorsOf(teamUpdateSchema, { memberIds: [id(1), id(2)] })).toBeNull()
    expect(
      errorsOf(teamUpdateSchema, { memberIds: [id(1), id(1)] }),
    ).not.toBeNull()
    expect(
      errorsOf(teamCreateSchema, { name: 'Vendas', memberIds: [id(1), id(1)] }),
    ).not.toBeNull()
  })
})
