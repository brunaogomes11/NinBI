import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { MIGRATIONS_FOLDER } from '../../src/database/migrate'
import * as schema from '../../src/database/schema'

const FONTES_SQL_TAG = '0006_fontes_sql'

/**
 * Banco PGlite com as migrações anteriores à 0006 aplicadas. `applyFontesSql`
 * aplica a 0006 e devolve o mesmo banco, para provar o que ela faz com linhas
 * que já existiam.
 */
export async function createDbBeforeFontesSql() {
  const folder = mkdtempSync(join(tmpdir(), 'ninbi-migrations-'))
  cpSync(MIGRATIONS_FOLDER, folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: { tag: string }[]
  }
  // Tudo a partir da 0006 fica de fora: o migrador do drizzle ignora uma
  // migração mais antiga que a última já aplicada, então uma migração posterior
  // aplicada antes faria `applyFontesSql` não aplicar a 0006.
  const fontesSqlIndex = journal.entries.findIndex(
    (entry) => entry.tag === FONTES_SQL_TAG,
  )
  journal.entries = journal.entries.slice(0, fontesSqlIndex)
  writeFileSync(journalPath, JSON.stringify(journal))

  const client = new PGlite()
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: folder })
  return {
    db,
    client,
    applyFontesSql: () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
  }
}
