import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'

export const ENCRYPTION_KEY = Symbol('ENCRYPTION_KEY')

const VERSION = 'v1'
const IV_BYTES = 12

/** Cifra segredos com AES-256-GCM no formato `v1:<iv>:<tag>:<cifra>`, cada parte em base64. */
@Injectable()
export class CryptoService {
  constructor(@Inject(ENCRYPTION_KEY) private readonly key: Buffer) {}

  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const parts = [iv, cipher.getAuthTag(), body].map((part) =>
      part.toString('base64'),
    )
    return [VERSION, ...parts].join(':')
  }

  decrypt(stored: string): string {
    const [version, iv, tag, body, ...rest] = stored.split(':')
    if (
      version !== VERSION ||
      !iv ||
      !tag ||
      body === undefined ||
      rest.length > 0
    ) {
      throw new Error('Formato de segredo cifrado inválido')
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(iv, 'base64'),
    )
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(body, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  }
}
