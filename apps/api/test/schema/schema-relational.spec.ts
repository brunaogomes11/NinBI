import type { RelationalSchemaDto, Role } from '@ninbi/contracts'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { CryptoService } from '../../src/crypto/crypto.service'
import { SchemaRefreshService } from '../../src/schema/schema-refresh.service'
import { MYSQL_DIALECT } from '../../src/sources/dialects'
import { createConnection, createUser } from '../factories'
import { programSqlSchema } from '../fakes/sql-schema-fixture'
import { createTestApp } from '../harness'

let close: (() => Promise<void>) | undefined

afterEach(async () => {
  await close?.()
  close = undefined
})

const schemaUrl = (id: string) => `/api/connections/${id}/schema`

describe('schema relacional', () => {
  it('SCS-12 schema SQL sai em ordem alfabética com views e relações', async () => {
    const t = await createTestApp()
    close = t.close
    const as = async (role: Role) => {
      const email = `${role.toLowerCase()}@x.com`
      await createUser(t.db, { name: role, email, role })
      const agent = request.agent(t.app.getHttpServer())
      await agent
        .post('/api/auth/login')
        .send({ email, password: 'senha-correta-123' })
      return agent
    }
    programSqlSchema(
      t.sql.MYSQL,
      MYSQL_DIALECT,
      [
        {
          schema: 'loja',
          name: 'pedidos',
          columns: [
            ['total', 'decimal(10,2)'],
            ['cliente_id', 'int'],
          ],
          rows: [{ total: 12.5, cliente_id: 1 }],
        },
        {
          schema: 'loja',
          name: 'vendas_mes',
          isView: true,
          columns: [['mes', 'date']],
        },
        {
          schema: 'loja',
          name: 'clientes',
          columns: [
            ['nome', 'varchar(80)'],
            ['id', 'int'],
          ],
          rows: [{ nome: "D'Ávila", id: 1 }],
        },
      ],
      [
        {
          name: 'pedidos_cliente_fk',
          from: { schema: 'loja', table: 'pedidos', columns: ['cliente_id'] },
          to: { schema: 'loja', table: 'clientes', columns: ['id'] },
        },
      ],
    )
    const connection = await createConnection(t.db, t.app.get(CryptoService), {
      name: 'Loja',
      type: 'MYSQL',
      port: 3306,
    })
    const refresh = t.app.get(SchemaRefreshService)
    await refresh.start(connection.id)
    await refresh.whenSettled(connection.id)

    const admin = await as('ADMIN')
    const editor = await as('EDITOR')
    const off = await admin
      .put(`${schemaUrl(connection.id)}/example-settings`)
      .send({
        kind: 'TABLE',
        element: 'clientes',
        property: 'nome',
        sendExample: false,
      })
    expect(off.status).toBe(204)
    const missing = await admin
      .put(`${schemaUrl(connection.id)}/example-settings`)
      .send({
        kind: 'TABLE',
        element: 'clientes',
        property: 'nada',
        sendExample: false,
      })
    expect(missing.status).toBe(404)
    const wrongKind = await admin
      .put(`${schemaUrl(connection.id)}/example-settings`)
      .send({
        kind: 'LABEL',
        element: 'clientes',
        property: 'nome',
        sendExample: false,
      })
    expect(wrongKind.status).toBe(404)

    const response = await editor.get(schemaUrl(connection.id))
    expect(response.status).toBe(200)
    const body = response.body as RelationalSchemaDto
    expect(body).toEqual({
      kind: 'RELATIONAL',
      connectionId: connection.id,
      connectionName: 'Loja',
      status: 'READY',
      readAt: t.clock.now().toISOString(),
      startedAt: expect.any(String),
      error: null,
      tables: [
        {
          name: 'clientes',
          isView: false,
          columns: [
            { name: 'id', type: 'int', example: '1', sendExample: true },
            {
              name: 'nome',
              type: 'varchar(80)',
              example: "'D''Ávila'",
              sendExample: false,
            },
          ],
        },
        {
          name: 'pedidos',
          isView: false,
          columns: [
            {
              name: 'cliente_id',
              type: 'int',
              example: '1',
              sendExample: true,
            },
            {
              name: 'total',
              type: 'decimal(10,2)',
              example: '12.5',
              sendExample: true,
            },
          ],
        },
        {
          name: 'vendas_mes',
          isView: true,
          columns: [
            { name: 'mes', type: 'date', example: null, sendExample: true },
          ],
        },
      ],
      foreignKeys: [
        {
          from: { table: 'pedidos', columns: ['cliente_id'] },
          to: { table: 'clientes', columns: ['id'] },
        },
      ],
    })

    // Conexão SQL ainda sem leitura: listas vazias, na forma relacional.
    const fresh = await createConnection(t.db, t.app.get(CryptoService), {
      name: 'Nova',
      type: 'SQLSERVER',
    })
    const empty = await editor.get(schemaUrl(fresh.id))
    expect(empty.body).toMatchObject({
      kind: 'RELATIONAL',
      tables: [],
      foreignKeys: [],
      readAt: null,
    })
  })
})
