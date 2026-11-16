import { randomBytes } from 'node:crypto'
import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bootstrap } from '../../src/bootstrap'
import { CryptoService } from '../../src/crypto/crypto.service'

const service = new CryptoService(randomBytes(32))
const PASSWORD = 's3nh@-Neo4j'

describe('cifra de segredos', () => {
  it('CONN-13 cifra AES-256-GCM no formato v1 e decifra de volta', () => {
    const stored = service.encrypt(PASSWORD)
    expect(stored.startsWith('v1:')).toBe(true)
    expect(stored.split(':')).toHaveLength(4)
    expect(stored).not.toContain(PASSWORD)
    expect(stored).not.toContain(Buffer.from(PASSWORD).toString('base64'))
    expect(service.decrypt(stored)).toBe(PASSWORD)
  })

  it('CONN-13 duas cifras do mesmo texto diferem', () => {
    expect(service.encrypt(PASSWORD)).not.toBe(service.encrypt(PASSWORD))
  })

  it('CONN-13 cifra adulterada lança', () => {
    const [version, iv, tag, body] = service.encrypt(PASSWORD).split(':')
    const tampered = Buffer.from(body, 'base64')
    tampered[0] ^= 0xff
    expect(() =>
      service.decrypt(
        [version, iv, tag, tampered.toString('base64')].join(':'),
      ),
    ).toThrow()
    expect(() => service.decrypt('texto-solto')).toThrow()
  })

  it('CONN-13 chave diferente não decifra', () => {
    const other = new CryptoService(randomBytes(32))
    expect(() => other.decrypt(service.encrypt(PASSWORD))).toThrow()
  })
})

describe('chave de cifra na inicialização', () => {
  const original = process.env.NINBI_ENCRYPTION_KEY

  afterEach(() => {
    process.env.NINBI_ENCRYPTION_KEY = original
    vi.restoreAllMocks()
  })

  async function bootWithKey(key: string | undefined) {
    if (key === undefined) delete process.env.NINBI_ENCRYPTION_KEY
    else process.env.NINBI_ENCRYPTION_KEY = key
    const logged = vi.spyOn(Logger, 'error').mockImplementation(() => undefined)
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never)
    await bootstrap()
    return { logged, exit }
  }

  it('CONN-21 sem NINBI_ENCRYPTION_KEY o backend não inicia e loga a mensagem', async () => {
    for (const key of [undefined, '']) {
      const { logged, exit } = await bootWithKey(key)
      expect(logged).toHaveBeenCalledWith('NINBI_ENCRYPTION_KEY não definida')
      expect(exit).toHaveBeenCalledWith(1)
      vi.restoreAllMocks()
    }
  })

  it('CONN-21 chave que não tem 32 bytes não inicia o backend', async () => {
    const { logged, exit } = await bootWithKey(
      randomBytes(16).toString('base64'),
    )
    expect(logged).toHaveBeenCalledWith(
      'NINBI_ENCRYPTION_KEY deve ter 32 bytes em base64',
    )
    expect(exit).toHaveBeenCalledWith(1)
  })
})
