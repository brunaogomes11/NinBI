/** Propriedade guardada no cache do schema; `example` é um literal Cypher (AD-039). */
export interface StoredProperty {
  name: string
  types: string[]
  example: string | null
}

export interface StoredLabel {
  name: string
  properties: StoredProperty[]
}

export interface StoredRelationshipType {
  name: string
  properties: StoredProperty[]
  patterns: { from: string; to: string }[]
}

/** Documento JSONB de `connection_schemas`. */
export interface StoredSchema {
  labels: StoredLabel[]
  relationshipTypes: StoredRelationshipType[]
}

/** Coluna de uma tabela SQL; `example` é um literal SQL (SCS-14). */
export interface StoredColumn {
  name: string
  type: string
  example: string | null
}

export interface StoredTable {
  /** `schema.tabela` no PostgreSQL e no SQL Server, `tabela` no MySQL (SCS-06). */
  name: string
  isView: boolean
  columns: StoredColumn[]
}

export interface StoredForeignKey {
  from: { table: string; columns: string[] }
  to: { table: string; columns: string[] }
}

/** Documento JSONB de `connection_schemas` de uma conexão SQL; sem `kind`, é de grafo. */
export interface StoredRelationalSchema {
  kind: 'RELATIONAL'
  tables: StoredTable[]
  foreignKeys: StoredForeignKey[]
}
