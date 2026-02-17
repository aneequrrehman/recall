import { Command } from 'commander'
import { resolveConfig } from './config'
import { createRecallMCPServer } from './server'

const program = new Command()

program
  .name('recall-mcp')
  .description('MCP server for Recall memory management')
  .version('0.1.0')
  .option('--db <path>', 'SQLite database path (use ":memory:" for in-memory)', 'recall.db')
  .option('--openai-key <key>', 'OpenAI API key (or use OPENAI_API_KEY env var)')
  .option('--model <model>', 'OpenAI model for extraction', 'gpt-5-nano')
  .option('--embedding <model>', 'OpenAI embedding model', 'text-embedding-3-small')
  .option('--user-id <id>', 'Default user ID for operations')
  .option('--verbose', 'Enable verbose logging', false)
  .action(async options => {
    try {
      const config = resolveConfig(options)
      const server = createRecallMCPServer(config)

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        await server.close()
        process.exit(0)
      })

      process.on('SIGTERM', async () => {
        await server.close()
        process.exit(0)
      })

      await server.start()
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program.parse()
