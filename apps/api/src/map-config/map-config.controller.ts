import { Controller, Get } from '@nestjs/common'
import type { MapConfigDto } from '@ninbi/contracts'
import { loadMapConfig } from '../config/env'

@Controller('map-config')
export class MapConfigController {
  @Get()
  get(): MapConfigDto {
    return loadMapConfig()
  }
}
