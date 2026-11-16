import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { BrandMark } from './BrandMark'

const webDir = join(__dirname, '..', '..', '..')

const css = readFileSync(join(webDir, 'src', 'styles', 'theme.css'), 'utf8')

function tokens(selector: ':root' | '.dark'): Record<string, string> {
  const open = css.indexOf('{', css.indexOf(`\n${selector} {`))
  const close = css.indexOf('\n}', open)
  const result: Record<string, string> = {}
  for (const m of css
    .slice(open + 1, close)
    .matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    result[m[1]] = m[2].trim()
  }
  return result
}

// AD-130: BI é ciano no escuro e teal escuro no claro (contraste sobre fundo claro).
const expectedBi = { dark: '#2ee6f0', light: '#08717e' } as const

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

describe('marca', () => {
  it.each(['dark', 'light'])(
    'SHELL-11 sidebar mostra o símbolo e NinBI com BI em ciano no tema %s',
    (theme) => {
      localStorage.setItem('ninbi-theme', theme)
      const { container } = render(
        <ThemeProvider>
          <BrandMark />
        </ThemeProvider>,
      )

      expect(container.querySelector('img')).toHaveAttribute(
        'src',
        '/brand/ninbi-symbol.png',
      )
      expect(document.documentElement.classList.contains('dark')).toBe(
        theme === 'dark',
      )
      const bi = container.querySelector('span span')
      expect(bi).toHaveTextContent(/^BI$/)
      expect(bi).toHaveClass('text-accent-text')
      expect(css).toMatch(/--color-accent-text:\s*var\(--accent-text\)/)
      const resolved = tokens(theme === 'dark' ? '.dark' : ':root')[
        '--accent-text'
      ]
      expect(resolved).toBe(expectedBi[theme as 'dark' | 'light'])
      if (theme === 'dark') {
        expect(resolved).toBe(tokens('.dark')['--brand-cyan'])
      }
      expect(bi?.parentElement).toHaveTextContent(/^NinBI$/)
    },
  )

  it('SHELL-12 ícone da aba é o símbolo em estrela', async () => {
    const html = readFileSync(join(webDir, 'index.html'), 'utf8')
    expect(html).toMatch(
      /<link\s+rel="icon"\s+type="image\/png"\s+href="\/favicon\.png"\s*\/?>/,
    )

    // scripts/brand/crop-symbol.mjs: favicon = símbolo recortado (256x256) reduzido para 64x64.
    const symbolPath = join(webDir, 'public', 'brand', 'ninbi-symbol.png')
    const faviconPath = join(webDir, 'public', 'favicon.png')
    const symbolMeta = await sharp(symbolPath).metadata()
    const faviconMeta = await sharp(faviconPath).metadata()
    expect([symbolMeta.format, symbolMeta.width, symbolMeta.height]).toEqual([
      'png',
      256,
      256,
    ])
    expect([faviconMeta.format, faviconMeta.width, faviconMeta.height]).toEqual(
      ['png', 64, 64],
    )

    const expected = await sharp(symbolPath)
      .resize(64, 64)
      .ensureAlpha()
      .raw()
      .toBuffer()
    const actual = await sharp(faviconPath).ensureAlpha().raw().toBuffer()
    expect(actual.equals(expected)).toBe(true)
  })

  it('SHELL-13 subtítulo da logo não aparece em nenhuma tela', () => {
    const subtitle = new RegExp(['BUSINESS', 'INTELLIGENCE'].join('\\s+'), 'i')
    const files = [
      join(webDir, 'index.html'),
      ...walk(join(webDir, 'src')).filter((f) => /\.(tsx?|css|html)$/.test(f)),
    ]

    expect(files.filter((f) => subtitle.test(readFileSync(f, 'utf8')))).toEqual(
      [],
    )
  })
})
