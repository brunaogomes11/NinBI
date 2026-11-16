import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const LICENSE_PATH = resolve(__dirname, '../../../../LICENSE')

describe('licença do repositório', () => {
  it('FND-06 LICENSE na raiz traz o texto da AGPL-3.0', () => {
    const text = readFileSync(LICENSE_PATH, 'utf-8')
    expect(
      text.trimStart().startsWith('GNU AFFERO GENERAL PUBLIC LICENSE'),
    ).toBe(true)
    expect(text).toContain('Version 3, 19 November 2007')
    expect(text).toContain('END OF TERMS AND CONDITIONS')
  })
})
