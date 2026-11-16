import { Global, Module } from '@nestjs/common'

/** Fonte de tempo injetável: os testes avançam o relógio sem esperar. */
export abstract class Clock {
  abstract now(): Date
}

export class SystemClock extends Clock {
  now(): Date {
    return new Date()
  }
}

@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class ClockModule {}
