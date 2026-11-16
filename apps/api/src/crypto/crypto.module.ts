import { Global, Module } from '@nestjs/common'
import { loadEncryptionKey } from '../config/env'
import { CryptoService, ENCRYPTION_KEY } from './crypto.service'

@Global()
@Module({
  providers: [
    { provide: ENCRYPTION_KEY, useFactory: () => loadEncryptionKey() },
    CryptoService,
  ],
  exports: [CryptoService],
})
export class CryptoModule {}
