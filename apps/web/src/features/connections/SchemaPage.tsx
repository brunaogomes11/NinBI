import {
  type ConnectionSchemaDto,
  isRelationalSchema,
  MESSAGES,
} from '@ninbi/contracts'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import { useConnectionSchema, useRefreshSchema } from './api'
import { ExampleToggle } from './ExampleToggle'
import { SchemaElementList, type SchemaSelection } from './SchemaElementList'
import { SchemaPropertiesTable } from './SchemaPropertiesTable'
import { TableSchemaView } from './TableSchemaView'

/** O item escolhido, se ainda existe no schema; senão o primeiro label (ou o primeiro tipo). */
function resolveSelection(
  schema: ConnectionSchemaDto,
  chosen: SchemaSelection | null,
): SchemaSelection | null {
  const exists =
    chosen &&
    (chosen.kind === 'LABEL' ? schema.labels : schema.relationshipTypes).some(
      (element) => element.name === chosen.name,
    )
  if (chosen && exists) return chosen
  if (schema.labels[0]) return { kind: 'LABEL', name: schema.labels[0].name }
  if (schema.relationshipTypes[0]) {
    return { kind: 'RELATIONSHIP', name: schema.relationshipTypes[0].name }
  }
  return null
}

function SchemaDetail({
  connectionId,
  schema,
}: {
  connectionId: string
  schema: ConnectionSchemaDto
}) {
  const [chosen, setChosen] = useState<SchemaSelection | null>(null)
  const selection = resolveSelection(schema, chosen)
  const relationship =
    selection?.kind === 'RELATIONSHIP'
      ? schema.relationshipTypes.find(
          (element) => element.name === selection.name,
        )
      : undefined
  const element =
    selection?.kind === 'LABEL'
      ? schema.labels.find((label) => label.name === selection.name)
      : relationship

  return (
    <div className="grid min-h-0 grid-cols-[16rem_1fr] gap-4 lg:max-h-[calc(100dvh-14rem)]">
      <Card className="min-h-0 overflow-hidden rounded-card p-3">
        <SchemaElementList
          labels={schema.labels}
          relationshipTypes={schema.relationshipTypes}
          selected={selection}
          onSelect={setChosen}
        />
      </Card>
      <Card className="min-h-0 overflow-hidden rounded-card p-3">
        {element && selection && (
          <SchemaPropertiesTable
            key={`${selection.kind}:${selection.name}`}
            element={element}
            patterns={relationship?.patterns}
            renderAction={(property) => (
              <ExampleToggle
                connectionId={connectionId}
                kind={selection.kind}
                element={element.name}
                property={property}
              />
            )}
          />
        )}
      </Card>
    </div>
  )
}

/** `/configuracoes/conexoes/:connectionId`: o schema guardado da conexão e o botão para relê-lo. */
export function SchemaPage() {
  const { connectionId = '' } = useParams()
  const schema = useConnectionSchema(connectionId)
  const refresh = useRefreshSchema(connectionId)
  const data = schema.data
  const reading = data?.status === 'READING'
  const hasRead = !!data?.readAt
  const graph = data && !isRelationalSchema(data) ? data : undefined
  const relational = data && isRelationalSchema(data) ? data : undefined
  const empty =
    hasRead &&
    (graph ? graph.labels.length === 0 : relational?.tables.length === 0)

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <Link
        to="/configuracoes/conexoes"
        className="text-accent-text text-sm hover:underline"
      >
        Voltar para as conexões
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          {data ? (
            <h1 className="font-semibold text-2xl">{data.connectionName}</h1>
          ) : (
            <Skeleton className="h-8 w-48" />
          )}
          {data && (
            <p className="text-muted-foreground text-sm">
              {hasRead && data.readAt
                ? `Última leitura: ${formatDateTime(data.readAt)}`
                : 'Nunca lido'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {reading && (
            <span role="status" className="text-muted-foreground text-sm">
              Lendo schema...
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={!data || reading || refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            Atualizar schema
          </Button>
        </div>
      </div>

      {schema.isError && (
        <p role="alert" className="text-destructive">
          {MESSAGES.schemaLoadFailed}: {schema.error.message}
        </p>
      )}
      {data?.status === 'FAILED' && (
        <div role="alert" className="flex flex-col gap-1 text-destructive">
          <p className="font-medium">{MESSAGES.schemaLoadFailed}</p>
          {data.error && <p className="text-sm">{data.error}</p>}
        </div>
      )}
      {refresh.isError && (
        <p role="alert" className="text-destructive">
          {refresh.error.message}
        </p>
      )}

      {schema.isPending && <Skeleton className="h-64 w-full" />}
      {empty && (
        <Card className="rounded-card p-6 text-center text-muted-foreground">
          {MESSAGES.schemaEmpty}
        </Card>
      )}
      {graph && !empty && (
        <SchemaDetail connectionId={connectionId} schema={graph} />
      )}
      {relational && !empty && (
        <TableSchemaView connectionId={connectionId} schema={relational} />
      )}
    </div>
  )
}
