import { z } from 'zod'
import { MESSAGES } from './messages'
import { ROLES, type Role } from './roles'

export interface SessionUserDto {
  id: string
  name: string
  email: string
  role: Role
  mustChangePassword: boolean
}

export interface UserDto {
  id: string
  name: string
  email: string
  role: Role
  status: 'ACTIVE' | 'DISABLED'
}

const MAX_TEXT = 120

const name = z
  .string()
  .trim()
  .min(1, MESSAGES.nameRequired)
  .max(MAX_TEXT, MESSAGES.nameTooLong)

const email = z
  .string()
  .trim()
  .min(1, MESSAGES.emailRequired)
  .max(MAX_TEXT, MESSAGES.emailTooLong)
  .pipe(z.email(MESSAGES.emailInvalid))

const newPassword = z.string().min(8, MESSAGES.passwordTooShort)

const role = z.enum(ROLES, MESSAGES.roleInvalid)

export const loginSchema = z.object({
  email,
  password: z.string().min(1, MESSAGES.passwordRequired),
})

export const setupAdminSchema = z
  .object({
    name,
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: MESSAGES.passwordsMismatch,
    path: ['confirmPassword'],
  })

export const newUserSchema = z.object({
  name,
  email,
  role,
  temporaryPassword: newPassword,
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, MESSAGES.currentPasswordRequired),
  newPassword,
})

export const initialPasswordSchema = z
  .object({
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: MESSAGES.passwordsMismatch,
    path: ['confirmPassword'],
  })

export const resetPasswordSchema = z.object({
  temporaryPassword: newPassword,
})

export const changeRoleSchema = z.object({ role })

export type LoginInput = z.infer<typeof loginSchema>
export type SetupAdminInput = z.infer<typeof setupAdminSchema>
export type NewUserInput = z.infer<typeof newUserSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type InitialPasswordInput = z.infer<typeof initialPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>
