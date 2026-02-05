/**
 * Loading Spinner Component
 */
export function LoadingSpinner({
  size = 'medium',
  className = '',
}: {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Full Page Loading Component
 */
export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="large" className="mx-auto text-primary mb-4" />
        <p className="text-gray">{message}</p>
      </div>
    </div>
  );
}

/**
 * Card Loading Skeleton
 */
export function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex gap-4">
        {/* Vote skeleton */}
        <div className="w-10 flex flex-col items-center gap-1">
          <div className="w-8 h-8 bg-gray-200 rounded" />
          <div className="w-6 h-4 bg-gray-200 rounded" />
          <div className="w-8 h-8 bg-gray-200 rounded" />
        </div>
        {/* Content skeleton */}
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
          <div className="flex gap-4 mt-4">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Post List Loading Skeleton
 */
export function PostListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Community Card Skeleton
 */
export function CommunityCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

/**
 * User Profile Skeleton
 */
export function ProfileSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
          <div className="flex gap-4">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="w-16 h-8 bg-gray-200 rounded mb-1" />
            <div className="w-12 h-3 bg-gray-200 rounded mx-auto" />
          </div>
          <div className="text-center">
            <div className="w-16 h-8 bg-gray-200 rounded mb-1" />
            <div className="w-12 h-3 bg-gray-200 rounded mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline Loading Indicator
 */
export function InlineLoading({
  text = 'Loading...',
  className = '',
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-gray ${className}`}>
      <LoadingSpinner size="small" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
