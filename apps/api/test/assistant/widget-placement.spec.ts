import { describe, expect, it } from 'vitest'
import { placeWidget, placeWidgets } from '../../src/assistant/widget-placement'

const overlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('posição dos widgets na grade', () => {
  it('GEN-04 widgets ficam na grade de 12 colunas sem sobreposição e com no mínimo 2 por 2', () => {
    const sizes = [
      { w: 1, h: 0 },
      { w: 14, h: 1 },
      { w: 6, h: 5 },
      { w: 12, h: 5 },
      { w: 3, h: 0 },
      { w: 7, h: 1 },
    ]
    const placed = placeWidgets(
      [],
      sizes.map((size) => ({ x: 0, y: 0, ...size })),
    )
    for (const item of placed) {
      expect(item.x).toBeGreaterThanOrEqual(0)
      expect(item.x + item.w).toBeLessThanOrEqual(12)
      expect(item.w).toBeGreaterThanOrEqual(2)
      expect(item.h).toBeGreaterThanOrEqual(2)
    }
    placed.forEach((a, i) => {
      for (const b of placed.slice(i + 1)) expect(overlap(a, b)).toBe(false)
    })
    expect(placed[0]).toEqual({ x: 0, y: 0, w: 2, h: 2 })
    expect(placed[1]).toEqual({ x: 0, y: 2, w: 12, h: 2 })

    const occupied = [{ x: 0, y: 0, w: 6, h: 4 }]
    expect(placeWidget(occupied, {})).toEqual({ x: 0, y: 4, w: 4, h: 4 })
    expect(placeWidget([], { x: 11, w: 4 })).toMatchObject({ x: 8, w: 4 })
    expect(placeWidget([], { x: 1.6, y: 0.4, w: 3.5, h: 2.4 })).toEqual({
      x: 2,
      y: 0,
      w: 4,
      h: 2,
    })
  })
})
