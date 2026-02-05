# Phase 6: Firehose Indexer - Deployment Summary

## Overview

Phase 6 implements a real-time ATProto event indexer that connects to the Bluesky Jetstream firehose and syncs `mlcommons.*` collection events to the shared Neon database.

## What Was Built

### Indexer Service (`/indexer`)

A standalone Node.js service that:

1. **Connects to Jetstream** - WebSocket connection to Bluesky's public firehose relay
2. **Filters Events** - Only processes `mlcommons.community.*` collections
3. **Syncs to Database** - Writes posts, votes, and community records to Neon
4. **Handles Resumption** - Persists cursor position for seamless restarts

### File Structure

```
indexer/
├── src/
│   ├── index.ts      # Main entry point, stats logging
│   ├── firehose.ts   # WebSocket client, Jetstream connection
│   ├── handlers.ts   # Event processing logic
│   ├── schema.ts     # Database schema (mirrors main app)
│   └── db.ts         # Drizzle database connection
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── Dockerfile        # Container build for Railway
├── railway.json      # Railway deployment config
├── .env.example      # Environment template
├── .gitignore        # Ignored files
├── README.md         # Service documentation
└── RAILWAY_DEPLOYMENT.md  # Detailed deployment guide
```

## Supported Events

### Posts (`mlcommons.community.post`)

| Operation | Action |
|-----------|--------|
| `create` | Insert post, update community/parent counts |
| `update` | Update post content |
| `delete` | Remove post, adjust counts |

### Votes (`mlcommons.community.vote`)

| Operation | Action |
|-----------|--------|
| `create` | Record vote, update post vote count |
| `delete` | Remove vote, revert vote count |

### Communities (`mlcommons.community.community`)

| Operation | Action |
|-----------|--------|
| `create` | Create community record |
| `update` | Update community metadata |

## Deployment

### Quick Start

1. Create Railway project linked to GitHub repo
2. Set root directory to `indexer`
3. Add `DATABASE_URL` environment variable
4. Deploy!

### Full Guide

See [RAILWAY_DEPLOYMENT.md](./indexer/RAILWAY_DEPLOYMENT.md) for:

- Step-by-step Railway setup
- Environment variable configuration
- Monitoring and logging
- Troubleshooting guide
- Cost estimation
- Production checklist

## Architecture

```
ATProto Network → Jetstream Relay → Firehose Indexer → Neon DB → Vercel App
```

The indexer enables cross-network content discovery by processing events from any ATProto PDS that creates `mlcommons.*` records.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `CURSOR_FILE` | No | Path for cursor persistence (default: `.cursor`) |

## Running Locally

```bash
cd indexer

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL

# Development mode (with hot reload)
npm run dev

# Production mode
npm run build && npm start
```

## Monitoring

The indexer logs stats every 60 seconds:

```
[Stats] Events: 1234 | Errors: 2 | Rate: 5.67/s | Uptime: 3600s
```

And event processing:

```
[Firehose] CREATE mlcommons.community.post from did:plc:xxx
[Handler] Created post: at://did:plc:xxx/mlcommons.community.post/3abc...
```

## Cost Estimate

Railway Hobby plan: **$5/month**

The indexer is lightweight (~100-200MB RAM, minimal CPU).

## Next Steps (Phase 7)

With the Firehose Indexer running, the platform can now:

1. **Trending Algorithm** - Analyze cross-network activity
2. **Recommended Communities** - Discover popular communities
3. **"Best of" Filters** - Time-based content ranking
4. **Personalized Feeds** - User-specific recommendations

---

## Commits

- `4344529` - feat: Add Firehose Indexer service (Phase 6)

## Related Documentation

- [Phase 5 Plan](./PHASE_5_PLAN.md) - Previous phase (Polish & Production)
- [Railway Deployment Guide](./indexer/RAILWAY_DEPLOYMENT.md) - Detailed deployment instructions
- [Indexer README](./indexer/README.md) - Service documentation
