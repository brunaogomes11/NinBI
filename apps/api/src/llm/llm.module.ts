import { Global, Module } from '@nestjs/common'
import {
  CHAT_MODEL_FACTORY,
  LangChainChatModelFactory,
} from './chat-model.factory'

@Global()
@Module({
  providers: [
    { provide: CHAT_MODEL_FACTORY, useClass: LangChainChatModelFactory },
  ],
  exports: [CHAT_MODEL_FACTORY],
})
export class LlmModule {}
