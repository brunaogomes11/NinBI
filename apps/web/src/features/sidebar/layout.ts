import type {
  SidebarDashboardNode,
  SidebarDto,
  SidebarGroupNode,
  SidebarLayoutInput,
} from '@ninbi/contracts'

type Node = SidebarDashboardNode | SidebarGroupNode

/** Onde soltar: antes de um item, no fim de um grupo ou no fim da lista, solto. */
export type DropTarget =
  | { before: string }
  | { intoGroup: string }
  | { rootEnd: true }

function findGroupOf(items: Node[], id: string): SidebarGroupNode | undefined {
  return items.find(
    (item): item is SidebarGroupNode =>
      item.type === 'group' && item.items.some((child) => child.id === id),
  )
}

function without(items: Node[], id: string): Node[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) =>
      item.type === 'group'
        ? { ...item, items: item.items.filter((child) => child.id !== id) }
        : item,
    )
}

function insertBefore(items: Node[], targetId: string, node: Node): Node[] {
  const result: Node[] = []
  for (const item of items) {
    if (item.id === targetId) result.push(node)
    if (item.type === 'group' && item.items.some((c) => c.id === targetId)) {
      const children: SidebarDashboardNode[] = []
      for (const child of item.items) {
        if (child.id === targetId && node.type === 'dashboard') {
          children.push(node)
        }
        children.push(child)
      }
      result.push({ ...item, items: children })
    } else {
      result.push(item)
    }
  }
  return result
}

/**
 * Move `draggedId` para o alvo. Um dashboard solto sobre um item entra antes
 * dele, no mesmo contêiner; um grupo nunca entra em grupo: vai antes do grupo
 * do alvo (SIDE-03 a SIDE-06).
 */
export function moveItem(
  layout: SidebarDto,
  draggedId: string,
  target: DropTarget,
): SidebarDto {
  const dragged =
    layout.items.find((item) => item.id === draggedId) ??
    layout.items
      .flatMap((item): Node[] => (item.type === 'group' ? item.items : []))
      .find((item) => item.id === draggedId)
  if (!dragged) return layout

  if ('before' in target) {
    if (target.before === draggedId) return layout
    const known =
      layout.items.some((item) => item.id === target.before) ||
      findGroupOf(layout.items, target.before)
    if (!known) return layout
  }
  if ('intoGroup' in target) {
    if (target.intoGroup === draggedId) return layout
    if (
      !layout.items.some((i) => i.id === target.intoGroup && i.type === 'group')
    ) {
      return layout
    }
  }

  const rest = without(layout.items, draggedId)

  if ('rootEnd' in target) return { ...layout, items: [...rest, dragged] }

  if ('intoGroup' in target) {
    if (dragged.type === 'group') {
      return {
        ...layout,
        items: insertBefore(rest, target.intoGroup, dragged),
      }
    }
    return {
      ...layout,
      items: rest.map((item) =>
        item.id === target.intoGroup && item.type === 'group'
          ? { ...item, items: [...item.items, dragged] }
          : item,
      ),
    }
  }

  if (dragged.type === 'group') {
    const holder = findGroupOf(rest, target.before)
    return {
      ...layout,
      items: insertBefore(rest, holder ? holder.id : target.before, dragged),
    }
  }
  return { ...layout, items: insertBefore(rest, target.before, dragged) }
}

export function addGroup(
  layout: SidebarDto,
  id: string,
  name: string,
): SidebarDto {
  return {
    ...layout,
    items: [...layout.items, { type: 'group', id, name, items: [] }],
  }
}

export function renameGroup(
  layout: SidebarDto,
  id: string,
  name: string,
): SidebarDto {
  return {
    ...layout,
    items: layout.items.map((item) =>
      item.type === 'group' && item.id === id ? { ...item, name } : item,
    ),
  }
}

/** Os dashboards do grupo ficam soltos na posição dele (SIDE-09). */
export function removeGroup(layout: SidebarDto, id: string): SidebarDto {
  return {
    ...layout,
    items: layout.items.flatMap((item): Node[] =>
      item.type === 'group' && item.id === id ? item.items : [item],
    ),
  }
}

/** O formato que a API grava: o mesmo sem o nome dos dashboards. */
export function toLayoutInput(layout: SidebarDto): SidebarLayoutInput {
  return {
    items: layout.items.map((item) =>
      item.type === 'group'
        ? {
            type: 'group',
            id: item.id,
            name: item.name,
            items: item.items.map((child) => ({
              type: 'dashboard',
              id: child.id,
            })),
          }
        : { type: 'dashboard', id: item.id },
    ),
  }
}
