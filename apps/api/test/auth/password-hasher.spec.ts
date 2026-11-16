import { describe, expect, it } from 'vitest'
import { PasswordHasher } from '../../src/auth/password-hasher'

const hasher = new PasswordHasher()

describe('PasswordHasher', () => {
  it('AUTH-10 o hash não contém a senha', async () => {
    const stored = await hasher.hash('segredo123')
    expect(stored).not.toContain('segredo123')
    expect(stored).toMatch(
      /^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/,
    )
  })

  it('AUTH-10 duas chamadas com a mesma senha dão hashes diferentes por causa do sal', async () => {
    const first = await hasher.hash('segredo123')
    const second = await hasher.hash('segredo123')
    expect(first).not.toBe(second)
  })

  it('AUTH-10 verify aceita a senha certa e recusa outra', async () => {
    const stored = await hasher.hash('segredo123')
    expect(await hasher.verify('segredo123', stored)).toBe(true)
    expect(await hasher.verify('segredo124', stored)).toBe(false)
  })

  it('AUTH-10 verify recusa um valor guardado em formato desconhecido', async () => {
    expect(await hasher.verify('segredo123', 'texto-qualquer')).toBe(false)
  })
})
