import { escapeIdentifier } from '../../src/schema/cypher-literal'
import type { FakeNeo4jGateway } from './fake-neo4j.gateway'

export interface FixtureProperty {
  name: string
  types: string[]
  /** Valor nativo que a consulta de exemplo devolve; sem ele a propriedade não tem linha de exemplo. */
  example?: unknown
}

export interface SchemaFixture {
  /** Cada item vira linhas de `db.schema.nodeTypeProperties()`, uma por propriedade (ou uma sem propriedade). */
  nodes?: { labels: string[]; properties: FixtureProperty[] }[]
  /** Cada item vira linhas de `db.schema.relTypeProperties()`, mais os pares origem e destino. */
  relationships?: {
    type: string
    properties: FixtureProperty[]
    patterns: [from: string, to: string][]
  }[]
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function exampleRows(properties: FixtureProperty[]) {
  return properties
    .filter((property) => property.example !== undefined)
    .map((property) => ({ p: property.name, v: property.example }))
}

/** Programa o fake para responder as quatro consultas do `SchemaReader` com este schema. */
export function programSchema(
  fake: FakeNeo4jGateway,
  fixture: SchemaFixture,
): void {
  const nodes = fixture.nodes ?? []
  const relationships = fixture.relationships ?? []

  fake.whenRead(
    'db.schema.nodeTypeProperties',
    nodes.flatMap<Record<string, unknown>>(({ labels, properties }) =>
      properties.length === 0
        ? [{ nodeLabels: labels, propertyName: null, propertyTypes: null }]
        : properties.map((property) => ({
            nodeLabels: labels,
            propertyName: property.name,
            propertyTypes: property.types,
          })),
    ),
  )
  fake.whenRead(
    'db.schema.relTypeProperties',
    relationships.flatMap<Record<string, unknown>>(({ type, properties }) =>
      properties.length === 0
        ? [
            {
              relType: `:${escapeIdentifier(type)}`,
              propertyName: null,
              propertyTypes: null,
            },
          ]
        : properties.map((property) => ({
            relType: `:${escapeIdentifier(type)}`,
            propertyName: property.name,
            propertyTypes: property.types,
          })),
    ),
  )

  for (const { type, patterns } of relationships) {
    fake.whenRead(
      new RegExp(
        `MATCH \\(a\\)-\\[:${escapeRegExp(escapeIdentifier(type))}\\]`,
      ),
      patterns.map(([from, to]) => ({ from, to })),
    )
  }

  const labelNames = new Set(nodes.flatMap(({ labels }) => labels))
  for (const label of labelNames) {
    const properties = nodes
      .filter((node) => node.labels.includes(label))
      .flatMap((node) => node.properties)
    fake.whenRead(
      new RegExp(`MATCH \\(x:${escapeRegExp(escapeIdentifier(label))}\\)`),
      exampleRows(properties),
    )
  }
  for (const { type, properties } of relationships) {
    fake.whenRead(
      new RegExp(
        `MATCH \\(\\)-\\[x:${escapeRegExp(escapeIdentifier(type))}\\]`,
      ),
      exampleRows(properties),
    )
  }
}
