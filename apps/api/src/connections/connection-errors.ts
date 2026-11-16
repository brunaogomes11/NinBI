import { MESSAGES } from '@ninbi/contracts'
import { AppError } from '../common/app-error'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isConnectionId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

export function connectionNotFound(): AppError {
  return new AppError(404, 'CONNECTION_NOT_FOUND', MESSAGES.connectionNotFound)
}
