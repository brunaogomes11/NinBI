import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { BrandMark } from './BrandMark'

const webDir = join(__dirname, '..', '..', '..')

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
      expect(bi?.parentElement).toHaveTextContent(/^NinBI$/)
    },
  )

  it('SHELL-12 ícone da aba é o símbolo em estrela', () => {
    const html = readFileSync(join(webDir, 'index.html'), 'utf8')

    expect(html).toMatch(
      /<link\s+rel="icon"\s+type="image\/png"\s+href="\/favicon\.png"\s*\/?>/,
    )
    expect(existsSync(join(webDir, 'public', 'favicon.png'))).toBe(true)
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
