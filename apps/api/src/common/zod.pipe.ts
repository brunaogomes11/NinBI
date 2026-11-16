import type { PipeTransform } from '@nestjs/common'
import { MESSAGES } from '@ninbi/contracts'
import type { ZodType } from 'zod'
import { AppError } from './app-error'

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value ?? {})
    if (result.success) return result.data
    const fieldErrors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const field = String(issue.path[0] ?? '_')
      if (!(field in fieldErrors)) fieldErrors[field] = issue.message
    }
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      MESSAGES.validationError,
      fieldErrors,
    )
  }
}
