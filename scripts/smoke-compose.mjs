import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dockerEnv, resolveDocker } from './docker.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const project = 'ninbi-smoke'
const baseUrl = 'http://localhost:8080'
const startTimeoutMs = 180_000
const docker = resolveDocker()

function run(args, { inherit = false } = {}) {
  return spawnSync(docker, args, {
    cwd: root,
    env: dockerEnv(docker),
    encoding: 'utf-8',
    stdio: inherit ? 'inherit' : 'pipe',
  })
}

const compose = (args, options) =>
  run(['compose', '-p', project, '-f', 'docker-compose.yml', ...args], options)

const results = []
function report(ok, id, description) {
  results.push(ok)
  console.log(`${ok ? 'ok' : 'not ok'} ${id} ${description}`)
}

async function waitForHealth() {
  const deadline = Date.now() + startTimeoutMs
  let last
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      last = response.status
      if (response.status === 200) return response
    } catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 2000))
  }
  throw new Error(`/api/health não respondeu 200 em 180 s (último: ${last})`)
}

/** Espera o neo4j-seed gravar o marcador e devolve as lojas com latitude que o Neo4j tem. */
async function countStoresWithLatitude() {
  const deadline = Date.now() + startTimeoutMs
  while (Date.now() < deadline) {
    const result = compose([
      'exec',
      '-T',
      'neo4j',
      'cypher-shell',
      '-u',
      'neo4j',
      '-p',
      'ninbi-neo4j-password',
      '--format',
      'plain',
      'MATCH (:NinbiSeed) WITH count(*) AS marcador MATCH (l:Loja) WHERE marcador > 0 AND l.latitude IS NOT NULL RETURN count(l) AS lojas',
    ])
    const count = Number(result.stdout?.trim().split(/\r?\n/).at(-1))
    if (result.status === 0 && count > 0) return count
    await new Promise((resolveWait) => setTimeout(resolveWait, 2000))
  }
  return 0
}

try {
  const up = compose(['up', '-d', '--build'], { inherit: true })
  if (up.status !== 0) throw new Error('docker compose up falhou')

  const health = await waitForHealth()
  const healthBody = await health.json()
  const page = await fetch(`${baseUrl}/`)
  const html = await page.text()

  report(
    page.status === 200 &&
      html.includes('<div id="root">') &&
      html.includes('<title>NinBI</title>'),
    'FND-01',
    'docker compose up responde a tela de login em http://localhost:8080',
  )
  report(
    healthBody.postgres === 'up',
    'FND-03',
    'api health responde 200 com postgres up',
  )
  const stores = await countStoresWithLatitude()
  report(
    stores === 12,
    'FND-02',
    'neo4j carregou o dataset de exemplo no primeiro start',
  )
} catch (error) {
  console.log(`not ok smoke ${error instanceof Error ? error.message : error}`)
  results.push(false)
} finally {
  compose(['down', '-v', '--rmi', 'local'], { inherit: true })
  run(['image', 'prune', '-f'], { inherit: true })
}

process.exit(results.length > 0 && results.every(Boolean) ? 0 : 1)
