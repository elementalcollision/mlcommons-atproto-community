import { useFetcher } from "@remix-run/react";

interface BookmarkButtonProps {
  postUri: string;
  isBookmarked: boolean;
  isAuthenticated: boolean;
  size?: "small" | "large";
}

export function BookmarkButton({
  postUri,
  isBookmarked,
  isAuthenticated,
  size = "small",
}: BookmarkButtonProps) {
  const fetcher = useFetcher();

  // Optimistic UI - show expected state while request is in flight
  const optimisticBookmarked = fetcher.formData
    ? !isBookmarked // Toggle state
    : isBookmarked;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      // Could redirect to login, for now just return
      return;
    }

    fetcher.submit(
      { postUri },
      { method: "post", action: "/api/bookmarks" }
    );
  };

  const iconSize = size === "large" ? "w-5 h-5" : "w-4 h-4";

  return (
    <button
      onClick={handleClick}
      disabled={!isAuthenticated || fetcher.state !== "idle"}
      className={`flex items-center gap-1 transition-smooth ${
        optimisticBookmarked
          ? "text-primary hover:text-primary-dark"
          : "text-gray hover:text-dark"
      } ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
      title={optimisticBookmarked ? "Remove from saved" : "Save post"}
    >
      {optimisticBookmarked ? (
        <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ) : (
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      )}
      {size === "large" && (
        <span className="text-sm">
          {optimisticBookmarked ? "Saved" : "Save"}
        </span>
      )}
    </button>
  );
}
