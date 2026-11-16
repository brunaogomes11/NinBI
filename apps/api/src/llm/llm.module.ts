import { Global, Module } from '@nestjs/common'
import {
  CHAT_MODEL_FACTORY,
  LangChainChatModelFactory,
} from './chat-model.factory'
import {
  DEFAULT_LLM_CALL_TIMEOUT_MS,
  LLM_CALL_TIMEOUT_MS,
  LlmClient,
} from './llm-client'

@Global()
@Module({
  providers: [
    { provide: CHAT_MODEL_FACTORY, useClass: LangChainChatModelFactory },
    { provide: LLM_CALL_TIMEOUT_MS, useValue: DEFAULT_LLM_CALL_TIMEOUT_MS },
    LlmClient,
  ],
  exports: [CHAT_MODEL_FACTORY, LLM_CALL_TIMEOUT_MS, LlmClient],
})
export class LlmModule {}
