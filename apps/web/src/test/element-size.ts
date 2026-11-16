import { act } from '@testing-library/react'

/**
 * O jsdom não mede elementos: o Recharts e o Leaflet desenham nada com tamanho zero.
 * `mockElementSize` fixa o tamanho de todo elemento e instala um `ResizeObserver` que
 * avisa esse tamanho; `resizeTo` muda o tamanho e avisa quem observa (CHART-08).
 */
type Callback = (
  entries: ResizeObserverEntry[],
  observer: ResizeObserver,
) => void

let size = { width: 0, height: 0 }
const observers = new Set<FakeResizeObserver>()

function entryFor(target: Element): ResizeObserverEntry {
  const rect = {
    width: size.width,
    height: size.height,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: size.width,
    bottom: size.height,
    toJSON: () => ({}),
  } as DOMRectReadOnly
  const box = [{ inlineSize: size.width, blockSize: size.height }]
  return {
    target,
    contentRect: rect,
    borderBoxSize: box,
    contentBoxSize: box,
    devicePixelContentBoxSize: box,
  } as unknown as ResizeObserverEntry
}

class FakeResizeObserver {
  private targets = new Set<Element>()
  constructor(private callback: Callback) {
    observers.add(this)
  }
  observe(target: Element) {
    this.targets.add(target)
    this.callback([entryFor(target)], this as unknown as ResizeObserver)
  }
  unobserve(target: Element) {
    this.targets.delete(target)
  }
  disconnect() {
    this.targets.clear()
    observers.delete(this)
  }
  notify() {
    if (this.targets.size === 0) return
    this.callback(
      [...this.targets].map(entryFor),
      this as unknown as ResizeObserver,
    )
  }
}

/**
 * Só os contêineres têm o tamanho falso: o texto (`span`, usado pelo Recharts para medir
 * rótulos) e a legenda e a dica medem o próprio conteúdo, que o jsdom devolve como zero.
 */
function isContainer(element: HTMLElement): boolean {
  if (element instanceof HTMLSpanElement) return false
  return !/recharts-(legend|tooltip)-wrapper/.test(element.className)
}

const proto = HTMLElement.prototype
const originals = {
  getBoundingClientRect: proto.getBoundingClientRect,
  clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
  clientHeight: Object.getOwnPropertyDescriptor(proto, 'clientHeight'),
  offsetWidth: Object.getOwnPropertyDescriptor(proto, 'offsetWidth'),
  offsetHeight: Object.getOwnPropertyDescriptor(proto, 'offsetHeight'),
  resizeObserver: globalThis.ResizeObserver,
}

/** Instala o tamanho falso e devolve a função que o desfaz. */
export function mockElementSize(width: number, height: number): () => void {
  size = { width, height }
  proto.getBoundingClientRect = function getBoundingClientRect() {
    return (
      isContainer(this)
        ? entryFor(this).contentRect
        : originals.getBoundingClientRect.call(this)
    ) as DOMRect
  }
  for (const [name, value] of [
    ['clientWidth', 'width'],
    ['clientHeight', 'height'],
    ['offsetWidth', 'width'],
    ['offsetHeight', 'height'],
  ] as const) {
    Object.defineProperty(proto, name, {
      configurable: true,
      get(this: HTMLElement) {
        return isContainer(this) ? size[value] : 0
      },
    })
  }
  globalThis.ResizeObserver =
    FakeResizeObserver as unknown as typeof ResizeObserver
  return () => {
    proto.getBoundingClientRect = originals.getBoundingClientRect
    for (const name of [
      'clientWidth',
      'clientHeight',
      'offsetWidth',
      'offsetHeight',
    ] as const) {
      const original = originals[name]
      if (original) Object.defineProperty(proto, name, original)
      else Reflect.deleteProperty(proto, name)
    }
    globalThis.ResizeObserver = originals.resizeObserver
    observers.clear()
  }
}

/** Muda o tamanho falso e avisa os observadores, como o navegador faz ao redimensionar o card. */
export function resizeTo(width: number, height: number) {
  size = { width, height }
  act(() => {
    for (const observer of observers) observer.notify()
  })
}
