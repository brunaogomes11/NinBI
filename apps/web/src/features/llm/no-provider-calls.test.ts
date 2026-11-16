import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', '..')
const PACKAGE_JSON = join(SRC, '..', 'package.json')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? sourceFiles(path) : [path]
  })
}

describe('chamadas ao provedor de LLM', () => {
  it('LLM-14 web não depende de pacote de provedor de LLM', () => {
    const manifest = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const names = Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    })
    const forbidden = names.filter(
      (name) =>
        name.startsWith('@langchain/') ||
        name === 'openai' ||
        name.startsWith('@anthropic-ai/') ||
        name.startsWith('@google/'),
    )
    expect(forbidden).toEqual([])

    const hosts = [
      'api.openai.com',
      'api.anthropic.com',
      'generativelanguage.googleapis.com',
    ]
    const offenders = sourceFiles(SRC)
      .filter((file) => !file.endsWith('no-provider-calls.test.ts'))
      .filter((file) => {
        const text = readFileSync(file, 'utf-8')
        return hosts.some((host) => text.includes(host))
      })
    expect(offenders).toEqual([])
  })
})
