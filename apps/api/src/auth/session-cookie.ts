import type { Request, Response } from 'express'
import { SESSION_IDLE_LIMIT_MS } from './session.service'

export const SESSION_COOKIE = 'ninbi_session'

export function readSessionToken(request: Request): string | undefined {
  const token = request.cookies?.[SESSION_COOKIE]
  return typeof token === 'string' && token.length > 0 ? token : undefined
}

export function setSessionCookie(response: Response, token: string): void {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NINBI_COOKIE_SECURE === 'true',
    maxAge: SESSION_IDLE_LIMIT_MS,
  })
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE, { path: '/' })
}
