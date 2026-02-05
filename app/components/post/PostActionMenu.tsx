import { useState, useRef, useEffect } from 'react';

export interface PostActionMenuProps {
  postUri: string;
  isAuthor: boolean;
  isModerator?: boolean;
  isPinned?: boolean;
  isLocked?: boolean;
  isRemoved?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onLock?: () => void;
  onUnlock?: () => void;
  onRemove?: () => void;
  onRestore?: () => void;
}

export function PostActionMenu({
  postUri,
  isAuthor,
  isModerator = false,
  isPinned = false,
  isLocked = false,
  isRemoved = false,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  onLock,
  onUnlock,
  onRemove,
  onRestore,
}: PostActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Don't show menu if no actions available
  if (!isAuthor && !isModerator) {
    return null;
  }

  const hasActions =
    (isAuthor && (onEdit || onDelete)) ||
    (isModerator && (onPin || onUnpin || onLock || onUnlock || onRemove || onRestore));

  if (!hasActions) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Three-dot button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray hover:bg-gray-100 rounded-lg transition-smooth"
        aria-label="Post actions"
        aria-expanded={isOpen}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-deep py-1 z-10 border border-gray-200">
          {/* Author actions */}
          {isAuthor && onEdit && (
            <button
              onClick={() => {
                onEdit();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-smooth flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
          )}

          {isAuthor && onDelete && (
            <button
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-smooth flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          )}

          {/* Moderator actions */}
          {isModerator && (
            <>
              <div className="border-t border-gray-200 my-1" />
              <div className="px-4 py-1 text-xs text-gray font-semibold uppercase">
                Moderator
              </div>

              {/* Pin/Unpin */}
              {isPinned && onUnpin ? (
                <button
                  onClick={() => {
                    onUnpin();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-smooth flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Unpin post
                </button>
              ) : onPin ? (
                <button
                  onClick={() => {
                    onPin();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-smooth flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Pin post
                </button>
              ) : null}

              {/* Lock/Unlock */}
              {isLocked && onUnlock ? (
                <button
                  onClick={() => {
                    onUnlock();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-smooth flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unlock comments
                </button>
              ) : onLock ? (
                <button
                  onClick={() => {
                    onLock();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-smooth flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Lock comments
                </button>
              ) : null}

              {/* Remove/Restore */}
              {isRemoved && onRestore ? (
                <button
                  onClick={() => {
                    onRestore();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 transition-smooth flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restore post
                </button>
              ) : onRemove ? (
                <button
                  onClick={() => {
                    onRemove();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-smooth flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Remove post
                </button>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
