import { ChatInterface } from '@/components/chat-interface'
import { MemoriesPanel } from '@/components/memories-panel'
import Link from 'next/link'

/**
 * This page demonstrates the @youcraft/recall-ai-sdk integration.
 *
 * It uses the same UI as the main page, but the chat endpoint
 * uses the recall() wrapper instead of manual memory handling.
 *
 * Compare /api/chat/route.ts with /api/ai-sdk/chat/route.ts
 * to see the difference.
 */
export default function AiSdkPage() {
  return (
    <main
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            zIndex: 10,
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              background: 'var(--theme-surface)',
              border: '1px solid var(--theme-border)',
              fontSize: '0.875rem',
              textDecoration: 'none',
              color: 'var(--theme-text-secondary)',
            }}
          >
            &larr; Manual
          </Link>
          <span
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              background: 'var(--theme-primary)',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            AI SDK
          </span>
          <Link
            href="/tanstack-ai"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              background: 'var(--theme-surface)',
              border: '1px solid var(--theme-border)',
              fontSize: '0.875rem',
              textDecoration: 'none',
              color: 'var(--theme-text-secondary)',
            }}
          >
            TanStack AI &rarr;
          </Link>
        </div>
        <ChatInterface apiEndpoint="/api/ai-sdk" />
      </div>
      <div style={{ height: '100%', display: 'block' }}>
        <MemoriesPanel />
      </div>
    </main>
  )
}
