import { useFetcher } from '@remix-run/react';
import { useEffect, useState } from 'react';

export interface VoteButtonsProps {
  postUri: string;
  voteCount: number;
  userVote?: 'up' | 'down' | null;
  isAuthenticated: boolean;
  size?: 'small' | 'large';
}

export function VoteButtons({
  postUri,
  voteCount,
  userVote,
  isAuthenticated,
  size = 'large',
}: VoteButtonsProps) {
  const fetcher = useFetcher();
  const [optimisticVote, setOptimisticVote] = useState<'up' | 'down' | null>(
    userVote || null
  );
  const [optimisticCount, setOptimisticCount] = useState(voteCount);

  // Sync with server state when fetcher completes
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      // Reset optimistic state after server update
      setOptimisticVote(userVote || null);
      setOptimisticCount(voteCount);
    }
  }, [fetcher.state, fetcher.data, userVote, voteCount]);

  const handleVote = (direction: 'up' | 'down') => {
    if (!isAuthenticated) {
      // TODO: Show login modal or redirect to login
      alert('Please sign in to vote');
      return;
    }

    // Optimistic update
    const previousVote = optimisticVote;
    const previousCount = optimisticCount;

    if (previousVote === direction) {
      // Unvote (clicking same direction)
      setOptimisticVote(null);
      setOptimisticCount(
        previousCount + (direction === 'up' ? -1 : 1)
      );
    } else if (previousVote === null) {
      // New vote
      setOptimisticVote(direction);
      setOptimisticCount(
        previousCount + (direction === 'up' ? 1 : -1)
      );
    } else {
      // Changing vote (2 point swing)
      setOptimisticVote(direction);
      setOptimisticCount(
        previousCount + (direction === 'up' ? 2 : -2)
      );
    }

    // Submit vote
    fetcher.submit(
      {
        intent: 'vote',
        postUri,
        direction,
      },
      {
        method: 'post',
        action: '/api/vote',
      }
    );
  };

  const iconSize = size === 'large' ? 'w-6 h-6' : 'w-5 h-5';
  const countSize = size === 'large' ? 'text-lg' : 'text-sm';
  const minWidth = size === 'large' ? 'min-w-[50px]' : 'min-w-[40px]';
  const padding = size === 'large' ? 'p-1' : 'p-0.5';

  const upvoteColor =
    optimisticVote === 'up'
      ? 'text-primary'
      : 'text-gray hover:text-primary';

  const downvoteColor =
    optimisticVote === 'down'
      ? 'text-red-500'
      : 'text-gray hover:text-red-500';

  return (
    <div className={`flex flex-col items-center gap-1 ${minWidth}`}>
      <button
        onClick={() => handleVote('up')}
        className={`${upvoteColor} transition-smooth ${padding}`}
        title={isAuthenticated ? 'Upvote' : 'Sign in to vote'}
        disabled={fetcher.state !== 'idle'}
      >
        <svg
          className={iconSize}
          fill={optimisticVote === 'up' ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>

      <span className={`font-bold ${countSize}`}>
        {optimisticCount}
      </span>

      <button
        onClick={() => handleVote('down')}
        className={`${downvoteColor} transition-smooth ${padding}`}
        title={isAuthenticated ? 'Downvote' : 'Sign in to vote'}
        disabled={fetcher.state !== 'idle'}
      >
        <svg
          className={iconSize}
          fill={optimisticVote === 'down' ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </div>
  );
}
