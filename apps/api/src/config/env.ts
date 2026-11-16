import { z } from 'zod'

export const DEFAULT_MAP_TILE_URL =
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

const queryLimitsSchema = z.object({
  NINBI_QUERY_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  NINBI_QUERY_MAX_ROWS: z.coerce.number().int().positive().default(5_000),
})

const mapConfigSchema = z.object({
  NINBI_MAP_TILE_URL: z
    .string()
    .default(DEFAULT_MAP_TILE_URL)
    .refine(
      (url) => ['{z}', '{x}', '{y}'].every((token) => url.includes(token)),
      'NINBI_MAP_TILE_URL deve conter {z}, {x} e {y}',
    ),
  NINBI_MAP_ATTRIBUTION: z.string().default('© OpenStreetMap'),
})

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1),
  NINBI_ENCRYPTION_KEY: z.string().min(1),
  NINBI_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  WEB_DIST_DIR: z.string().min(1).optional(),
  ...queryLimitsSchema.shape,
  ...mapConfigSchema.shape,
})

export type Env = z.infer<typeof envSchema>

const KEY_BYTES = 32

/** Lê a chave de cifra (base64 de 32 bytes); lança com a mensagem que vai ao log de inicialização. */
export function loadEncryptionKey(
  source: NodeJS.ProcessEnv = process.env,
): Buffer {
  const raw = source.NINBI_ENCRYPTION_KEY
  if (raw === undefined || raw.trim() === '') {
    throw new Error('NINBI_ENCRYPTION_KEY não definida')
  }
  const key = Buffer.from(raw.trim(), 'base64')
  if (key.length !== KEY_BYTES) {
    throw new Error('NINBI_ENCRYPTION_KEY deve ter 32 bytes em base64')
  }
  return key
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  loadEncryptionKey(source)
  return envSchema.parse(source)
}

/** Prazo e limite de linhas das consultas; lê só as duas variáveis, sem exigir o resto do ambiente. */
export function loadQueryLimits(source: NodeJS.ProcessEnv = process.env): {
  timeoutMs: number
  maxRows: number
} {
  const env = queryLimitsSchema.parse(source)
  return {
    timeoutMs: env.NINBI_QUERY_TIMEOUT_MS,
    maxRows: env.NINBI_QUERY_MAX_ROWS,
  }
}

/** Endereço dos tiles e atribuição do mapa; lê só as duas variáveis, sem exigir o resto do ambiente. */
export function loadMapConfig(source: NodeJS.ProcessEnv = process.env): {
  tileUrl: string
  attribution: string
} {
  const env = mapConfigSchema.parse(source)
  return {
    tileUrl: env.NINBI_MAP_TILE_URL,
    attribution: env.NINBI_MAP_ATTRIBUTION,
  }
}
