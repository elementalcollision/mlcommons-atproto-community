import { Link } from '@remix-run/react';
import { formatDistanceToNow } from 'date-fns';

export interface PostHeaderProps {
  authorDid: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt: Date | string;
  showAvatar?: boolean;
  size?: 'small' | 'medium' | 'large';
  isModerator?: boolean;
  isAdmin?: boolean;
  isCreator?: boolean;
}

export function PostHeader({
  authorDid,
  authorName,
  authorAvatar,
  createdAt,
  showAvatar = false,
  size = 'medium',
  isModerator = false,
  isAdmin = false,
  isCreator = false,
}: PostHeaderProps) {
  // Format timestamp
  const timeAgo = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
  });

  // Determine display name
  const displayName = authorName || (authorDid.startsWith('did:')
    ? authorDid.slice(0, 20) + '...'
    : authorDid);

  // Size variants
  const textSize = size === 'small' ? 'text-xs' : size === 'large' ? 'text-base' : 'text-sm';
  const avatarSize = size === 'small' ? 'w-6 h-6' : size === 'large' ? 'w-10 h-10' : 'w-8 h-8';
  const badgeSize = size === 'small' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <div className={`flex items-center gap-2 ${textSize} text-gray`}>
      {/* Avatar */}
      {showAvatar && (
        <Link to={`/u/${authorDid}`}>
          {authorAvatar ? (
            <img
              src={authorAvatar}
              alt={displayName}
              className={`${avatarSize} rounded-full hover:ring-2 hover:ring-primary transition-smooth`}
            />
          ) : (
            <div className={`${avatarSize} rounded-full bg-primary flex items-center justify-center hover:ring-2 hover:ring-primary-dark transition-smooth`}>
              <span className="text-dark font-semibold text-xs">
                {displayName[0].toUpperCase()}
              </span>
            </div>
          )}
        </Link>
      )}

      {/* Author Name */}
      <Link
        to={`/u/${authorDid}`}
        className="font-semibold hover:text-secondary-blue transition-smooth"
        title={authorDid}
      >
        {displayName}
      </Link>

      {/* Badges */}
      {isCreator && (
        <span className={`${badgeSize} bg-yellow-100 text-yellow-800 rounded font-semibold uppercase`}>
          Creator
        </span>
      )}
      {isAdmin && (
        <span className={`${badgeSize} bg-blue-100 text-blue-800 rounded font-semibold uppercase`}>
          Admin
        </span>
      )}
      {isModerator && !isAdmin && (
        <span className={`${badgeSize} bg-green-100 text-green-800 rounded font-semibold uppercase`}>
          Mod
        </span>
      )}

      {/* Timestamp */}
      <span>•</span>
      <span>{timeAgo}</span>
    </div>
  );
}
