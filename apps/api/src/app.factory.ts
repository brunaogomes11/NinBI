import type { INestApplication } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import type { NextFunction, Request, Response } from 'express'
import { AppErrorFilter } from './common/error.filter'
import { HttpLoggingMiddleware } from './common/http-logging.middleware'

export function configureApp(app: INestApplication): INestApplication {
  const httpLogging = new HttpLoggingMiddleware()
  app.setGlobalPrefix('api')
  app.use((req: Request, res: Response, next: NextFunction) =>
    httpLogging.use(req, res, next),
  )
  app.use(cookieParser())
  app.useGlobalFilters(new AppErrorFilter())
  return app
}
