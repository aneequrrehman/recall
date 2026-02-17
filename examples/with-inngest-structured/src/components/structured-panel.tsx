'use client'

import { motion } from 'framer-motion'
import { Database, Table2, Hash, RefreshCw } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import styles from './StructuredPanel.module.scss'

interface Column {
  name: string
  type: string
}

interface TableInfo {
  name: string
  columns: Column[]
  rowCount: number
  data: Record<string, unknown>[]
}

interface StructuredPanelProps {
  refreshTrigger?: number
}

export function StructuredPanel({ refreshTrigger }: StructuredPanelProps) {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/tables')
      const data = await res.json()
      setTables(data.tables || [])
      setError(null)
    } catch (err) {
      console.error('Failed to fetch tables:', err)
      setError('Failed to load tables')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTables()
  }, [fetchTables, refreshTrigger])

  // Format a row for display, excluding system fields
  const formatRow = (row: Record<string, unknown>) => {
    const { id, created_at, updated_at, ...rest } = row
    return rest
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Database size={20} style={{ color: 'var(--theme-primary)' }} />
        <h2>Structured Data</h2>
        <button className={styles.refreshButton} onClick={fetchTables} disabled={loading}>
          <RefreshCw size={14} className={loading ? styles.spinning : ''} />
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading && tables.length === 0 && <div className={styles.empty}>Loading tables...</div>}

      {!loading && tables.length === 0 && (
        <div className={styles.empty}>
          <p>No structured data yet.</p>
          <p className={styles.hint}>
            Try saying something like:
            <br />
            &quot;Paid Jayden $100 for MMA&quot;
            <br />
            &quot;Did 50 pushups today&quot;
          </p>
        </div>
      )}

      <div className={styles.tablesList}>
        {tables.map((table, tableIndex) => (
          <motion.div
            key={table.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: tableIndex * 0.1 }}
            className={styles.tableCard}
          >
            <div className={styles.tableHeader}>
              <Table2 size={14} />
              <span className={styles.tableName}>{table.name}</span>
              <span className={styles.rowCount}>
                <Hash size={10} />
                {table.rowCount}
              </span>
            </div>

            <div className={styles.columns}>
              {table.columns.map(col => (
                <span key={col.name} className={styles.column}>
                  {col.name}
                  <span className={styles.type}>{col.type}</span>
                </span>
              ))}
            </div>

            {table.data.length > 0 && (
              <div className={styles.dataPreview}>
                <div className={styles.dataHeader}>Recent entries:</div>
                {table.data.slice(0, 3).map((row, rowIndex) => (
                  <div key={rowIndex} className={styles.dataRow}>
                    {Object.entries(formatRow(row)).map(([key, value]) => (
                      <span key={key} className={styles.dataCell}>
                        <span className={styles.dataKey}>{key}:</span>
                        <span className={styles.dataValue}>{String(value)}</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
