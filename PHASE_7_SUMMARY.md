# Phase 7: Content Discovery & Feeds - Summary

## Overview

Phase 7 adds comprehensive content discovery features to the MLCommons Community Platform, enabling users to find trending posts, discover new communities, and explore content across the platform.

## What Was Built

### 1. Trending Posts Algorithm

**Location:** `app/lib/db/posts.server.ts`

- **Trending Sort**: `(votes + comments*2) / age^1.5`
  - Weighs engagement velocity over raw popularity
  - Comments count double (indicates discussion)
  - Age decay prevents stale content from dominating

- **Rising Posts**: Posts < 12 hours old with momentum
  - Minimum engagement threshold (2+ votes)
  - Sorted by votes per hour (velocity)

### 2. Time-Based Filters

**Supported Filters:**
- Hour
- Today (24 hours)
- Week (7 days)
- Month (30 days)
- Year (365 days)
- All Time

**Applied To:**
- Home feed (with Top sort)
- Discover page (Top tab)
- Community feeds

### 3. Discover Page

**Location:** `app/routes/_app.discover.tsx`

**Features:**
- **Trending Tab**: Posts gaining traction across all communities
- **Rising Tab**: New posts with early momentum
- **Top Tab**: Highest voted posts with time filters
- **Sidebar Widgets**:
  - Platform statistics (communities, members, posts)
  - Trending communities
  - Recommended communities (personalized)
  - New communities

### 4. Community Recommendations

**Location:** `app/lib/db/communities.server.ts`

- **`getTrendingCommunities()`**: Communities with recent activity
  - Weighted score: `(memberCount * 0.3) + (recentPosts * 2)`

- **`getRecommendedCommunities()`**: Personalized suggestions
  - Excludes already-joined communities
  - Sorted by combined popularity/activity

- **`getNewCommunities()`**: Recently created communities
  - Configurable age threshold (default: 30 days)

- **`getCommunityStats()`**: Platform-wide statistics

### 5. Community Sidebar

**Location:** `app/routes/_app.c.$communityName.tsx`

**Widgets:**
- About Community (description, stats, create post button)
- Community Rules (placeholder)
- Trending Communities
- New Communities

**Layout:**
- Responsive: hidden on mobile, visible on large screens
- Sticky positioning for scroll-follow behavior

### 6. Enhanced Home Feed

**Updates to:** `app/routes/_app.home.tsx`

- Added "Trending" sort option
- Added time filter UI (for Top sort)
- Improved sort selector with 4 options

## Files Modified/Created

### New Files
- `app/routes/_app.discover.tsx` - Discover page

### Modified Files
- `app/lib/db/posts.server.ts` - Trending/rising algorithms, time filters
- `app/lib/db/communities.server.ts` - Community discovery functions
- `app/routes/_app.home.tsx` - Trending sort, time filters
- `app/routes/_app.tsx` - Added Discover nav link
- `app/routes/_app.c.$communityName.tsx` - Community sidebar
- `app/types/post.ts` - TimeFilter type, updated ListPostsOptions

## Algorithm Details

### Trending Score
```typescript
// Posts gaining traction
score = (votes + comments * 2) / Math.pow(ageInHours + 2, 1.5)
```

### Rising Detection
```typescript
// New posts with momentum
velocity = votes / (ageInHours + 0.5)
// Filter: created < 12 hours, votes >= 2
```

### Community Trending
```typescript
// Active communities
score = (memberCount * 0.3) + (postsInLast7Days * 2)
```

## Navigation

New navigation structure:
- **Home** - Personal feed (All / Subscribed)
- **Discover** - Trending content across platform
- **Communities** - Browse all communities
- **Create Community** - Start a new community
- **Profile** - User settings

## Commits

- `f0e5d58` - feat: Add content discovery features (Phase 7)
- `1e1c40f` - feat: Add community sidebar with discovery widgets

## What's Next

Potential future enhancements:
- Personalized feed based on voting history
- Topic-based recommendations
- Saved posts / bookmarks
- Cross-community search
- Notification system for trending posts

---

*Phase 7 completed: February 2025*
