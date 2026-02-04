# MLCommons ATProto Community Platform

A decentralized Reddit-lite community engagement and syndication platform built on AT Protocol.

## Features

- 🌐 **Decentralized Communities**: Create and manage topic-based communities
- 🔄 **Content Syndication**: Real-time content aggregation via ATProto firehose
- 🗳️ **Voting System**: Upvote/downvote posts and comments
- 🏆 **Reputation**: Karma-based reputation system
- 🛡️ **Moderation**: Community-level moderation tools
- 🎨 **MLCommons Design**: Professional trade dress with Tailwind CSS

## Tech Stack

- **Framework**: Remix v2 with Vite
- **Deployment**: Vercel (frontend) + Railway (firehose indexer)
- **Database**: Vercel Postgres with Drizzle ORM
- **Authentication**: OAuth via @atproto/oauth-client-node
- **Styling**: Tailwind CSS with MLCommons design tokens
- **Protocol**: AT Protocol with custom Lexicon schemas

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- AT Protocol account (create at [bsky.app](https://bsky.app))

### Installation

1. Clone the repository:
```bash
cd /Users/dave/Claude_Primary/MLC_AT_Proto
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Generate a session secret:
```bash
openssl rand -base64 32
```

5. Set up the database (when Vercel Postgres is configured):
```bash
npm run db:push
```

6. Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
├── app/
│   ├── routes/          # Remix routes
│   ├── components/      # React components
│   ├── lib/             # Utilities and server code
│   ├── services/        # Business logic
│   ├── styles/          # Tailwind CSS
│   └── types/           # TypeScript types
├── db/
│   ├── schema/          # Drizzle ORM schemas
│   └── migrations/      # Database migrations
├── indexer/             # Firehose indexer service (separate deployment)
├── lexicons/            # Custom ATProto Lexicon schemas
└── public/              # Static assets
```

## Custom Lexicon Schemas

This platform defines custom ATProto schemas:

- `mlcommons.community.definition` - Community metadata
- `mlcommons.community.post` - Posts within communities
- `mlcommons.community.vote` - Voting records
- `mlcommons.community.moderation` - Moderation actions
- `mlcommons.user.reputation` - User reputation/karma

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio

## Deployment

### Vercel (Frontend)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Railway (Firehose Indexer)

See `indexer/README.md` for deployment instructions.

## Architecture

```
┌─────────────────────────────────────────┐
│  Vercel: Remix App + API Routes         │
│  • OAuth authentication                  │
│  • Community & post CRUD                 │
│  • Voting & reputation                   │
└─────────────┬───────────────────────────┘
              ↕
┌─────────────────────────────────────────┐
│  Vercel Postgres Database               │
│  • Users, communities, posts, votes     │
└─────────────┬───────────────────────────┘
              ↕
┌─────────────────────────────────────────┐
│  Railway: Firehose Indexer              │
│  • 24/7 WebSocket to ATProto            │
│  • Real-time event processing           │
└─────────────┬───────────────────────────┘
              ↕
┌─────────────────────────────────────────┐
│  ATProto Network                        │
│  • User repositories                     │
│  • OAuth authentication                  │
│  • Firehose events                       │
└─────────────────────────────────────────┘
```

## Contributing

This project is part of the MLCommons initiative. Contributions are welcome!

## License

MIT License - see LICENSE file for details

## Resources

- [AT Protocol Documentation](https://atproto.com)
- [Bluesky Developer Docs](https://docs.bsky.app)
- [Remix Documentation](https://remix.run/docs)
- [MLCommons](https://mlcommons.org)
