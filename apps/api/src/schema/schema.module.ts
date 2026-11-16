import { Module } from '@nestjs/common'
import { SchemaController } from './schema.controller'
import { SchemaQueryService } from './schema-query.service'
import { SchemaReader } from './schema-reader'
import {
  DEFAULT_SCHEMA_READ_TIMEOUT_MS,
  SCHEMA_READ_TIMEOUT_MS,
  SchemaRefreshService,
} from './schema-refresh.service'

@Module({
  controllers: [SchemaController],
  providers: [
    SchemaReader,
    SchemaRefreshService,
    SchemaQueryService,
    {
      provide: SCHEMA_READ_TIMEOUT_MS,
      useValue: DEFAULT_SCHEMA_READ_TIMEOUT_MS,
    },
  ],
  exports: [SchemaRefreshService, SchemaQueryService],
})
export class SchemaModule {}
