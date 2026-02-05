/**
 * Skeleton Loading Components
 * Placeholder content for loading states
 */

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton element with shimmer animation
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton for a post card
 */
export function PostCardSkeleton() {
  return (
    <div className="card" aria-label="Loading post">
      <div className="flex gap-4">
        {/* Vote buttons skeleton */}
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-6 h-4" />
          <Skeleton className="w-8 h-8 rounded" />
        </div>

        {/* Content skeleton */}
        <div className="flex-1 space-y-3">
          {/* Title */}
          <Skeleton className="h-6 w-3/4" />

          {/* Meta info */}
          <div className="flex gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Content preview */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-8 w-20 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for a community card
 */
export function CommunityCardSkeleton() {
  return (
    <div className="card" aria-label="Loading community">
      <div className="flex items-center gap-4">
        {/* Avatar skeleton */}
        <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />

        {/* Info skeleton */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Button skeleton */}
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a comment
 */
export function CommentSkeleton() {
  return (
    <div className="py-4 border-b border-gray-100 dark:border-gray-700" aria-label="Loading comment">
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />

        <div className="flex-1 space-y-2">
          {/* Author and date */}
          <div className="flex gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Comment content */}
          <div className="space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for the sidebar
 */
export function SidebarSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading sidebar">
      {/* Community info card */}
      <div className="card space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex justify-between py-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Rules card */}
      <div className="card space-y-3">
        <Skeleton className="h-5 w-28" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for notifications
 */
export function NotificationSkeleton() {
  return (
    <div className="p-4 border-b border-gray-100 dark:border-gray-700" aria-label="Loading notification">
      <div className="flex gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for user profile header
 */
export function ProfileHeaderSkeleton() {
  return (
    <div className="card" aria-label="Loading profile">
      <div className="flex flex-col md:flex-row items-start gap-6">
        <Skeleton className="w-24 h-24 rounded-full" />

        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        <div className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-12 mx-auto" />
              <Skeleton className="h-3 w-10 mx-auto mt-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * List of post skeletons
 */
export function PostListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * List of community skeletons
 */
export function CommunityListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <CommunityCardSkeleton key={i} />
      ))}
    </div>
  );
}
