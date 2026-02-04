# Quick Start: Deploy to Vercel

Follow these steps to get your application running on Vercel with a database.

## 🚀 Fast Track (5 minutes)

### Step 1: Deploy via Vercel Dashboard (EASIEST)

1. **Visit**: https://vercel.com/new
2. **Import**: `elementalcollision/mlcommons-atproto-community`
3. **Click**: "Deploy" (skip env vars for now)
4. **Wait**: ~2 minutes for first deployment

### Step 2: Add Database

1. **Go to**: Your project in Vercel dashboard
2. **Click**: "Storage" tab
3. **Click**: "Create Database" → "Postgres"
4. **Name**: `mlcommons-atproto-community`
5. **Region**: US East (Ohio) or closest to you
6. **Click**: "Create" then "Connect to project"
7. **Select**: Production, Preview, Development
8. **Done**: Database variables auto-injected ✅

### Step 3: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

**SESSION_SECRET**
```bash
# Generate locally first:
openssl rand -base64 32

# Copy output and paste in Vercel
# Environment: Production, Preview, Development
```

**PUBLIC_URL**
```
# For Production:
https://your-project.vercel.app

# For Development:
http://localhost:3000
```

**ATPROTO Variables** (add all three)
```
ATPROTO_SERVICE=https://bsky.social
ATPROTO_FIREHOSE=wss://bsky.network
ATPROTO_CLIENT_ID=https://your-project.vercel.app/client-metadata.json
```

### Step 4: Run Database Migrations

**Option A: From Your Local Machine (Recommended)**
```bash
# 1. Pull environment variables
cd /Users/dave/Claude_Primary/MLC_AT_Proto
vercel login  # Follow browser prompt
vercel link   # Link to your project
vercel env pull .env.local

# 2. Run migrations
npm run db:push

# 3. Verify
npm run db:studio  # Opens browser to view database
```

**Option B: Use Vercel CLI**
```bash
vercel login
vercel link
vercel env pull .env.local
npm run db:push
```

### Step 5: Redeploy

**Option A: In Vercel Dashboard**
- Go to Deployments → Latest → "..." → Redeploy

**Option B: Push to GitHub**
```bash
git add .
git commit -m "Configure production environment"
git push origin main
# Auto-deploys!
```

### Step 6: Test

Visit: `https://your-project.vercel.app/auth/login`

---

## 📋 Complete Checklist

- [ ] Project deployed to Vercel
- [ ] Neon Postgres database created
- [ ] Database connected to project
- [ ] SESSION_SECRET environment variable added
- [ ] PUBLIC_URL environment variable added
- [ ] ATPROTO_* environment variables added
- [ ] Database migrations run (`npm run db:push`)
- [ ] Application redeployed
- [ ] Login page accessible
- [ ] No errors in Vercel logs

---

## 🆘 Quick Troubleshooting

**"Database connection failed"**
→ Did you run `npm run db:push`?
→ Check that POSTGRES_URL exists in env vars

**"Session secret required"**
→ Add SESSION_SECRET in Vercel dashboard
→ Redeploy the application

**"OAuth redirect error"**
→ Update PUBLIC_URL to match your Vercel URL
→ Update public/client-metadata.json

**"Module not found"**
→ Clear build cache in Vercel
→ Redeploy with "Use existing Build Cache" unchecked

---

## 🎯 What's Next?

After successful deployment:

1. **Test Authentication**: Try logging in with ATProto handle
2. **Check Database**: Use Drizzle Studio (`npm run db:studio`)
3. **Monitor Logs**: Watch Vercel logs for errors
4. **Local Development**: Pull env vars with `vercel env pull`
5. **Begin Phase 3**: Start building community features

---

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Project**: https://github.com/elementalcollision/mlcommons-atproto-community
- **Full Guide**: See `VERCEL_SETUP.md` for detailed instructions
- **Phase 2 Summary**: See `PHASE_2_SUMMARY.md`

---

**Estimated Time**: 5-10 minutes
**Difficulty**: Easy (mostly clicking in dashboards)
**Cost**: Free (Vercel Hobby + Neon Free Tier)
