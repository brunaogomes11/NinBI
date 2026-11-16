import { Module } from '@nestjs/common'
import { SchemaModule } from '../schema/schema.module'
import { ConnectionsController } from './connections.controller'
import {
  CONNECTION_VERIFY_TIMEOUT_MS,
  ConnectionsService,
  DEFAULT_CONNECTION_VERIFY_TIMEOUT_MS,
} from './connections.service'

@Module({
  imports: [SchemaModule],
  controllers: [ConnectionsController],
  providers: [
    ConnectionsService,
    {
      provide: CONNECTION_VERIFY_TIMEOUT_MS,
      useValue: DEFAULT_CONNECTION_VERIFY_TIMEOUT_MS,
    },
  ],
})
export class ConnectionsModule {}
