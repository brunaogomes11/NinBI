import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeProvider'

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
)

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('SHELL-04 reabrir aplica o último tema e o escuro sem escolha', () => {
    const first = renderHook(() => useTheme(), { wrapper })
    expect(document.documentElement).toHaveClass('dark')
    expect(first.result.current.theme).toBe('dark')
    first.unmount()

    localStorage.setItem('ninbi-theme', 'light')
    document.documentElement.classList.add('dark')
    const second = renderHook(() => useTheme(), { wrapper })
    expect(document.documentElement).not.toHaveClass('dark')
    expect(second.result.current.theme).toBe('light')
    second.unmount()

    const third = renderHook(() => useTheme(), { wrapper })
    expect(document.documentElement).not.toHaveClass('dark')
    expect(third.result.current.theme).toBe('light')
  })

  it('SHELL-03 escolher Escuro volta ao tema escuro', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.setTheme('light'))
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('ninbi-theme')).toBe('light')

    act(() => result.current.setTheme('dark'))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('ninbi-theme')).toBe('dark')
  })
})
