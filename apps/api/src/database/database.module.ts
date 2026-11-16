import { Global, Module } from '@nestjs/common'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import { Pool } from 'pg'
import { loadEnv } from '../config/env'
import { attachPoolErrorLogger } from './pool-error-logger'
import * as schema from './schema'

export type AppDatabase =
  | NodePgDatabase<typeof schema>
  | PgliteDatabase<typeof schema>

export const DB = Symbol('DB')

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): AppDatabase => {
        const pool = new Pool({ connectionString: loadEnv().DATABASE_URL })
        attachPoolErrorLogger(pool)
        return drizzle(pool, { schema })
      },
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
