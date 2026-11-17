import { GRID_COLUMNS, type WidgetLayoutDto } from '@ninbi/contracts'

const MIN_SIZE = 2
const MAX_HEIGHT = 12
const DEFAULT_SIZE = 4

function whole(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value)
    : null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function overlaps(a: WidgetLayoutDto, b: WidgetLayoutDto): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  )
}

/** Posição de um widget na grade de 12 colunas, sem sobrepor os ocupados (GEN-04). */
export function placeWidget(
  occupied: WidgetLayoutDto[],
  wanted: Partial<WidgetLayoutDto>,
): WidgetLayoutDto {
  const w = clamp(whole(wanted.w) ?? DEFAULT_SIZE, MIN_SIZE, GRID_COLUMNS)
  const h = clamp(whole(wanted.h) ?? DEFAULT_SIZE, MIN_SIZE, MAX_HEIGHT)
  const x = clamp(whole(wanted.x) ?? 0, 0, GRID_COLUMNS - w)
  const below = occupied.reduce(
    (max, item) => Math.max(max, item.y + item.h),
    0,
  )
  const layout = { x, y: Math.max(0, whole(wanted.y) ?? below), w, h }
  while (occupied.some((item) => overlaps(layout, item))) layout.y += 1
  return layout
}

/** Posiciona em sequência: cada widget entra nos ocupados do seguinte. */
export function placeWidgets(
  occupied: WidgetLayoutDto[],
  wanted: Partial<WidgetLayoutDto>[],
): WidgetLayoutDto[] {
  const placed: WidgetLayoutDto[] = []
  for (const request of wanted) {
    placed.push(placeWidget([...occupied, ...placed], request))
  }
  return placed
}
