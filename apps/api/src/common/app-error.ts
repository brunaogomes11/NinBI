import type { ErrorCode } from '@ninbi/contracts'

/** Erro de negócio com o corpo `{ code, message, fieldErrors }` já definido. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message)
  }
}
