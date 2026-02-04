# Vercel Deployment & Database Setup Guide

This guide walks you through deploying the MLCommons ATProto Community Platform to Vercel with a Neon Postgres database.

## Prerequisites

- GitHub repository pushed (✅ Done)
- Vercel account (create at https://vercel.com)
- Vercel CLI installed (✅ Done)

## Step 1: Link Project to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/new
   - Click "Add New..." → "Project"

2. **Import Git Repository**
   - Select "Import Git Repository"
   - Choose GitHub
   - Find: `elementalcollision/mlcommons-atproto-community`
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Remix (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `build` (auto-filled)
   - **Install Command**: `npm install` (auto-filled)

4. **Skip Environment Variables for now** (we'll add them after database setup)
   - Click "Deploy" to create the project

### Option B: Via Vercel CLI

```bash
# Navigate to project directory
cd /Users/dave/Claude_Primary/MLC_AT_Proto

# Login to Vercel
vercel login

# Link and deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? mlcommons-atproto-community
# - Directory? ./
# - Override settings? No
```

## Step 2: Add Neon Postgres Database

### Via Vercel Dashboard

1. **Navigate to Your Project**
   - Go to https://vercel.com/dashboard
   - Select your project: `mlcommons-atproto-community`

2. **Add Storage**
   - Click "Storage" tab
   - Click "Create Database"
   - Select "Postgres" (powered by Neon)
   - Choose database name: `mlcommons-atproto-community`
   - Select region: Choose closest to your users (e.g., `US East (Ohio)`)
   - Click "Create"

3. **Connect to Project**
   - Select "Connect to project"
   - Choose your project
   - Environment: Select "Production, Preview, and Development"
   - Click "Connect"

4. **Verify Environment Variables**
   - Go to Settings → Environment Variables
   - You should now see these auto-injected:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`
     - `POSTGRES_URL_NO_SSL`
     - `POSTGRES_USER`
     - `POSTGRES_HOST`
     - `POSTGRES_PASSWORD`
     - `POSTGRES_DATABASE`

### Via Vercel CLI

```bash
# Add database storage
vercel storage create postgres mlcommons-atproto-community

# Link to project
vercel link

# The database connection will be automatically added to environment variables
```

## Step 3: Add Additional Environment Variables

### Generate Session Secret

```bash
# Generate a secure session secret
openssl rand -base64 32
```

Copy the output (it will look like: `Xk7jP9mN2qR8vL4wE6sT1oC3nH5gF0bZ...`)

### Add Variables in Vercel Dashboard

1. **Go to Settings → Environment Variables**
2. **Add the following variables:**

   **SESSION_SECRET**
   - Name: `SESSION_SECRET`
   - Value: [Paste the output from openssl command above]
   - Environment: Production, Preview, Development
   - Click "Save"

   **PUBLIC_URL** (Production)
   - Name: `PUBLIC_URL`
   - Value: `https://your-project-name.vercel.app` (use your actual Vercel URL)
   - Environment: Production
   - Click "Save"

   **PUBLIC_URL** (Development)
   - Name: `PUBLIC_URL`
   - Value: `http://localhost:3000`
   - Environment: Development
   - Click "Save"

   **ATPROTO_SERVICE**
   - Name: `ATPROTO_SERVICE`
   - Value: `https://bsky.social`
   - Environment: Production, Preview, Development
   - Click "Save"

   **ATPROTO_FIREHOSE**
   - Name: `ATPROTO_FIREHOSE`
   - Value: `wss://bsky.network`
   - Environment: Production, Preview, Development
   - Click "Save"

   **ATPROTO_CLIENT_ID**
   - Name: `ATPROTO_CLIENT_ID`
   - Value: `https://your-project-name.vercel.app/client-metadata.json`
   - Environment: Production
   - Click "Save"

### Via Vercel CLI

```bash
# Generate and set session secret
SESSION_SECRET=$(openssl rand -base64 32)
vercel env add SESSION_SECRET production
# Paste the generated secret when prompted

vercel env add SESSION_SECRET development
# Paste the same secret

# Add other environment variables
vercel env add PUBLIC_URL production
# Enter: https://your-project-name.vercel.app

vercel env add PUBLIC_URL development
# Enter: http://localhost:3000

vercel env add ATPROTO_SERVICE production
# Enter: https://bsky.social

vercel env add ATPROTO_FIREHOSE production
# Enter: wss://bsky.network

vercel env add ATPROTO_CLIENT_ID production
# Enter: https://your-project-name.vercel.app/client-metadata.json
```

## Step 4: Run Database Migrations

### Option A: Via Vercel CLI (Recommended)

1. **Pull environment variables locally**
   ```bash
   cd /Users/dave/Claude_Primary/MLC_AT_Proto
   vercel env pull .env.local
   ```

2. **Run migrations locally against production database**
   ```bash
   # This will use the POSTGRES_URL from .env.local
   npm run db:push
   ```

3. **Verify migration**
   ```bash
   # Check that tables were created
   npm run db:studio
   # Opens Drizzle Studio in browser
   ```

### Option B: Via Vercel Edge Config

Alternatively, you can run migrations directly in a serverless function:

1. **Create migration script**
   ```bash
   # Already exists in package.json as: npm run db:push
   ```

2. **Create a one-time migration route**

   Create: `app/routes/admin.migrate.tsx`
   ```typescript
   import type { LoaderFunctionArgs } from "@remix-run/node";
   import { json } from "@remix-run/node";
   import { sql } from '@neondatabase/serverless';
   import { drizzle } from 'drizzle-orm/neon-serverless';
   import { migrate } from 'drizzle-orm/neon-serverless/migrator';

   export async function loader({ request }: LoaderFunctionArgs) {
     // SECURITY: Add authentication check here
     // For now, only allow in development or with secret key
     const url = new URL(request.url);
     const secret = url.searchParams.get('secret');

     if (process.env.NODE_ENV === 'production' && secret !== process.env.MIGRATION_SECRET) {
       return json({ error: 'Unauthorized' }, { status: 401 });
     }

     try {
       const client = new sql(process.env.POSTGRES_URL!);
       const db = drizzle(client);

       // Run migrations
       await migrate(db, { migrationsFolder: './db/migrations' });

       return json({ success: true, message: 'Migrations completed' });
     } catch (error) {
       console.error('Migration error:', error);
       return json({
         error: error instanceof Error ? error.message : 'Migration failed'
       }, { status: 500 });
     }
   }
   ```

3. **Add MIGRATION_SECRET to Vercel**
   ```bash
   vercel env add MIGRATION_SECRET production
   # Enter a secure random string
   ```

4. **Run migration**
   ```bash
   # After deploying, visit:
   curl "https://your-project-name.vercel.app/admin/migrate?secret=YOUR_MIGRATION_SECRET"
   ```

### Option C: Use Drizzle Studio with Vercel Database

1. **Install Drizzle Kit globally**
   ```bash
   npm install -g drizzle-kit
   ```

2. **Pull environment variables**
   ```bash
   vercel env pull .env.local
   ```

3. **Run Drizzle Studio**
   ```bash
   npm run db:studio
   ```

4. **Push schema to database**
   ```bash
   npm run db:push
   ```

## Step 5: Update client-metadata.json for Production

The `public/client-metadata.json` file needs to be updated with production URLs.

### Option A: Use Environment Variable Replacement

Update `public/client-metadata.json` to be generated dynamically:

1. **Create a route to serve client metadata**

   Create: `app/routes/client-metadata[.]json.tsx`
   ```typescript
   import type { LoaderFunctionArgs } from "@remix-run/node";
   import { json } from "@remix-run/node";

   export async function loader({ request }: LoaderFunctionArgs) {
     const publicUrl = process.env.PUBLIC_URL || "http://localhost:3000";

     const metadata = {
       client_id: `${publicUrl}/client-metadata.json`,
       client_name: "MLCommons Community Platform",
       client_uri: publicUrl,
       logo_uri: `${publicUrl}/logo.png`,
       tos_uri: `${publicUrl}/terms`,
       policy_uri: `${publicUrl}/privacy`,
       redirect_uris: [`${publicUrl}/auth/callback/atproto`],
       scope: "atproto transition:generic",
       grant_types: ["authorization_code", "refresh_token"],
       response_types: ["code"],
       token_endpoint_auth_method: "none",
       application_type: "web",
       dpop_bound_access_tokens: true,
     };

     return json(metadata, {
       headers: {
         "Content-Type": "application/json",
         "Cache-Control": "public, max-age=3600",
       },
     });
   }
   ```

### Option B: Manual Update

Update `public/client-metadata.json` directly:

```json
{
  "client_id": "https://your-project-name.vercel.app/client-metadata.json",
  "client_name": "MLCommons Community Platform",
  "client_uri": "https://your-project-name.vercel.app",
  "logo_uri": "https://your-project-name.vercel.app/logo.png",
  "tos_uri": "https://your-project-name.vercel.app/terms",
  "policy_uri": "https://your-project-name.vercel.app/privacy",
  "redirect_uris": [
    "https://your-project-name.vercel.app/auth/callback/atproto"
  ],
  "scope": "atproto transition:generic",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
}
```

Commit and push the changes.

## Step 6: Redeploy

### Via Vercel Dashboard

1. Go to Deployments tab
2. Click "Redeploy" on the latest deployment
3. Check "Use existing Build Cache"
4. Click "Redeploy"

### Via Vercel CLI

```bash
vercel --prod
```

Or just push to GitHub:

```bash
git add .
git commit -m "Update production configuration"
git push origin main
# Vercel will auto-deploy
```

## Step 7: Verify Deployment

### Check Environment Variables

```bash
# Verify all environment variables are set
vercel env ls
```

### Check Database Connection

1. Visit: `https://your-project-name.vercel.app`
2. Try to navigate to: `https://your-project-name.vercel.app/auth/login`
3. Check Vercel logs for any database connection errors

### View Logs

```bash
# Real-time logs
vercel logs --follow

# Or in dashboard
# Go to project → Deployments → [Latest] → Logs
```

## Step 8: Local Development with Vercel Database

### Setup Local Environment

1. **Pull production environment variables**
   ```bash
   vercel env pull .env.local
   ```

2. **Generate session secret locally**
   ```bash
   echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env.local
   echo "PUBLIC_URL=http://localhost:3000" >> .env.local
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Your .env.local should contain:**
   ```bash
   # From Vercel
   POSTGRES_URL=postgres://...
   POSTGRES_PRISMA_URL=postgres://...
   POSTGRES_URL_NON_POOLING=postgres://...

   # Added manually
   SESSION_SECRET=your-generated-secret
   PUBLIC_URL=http://localhost:3000
   ATPROTO_SERVICE=https://bsky.social
   ATPROTO_FIREHOSE=wss://bsky.network
   ATPROTO_CLIENT_ID=http://localhost:3000/client-metadata.json
   ```

## Troubleshooting

### Database Connection Issues

**Error: "connect ECONNREFUSED"**
- Check that `POSTGRES_URL` is set correctly
- Verify database exists in Vercel dashboard
- Try pulling env vars again: `vercel env pull .env.local`

**Error: "relation does not exist"**
- Migrations haven't run yet
- Run: `npm run db:push`
- Check Drizzle Studio: `npm run db:studio`

### Session Secret Issues

**Error: "Session secret is required"**
- Add `SESSION_SECRET` to Vercel environment variables
- Redeploy the project
- For local dev, add to `.env.local`

### OAuth Redirect Issues

**Error: "Invalid redirect_uri"**
- Update `public/client-metadata.json` with production URL
- Or implement dynamic client-metadata route
- Redeploy after changes

### Migration Issues

**Error: "Cannot run migrations in production"**
- Use `vercel env pull` to get production database URL
- Run migrations locally: `npm run db:push`
- Or use the admin migration route approach

## Quick Command Reference

```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Pull environment variables
vercel env pull .env.local

# Add environment variable
vercel env add VARIABLE_NAME production

# Run migrations (local with production DB)
npm run db:push

# Deploy to production
vercel --prod

# View logs
vercel logs --follow

# Open Vercel dashboard
vercel dashboard

# Open Drizzle Studio
npm run db:studio
```

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Rotate session secrets** - Generate new secrets periodically
3. **Use different secrets** - Different values for production/development
4. **Limit database access** - Use Vercel's built-in security
5. **Review logs regularly** - Check for unauthorized access attempts

## Next Steps After Setup

1. ✅ Database created and connected
2. ✅ Migrations run successfully
3. ✅ Environment variables configured
4. ✅ Application deployed and accessible
5. → Test authentication flow
6. → Begin Phase 3: Community Features

---

**Need Help?**
- Vercel Documentation: https://vercel.com/docs
- Neon Documentation: https://neon.tech/docs
- Drizzle Documentation: https://orm.drizzle.team/docs

**Project Repository**: https://github.com/elementalcollision/mlcommons-atproto-community
