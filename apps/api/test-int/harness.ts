import { randomBytes } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import request from 'supertest'
import { configureApp } from '../src/app.factory'
import { AppModule } from '../src/app.module'
import { DB } from '../src/database/database.module'
import { MIGRATIONS_FOLDER } from '../src/database/migrate'
import * as schema from '../src/database/schema'
import { NEO4J_GATEWAY } from '../src/neo4j/neo4j.gateway'
import { FakeNeo4jGateway } from '../test/fakes/fake-neo4j.gateway'

const ADMIN_URL = 'postgres://ninbi:ninbi@localhost:55432/postgres'

/**
 * App Nest contra o PostgreSQL real do compose de dev, num banco
 * `ninbi_test_<aleatório>` criado aqui e apagado em `close()`.
 */
export async function createIntApp() {
  const databaseName = `ninbi_test_${randomBytes(6).toString('hex')}`
  const admin = new Pool({ connectionString: ADMIN_URL, max: 1 })
  await admin.query(`CREATE DATABASE ${databaseName}`)

  const pool = new Pool({
    connectionString: ADMIN_URL.replace(/\/postgres$/, `/${databaseName}`),
    min: 4,
    max: 10,
  })
  const db = drizzle(pool, { schema })
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })

  const neo4j = new FakeNeo4jGateway()
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DB)
    .useValue(db)
    .overrideProvider(NEO4J_GATEWAY)
    .useValue(neo4j)
    .compile()
  const app: INestApplication = configureApp(moduleRef.createNestApplication())
  await app.init()

  return {
    app,
    db,
    pool,
    /** Neo4j falso: o PostgreSQL é real, o Neo4j do usuário não. */
    neo4j,
    http: request.agent(app.getHttpServer()),
    /** Cliente sem cookie, para envios simultâneos independentes. */
    anonymous: () => request(app.getHttpServer()),
    close: async () => {
      await app.close()
      await pool.end()
      await admin.query(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`)
      await admin.end()
    },
  }
}
