import { Injectable, Logger, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

/** Uma linha por resposta: método, caminho sem query, status e duração. */
@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint()
    res.on('finish', () => {
      const elapsedMs = Number(
        (process.hrtime.bigint() - startedAt) / 1_000_000n,
      )
      const path = req.originalUrl.split('?')[0]
      this.logger.log(`${req.method} ${path} ${res.statusCode} ${elapsedMs}ms`)
    })
    next()
  }
}
