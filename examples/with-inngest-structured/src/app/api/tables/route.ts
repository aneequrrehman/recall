import { getStructuredTables } from '@/lib/memory'

export async function GET() {
  try {
    const tables = await getStructuredTables()
    return Response.json({ tables })
  } catch (error) {
    console.error('Tables API Error:', error)
    return Response.json({ tables: [], error: 'Failed to fetch tables' }, { status: 500 })
  }
}
