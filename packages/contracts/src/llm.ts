import { z } from 'zod'
import { MESSAGES } from './messages'

export const LLM_PROVIDERS = [
  'OPENAI',
  'ANTHROPIC',
  'GOOGLE',
  'OLLAMA',
  'OPENAI_COMPATIBLE',
] as const

export type LlmProvider = (typeof LLM_PROVIDERS)[number]

export const LLM_PROVIDER_LABELS: Record<LlmProvider, string> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GOOGLE: 'Google Gemini',
  OLLAMA: 'Ollama',
  OPENAI_COMPATIBLE: 'Compatível com OpenAI',
}

export const PROVIDERS_REQUIRING_KEY: readonly LlmProvider[] = [
  'OPENAI',
  'ANTHROPIC',
  'GOOGLE',
]

export const PROVIDERS_REQUIRING_BASE_URL: readonly LlmProvider[] = [
  'OLLAMA',
  'OPENAI_COMPATIBLE',
]

const MODEL_MAX = 200

const httpUrl = z.url({ protocol: /^https?$/ })

function isHttpUrl(value: string): boolean {
  return httpUrl.safeParse(value).success
}

export const llmSettingsSchema = z
  .object({
    provider: z.enum(LLM_PROVIDERS),
    model: z
      .string()
      .trim()
      .min(1, MESSAGES.llmModelRequired)
      .max(MODEL_MAX, MESSAGES.llmModelTooLong),
    apiKey: z.string().trim().optional(),
    baseUrl: z
      .string()
      .trim()
      .refine((v) => v === '' || isHttpUrl(v), MESSAGES.llmBaseUrlInvalid)
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (
      PROVIDERS_REQUIRING_BASE_URL.includes(value.provider) &&
      !value.baseUrl
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['baseUrl'],
        message: MESSAGES.llmBaseUrlRequired,
      })
    }
  })

export type LlmSettingsInput = z.input<typeof llmSettingsSchema>

export interface LlmSettingsDto {
  configured: true
  provider: LlmProvider
  model: string
  baseUrl: string | null
  apiKeyLast4: string | null
  updatedAt: string
}

export type LlmSettingsResponse = LlmSettingsDto | { configured: false }

export interface LlmTestResultDto {
  ok: true
}

export interface AiStatusDto {
  configured: boolean
}
