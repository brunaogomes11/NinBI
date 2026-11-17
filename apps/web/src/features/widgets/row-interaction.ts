/** Clique em elementos de um widget com "Ao clicar" (XFL-02, XFL-04). */
export interface RowInteraction {
  /** A linha do resultado de cada item desenhado, na ordem dos dados da visualização. */
  rows: number[]
  /** Linhas com o valor selecionado; vazio sem seleção. */
  selected: Set<number>
  onRowClick: (rowIndex: number) => void
}

export const DIMMED_OPACITY = 0.3

/** Atributos de um elemento clicável: índice da linha, papel de botão, destaque e esmaecimento. */
export function rowProps(
  interaction: RowInteraction | undefined,
  dataIndex: number,
) {
  if (!interaction) return {}
  return clickProps(interaction, dataIndex)
}

function clickProps(interaction: RowInteraction, dataIndex: number) {
  const rowIndex = interaction.rows[dataIndex] ?? dataIndex
  const selecting = interaction.selected.size > 0
  const selected = selecting && interaction.selected.has(rowIndex)
  const dimmed = selecting && !selected
  return {
    'data-row-index': rowIndex,
    role: 'button' as const,
    tabIndex: 0,
    cursor: 'pointer',
    ...(selected && { 'data-selected': 'true' }),
    ...(dimmed && { 'data-dimmed': 'true' }),
    opacity: dimmed ? DIMMED_OPACITY : 1,
    onClick: () => interaction.onRowClick(rowIndex),
    onKeyDown: (event: { key: string }) => {
      if (event.key === 'Enter' || event.key === ' ') {
        interaction.onRowClick(rowIndex)
      }
    },
  }
}

/** Os mesmos atributos para elementos HTML (lista, tabela): a opacidade vai no estilo. */
export function rowHtmlProps(
  interaction: RowInteraction | undefined,
  dataIndex: number,
) {
  if (!interaction) return {}
  const { opacity, cursor, ...rest } = clickProps(interaction, dataIndex)
  return { ...rest, style: { opacity, cursor } }
}
