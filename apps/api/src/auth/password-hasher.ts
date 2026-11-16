import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { Injectable } from '@nestjs/common'

const N = 16384
const R = 8
const P = 1
const KEY_LENGTH = 64
const SALT_LENGTH = 16

function derive(plain: string, salt: Buffer, n: number, r: number, p: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(plain, salt, KEY_LENGTH, { N: n, r, p }, (error, key) =>
      error ? reject(error) : resolve(key),
    )
  })
}

/** Hash com sal no formato `scrypt$N$r$p$<sal base64>$<hash base64>`. */
@Injectable()
export class PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH)
    const key = await derive(plain, salt, N, R, P)
    return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
  }

  async verify(plain: string, stored: string): Promise<boolean> {
    const parts = stored.split('$')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false
    const [, n, r, p, salt, expected] = parts as [
      string,
      string,
      string,
      string,
      string,
      string,
    ]
    const expectedKey = Buffer.from(expected, 'base64')
    const key = await derive(
      plain,
      Buffer.from(salt, 'base64'),
      Number(n),
      Number(r),
      Number(p),
    )
    return (
      key.length === expectedKey.length && timingSafeEqual(key, expectedKey)
    )
  }
}
