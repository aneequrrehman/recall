'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Clock, RefreshCw, Quote } from 'lucide-react'
import styles from './MemoriesPanel.module.scss'

interface Memory {
  id: string
  content: string
  createdAt: string
}

const POLL_INTERVAL = 10000 // 10 seconds

export function MemoriesPanel() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchMemories = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    try {
      const response = await fetch('/api/memories')
      if (response.ok) {
        const data = await response.json()
        setMemories(data.memories)
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMemories()
    const interval = setInterval(() => fetchMemories(), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchMemories])

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className={styles.container}>
      {/* Decorative background elements */}
      <div className={styles.bgDecor}>
        <div className={styles.bgCircle1} />
        <div className={styles.bgCircle2} />
      </div>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconWrapper}>
            <Sparkles size={18} />
          </div>
          <div className={styles.headerText}>
            <h2>Memories</h2>
            <span className={styles.subtitle}>{memories.length} remembered</span>
          </div>
        </div>
        <button
          onClick={() => fetchMemories(true)}
          className={`${styles.refreshButton} ${isRefreshing ? styles.spinning : ''}`}
          title="Refresh memories"
          disabled={isRefreshing}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className={styles.list}>
        {isLoading ? (
          <div className={styles.emptyState}>
            <div className={styles.loadingDots}>
              <span />
              <span />
              <span />
            </div>
            <p>Loading memories...</p>
          </div>
        ) : memories.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Quote size={32} />
            </div>
            <p className={styles.emptyTitle}>No memories yet</p>
            <p className={styles.emptySubtitle}>
              Start a conversation and I&apos;ll remember the important details
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {memories.map((memory, index) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  delay: index * 0.04,
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                layout
                className={styles.memoryCard}
              >
                <div className={styles.cardAccent} />
                <div className={styles.cardContent}>
                  <p className={styles.memoryText}>{memory.content}</p>
                  <div className={styles.cardMeta}>
                    <Clock size={10} />
                    <span>{formatRelativeTime(memory.createdAt)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Live indicator */}
      <div className={styles.liveIndicator}>
        <span className={styles.liveDot} />
        <span>Auto-updating</span>
      </div>
    </div>
  )
}
