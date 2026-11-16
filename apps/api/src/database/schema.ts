import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['ADMIN', 'EDITOR', 'VIEWER'])
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'DISABLED'])

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

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type SessionRow = typeof sessions.$inferSelect
