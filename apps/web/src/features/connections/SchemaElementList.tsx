import type { SchemaElementDto } from '@ninbi/contracts'
import { cn } from '@/lib/utils'

export interface SchemaSelection {
  kind: 'LABEL' | 'RELATIONSHIP'
  name: string
}

type Item = Pick<SchemaElementDto, 'name'>

interface SchemaElementListProps {
  labels: Item[]
  relationshipTypes: Item[]
  selected: SchemaSelection | null
  onSelect: (selection: SchemaSelection) => void
}

function Group({
  title,
  kind,
  items,
  selected,
  onSelect,
}: {
  title: string
  kind: SchemaSelection['kind']
  items: Item[]
  selected: SchemaSelection | null
  onSelect: (selection: SchemaSelection) => void
}) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-2 font-medium text-muted-foreground text-xs uppercase">
        {title}
      </h2>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isSelected =
            selected?.kind === kind && selected.name === item.name
          return (
            <li key={item.name}>
              <button
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => onSelect({ kind, name: item.name })}
                className={cn(
                  'w-full truncate rounded-control px-2 py-1.5 text-left text-sm hover:bg-muted',
                  isSelected && 'bg-muted font-medium text-accent-text',
                )}
              >
                {item.name}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Lista de labels e tipos de relacionamento do schema, rolando por conta própria. */
export function SchemaElementList({
  labels,
  relationshipTypes,
  selected,
  onSelect,
}: SchemaElementListProps) {
  return (
    <div
      data-testid="schema-element-list"
      className="flex min-h-0 flex-col gap-4 overflow-y-auto"
    >
      <Group
        title="Labels"
        kind="LABEL"
        items={labels}
        selected={selected}
        onSelect={onSelect}
      />
      <Group
        title="Tipos de relacionamento"
        kind="RELATIONSHIP"
        items={relationshipTypes}
        selected={selected}
        onSelect={onSelect}
      />
    </div>
  )
}
