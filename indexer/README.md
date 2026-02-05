# MLCommons Firehose Indexer

Real-time ATProto event indexer for the MLCommons Community Platform.

## Overview

This service connects to Bluesky's Jetstream firehose and syncs `mlcommons.*` collection events to the database. It enables:

- Real-time post indexing from any ATProto PDS
- Cross-network content discovery
- Vote aggregation from the network
- Community event processing

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   ATProto Network   │────▶│  Jetstream Relay    │
│   (Multiple PDS)    │     │  (Bluesky Public)   │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                                       │ WebSocket
                                       ▼
                            ┌──────────────────────┐
                            │  Firehose Indexer    │
                            │  (This Service)      │
                            └──────────┬───────────┘
                                       │
                                       │ SQL
                                       ▼
                            ┌──────────────────────┐
                            │   Neon PostgreSQL    │
                            │   (Shared DB)        │
                            └──────────────────────┘
```

## Filtered Collections

The indexer only processes events from:

- `mlcommons.community.community` - Community records
- `mlcommons.community.post` - Posts and comments
- `mlcommons.community.vote` - Votes on posts

## Development

### Prerequisites

- Node.js 20+
- Access to Neon PostgreSQL database

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your DATABASE_URL
```

### Running Locally

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build && npm start
```

## Deployment (Railway)

1. Create a new Railway project
2. Connect this repository (or the `/indexer` directory)
3. Set environment variables:
   - `DATABASE_URL`: Same Neon connection string as the main app
4. Deploy!

Railway will use the included `Dockerfile` and `railway.json` configuration.

## Event Handling

### Post Events

- **create**: Inserts new post, updates community/parent counts
- **update**: Updates post content
- **delete**: Removes post, adjusts counts

### Vote Events

- **create**: Records vote, updates post vote count
- **delete**: Removes vote, reverts vote count

### Community Events

- **create**: Creates community record
- **update**: Updates community metadata

## Resumption

The indexer saves its cursor position to `.cursor` file. On restart, it resumes from the last processed event, ensuring no data loss.

## Monitoring

Stats are logged every 60 seconds:

```
[Stats] Events: 1234 | Errors: 2 | Rate: 5.67/s | Uptime: 3600s
```

## License

MIT
