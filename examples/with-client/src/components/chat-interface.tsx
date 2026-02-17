'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'
import styles from './ChatInterface.module.scss'
import { cn } from '@/lib/utils'

function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter(part => part.type === 'text' && part.text)
    .map(part => part.text)
    .join('')
}

type ChatInterfaceProps = {
  apiEndpoint: string
}

export function ChatInterface({ apiEndpoint }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: apiEndpoint,
    }),
  })

  const isLoading = status === 'streaming'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    sendMessage({
      parts: [{ type: 'text', text: input }],
    })
    setInput('')
  }

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.avatar} style={{ border: 'none' }}>
              <Sparkles size={32} strokeWidth={1} />
            </div>
            <h3>How can I help you today?</h3>
            <p>
              I can help you with your tasks, answer questions, and remember important details about
              our conversations.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(styles.messageRow, m.role === 'user' ? styles.user : styles.bot)}
            >
              {m.role !== 'user' && (
                <div className={styles.avatar}>
                  <Bot size={16} />
                </div>
              )}

              <div className={cn(styles.bubble, m.role === 'user' ? styles.user : styles.bot)}>
                <p>{getMessageText(m)}</p>
              </div>

              {m.role === 'user' && (
                <div className={styles.avatar}>
                  <User size={16} />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className={cn(styles.messageRow, styles.bot)}>
            <div className={styles.avatar}>
              <Bot size={16} />
            </div>
            <div className={cn(styles.bubble, styles.bot)}>
              <div className={styles.loading}>
                <motion.div
                  className={styles.dot}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                />
                <motion.div
                  className={styles.dot}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                />
                <motion.div
                  className={styles.dot}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
          />
          <button type="submit" disabled={isLoading || !input.trim()} className={styles.sendButton}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
