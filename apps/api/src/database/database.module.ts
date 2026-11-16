import { Global, Module } from '@nestjs/common'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import { Pool } from 'pg'
import { loadEnv } from '../config/env'
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
      useFactory: (): AppDatabase =>
        drizzle(new Pool({ connectionString: loadEnv().DATABASE_URL }), {
          schema,
        }),
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
