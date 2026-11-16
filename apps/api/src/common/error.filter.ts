import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common'
import { type ApiErrorBody, MESSAGES } from '@ninbi/contracts'
import type { Response } from 'express'
import { AppError } from './app-error'

@Catch()
export class AppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('Error')

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const { status, body } = this.toResponse(exception)
    response.status(status).json(body)
  }

  private toResponse(exception: unknown): {
    status: number
    body: ApiErrorBody
  } {
    if (exception instanceof AppError) {
      const body: ApiErrorBody = {
        code: exception.code,
        message: exception.message,
      }
      if (exception.fieldErrors) body.fieldErrors = exception.fieldErrors
      return { status: exception.status, body }
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      if (status === 404) {
        return {
          status,
          body: { code: 'NOT_FOUND', message: MESSAGES.userNotFound },
        }
      }
      if (status === 400) {
        return {
          status,
          body: { code: 'VALIDATION_ERROR', message: MESSAGES.validationError },
        }
      }
    }
    this.logger.error(
      exception instanceof Error ? exception.message : 'erro desconhecido',
    )
    return {
      status: 500,
      body: { code: 'INTERNAL_ERROR', message: MESSAGES.internalError },
    }
  }
}
