import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestApp } from '../harness'

const HTML = '<!doctype html><title>NinBI</title><div id="root"></div>'

let close: (() => Promise<void>) | undefined
let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ninbi-web-'))
  writeFileSync(join(dir, 'index.html'), HTML)
  process.env.WEB_DIST_DIR = dir
})

afterEach(async () => {
  await close?.()
  close = undefined
  delete process.env.WEB_DIST_DIR
  rmSync(dir, { recursive: true, force: true })
})

describe('servir o web pela API', () => {
  it('FND-01 serve o index.html do web em GET /', async () => {
    const test = await createTestApp()
    close = test.close

    const root = await test.http.get('/')
    expect(root.status).toBe(200)
    expect(root.text).toBe(HTML)

    const deep = await test.http.get('/configuracoes/usuarios')
    expect(deep.status).toBe(200)
    expect(deep.text).toBe(HTML)

    const missing = await test.http.get('/api/rota-inexistente')
    expect(missing.status).toBe(404)
    expect(missing.headers['content-type']).toContain('application/json')
    expect(missing.body.code).toBe('NOT_FOUND')
  })
})
