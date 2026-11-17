import type { MapConfigDto } from '@ninbi/contracts'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { loadEnv } from '../../src/config/env'
import { createTestApp } from '../harness'
import { signInAs } from '../support/sign-in'

let close: (() => Promise<void>) | undefined
const saved = {
  tile: process.env.NINBI_MAP_TILE_URL,
  attribution: process.env.NINBI_MAP_ATTRIBUTION,
}

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

afterEach(async () => {
  await close?.()
  close = undefined
  restore('NINBI_MAP_TILE_URL', saved.tile)
  restore('NINBI_MAP_ATTRIBUTION', saved.attribution)
})

async function start() {
  const test = await createTestApp()
  close = test.close
  return test
}

describe('configuração do mapa', () => {
  it('MAP-07 endereço dos tiles vem de NINBI_MAP_TILE_URL com OpenStreetMap por padrão', async () => {
    delete process.env.NINBI_MAP_TILE_URL
    delete process.env.NINBI_MAP_ATTRIBUTION
    const t = await start()
    const user = await signInAs(t.app, t.db, 'EDITOR', 'ed@x.com')
    const byDefault = await user.agent.get('/api/map-config')
    expect(byDefault.status).toBe(200)
    expect(byDefault.body).toEqual({
      tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap',
    } satisfies MapConfigDto)
    // o controller lê o ambiente a cada requisição: o mesmo app serve os dois cenários
    process.env.NINBI_MAP_TILE_URL = 'https://tiles.exemplo/{z}/{x}/{y}.png'
    process.env.NINBI_MAP_ATTRIBUTION = '© Exemplo'
    const configured = await user.agent.get('/api/map-config')
    expect(configured.body).toEqual({
      tileUrl: 'https://tiles.exemplo/{z}/{x}/{y}.png',
      attribution: '© Exemplo',
    })
  })

  it('MAP-07 Visualizador logado recebe 200', async () => {
    const t = await start()
    const viewer = await signInAs(t.app, t.db, 'VIEWER', 'viu@x.com')
    const response = await viewer.agent.get('/api/map-config')
    expect(response.status).toBe(200)
  })

  it('MAP-07 sem sessão a rota responde 401', async () => {
    const t = await start()
    const response = await request(t.app.getHttpServer()).get('/api/map-config')
    expect(response.status).toBe(401)
  })

  it('MAP-07 loadEnv recusa NINBI_MAP_TILE_URL sem os marcadores de tile', () => {
    const base = {
      DATABASE_URL: 'postgres://x',
      NINBI_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
    }
    expect(() =>
      loadEnv({
        ...base,
        NINBI_MAP_TILE_URL: 'https://tiles.exemplo/mapa.png',
      }),
    ).toThrow(/NINBI_MAP_TILE_URL/)
    expect(
      loadEnv({
        ...base,
        NINBI_MAP_TILE_URL: 'https://tiles.exemplo/{z}/{x}/{y}.png',
      }).NINBI_MAP_TILE_URL,
    ).toBe('https://tiles.exemplo/{z}/{x}/{y}.png')
  })
})
