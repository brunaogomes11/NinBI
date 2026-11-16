import { resolve } from 'node:path'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

/** Pasta das migrações SQL; igual a partir de `src/` e de `dist/`. */
export const MIGRATIONS_FOLDER = resolve(__dirname, '..', '..', 'drizzle')

export async function runMigrations(db: NodePgDatabase): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
}
