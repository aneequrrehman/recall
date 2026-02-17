import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import {
  z,
  ZodArray,
  ZodBoolean,
  ZodDate,
  ZodDefault,
  ZodEnum,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  type ZodTypeAny,
} from 'zod'
import type { SchemaMap, StructuredStore, ColumnInfo } from './types'

/**
 * Sanitize table name to prevent SQL injection
 */
function sanitizeTableName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
}

/**
 * Sanitize column name to prevent SQL injection
 */
function sanitizeColumnName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
}

/**
 * Convert a Zod type to SQLite type
 */
function zodTypeToSQLite(zodType: ZodTypeAny): { sqlType: string; nullable: boolean } {
  // Handle optionals and nullables
  if (zodType instanceof ZodOptional || zodType instanceof ZodNullable) {
    const inner = zodTypeToSQLite(
      (zodType as ZodOptional<ZodTypeAny> | ZodNullable<ZodTypeAny>).unwrap()
    )
    return { ...inner, nullable: true }
  }

  // Handle defaults (treat as non-nullable since default exists)
  if (zodType instanceof ZodDefault) {
    return zodTypeToSQLite((zodType as ZodDefault<ZodTypeAny>)._def.innerType)
  }

  // Core types
  if (zodType instanceof ZodString) return { sqlType: 'TEXT', nullable: false }
  if (zodType instanceof ZodNumber) return { sqlType: 'REAL', nullable: false }
  if (zodType instanceof ZodBoolean) return { sqlType: 'INTEGER', nullable: false }
  if (zodType instanceof ZodDate) return { sqlType: 'TEXT', nullable: false }
  if (zodType instanceof ZodEnum) return { sqlType: 'TEXT', nullable: false }

  // Complex types stored as JSON
  if (zodType instanceof ZodArray) return { sqlType: 'TEXT', nullable: false }
  if (zodType instanceof ZodObject) return { sqlType: 'TEXT', nullable: false }

  // Default fallback
  return { sqlType: 'TEXT', nullable: true }
}

/**
 * Get description from a Zod type
 */
function getZodDescription(zodType: ZodTypeAny): string | undefined {
  return zodType._def?.description
}

/**
 * Extract column info from a Zod object schema
 */
export function extractColumnsFromZod(schema: z.ZodObject<z.ZodRawShape>): ColumnInfo[] {
  const shape = schema.shape
  const columns: ColumnInfo[] = []

  for (const [fieldName, fieldType] of Object.entries(shape)) {
    const { sqlType, nullable } = zodTypeToSQLite(fieldType as ZodTypeAny)
    columns.push({
      name: fieldName,
      type: sqlType,
      nullable,
      description: getZodDescription(fieldType as ZodTypeAny),
    })
  }

  return columns
}

/**
 * Create a SQLite-based structured store
 */
export function createStore(dbPath: string): StructuredStore {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  return {
    initialize(schemas: SchemaMap): void {
      for (const [name, definition] of Object.entries(schemas)) {
        const safeName = sanitizeTableName(name)
        const shape = definition.schema.shape

        // Build column definitions
        const columnDefs = ['id TEXT PRIMARY KEY', 'user_id TEXT NOT NULL']

        for (const [fieldName, fieldType] of Object.entries(shape)) {
          const safeColName = sanitizeColumnName(fieldName)
          const { sqlType, nullable } = zodTypeToSQLite(fieldType as ZodTypeAny)
          const nullConstraint = nullable ? '' : ' NOT NULL'
          columnDefs.push(`${safeColName} ${sqlType}${nullConstraint}`)
        }

        columnDefs.push('created_at TEXT NOT NULL')
        columnDefs.push('updated_at TEXT NOT NULL')

        const createSQL = `CREATE TABLE IF NOT EXISTS ${safeName} (${columnDefs.join(', ')})`
        db.exec(createSQL)

        // Create index on user_id for efficient filtering
        db.exec(`CREATE INDEX IF NOT EXISTS idx_${safeName}_user_id ON ${safeName}(user_id)`)
      }
    },

    close(): void {
      db.close()
    },

    insert(table: string, userId: string, data: Record<string, unknown>): string {
      const safeName = sanitizeTableName(table)
      const id = randomUUID()
      const now = new Date().toISOString()

      // Get column names from data
      const columnNames = Object.keys(data).map(sanitizeColumnName)
      const allColumns = ['id', 'user_id', ...columnNames, 'created_at', 'updated_at']
      const placeholders = allColumns.map(() => '?').join(', ')

      // Prepare values with type conversion
      const values = [
        id,
        userId,
        ...Object.values(data).map(v => {
          if (v === null || v === undefined) return null
          if (typeof v === 'boolean') return v ? 1 : 0
          if (v instanceof Date) return v.toISOString()
          if (typeof v === 'object') return JSON.stringify(v)
          return v
        }),
        now,
        now,
      ]

      const sql = `INSERT INTO ${safeName} (${allColumns.join(', ')}) VALUES (${placeholders})`
      db.prepare(sql).run(...values)

      return id
    },

    update(table: string, id: string, data: Record<string, unknown>): void {
      const safeName = sanitizeTableName(table)
      const now = new Date().toISOString()

      // Build SET clause
      const setClauses: string[] = []
      const values: unknown[] = []

      for (const [key, value] of Object.entries(data)) {
        const safeColName = sanitizeColumnName(key)
        setClauses.push(`${safeColName} = ?`)

        if (value === null || value === undefined) {
          values.push(null)
        } else if (typeof value === 'boolean') {
          values.push(value ? 1 : 0)
        } else if (value instanceof Date) {
          values.push(value.toISOString())
        } else if (typeof value === 'object') {
          values.push(JSON.stringify(value))
        } else {
          values.push(value)
        }
      }

      setClauses.push('updated_at = ?')
      values.push(now)
      values.push(id)

      const sql = `UPDATE ${safeName} SET ${setClauses.join(', ')} WHERE id = ?`
      db.prepare(sql).run(...values)
    },

    delete(table: string, id: string): void {
      const safeName = sanitizeTableName(table)
      db.prepare(`DELETE FROM ${safeName} WHERE id = ?`).run(id)
    },

    get(table: string, id: string): Record<string, unknown> | null {
      const safeName = sanitizeTableName(table)
      const row = db.prepare(`SELECT * FROM ${safeName} WHERE id = ?`).get(id) as
        | Record<string, unknown>
        | undefined
      return row ?? null
    },

    list(
      table: string,
      userId: string,
      limit: number = 100,
      offset: number = 0
    ): Record<string, unknown>[] {
      const safeName = sanitizeTableName(table)
      const rows = db
        .prepare(
          `SELECT * FROM ${safeName} WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .all(userId, limit, offset) as Record<string, unknown>[]
      return rows
    },

    query(sql: string): Record<string, unknown>[] {
      // Only allow SELECT queries for safety
      const trimmed = sql.trim().toLowerCase()
      if (!trimmed.startsWith('select')) {
        throw new Error('Only SELECT queries are allowed')
      }

      const rows = db.prepare(sql).all() as Record<string, unknown>[]
      return rows
    },

    findByField(
      table: string,
      userId: string,
      field: string,
      value: unknown
    ): Record<string, unknown> | null {
      const safeName = sanitizeTableName(table)
      const safeField = sanitizeColumnName(field)

      // Convert value for comparison
      let queryValue = value
      if (typeof value === 'boolean') {
        queryValue = value ? 1 : 0
      } else if (value instanceof Date) {
        queryValue = value.toISOString()
      }

      const row = db
        .prepare(
          `SELECT * FROM ${safeName} WHERE user_id = ? AND ${safeField} = ? ORDER BY created_at DESC LIMIT 1`
        )
        .get(userId, queryValue) as Record<string, unknown> | undefined

      return row ?? null
    },

    getMostRecent(table: string, userId: string): Record<string, unknown> | null {
      const safeName = sanitizeTableName(table)
      const row = db
        .prepare(`SELECT * FROM ${safeName} WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`)
        .get(userId) as Record<string, unknown> | undefined

      return row ?? null
    },
  }
}
