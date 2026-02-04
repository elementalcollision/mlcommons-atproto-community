# Vercel Environment Variables Setup

## Required Environment Variables

To make the production deployment fully functional, you need to configure these environment variables in Vercel:

### 1. Get Your Neon Database Connection String

From your Neon dashboard (https://console.neon.tech/):

1. Navigate to your project: **silent-brook-33837414**
2. Go to **Connection Details**
3. Select **Connection string**
4. Copy the full connection string that looks like:
   ```
   postgresql://[user]:[password]@[endpoint].neon.tech/[database]?sslmode=require
   ```

### 2. Configure Vercel Environment Variables

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

Add these variables:

#### Database Connection
```
Name: POSTGRES_URL
Value: postgresql://[user]:[password]@[endpoint].neon.tech/[database]?sslmode=require
Environment: Production, Preview, Development
```

#### Session Secret
```
Name: SESSION_SECRET
Value: [Generate with: openssl rand -base64 32]
Environment: Production, Preview, Development
```

#### ATProto Configuration
```
Name: PUBLIC_URL
Value: https://mlcommons-atproto-community.vercel.app
Environment: Production

Value: https://mlcommons-atproto-community-git-[branch].vercel.app
Environment: Preview

Value: http://localhost:3000
Environment: Development
```

```
Name: ATPROTO_CLIENT_ID
Value: https://mlcommons-atproto-community.vercel.app/client-metadata.json
Environment: Production

Value: https://mlcommons-atproto-community-git-[branch].vercel.app/client-metadata.json
Environment: Preview

Value: http://localhost:3000/client-metadata.json
Environment: Development
```

```
Name: ATPROTO_SERVICE
Value: https://bsky.social
Environment: Production, Preview, Development
```

### 3. Generate Session Secret

Run this command locally to generate a secure session secret:

```bash
openssl rand -base64 32
```

Copy the output and use it as the `SESSION_SECRET` value in Vercel.

### 4. Redeploy

After adding all environment variables:

1. Go to Vercel Dashboard → Deployments
2. Click on the latest deployment
3. Click the "Redeploy" button
4. OR simply push a new commit to trigger a deployment

## Verification Steps

After redeploying with environment variables:

1. Visit https://mlcommons-atproto-community.vercel.app
2. Click "Communities" in navigation
3. Should see empty state message (no communities yet)
4. Click "Create Community" to test community creation
5. Login with ATProto handle (e.g., yourhandle.bsky.social)
6. Complete OAuth flow
7. Fill out community form and submit
8. Should redirect to new community page

## Troubleshooting

### If /communities still shows error:
- Check Vercel logs: `npx vercel logs [deployment-url]`
- Verify POSTGRES_URL is set correctly
- Ensure database is accessible from Vercel (check Neon IP allowlist if applicable)
- Check that Neon database is not in sleep mode

### If OAuth fails:
- Verify PUBLIC_URL matches your actual domain
- Check ATPROTO_CLIENT_ID points to accessible client-metadata.json
- Ensure client-metadata.json has correct redirect_uris

### Database Connection Test:
You can test the connection string locally:
```bash
# Set environment variable
export POSTGRES_URL="your-connection-string-here"

# Run local dev server
npm run dev

# Test communities page
curl http://localhost:3000/communities
```

## Current Status

- ✅ All code deployed
- ✅ Build successful
- ⚠️ Environment variables needed
- ⏳ Waiting for database configuration

## Quick Start Checklist

- [ ] Get Neon connection string
- [ ] Generate session secret
- [ ] Add POSTGRES_URL to Vercel
- [ ] Add SESSION_SECRET to Vercel
- [ ] Verify PUBLIC_URL in Vercel
- [ ] Verify ATPROTO_CLIENT_ID in Vercel
- [ ] Add ATPROTO_SERVICE to Vercel
- [ ] Redeploy application
- [ ] Test /communities page
- [ ] Test community creation
- [ ] Test OAuth login

Once all environment variables are configured, the application will be fully functional!
