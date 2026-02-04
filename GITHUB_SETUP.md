# GitHub Setup Instructions

## Create Repository on GitHub

1. Go to [GitHub](https://github.com/new)
2. Create a new repository with these settings:
   - **Name**: `mlcommons-atproto-community`
   - **Description**: `Decentralized Reddit-lite community platform built on AT Protocol`
   - **Visibility**: Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)

3. After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/mlcommons-atproto-community.git

# Push to GitHub
git push -u origin main
```

## Or use GitHub CLI (if installed)

```bash
gh repo create mlcommons-atproto-community --public --source=. --description="Decentralized Reddit-lite community platform built on AT Protocol" --push
```

## Verify

After pushing, your repository should be available at:
`https://github.com/YOUR_USERNAME/mlcommons-atproto-community`

## Next Steps

Once pushed to GitHub, you can:
1. Connect to Vercel for automatic deployments
2. Set up Vercel Postgres database
3. Configure environment variables in Vercel dashboard
4. Deploy the application

---

**Current Status**: Phase 1 (Infrastructure) Complete ✅
**Next Phase**: Phase 2 - OAuth Authentication
