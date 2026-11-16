import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { configureApp } from '../src/app.factory'
import { AppModule } from '../src/app.module'
import { Clock } from '../src/common/clock'
import { type AppDatabase, DB } from '../src/database/database.module'
import { createTestDb } from './db'

/** Relógio controlável: começa em 2026-01-01T12:00:00Z e só anda quando o teste manda. */
export class FakeClock extends Clock {
  private current = new Date('2026-01-01T12:00:00.000Z')

  now(): Date {
    return new Date(this.current)
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds)
  }
}

export interface TestAppOptions {
  /** Substitui o banco, por exemplo para simular o PostgreSQL fora do ar. */
  db?: AppDatabase
}

export async function createTestApp(options: TestAppOptions = {}) {
  const { db, client } = await createTestDb()
  const clock = new FakeClock()
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DB)
    .useValue(options.db ?? db)
    .overrideProvider(Clock)
    .useValue(clock)
    .compile()
  const app: INestApplication = configureApp(moduleRef.createNestApplication())
  await app.init()
  return {
    app,
    db,
    clock,
    http: request.agent(app.getHttpServer()),
    close: async () => {
      await app.close()
      await client.close()
    },
  }
}
