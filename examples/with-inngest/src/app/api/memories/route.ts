import { memory } from '@/lib/memory'

// For demo purposes, using a hardcoded user ID
// In production, get this from authentication
const USER_ID = 'demo-user'

export async function GET() {
  try {
    const memories = await memory.list(USER_ID)

    // Sort by createdAt descending (newest first)
    const sortedMemories = memories.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return Response.json({ memories: sortedMemories })
  } catch (error) {
    console.error('Memories API Error:', error)
    return Response.json({ error: 'Failed to fetch memories' }, { status: 500 })
  }
}
