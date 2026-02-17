# Recall Client Example

Example Next.js app using `@youcraft/recall-client` to connect to a hosted Recall API.

## Setup

1. Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the dev server:

```bash
pnpm dev
```

## Environment Variables

- `RECALL_API_KEY` - Your Recall API key (starts with `rk_`)
- `RECALL_API_URL` - URL of your Recall instance (defaults to hosted version)
- `OPENAI_API_KEY` - OpenAI API key for the chat model
