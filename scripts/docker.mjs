import { spawnSync } from 'node:child_process'
import { closeSync, existsSync, openSync } from 'node:fs'
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const composeFile = 'docker-compose.dev.yml'
const seedFile = join(root, 'infra', 'neo4j', 'seed.cypher')

// Docker Desktop's CLI is often missing from the PATH of shells opened before the install.
const fallbacks = [
  process.env.LOCALAPPDATA &&
    join(
      process.env.LOCALAPPDATA,
      'Programs',
      'DockerDesktop',
      'resources',
      'bin',
      'docker.exe',
    ),
  process.env.ProgramFiles &&
    join(
      process.env.ProgramFiles,
      'Docker',
      'Docker',
      'resources',
      'bin',
      'docker.exe',
    ),
].filter(Boolean)

function findDocker() {
  const onPath = spawnSync('docker', ['--version'], { stdio: 'ignore' })
  if (!onPath.error && onPath.status === 0) return 'docker'
  return fallbacks.find((candidate) => existsSync(candidate))
}

/** Caminho do executável do docker, ou encerra com erro quando não há. */
export function resolveDocker() {
  const docker = findDocker()
  if (!docker) {
    console.error(
      'docker não encontrado no PATH nem em %LOCALAPPDATA% ou %ProgramFiles%',
    )
    process.exit(1)
  }
  return docker
}

/** Ambiente com a pasta do docker no PATH: o CLI chama docker-credential-desktop dali. */
export function dockerEnv(docker) {
  const env = { ...process.env }
  if (isAbsolute(docker)) {
    // Windows keeps the variable as "Path", whatever its casing in process.env.
    const pathKey =
      Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH'
    env[pathKey] = [dirname(docker), env[pathKey]].join(delimiter)
  }
  return env
}

function compose(docker, args, stdin = 'inherit') {
  const result = spawnSync(docker, ['compose', '-f', composeFile, ...args], {
    cwd: root,
    env: dockerEnv(docker),
    stdio: [stdin, 'inherit', 'inherit'],
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function main(command) {
  const docker = resolveDocker()
  if (command === 'up') {
    compose(docker, ['up', '-d', '--wait', 'postgres', 'neo4j'])
    if (existsSync(seedFile)) {
      // O seed é idempotente (marcador NinbiSeed). Vai por stdin no neo4j que já está de pé:
      // evita o bind mount do serviço neo4j-seed, que trava em alguns Docker Desktop.
      const fd = openSync(seedFile, 'r')
      try {
        compose(
          docker,
          [
            'exec',
            '-T',
            'neo4j',
            'cypher-shell',
            '-u',
            'neo4j',
            '-p',
            'ninbi-dev-password',
          ],
          fd,
        )
      } finally {
        closeSync(fd)
      }
    }
  } else if (command === 'down') {
    compose(docker, ['stop'])
  } else {
    console.error('uso: node scripts/docker.mjs up|down')
    process.exit(2)
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main(process.argv[2])
}
