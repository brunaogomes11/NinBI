import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio, hexToRgb, luminance } from './contrast'

const srcDir = join(__dirname, '..')
const css = readFileSync(join(srcDir, 'styles', 'theme.css'), 'utf8')

function tokens(selector: ':root' | '.dark'): Record<string, string> {
  const start = css.indexOf(`\n${selector} {`)
  const open = css.indexOf('{', start)
  const close = css.indexOf('\n}', open)
  const result: Record<string, string> = {}
  for (const m of css
    .slice(open + 1, close)
    .matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    result[m[1]] = m[2].trim()
  }
  return result
}

const light = tokens(':root')
const dark = tokens('.dark')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

describe('tokens do tema', () => {
  it('SHELL-08 temas escuro e claro definem os mesmos tokens', () => {
    expect(Object.keys(light).length).toBeGreaterThan(20)
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort())
  })

  it('SHELL-08 nenhuma tela usa cor literal fora dos tokens', () => {
    const literal = /#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b|\brgba?\(/
    const offenders = walk(srcDir)
      .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
      .filter((f) => !relative(srcDir, f).startsWith(`components${sep}ui`))
      .filter((f) => literal.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('SHELL-02 tema claro tem contraste de texto de ao menos 4,5:1', () => {
    for (const text of [
      '--foreground',
      '--muted-foreground',
      '--accent-text',
    ]) {
      for (const surface of ['--background', '--card']) {
        expect(
          contrastRatio(light[text], light[surface]),
          `${text} sobre ${surface}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
    for (const brand of ['--brand-cyan', '--brand-purple']) {
      expect(
        contrastRatio(light['--primary-foreground'], light[brand]),
        `primary-foreground sobre ${brand}`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('SHELL-15 destaque usa o gradiente roxo para ciano sobre fundo quase preto', () => {
    for (const theme of [light, dark]) {
      const gradient = theme['--gradient-brand']
      expect(gradient.indexOf('var(--brand-purple)')).toBeGreaterThan(-1)
      expect(gradient.indexOf('var(--brand-purple)')).toBeLessThan(
        gradient.indexOf('var(--brand-cyan)'),
      )
    }
    expect(luminance(dark['--background'])).toBeLessThan(0.01)
    for (const theme of [light, dark]) {
      for (const [name, value] of Object.entries(theme)) {
        if (!/^#[0-9a-f]{6}$/i.test(value)) continue
        const [r, g, b] = hexToRgb(value)
        const saturation =
          (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b, 1)
        expect(g > r && g > b && saturation > 0.5, `${name} é verde`).toBe(
          false,
        )
      }
    }
  })
})
