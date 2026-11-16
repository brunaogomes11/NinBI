import { Controller, Get } from '@nestjs/common'

/** Rota protegida só para os testes: não faz nada além de responder. */
@Controller('probe')
export class ProbeController {
  @Get()
  probe(): { ok: true } {
    return { ok: true }
  }
}
