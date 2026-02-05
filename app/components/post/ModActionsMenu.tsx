import { useFetcher } from "@remix-run/react";
import { useState, useRef, useEffect } from "react";

interface ModActionsMenuProps {
  postUri: string;
  authorDid: string;
  communityId: string;
  isPinned: boolean;
  isLocked: boolean;
  isRemoved: boolean;
  onActionComplete?: () => void;
}

export function ModActionsMenu({
  postUri,
  authorDid,
  communityId,
  isPinned,
  isLocked,
  isRemoved,
  onActionComplete,
}: ModActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fetcher = useFetcher();

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu on action complete
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setIsOpen(false);
      setShowBanModal(false);
      onActionComplete?.();
    }
  }, [fetcher.state, fetcher.data, onActionComplete]);

  const handleAction = (
    action: string,
    additionalData?: Record<string, string>
  ) => {
    fetcher.submit(
      {
        intent: action,
        postUri,
        ...additionalData,
      },
      { method: "post", action: "/api/mod" }
    );
  };

  const handleBanUser = (reason: string, expiresInDays?: number) => {
    fetcher.submit(
      {
        intent: "ban",
        communityId,
        userDid: authorDid,
        reason,
        ...(expiresInDays ? { expiresInDays: expiresInDays.toString() } : {}),
      },
      { method: "post", action: "/api/mod" }
    );
  };

  const isLoading = fetcher.state !== "idle";

  return (
    <div className="relative" ref={menuRef}>
      {/* Mod Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="p-1.5 text-gray hover:text-secondary-blue hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-smooth"
        title="Moderation actions"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-fade-in">
          <div className="py-2">
            <div className="px-3 py-1.5 text-xs font-semibold text-gray dark:text-gray-400 uppercase tracking-wider">
              Post Actions
            </div>

            {/* Pin/Unpin */}
            <button
              onClick={() => handleAction(isPinned ? "unpin" : "pin")}
              disabled={isLoading}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
            >
              <svg
                className="w-4 h-4"
                fill={isPinned ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {isPinned ? "Unpin post" : "Pin post"}
            </button>

            {/* Lock/Unlock */}
            <button
              onClick={() => handleAction(isLocked ? "unlock" : "lock")}
              disabled={isLoading}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isLocked ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                )}
              </svg>
              {isLocked ? "Unlock comments" : "Lock comments"}
            </button>

            {/* Remove/Restore */}
            <button
              onClick={() => handleAction(isRemoved ? "restore" : "remove")}
              disabled={isLoading}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 ${
                !isRemoved ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isRemoved ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                )}
              </svg>
              {isRemoved ? "Restore post" : "Remove post"}
            </button>

            <hr className="my-2 border-gray-200 dark:border-gray-700" />

            <div className="px-3 py-1.5 text-xs font-semibold text-gray dark:text-gray-400 uppercase tracking-wider">
              User Actions
            </div>

            {/* Ban User */}
            <button
              onClick={() => setShowBanModal(true)}
              disabled={isLoading}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
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
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              Ban user from community
            </button>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <BanUserModal
          onClose={() => setShowBanModal(false)}
          onBan={handleBanUser}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

function BanUserModal({
  onClose,
  onBan,
  isLoading,
}: {
  onClose: () => void;
  onBan: (reason: string, expiresInDays?: number) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState("");
  const [banType, setBanType] = useState<"permanent" | "temporary">("permanent");
  const [duration, setDuration] = useState(7);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4 dark:text-white">Ban User</h3>

        <div className="space-y-4">
          {/* Ban Type */}
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">
              Ban Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="banType"
                  checked={banType === "permanent"}
                  onChange={() => setBanType("permanent")}
                  className="w-4 h-4 text-secondary-blue"
                />
                <span className="dark:text-gray-200">Permanent</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="banType"
                  checked={banType === "temporary"}
                  onChange={() => setBanType("temporary")}
                  className="w-4 h-4 text-secondary-blue"
                />
                <span className="dark:text-gray-200">Temporary</span>
              </label>
            </div>
          </div>

          {/* Duration (if temporary) */}
          {banType === "temporary" && (
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                Duration (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-blue bg-white dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-200">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for banning this user..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-blue resize-none bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-smooth disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onBan(reason, banType === "temporary" ? duration : undefined)
            }
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-smooth disabled:opacity-50"
          >
            {isLoading ? "Banning..." : "Ban User"}
          </button>
        </div>
      </div>
    </div>
  );
}
