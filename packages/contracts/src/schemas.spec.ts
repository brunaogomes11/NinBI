import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'
import {
  changePasswordSchema,
  changeRoleSchema,
  initialPasswordSchema,
  loginSchema,
  newUserSchema,
  resetPasswordSchema,
  setupAdminSchema,
} from './schemas'

/** Mensagem do primeiro erro de cada campo, ou null quando o valor é válido. */
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

const validSetup = {
  name: 'Ana',
  email: 'ana@x.com',
  password: 'senha1234',
  confirmPassword: 'senha1234',
}

const SHORT = 'A senha precisa ter ao menos 8 caracteres'

describe('setupAdminSchema', () => {
  it('SETUP-04 senha com menos de 8 caracteres', () => {
    expect(
      errorsOf(setupAdminSchema, {
        ...validSetup,
        password: '1234567',
        confirmPassword: '1234567',
      }),
    ).toEqual({ password: SHORT })
  })

  it('SETUP-04 senha com exatamente 8 caracteres é aceita', () => {
    expect(
      errorsOf(setupAdminSchema, {
        ...validSetup,
        password: '12345678',
        confirmPassword: '12345678',
      }),
    ).toBeNull()
  })

  it('SETUP-05 senhas diferentes', () => {
    expect(
      errorsOf(setupAdminSchema, {
        ...validSetup,
        confirmPassword: 'outra1234',
      }),
    ).toEqual({ confirmPassword: 'As senhas não conferem' })
  })

  it('SETUP-04 dados válidos passam', () => {
    expect(errorsOf(setupAdminSchema, validSetup)).toBeNull()
  })
})

describe('loginSchema', () => {
  it('AUTH-03 e-mail vazio ou inválido e senha vazia', () => {
    expect(errorsOf(loginSchema, { email: '', password: 'x' })).toEqual({
      email: 'Informe o e-mail',
    })
    expect(errorsOf(loginSchema, { email: 'ana@', password: 'x' })).toEqual({
      email: 'Informe um e-mail válido',
    })
    expect(errorsOf(loginSchema, { email: 'ana@x.com', password: '' })).toEqual(
      { password: 'Informe a senha' },
    )
  })

  it('AUTH-03 e-mail e senha válidos passam', () => {
    expect(
      errorsOf(loginSchema, { email: 'ana@x.com', password: 'x' }),
    ).toBeNull()
  })
})

describe('newUserSchema', () => {
  const valid = {
    name: 'Bruno',
    email: 'bruno@x.com',
    role: 'EDITOR',
    temporaryPassword: 'provisoria1',
  }

  it('USR-14 nome com 121 caracteres é recusado no campo e 120 passa', () => {
    expect(
      errorsOf(newUserSchema, { ...valid, name: 'a'.repeat(121) }),
    ).toEqual({ name: 'O nome pode ter no máximo 120 caracteres' })
    expect(
      errorsOf(newUserSchema, { ...valid, name: 'a'.repeat(120) }),
    ).toBeNull()
  })

  it('USR-14 e-mail com 121 caracteres é recusado no campo e 120 passa', () => {
    const email = (size: number) =>
      `${'a'.repeat(size - '@x.com'.length)}@x.com`
    expect(errorsOf(newUserSchema, { ...valid, email: email(121) })).toEqual({
      email: 'O e-mail pode ter no máximo 120 caracteres',
    })
    expect(errorsOf(newUserSchema, { ...valid, email: email(120) })).toBeNull()
  })

  it('USR-04 nome vazio, e-mail mal formado, papel inválido e senha curta', () => {
    expect(errorsOf(newUserSchema, { ...valid, name: '' })).toEqual({
      name: 'Informe o nome',
    })
    expect(errorsOf(newUserSchema, { ...valid, email: 'bruno' })).toEqual({
      email: 'Informe um e-mail válido',
    })
    expect(errorsOf(newUserSchema, { ...valid, role: 'ROOT' })).toEqual({
      role: 'Escolha um papel',
    })
    expect(
      errorsOf(newUserSchema, { ...valid, temporaryPassword: '1234567' }),
    ).toEqual({ temporaryPassword: SHORT })
  })

  it('USR-04 dados válidos passam, com os três papéis', () => {
    for (const role of ['ADMIN', 'EDITOR', 'VIEWER']) {
      expect(errorsOf(newUserSchema, { ...valid, role })).toBeNull()
    }
  })
})

describe('changePasswordSchema', () => {
  it('PWD-03 nova senha com menos de 8 caracteres', () => {
    expect(
      errorsOf(changePasswordSchema, {
        currentPassword: 'atual1234',
        newPassword: '1234567',
      }),
    ).toEqual({ newPassword: SHORT })
  })

  it('PWD-01 senha atual vazia é recusada e dados válidos passam', () => {
    expect(
      errorsOf(changePasswordSchema, {
        currentPassword: '',
        newPassword: 'nova12345',
      }),
    ).toEqual({ currentPassword: 'Informe a senha atual' })
    expect(
      errorsOf(changePasswordSchema, {
        currentPassword: 'atual1234',
        newPassword: 'nova12345',
      }),
    ).toBeNull()
  })
})

describe('initialPasswordSchema', () => {
  it('USR-06 confirmação diferente e senha curta na senha definitiva', () => {
    expect(
      errorsOf(initialPasswordSchema, {
        newPassword: 'nova12345',
        confirmPassword: 'outra1234',
      }),
    ).toEqual({ confirmPassword: 'As senhas não conferem' })
    expect(
      errorsOf(initialPasswordSchema, {
        newPassword: '1234567',
        confirmPassword: '1234567',
      }),
    ).toEqual({ newPassword: SHORT })
    expect(
      errorsOf(initialPasswordSchema, {
        newPassword: 'nova12345',
        confirmPassword: 'nova12345',
      }),
    ).toBeNull()
  })
})

describe('resetPasswordSchema e changeRoleSchema', () => {
  it('USR-07 senha provisória curta é recusada e válida passa', () => {
    expect(
      errorsOf(resetPasswordSchema, { temporaryPassword: '1234567' }),
    ).toEqual({ temporaryPassword: SHORT })
    expect(
      errorsOf(resetPasswordSchema, { temporaryPassword: 'provisoria1' }),
    ).toBeNull()
  })

  it('ROLE-05 papel inválido é recusado e papel válido passa', () => {
    expect(errorsOf(changeRoleSchema, { role: 'ROOT' })).toEqual({
      role: 'Escolha um papel',
    })
    expect(errorsOf(changeRoleSchema, { role: 'VIEWER' })).toBeNull()
  })
})
