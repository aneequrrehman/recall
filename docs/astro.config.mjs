// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// https://astro.build/config
export default defineConfig({
  site: 'https://recall.youcraft.dev',
  integrations: [
    starlight({
      title: 'Recall',
      description:
        'Memory layer for AI applications. LLM-powered fact extraction, smart deduplication, and vector search — all in your existing database.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/aneequrrehman/recall',
        },
      ],
      head: [
        // Structured Data for SEO
        {
          tag: 'script',
          attrs: { type: 'application/ld+json' },
          content: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareSourceCode',
            name: 'Recall',
            description:
              'Memory layer for AI applications with LLM-powered fact extraction and vector search',
            codeRepository: 'https://github.com/aneequrrehman/recall',
            programmingLanguage: 'TypeScript',
            license: 'https://opensource.org/licenses/MIT',
            author: {
              '@type': 'Organization',
              name: 'YouCraft',
            },
            keywords: ['ai', 'memory', 'llm', 'embeddings', 'vector-database', 'typescript'],
          }),
        },
        // Open Graph
        {
          tag: 'meta',
          attrs: {
            property: 'og:type',
            content: 'website',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:site_name',
            content: 'Recall Documentation',
          },
        },
        // Twitter Card
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:card',
            content: 'summary_large_image',
          },
        },
      ],
      sidebar: [
        {
          label: 'Get Started',
          items: [
            { label: 'Introduction', link: '/' },
            { label: 'Overview', slug: 'overview' },
            { label: 'Quickstart', slug: 'quickstart' },
            { label: 'Core Concepts', slug: 'concepts' },
            { label: 'Packages', slug: 'packages' },
          ],
        },
        {
          label: 'Tutorials',
          items: [
            { label: 'Next.js Chatbot', slug: 'tutorials/nextjs-chatbot' },
            { label: 'AI SDK Memory', slug: 'tutorials/ai-sdk-memory' },
            { label: 'MCP Server', slug: 'tutorials/mcp-server' },
          ],
        },
        {
          label: 'Structured Memory',
          items: [
            { label: 'Overview', slug: 'structured' },
            { label: 'Quickstart', slug: 'structured/quickstart' },
            { label: 'Core Concepts', slug: 'structured/concepts' },
            { label: 'Multi-hop Agent', slug: 'structured/agent' },
            { label: 'API Reference', slug: 'structured/api' },
          ],
        },
        {
          label: 'Extractors',
          items: [
            { label: 'Overview', slug: 'extractors' },
            { label: 'OpenAI', slug: 'extractors/openai' },
            { label: 'Anthropic', slug: 'extractors/anthropic' },
          ],
        },
        {
          label: 'Embeddings Providers',
          items: [
            { label: 'Overview', slug: 'embeddings' },
            { label: 'OpenAI', slug: 'embeddings/openai' },
            { label: 'Cohere', slug: 'embeddings/cohere' },
            { label: 'Voyage', slug: 'embeddings/voyage' },
          ],
        },
        {
          label: 'Database Adapters',
          items: [
            { label: 'Overview', slug: 'database-adapters' },
            { label: 'SQLite', slug: 'database-adapters/sqlite' },
            { label: 'PostgreSQL', slug: 'database-adapters/postgresql' },
            { label: 'MySQL', slug: 'database-adapters/mysql' },
          ],
        },
        {
          label: 'Integrations',
          items: [
            { label: 'MCP Tools', slug: 'integrations/mcp' },
            { label: 'MCP Server', slug: 'integrations/mcp-server' },
            { label: 'Vercel AI SDK', slug: 'integrations/ai-sdk' },
          ],
        },
        {
          label: 'Examples',
          items: [
            { label: 'Overview', slug: 'examples' },
            { label: 'with-inngest', slug: 'examples/with-inngest' },
            { label: 'with-wdk', slug: 'examples/with-wdk' },
            { label: 'with-inngest-structured', slug: 'examples/with-inngest-structured' },
          ],
        },
      ],
    }),
  ],
})
