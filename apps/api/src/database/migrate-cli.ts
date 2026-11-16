import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { loadEnv } from '../config/env'
import { runMigrations } from './migrate'

/** Aplica as migrações e sai: o entrypoint da imagem roda isto antes de `main.js`. */
async function main(): Promise<void> {
  const pool = new Pool({ connectionString: loadEnv().DATABASE_URL })
  try {
    await runMigrations(drizzle(pool))
  } finally {
    await pool.end()
  }
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
