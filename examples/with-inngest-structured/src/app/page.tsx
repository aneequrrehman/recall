'use client'

import { useState } from 'react'
import { ChatInterface } from '@/components/chat-interface'
import { StructuredPanel } from '@/components/structured-panel'

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleMessageSent = () => {
    // Trigger a refresh of the tables panel
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <main style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        <ChatInterface onMessageSent={handleMessageSent} />
      </div>
      <div style={{ height: '100%', display: 'block' }}>
        <StructuredPanel refreshTrigger={refreshTrigger} />
      </div>
    </main>
  )
}
