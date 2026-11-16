import { Module } from '@nestjs/common'
import { SchemaReader } from './schema-reader'
import {
  DEFAULT_SCHEMA_READ_TIMEOUT_MS,
  SCHEMA_READ_TIMEOUT_MS,
  SchemaRefreshService,
} from './schema-refresh.service'

@Module({
  providers: [
    SchemaReader,
    SchemaRefreshService,
    {
      provide: SCHEMA_READ_TIMEOUT_MS,
      useValue: DEFAULT_SCHEMA_READ_TIMEOUT_MS,
    },
  ],
  exports: [SchemaRefreshService],
})
export class SchemaModule {}
