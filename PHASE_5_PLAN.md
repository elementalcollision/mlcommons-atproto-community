# Phase 5: Polish & Production Readiness

**Goal:** Stabilize and polish the existing features before adding the Firehose Indexer (Phase 6)

**Timeline:** Incremental implementation, no rush
**Approach:** Complete each step fully before moving to the next

---

## Current Status (Post Phase 4.2)

### Already Implemented ✅
- [x] User profiles with karma display (`/u/{userId}`)
- [x] Edit/delete posts (as author) - API + UI
- [x] PostHeader component for consistent author display
- [x] ConfirmDialog component for confirmations
- [x] Moderator role database helpers
- [x] Post creation with images, links, tags
- [x] Voting system with optimistic UI
- [x] Comment system (basic)
- [x] Hot/New/Top sorting

### Remaining Work

---

## Step 1: Nested Comment Replies
**Status:** Not started
**Complexity:** Medium

### Tasks
1. Add reply form state to CommentCard component
2. Show inline reply textarea when "Reply" clicked
3. Submit replies with correct `replyParent` (comment URI, not post URI)
4. Collapse/expand reply form
5. Update comment count on parent post

### Files to Modify
- `app/routes/_app.c.$communityName.p.$postUri.tsx` - CommentCard component

### Acceptance Criteria
- [ ] Click "Reply" on comment shows inline form
- [ ] Submitting reply creates comment with correct parent
- [ ] Reply appears nested under parent comment
- [ ] Cancel closes the reply form

---

## Step 2: Post Search Functionality
**Status:** Not started
**Complexity:** Medium

### Tasks
1. Add search input to community page header
2. Create search API endpoint
3. Implement full-text search in posts table
4. Show search results with highlighting
5. Add search to global navigation (optional)

### Files to Create
- `app/routes/api.search.tsx` - Search API endpoint
- `app/routes/_app.search.tsx` - Search results page (optional)

### Files to Modify
- `app/routes/_app.c.$communityName._index.tsx` - Add search UI
- `app/lib/db/posts.server.ts` - Add search query function

### Acceptance Criteria
- [ ] Search input visible on community page
- [ ] Searching filters posts by title and text
- [ ] Results show matching posts
- [ ] Empty search shows all posts

---

## Step 3: Tag Filtering
**Status:** Not started
**Complexity:** Low

### Tasks
1. Display clickable tags on posts
2. Add tag filter to URL params
3. Filter posts by selected tag
4. Show active tag filter indicator
5. Clear filter button

### Files to Modify
- `app/routes/_app.c.$communityName._index.tsx` - Tag filter UI and logic

### Acceptance Criteria
- [ ] Clicking a tag filters to posts with that tag
- [ ] Active filter shown in UI
- [ ] Can clear filter to show all posts
- [ ] URL reflects current tag filter

---

## Step 4: Moderator Tools UI
**Status:** API exists, no UI
**Complexity:** Medium

### Tasks
1. Add moderator actions to PostActionMenu (pin, lock, remove)
2. Show pinned posts at top of feed
3. Show "locked" indicator on locked posts
4. Show "removed" posts only to moderators
5. Add moderator badge to authors in mod-controlled communities

### Files to Modify
- `app/components/post/PostActionMenu.tsx` - Add mod action handlers
- `app/routes/_app.c.$communityName._index.tsx` - Pin/lock/remove display
- `app/routes/_app.c.$communityName.p.$postUri.tsx` - Status indicators

### Acceptance Criteria
- [ ] Moderators see pin/lock/remove options
- [ ] Pinned posts appear at top with indicator
- [ ] Locked posts show lock icon, disable commenting
- [ ] Removed posts hidden from regular users

---

## Step 5: Background Hot Score Recalculation
**Status:** Not started
**Complexity:** Medium

### Tasks
1. Create API endpoint for batch recalculation
2. Add Vercel Cron job configuration
3. Recalculate scores for posts < 7 days old
4. Log recalculation stats

### Files to Create
- `app/routes/api.cron.recalculate-hot.tsx` - Cron endpoint
- `vercel.json` - Add cron configuration

### Acceptance Criteria
- [ ] Cron job runs every 15 minutes
- [ ] Posts < 7 days old get updated scores
- [ ] Hot feed reflects time decay properly

---

## Step 6: Comment Pagination
**Status:** Not started (loads 100 max)
**Complexity:** Low

### Tasks
1. Add "Load more comments" button
2. Paginate comments (20 per page)
3. Show comment count vs loaded count

### Files to Modify
- `app/routes/_app.c.$communityName.p.$postUri.tsx` - Pagination UI
- `app/lib/db/posts.server.ts` - Pagination query (already supports it)

### Acceptance Criteria
- [ ] Initial load shows first 20 comments
- [ ] "Load more" button fetches next page
- [ ] Shows "X of Y comments" indicator

---

## Step 7: Error Boundaries & Loading States
**Status:** Partial
**Complexity:** Low-Medium

### Tasks
1. Create ErrorBoundary component
2. Add error boundaries to all routes
3. Create Loading/Skeleton components
4. Add loading states to all data-fetching pages
5. Handle 404s gracefully

### Files to Create
- `app/components/ui/ErrorBoundary.tsx`
- `app/components/ui/Loading.tsx`
- `app/components/ui/Skeleton.tsx`

### Files to Modify
- All route files - Add error boundaries

### Acceptance Criteria
- [ ] Errors show user-friendly message
- [ ] Loading states prevent layout shift
- [ ] 404s show helpful navigation

---

## Step 8: Global Feed ("All" Posts)
**Status:** Not started
**Complexity:** Medium

### Tasks
1. Create "All" feed showing posts from all communities
2. Create "Subscribed" feed showing posts from joined communities
3. Add feed switcher to home page
4. Implement proper sorting across communities

### Files to Create
- `app/routes/_app.feed._index.tsx` - All/Subscribed feeds

### Files to Modify
- `app/routes/_app._index.tsx` - Link to feeds
- `app/lib/db/posts.server.ts` - Cross-community queries

### Acceptance Criteria
- [ ] /feed shows all posts from all communities
- [ ] /feed?filter=subscribed shows only joined communities
- [ ] Sorting works correctly across communities

---

## Implementation Order (Recommended)

1. **Step 1: Nested Comment Replies** - High user value, completes comment UX
2. **Step 4: Moderator Tools UI** - API exists, quick win
3. **Step 3: Tag Filtering** - Low complexity, improves discovery
4. **Step 2: Post Search** - Medium complexity, high value
5. **Step 6: Comment Pagination** - Quick performance win
6. **Step 7: Error Boundaries** - Production stability
7. **Step 5: Background Jobs** - Automation
8. **Step 8: Global Feed** - Discovery (leads into Phase 6 Firehose)

---

## Future Phases

### Phase 6: Firehose Indexer
- Railway-hosted service
- WebSocket connection to ATProto relay
- Real-time event processing
- Cross-network content discovery

### Phase 7: Content Discovery & Feeds
- Trending algorithm
- Recommended communities
- "Best of" time filters
- Personalized feed

---

## Notes

- Each step should be fully completed and tested before moving to the next
- Commit after each step for easy rollback
- TypeScript errors must pass before deployment
- Test in local development before pushing to Vercel
