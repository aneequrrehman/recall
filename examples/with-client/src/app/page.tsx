import { ChatInterface } from '@/components/chat-interface'
import { MemoriesPanel } from '@/components/memories-panel'

export default function Home() {
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
            Client Example
          </span>
        </div>
        <ChatInterface apiEndpoint="/api/chat" />
      </div>
      <div style={{ height: '100%', display: 'block' }}>
        <MemoriesPanel />
      </div>
    </main>
  )
}
