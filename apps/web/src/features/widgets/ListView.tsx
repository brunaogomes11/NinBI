import type { ListItemData } from './mapping/simple-data'

/** Lista compacta: uma linha por linha do resultado, que rola dentro do card (LIST-01 a LIST-04). */
export function ListView({ data }: { data: ListItemData[] }) {
  return (
    <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
      {data.map((item, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: linhas do resultado não têm identidade própria
        <li key={index} className="flex items-center gap-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={item.primary}>
              {item.primary}
            </p>
            {item.secondary !== null && (
              <p
                className="truncate text-sm text-muted-foreground"
                title={item.secondary}
              >
                {item.secondary}
              </p>
            )}
          </div>
          {item.values.map((value, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: até dois valores, na ordem fixa das colunas
              key={i}
              className="shrink-0 text-sm tabular-nums"
            >
              {value}
            </span>
          ))}
        </li>
      ))}
    </ul>
  )
}
