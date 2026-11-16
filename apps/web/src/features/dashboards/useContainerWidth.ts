import { useLayoutEffect, useRef, useState } from 'react'

/** Largura usada enquanto o contêiner não tem medida (ex.: jsdom, que mede 0). */
export const FALLBACK_WIDTH = 1200

/** Mede a largura do contêiner e a acompanha com `ResizeObserver`. */
export function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(FALLBACK_WIDTH)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const measured = element.getBoundingClientRect().width
      if (measured > 0) setWidth(measured)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}
