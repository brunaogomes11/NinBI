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
