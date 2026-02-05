# Railway Deployment Guide - MLCommons Firehose Indexer

This guide provides step-by-step instructions for deploying the MLCommons Firehose Indexer to Railway.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Railway Account Setup](#railway-account-setup)
3. [Project Configuration](#project-configuration)
4. [Environment Variables](#environment-variables)
5. [Deployment Methods](#deployment-methods)
6. [Monitoring & Logs](#monitoring--logs)
7. [Troubleshooting](#troubleshooting)
8. [Cost Estimation](#cost-estimation)
9. [Production Checklist](#production-checklist)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] A Railway account (free tier available)
- [ ] GitHub repository with the indexer code pushed
- [ ] Neon PostgreSQL DATABASE_URL from the main application
- [ ] (Optional) Railway CLI installed for local management

### Getting Your DATABASE_URL

The indexer shares the same database as the main Vercel application. You can find this in:

1. **Vercel Dashboard**: Project → Settings → Environment Variables → `DATABASE_URL`
2. **Neon Dashboard**: Project → Connection Details → Connection String

The URL format should be:
```
postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## Railway Account Setup

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with GitHub (recommended for easy repo access)
4. Verify your email if prompted

### Step 2: Install Railway CLI (Optional but Recommended)

```bash
# macOS
brew install railway

# npm (cross-platform)
npm install -g @railway/cli

# Verify installation
railway --version
```

### Step 3: Login to CLI

```bash
railway login
```

This opens a browser window for authentication.

---

## Project Configuration

### Option A: Deploy from GitHub (Recommended)

#### Step 1: Create New Project

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub if not already done
5. Search for and select: `elementalcollision/mlcommons-atproto-community`

#### Step 2: Configure Root Directory

Since the indexer is in a subdirectory:

1. After selecting the repo, click on the service
2. Go to **Settings** tab
3. Under **Source**, find **Root Directory**
4. Set to: `indexer`
5. Click **Save**

#### Step 3: Configure Build Settings

Railway should auto-detect the Dockerfile, but verify:

1. In **Settings** → **Build**
2. Ensure **Builder** is set to: `Dockerfile`
3. **Dockerfile Path** should be: `Dockerfile` (relative to root directory)

### Option B: Deploy via CLI

```bash
# Navigate to the indexer directory
cd /path/to/MLC_AT_Proto/indexer

# Login to Railway
railway login

# Create a new project
railway init

# Link to existing project (if already created in dashboard)
# railway link

# Deploy
railway up
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CURSOR_FILE` | Path to cursor persistence file | `.cursor` |
| `NODE_ENV` | Node environment | `production` |

### Setting Variables in Railway Dashboard

1. Select your service in the Railway dashboard
2. Go to **Variables** tab
3. Click **"+ New Variable"**
4. Add each variable:

```
DATABASE_URL = postgresql://neondb_owner:xxxxx@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

5. Click **"Add"** for each variable
6. Railway will automatically redeploy with new variables

### Setting Variables via CLI

```bash
# Set individual variable
railway variables set DATABASE_URL="postgresql://..."

# Or set from .env file
railway variables set < .env.local
```

---

## Deployment Methods

### Method 1: Automatic Deployments (Recommended)

With GitHub integration, Railway automatically deploys when:

- You push to the `main` branch
- Changes are detected in the `indexer/` directory

To configure:

1. Go to service **Settings** → **Source**
2. Enable **"Automatic Deployments"**
3. Set **Branch** to: `main`
4. Optionally set **Watch Paths** to: `indexer/**`

### Method 2: Manual Deployments

#### Via Dashboard

1. Go to your service
2. Click **"Deploy"** button
3. Select the commit to deploy

#### Via CLI

```bash
cd /path/to/MLC_AT_Proto/indexer
railway up
```

### Method 3: Deploy Specific Commit

```bash
railway up --commit <commit-sha>
```

---

## Monitoring & Logs

### Viewing Logs

#### Dashboard

1. Select your service
2. Click **"Logs"** tab (or **"View Logs"** button)
3. Logs stream in real-time

#### CLI

```bash
# Stream logs
railway logs

# Follow logs (like tail -f)
railway logs --follow
```

### Expected Log Output

On successful startup:
```
===========================================
   MLCommons Firehose Indexer
===========================================

[Indexer] Database connection configured
[Indexer] Starting firehose connection...
[Firehose] Connecting to: wss://jetstream1.us-east.bsky.network/subscribe?wantedCollections=mlcommons.community.community&wantedCollections=mlcommons.community.post&wantedCollections=mlcommons.community.vote
[Firehose] Connected to Jetstream
[Indexer] Indexer is running. Press Ctrl+C to stop.
```

Periodic stats (every 60 seconds):
```
[Stats] Events: 0 | Errors: 0 | Rate: 0.00/s | Uptime: 60s
```

When processing events:
```
[Firehose] CREATE mlcommons.community.post from did:plc:xxx
[Handler] Created post: at://did:plc:xxx/mlcommons.community.post/3abc...
```

### Health Checks

Railway automatically monitors your service. You can also:

1. Check **Metrics** tab for CPU/Memory usage
2. View **Deployments** tab for deployment history
3. Check service **Status** indicator (green = healthy)

### Setting Up Alerts (Optional)

1. Go to **Settings** → **Notifications**
2. Connect Slack, Discord, or email
3. Configure alerts for:
   - Deployment failures
   - Service crashes
   - High resource usage

---

## Troubleshooting

### Common Issues

#### 1. "DATABASE_URL environment variable is required"

**Cause**: Environment variable not set or not available at runtime.

**Solution**:
```bash
# Verify variable is set
railway variables

# Re-set the variable
railway variables set DATABASE_URL="postgresql://..."
```

#### 2. "Connection refused" or Database Errors

**Cause**: Network connectivity or incorrect connection string.

**Solutions**:
- Verify DATABASE_URL is correct (copy directly from Neon)
- Ensure Neon project is active (not paused)
- Check if IP allowlist is restricting access (Neon → Project → Settings → IP Allow)

#### 3. WebSocket Connection Failures

**Cause**: Network issues or Jetstream relay problems.

**Solutions**:
- The indexer auto-reconnects with exponential backoff
- Check [status.bsky.app](https://status.bsky.app) for Bluesky outages
- Review logs for specific error messages

#### 4. High Memory Usage

**Cause**: Event backlog or memory leaks.

**Solutions**:
- Check for error loops in logs
- Restart the service: Railway dashboard → **"Restart"**
- Consider upgrading Railway plan for more resources

#### 5. Missing Events After Restart

**Cause**: Cursor not persisted properly.

**Solution**: The indexer uses `.cursor` file for persistence. On Railway:
- Cursor may reset on redeploy (expected behavior)
- For critical deployments, consider external cursor storage (Redis/DB)

### Viewing Build Logs

If deployment fails:

1. Go to **Deployments** tab
2. Click on failed deployment
3. View **Build Logs** for errors

### Restarting the Service

#### Dashboard
1. Select service
2. Click **⋮** menu → **"Restart"**

#### CLI
```bash
railway service restart
```

---

## Cost Estimation

### Railway Pricing (as of 2024)

| Plan | Monthly Cost | Resources |
|------|--------------|-----------|
| **Hobby** | $5/month | 512MB RAM, shared CPU |
| **Pro** | $20/month | 8GB RAM, 8 vCPU |
| **Enterprise** | Custom | Custom resources |

### Estimated Usage for Indexer

The Firehose Indexer is lightweight:

- **CPU**: Minimal (mostly I/O waiting)
- **Memory**: ~100-200MB typical
- **Network**: Depends on event volume
- **Storage**: Minimal (cursor file only)

**Recommendation**: Start with **Hobby plan** ($5/month). Upgrade if you see:
- Memory warnings in logs
- Slow event processing
- Frequent restarts

### Cost Optimization Tips

1. Use Railway's **Usage** tab to monitor actual consumption
2. Set up **Spending Limits** in account settings
3. Consider pausing during development/testing

---

## Production Checklist

Before going to production, verify:

### Deployment

- [ ] Service is deployed and running (green status)
- [ ] Logs show successful Jetstream connection
- [ ] No errors in recent logs

### Environment

- [ ] `DATABASE_URL` is set correctly
- [ ] Using production Neon database (not development)
- [ ] `NODE_ENV=production` is set (optional)

### Monitoring

- [ ] Logs are accessible and streaming
- [ ] Notifications configured for failures (optional)
- [ ] Familiar with restart procedures

### Database

- [ ] Verified indexer can write to database
- [ ] Checked a few indexed records in Neon dashboard
- [ ] Main application sees indexed data

### Security

- [ ] DATABASE_URL is not exposed in logs
- [ ] GitHub repo doesn't contain secrets
- [ ] Railway variables marked as secret (automatic)

### Backup Plan

- [ ] Know how to pause/stop the indexer
- [ ] Have DATABASE_URL backed up separately
- [ ] Understand cursor resumption behavior

---

## Quick Reference Commands

```bash
# Login
railway login

# Deploy
railway up

# View logs
railway logs --follow

# Set variable
railway variables set KEY=value

# Restart service
railway service restart

# Open dashboard
railway open

# Check status
railway status
```

---

## Support Resources

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Neon Documentation**: [neon.tech/docs](https://neon.tech/docs)
- **ATProto Jetstream**: [github.com/bluesky-social/jetstream](https://github.com/bluesky-social/jetstream)

---

## Appendix: Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ATProto Network                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  PDS 1  │  │  PDS 2  │  │  PDS 3  │  │  PDS N  │           │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
└───────┼────────────┼────────────┼────────────┼─────────────────┘
        │            │            │            │
        └────────────┴─────┬──────┴────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Bluesky Jetstream    │
              │   (Public Relay)       │
              │   wss://jetstream1...  │
              └───────────┬────────────┘
                          │
                          │ WebSocket (filtered)
                          │ mlcommons.* only
                          ▼
              ┌────────────────────────┐
              │   Railway Service      │
              │   ┌────────────────┐   │
              │   │   Firehose     │   │
              │   │   Indexer      │   │
              │   └───────┬────────┘   │
              └───────────┼────────────┘
                          │
                          │ PostgreSQL
                          ▼
              ┌────────────────────────┐
              │   Neon PostgreSQL      │
              │   (Shared Database)    │
              └───────────┬────────────┘
                          │
                          │ SQL Queries
                          ▼
              ┌────────────────────────┐
              │   Vercel Application   │
              │   (MLCommons Frontend) │
              └────────────────────────┘
```

---

*Last updated: February 2025*
