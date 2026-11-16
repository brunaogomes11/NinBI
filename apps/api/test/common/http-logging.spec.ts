import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestApp } from '../harness'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  vi.restoreAllMocks()
  await close?.()
  close = undefined
})

describe('log de requisições', () => {
  it('FND-05 log de requisição tem método, caminho, status e duração sem corpo, senha nem cookie', async () => {
    const lines: string[] = []
    vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
      lines.push(String(message))
    })
    const test = await createTestApp()
    close = test.close

    const response = await test.http
      .post('/api/health?token=abc')
      .set('Cookie', 'ninbi_session=xyz')
      .send({ password: 'segredo123' })

    const requestLines = lines.filter((line) => line.startsWith('POST '))
    expect(requestLines).toHaveLength(1)
    expect(requestLines[0]).toMatch(/^POST \/api\/health \d+ \d+ms$/)
    expect(requestLines[0]?.split(' ')[2]).toBe(String(response.status))
    const everything = lines.join('\n')
    for (const secret of ['segredo123', 'xyz', 'token=abc', 'password']) {
      expect(everything).not.toContain(secret)
    }
  })
})
