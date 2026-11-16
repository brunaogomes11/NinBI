import type { SchemaElementDto, SchemaPatternDto } from '@ninbi/contracts'
import type { ReactNode } from 'react'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface SchemaPropertiesTableProps {
  element: SchemaElementDto
  /** Pares origem/destino quando o elemento é um tipo de relacionamento. */
  patterns?: SchemaPatternDto[]
  /** Conteúdo da coluna "Enviar exemplo à IA" de cada propriedade; sem ele a coluna não aparece. */
  renderAction?: (property: SchemaElementDto['properties'][number]) => ReactNode
}

/** Propriedades do label ou tipo selecionado, com tipos e exemplo; rola por conta própria com o cabeçalho fixo. */
export function SchemaPropertiesTable({
  element,
  patterns,
  renderAction,
}: SchemaPropertiesTableProps) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      {patterns && patterns.length > 0 && (
        <ul className="flex flex-col gap-1 font-mono text-sm">
          {patterns.map((pattern) => (
            <li key={`${pattern.from}->${pattern.to}`}>
              {`(:${pattern.from})-[:${element.name}]->(:${pattern.to})`}
            </li>
          ))}
        </ul>
      )}
      <div
        data-testid="schema-properties-scroll"
        className="min-h-0 overflow-y-auto"
      >
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead>Propriedade</TableHead>
              <TableHead>Tipos</TableHead>
              <TableHead>Exemplo</TableHead>
              {renderAction && <TableHead>Enviar exemplo à IA</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {element.properties.map((property) => (
              <TableRow key={property.name}>
                <TableCell className="font-medium">{property.name}</TableCell>
                <TableCell>{property.types.join(', ')}</TableCell>
                {property.example === null ? (
                  <TableCell className="text-muted-foreground">
                    sem exemplo
                  </TableCell>
                ) : (
                  <TableCell
                    title={property.example}
                    className="max-w-xs truncate font-mono"
                  >
                    {property.example}
                  </TableCell>
                )}
                {renderAction && (
                  <TableCell>{renderAction(property)}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  )
}
