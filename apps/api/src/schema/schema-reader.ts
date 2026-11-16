import { Inject, Injectable } from '@nestjs/common'
import {
  NEO4J_GATEWAY,
  type Neo4jConnectionConfig,
  type Neo4jGateway,
  Neo4jTimeoutError,
} from '../neo4j/neo4j.gateway'
import { escapeIdentifier, toCypherLiteral } from './cypher-literal'
import type {
  StoredLabel,
  StoredProperty,
  StoredRelationshipType,
  StoredSchema,
} from './types'

export interface SchemaReadOptions {
  /** Instante (ms desde a época) em que a leitura inteira precisa ter terminado. */
  deadline: number
  signal: AbortSignal
}

const NODE_PROPERTIES_QUERY =
  'CALL db.schema.nodeTypeProperties() YIELD nodeLabels, propertyName, propertyTypes'
const REL_PROPERTIES_QUERY =
  'CALL db.schema.relTypeProperties() YIELD relType, propertyName, propertyTypes'

const patternsQuery = (type: string) =>
  `MATCH (a)-[:${escapeIdentifier(type)}]->(b) UNWIND labels(a) AS from UNWIND labels(b) AS to RETURN DISTINCT from, to`

const examplesQuery = (match: string) =>
  `UNWIND $props AS p CALL { WITH p ${match} WHERE x[p] IS NOT NULL RETURN x[p] AS v LIMIT 1 } RETURN p, v`

const labelExamplesQuery = (label: string) =>
  examplesQuery(`MATCH (x:${escapeIdentifier(label)})`)

const relationshipExamplesQuery = (type: string) =>
  examplesQuery(`MATCH ()-[x:${escapeIdentifier(type)}]->()`)

/** `:`FEZ`` vira `FEZ`. */
function relationshipName(relType: string): string {
  return relType
    .replace(/^:/, '')
    .replace(/^`/, '')
    .replace(/`$/, '')
    .replaceAll('``', '`')
}

function mergeProperty(
  properties: StoredProperty[],
  name: string | null,
  types: unknown,
): void {
  if (name === null) return
  let property = properties.find((candidate) => candidate.name === name)
  if (!property) {
    property = { name, types: [], example: null }
    properties.push(property)
  }
  for (const type of Array.isArray(types) ? (types as string[]) : []) {
    if (!property.types.includes(type)) property.types.push(type)
  }
}

/** Lê o schema enriquecido (tipos, padrões, exemplos) só por `Neo4jGateway.read`. */
@Injectable()
export class SchemaReader {
  constructor(@Inject(NEO4J_GATEWAY) private readonly gateway: Neo4jGateway) {}

  async read(
    cfg: Neo4jConnectionConfig,
    options: SchemaReadOptions,
  ): Promise<StoredSchema> {
    const query = (cypher: string, params: Record<string, unknown> = {}) => {
      const timeoutMs = options.deadline - Date.now()
      if (timeoutMs <= 0) throw new Neo4jTimeoutError()
      return this.gateway.read(cfg, cypher, params, {
        timeoutMs,
        signal: options.signal,
      })
    }

    const labels = new Map<string, StoredLabel>()
    for (const row of (await query(NODE_PROPERTIES_QUERY)).rows) {
      const names = Array.isArray(row.nodeLabels)
        ? (row.nodeLabels as string[])
        : []
      for (const name of names) {
        let label = labels.get(name)
        if (!label) {
          label = { name, properties: [] }
          labels.set(name, label)
        }
        mergeProperty(
          label.properties,
          (row.propertyName as string | null) ?? null,
          row.propertyTypes,
        )
      }
    }

    const relationshipTypes = new Map<string, StoredRelationshipType>()
    for (const row of (await query(REL_PROPERTIES_QUERY)).rows) {
      const name = relationshipName(String(row.relType))
      let type = relationshipTypes.get(name)
      if (!type) {
        type = { name, properties: [], patterns: [] }
        relationshipTypes.set(name, type)
      }
      mergeProperty(
        type.properties,
        (row.propertyName as string | null) ?? null,
        row.propertyTypes,
      )
    }

    for (const type of relationshipTypes.values()) {
      const rows = (await query(patternsQuery(type.name))).rows
      type.patterns = rows.map((row) => ({
        from: String(row.from),
        to: String(row.to),
      }))
    }

    for (const label of labels.values()) {
      await this.fillExamples(
        label.properties,
        labelExamplesQuery(label.name),
        query,
      )
    }
    for (const type of relationshipTypes.values()) {
      await this.fillExamples(
        type.properties,
        relationshipExamplesQuery(type.name),
        query,
      )
    }

    return {
      labels: [...labels.values()],
      relationshipTypes: [...relationshipTypes.values()],
    }
  }

  private async fillExamples(
    properties: StoredProperty[],
    cypher: string,
    query: (
      cypher: string,
      params: Record<string, unknown>,
    ) => Promise<{ rows: Record<string, unknown>[] }>,
  ): Promise<void> {
    if (properties.length === 0) return
    const { rows } = await query(cypher, {
      props: properties.map((property) => property.name),
    })
    for (const row of rows) {
      const property = properties.find((candidate) => candidate.name === row.p)
      if (property && row.v !== null && row.v !== undefined) {
        property.example = toCypherLiteral(row.v)
      }
    }
  }
}
