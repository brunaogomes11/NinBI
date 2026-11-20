import type {
  AssistantReplyDetails,
  DashboardFilter,
  McpCall,
  SidebarLayoutInput,
} from '@ninbi/contracts'
import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['ADMIN', 'EDITOR', 'VIEWER'])
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'DISABLED'])
export const schemaStatusEnum = pgEnum('schema_status', [
  'NEVER',
  'READING',
  'READY',
  'FAILED',
])
export const connectionTypeEnum = pgEnum('connection_type', [
  'NEO4J',
  'POSTGRES',
  'MYSQL',
  'SQLSERVER',
])
export const schemaElementKindEnum = pgEnum('schema_element_kind', [
  'LABEL',
  'RELATIONSHIP',
  'TABLE',
])
export const llmProviderEnum = pgEnum('llm_provider', [
  'OPENAI',
  'ANTHROPIC',
  'GOOGLE',
  'OLLAMA',
  'OPENAI_COMPATIBLE',
])
export const shareRecipientTypeEnum = pgEnum('share_recipient_type', [
  'USER',
  'TEAM',
  'EVERYONE',
])
export const sharePermissionEnum = pgEnum('share_permission', ['view', 'edit'])
export const assistantRoleEnum = pgEnum('assistant_role', ['USER', 'ASSISTANT'])

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' })

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 120 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').notNull(),
    status: userStatusEnum('status').notNull().default('ACTIVE'),
    mustChangePassword: boolean('must_change_password')
      .notNull()
      .default(false),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_lower_uq').on(sql`lower(${table.email})`),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamptz('created_at').notNull(),
    lastUsedAt: timestamptz('last_used_at').notNull(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
)

export const loginThrottle = pgTable('login_throttle', {
  email: text('email').primaryKey(),
  failedCount: integer('failed_count').notNull(),
  windowStartedAt: timestamptz('window_started_at').notNull(),
  lockedUntil: timestamptz('locked_until'),
})

export const installation = pgTable(
  'installation',
  {
    id: smallint('id').primaryKey(),
    setupCompletedAt: timestamptz('setup_completed_at').notNull(),
  },
  (table) => [check('installation_single_row', sql`${table.id} = 1`)],
)

export const connections = pgTable(
  'connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 80 }).notNull(),
    type: connectionTypeEnum('type').notNull().default('NEO4J'),
    uri: text('uri'),
    host: text('host'),
    port: integer('port'),
    ssl: boolean('ssl').notNull().default(false),
    database: varchar('database', { length: 120 }),
    username: varchar('username', { length: 120 }).notNull(),
    passwordEncrypted: text('password_encrypted').notNull(),
    schemaStatus: schemaStatusEnum('schema_status').notNull().default('NEVER'),
    schemaReadStartedAt: timestamptz('schema_read_started_at'),
    schemaError: text('schema_error'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('connections_name_lower_uq').on(sql`lower(${table.name})`),
  ],
)

export const mcpConnections = pgTable('mcp_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 80 }).notNull(),
  endpoint: text('endpoint').notNull(),
  enabledTools: jsonb('enabled_tools').$type<string[]>().notNull().default([]),
})

export const connectionSchemas = pgTable('connection_schemas', {
  connectionId: uuid('connection_id')
    .primaryKey()
    .references(() => connections.id, { onDelete: 'cascade' }),
  readAt: timestamptz('read_at').notNull(),
  document: jsonb('document').notNull(),
})

export const schemaExampleOptOuts = pgTable(
  'schema_example_opt_outs',
  {
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => connections.id, { onDelete: 'cascade' }),
    elementKind: schemaElementKindEnum('element_kind').notNull(),
    elementName: text('element_name').notNull(),
    propertyName: text('property_name').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.connectionId,
        table.elementKind,
        table.elementName,
        table.propertyName,
      ],
    }),
  ],
)

export const dashboards = pgTable(
  'dashboards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 80 }).notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    connectionId: uuid('connection_id').references(() => connections.id, {
      onDelete: 'restrict',
    }),
    version: integer('version').notNull().default(1),
    filters: jsonb('filters').$type<DashboardFilter[]>().notNull().default([]),
    refreshIntervalSec: integer('refresh_interval_sec').notNull().default(0),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('dashboards_owner_id_idx').on(table.ownerId),
    index('dashboards_connection_id_idx').on(table.connectionId),
  ],
)

export const dashboardTabs = pgTable(
  'dashboard_tabs',
  {
    id: uuid('id').primaryKey(),
    dashboardId: uuid('dashboard_id')
      .notNull()
      .references(() => dashboards.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 40 }).notNull(),
    position: integer('position').notNull(),
  },
  (table) => [index('dashboard_tabs_dashboard_id_idx').on(table.dashboardId)],
)

export const widgets = pgTable(
  'widgets',
  {
    id: uuid('id').primaryKey(),
    dashboardId: uuid('dashboard_id')
      .notNull()
      .references(() => dashboards.id, { onDelete: 'cascade' }),
    tabId: uuid('tab_id')
      .notNull()
      .references(() => dashboardTabs.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 80 }).notNull(),
    cypher: text('cypher'),
    mcpConnectionId: uuid('mcp_connection_id').references(
      () => mcpConnections.id,
      { onDelete: 'restrict' },
    ),
    mcpCall: jsonb('mcp_call').$type<Omit<McpCall, 'connectionId'>>(),
    visualization: varchar('visualization', { length: 40 })
      .notNull()
      .default('TABLE'),
    config: jsonb('config')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    w: integer('w').notNull(),
    h: integer('h').notNull(),
  },
  (table) => [
    index('widgets_dashboard_id_idx').on(table.dashboardId),
    index('widgets_tab_id_idx').on(table.tabId),
  ],
)

export const sidebarLayouts = pgTable('sidebar_layouts', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  layout: jsonb('layout').$type<SidebarLayoutInput>().notNull(),
  updatedAt: timestamptz('updated_at').notNull(),
})

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 40 }).notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('teams_name_lower_uq').on(sql`lower(${table.name})`)],
)

export const teamMembers = pgTable(
  'team_members',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.userId] }),
    index('team_members_user_id_idx').on(table.userId),
  ],
)

export const dashboardShares = pgTable(
  'dashboard_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dashboardId: uuid('dashboard_id')
      .notNull()
      .references(() => dashboards.id, { onDelete: 'cascade' }),
    recipientType: shareRecipientTypeEnum('recipient_type').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
    recipientKey: varchar('recipient_key', { length: 60 }).notNull(),
    permission: sharePermissionEnum('permission').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('dashboard_shares_recipient_uq').on(
      table.dashboardId,
      table.recipientKey,
    ),
    index('dashboard_shares_user_id_idx').on(table.userId),
    index('dashboard_shares_team_id_idx').on(table.teamId),
    check(
      'dashboard_shares_recipient_ck',
      sql`(${table.recipientType} = 'USER' and ${table.userId} is not null and ${table.teamId} is null) or (${table.recipientType} = 'TEAM' and ${table.teamId} is not null and ${table.userId} is null) or (${table.recipientType} = 'EVERYONE' and ${table.userId} is null and ${table.teamId} is null)`,
    ),
  ],
)

export const llmSettings = pgTable(
  'llm_settings',
  {
    id: smallint('id').primaryKey(),
    provider: llmProviderEnum('provider').notNull(),
    model: varchar('model', { length: 200 }).notNull(),
    baseUrl: text('base_url'),
    apiKeyEncrypted: text('api_key_encrypted'),
    apiKeyLast4: varchar('api_key_last4', { length: 4 }),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedAt: timestamptz('updated_at').notNull(),
  },
  (table) => [check('llm_settings_single_row', sql`${table.id} = 1`)],
)

export const assistantMessages = pgTable(
  'assistant_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seq: bigint('seq', { mode: 'number' }).generatedAlwaysAsIdentity(),
    dashboardId: uuid('dashboard_id')
      .notNull()
      .references(() => dashboards.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: assistantRoleEnum('role').notNull(),
    text: text('text').notNull(),
    details: jsonb('details').$type<AssistantReplyDetails>(),
    createdAt: timestamptz('created_at').notNull(),
  },
  (table) => [
    index('assistant_messages_dashboard_user_seq_idx').on(
      table.dashboardId,
      table.userId,
      table.seq,
    ),
  ],
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type SessionRow = typeof sessions.$inferSelect
export type ConnectionRow = typeof connections.$inferSelect
export type DashboardRow = typeof dashboards.$inferSelect
export type WidgetRow = typeof widgets.$inferSelect
export type LlmSettingsRow = typeof llmSettings.$inferSelect
export type TeamRow = typeof teams.$inferSelect
export type DashboardShareRow = typeof dashboardShares.$inferSelect
export type AssistantMessageRow = typeof assistantMessages.$inferSelect
