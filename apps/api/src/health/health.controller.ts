import { Controller, Get, Inject, Res } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import type { Response } from 'express'
import { Public } from '../auth/decorators'
import { type AppDatabase, DB } from '../database/database.module'

interface HealthBody {
  status: 'ok' | 'error'
  postgres: 'up' | 'down'
}

@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: AppDatabase) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthBody> {
    try {
      await this.db.execute(sql`select 1`)
      return { status: 'ok', postgres: 'up' }
    } catch {
      res.status(503)
      return { status: 'error', postgres: 'down' }
    }
  }
}
