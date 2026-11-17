import type {
  RelationalForeignKeyDto,
  RelationalSchemaDto,
  RelationalTableDto,
} from '@ninbi/contracts'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ExampleToggle } from './ExampleToggle'

/** `origem.coluna → destino.coluna`; a chave composta lista um par por coluna. */
function describeForeignKey(foreignKey: RelationalForeignKeyDto): string {
  const from = foreignKey.from.columns.map(
    (column) => `${foreignKey.from.table}.${column}`,
  )
  const to = foreignKey.to.columns.map(
    (column) => `${foreignKey.to.table}.${column}`,
  )
  return `${from.join(', ')} → ${to.join(', ')}`
}

function tableLabel(table: RelationalTableDto): string {
  return table.isView ? `${table.name} (visão)` : table.name
}

function TableColumns({
  connectionId,
  table,
  foreignKeys,
}: {
  connectionId: string
  table: RelationalTableDto
  foreignKeys: RelationalForeignKeyDto[]
}) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div
        data-testid="schema-properties-scroll"
        className="min-h-0 overflow-y-auto"
      >
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead>Coluna</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Exemplo</TableHead>
              <TableHead>Enviar exemplo à IA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.columns.map((column) => (
              <TableRow key={column.name}>
                <TableCell className="font-medium">{column.name}</TableCell>
                <TableCell>{column.type}</TableCell>
                {column.example === null ? (
                  <TableCell className="text-muted-foreground">
                    sem exemplo
                  </TableCell>
                ) : (
                  <TableCell
                    title={column.example}
                    className="max-w-xs truncate font-mono"
                  >
                    {!column.sendExample && (
                      <span className="mr-2 font-sans text-muted-foreground">
                        exemplo não enviado
                      </span>
                    )}
                    {column.example}
                  </TableCell>
                )}
                <TableCell>
                  <ExampleToggle
                    connectionId={connectionId}
                    kind="TABLE"
                    element={table.name}
                    property={column}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
      {foreignKeys.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="font-medium text-muted-foreground text-xs uppercase">
            Chaves estrangeiras
          </h2>
          <ul className="flex flex-col gap-1 font-mono text-sm">
            {foreignKeys.map((foreignKey) => (
              <li key={describeForeignKey(foreignKey)}>
                {describeForeignKey(foreignKey)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** Schema de uma conexão SQL: tabelas e relações à esquerda, colunas e chaves da tabela escolhida à direita. */
export function TableSchemaView({
  connectionId,
  schema,
}: {
  connectionId: string
  schema: RelationalSchemaDto
}) {
  const [chosen, setChosen] = useState<string | null>(null)
  const table =
    schema.tables.find((item) => item.name === chosen) ?? schema.tables[0]
  const tableKeys = table
    ? schema.foreignKeys.filter(
        (foreignKey) =>
          foreignKey.from.table === table.name ||
          foreignKey.to.table === table.name,
      )
    : []

  return (
    <div className="grid min-h-0 grid-cols-[16rem_1fr] gap-4 lg:max-h-[calc(100dvh-14rem)]">
      <Card className="min-h-0 overflow-hidden rounded-card p-3">
        <div
          data-testid="schema-element-list"
          className="flex min-h-0 flex-col gap-4 overflow-y-auto"
        >
          <section className="flex flex-col gap-1">
            <h2 className="px-2 font-medium text-muted-foreground text-xs uppercase">
              Tabelas
            </h2>
            <ul className="flex flex-col gap-0.5">
              {schema.tables.map((item) => {
                const isSelected = item.name === table?.name
                return (
                  <li key={item.name}>
                    <button
                      type="button"
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => setChosen(item.name)}
                      className={cn(
                        'w-full truncate rounded-control px-2 py-1.5 text-left text-sm hover:bg-muted',
                        isSelected && 'bg-muted font-medium text-accent-text',
                      )}
                    >
                      {tableLabel(item)}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
          <section className="flex flex-col gap-1">
            <h2 className="px-2 font-medium text-muted-foreground text-xs uppercase">
              Relações
            </h2>
            <ul className="flex flex-col gap-1 px-2 font-mono text-xs">
              {schema.foreignKeys.map((foreignKey) => (
                <li key={describeForeignKey(foreignKey)} className="break-all">
                  {describeForeignKey(foreignKey)}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Card>
      <Card className="min-h-0 overflow-hidden rounded-card p-3">
        {table && (
          <TableColumns
            key={table.name}
            connectionId={connectionId}
            table={table}
            foreignKeys={tableKeys}
          />
        )}
      </Card>
    </div>
  )
}
