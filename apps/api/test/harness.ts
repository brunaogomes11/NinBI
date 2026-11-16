import type { INestApplication, Type } from '@nestjs/common'
import { AbstractLoader, ExpressLoader } from '@nestjs/serve-static'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { configureApp } from '../src/app.factory'
import { AppModule } from '../src/app.module'
import { Clock } from '../src/common/clock'
import { DASHBOARD_SHARE_RESOLVER } from '../src/dashboard-access/dashboard-share-resolver'
import { type AppDatabase, DB } from '../src/database/database.module'
import { CHAT_MODEL_FACTORY } from '../src/llm/chat-model.factory'
import { NEO4J_GATEWAY } from '../src/neo4j/neo4j.gateway'
import { createTestDb } from './db'
import { FakeChatModelFactory } from './fakes/fake-chat-model.factory'
import { FakeNeo4jGateway } from './fakes/fake-neo4j.gateway'
import { FakeShareResolver } from './fakes/fake-share-resolver'

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
  /** Compartilhamentos de teste; sem a opção, ninguém compartilha nada. */
  shares?: FakeShareResolver
  /** Usa o `DbShareResolver` real em vez do fake (testes de `compartilhamento`). */
  realShares?: boolean
  /** Controllers só de teste (rotas de sonda) somados ao AppModule. */
  controllers?: Type[]
  /** Modelos de chat de teste; sem a opção, o app usa um `FakeChatModelFactory` vazio. */
  chatModels?: FakeChatModelFactory
  /** Troca providers do app, por exemplo os prazos injetáveis, por valores curtos de teste. */
  overrides?: { provide: unknown; useValue: unknown }[]
}

export async function createTestApp(options: TestAppOptions = {}) {
  const { db, client } = await createTestDb()
  const clock = new FakeClock()
  const neo4j = new FakeNeo4jGateway()
  const chatModels = options.chatModels ?? new FakeChatModelFactory()
  const shares = options.shares ?? new FakeShareResolver()
  let builder = Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers,
  })
    .overrideProvider(DB)
    .useValue(options.db ?? db)
    .overrideProvider(Clock)
    .useValue(clock)
    .overrideProvider(NEO4J_GATEWAY)
    .useValue(neo4j)
    .overrideProvider(CHAT_MODEL_FACTORY)
    .useValue(chatModels)
    // No módulo de teste o adaptador HTTP só existe depois do compile: sem isto o serve-static cai no loader nulo.
    .overrideProvider(AbstractLoader)
    .useClass(ExpressLoader)
  // SPEC_DEVIATION: o design diz "sem `shares`, o app usa o resolver real"; os testes de
  // dashboards-consultas dependem do fake como padrão, então o resolver real vem por `realShares`.
  if (!options.realShares) {
    builder = builder
      .overrideProvider(DASHBOARD_SHARE_RESOLVER)
      .useValue(shares)
  }
  for (const { provide, useValue } of options.overrides ?? []) {
    builder = builder.overrideProvider(provide).useValue(useValue)
  }
  const moduleRef = await builder.compile()
  const app: INestApplication = configureApp(moduleRef.createNestApplication())
  await app.init()
  return {
    app,
    db,
    clock,
    neo4j,
    chatModels,
    shares,
    http: request.agent(app.getHttpServer()),
    close: async () => {
      await app.close()
      await client.close()
    },
  }
}
