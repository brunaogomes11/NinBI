import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { configureApp } from './app.factory'
import { AppModule } from './app.module'
import { loadEnv } from './config/env'

/** Sobe a API; configuração inválida vai ao log e encerra o processo com código 1. */
export async function bootstrap(): Promise<void> {
  try {
    const env = loadEnv()
    const app = configureApp(await NestFactory.create(AppModule))
    await app.listen(env.PORT)
  } catch (error) {
    Logger.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
