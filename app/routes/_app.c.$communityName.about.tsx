import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useRouteLoaderData } from "@remix-run/react";

export async function loader({ params }: LoaderFunctionArgs) {
  const { communityName } = params;

  // TODO: Fetch moderators list (future feature)
  const moderators: any[] = [];

  return json({ communityName, moderators });
}

export default function CommunityAbout() {
  const { moderators } = useLoaderData<typeof loader>();
  // Get community data from parent layout
  const parentData = useRouteLoaderData("routes/_app.c.$communityName") as any;
  const { community } = parentData;

  // Format creation date
  const createdDate = new Date(community.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Description Card */}
      <div className="card">
        <h2 className="text-xl font-serif font-bold mb-4">About Community</h2>
        {community.description ? (
          <div className="prose prose-sm max-w-none">
            {/* Simple text display - markdown rendering can be added later */}
            <p className="text-gray whitespace-pre-wrap">{community.description}</p>
          </div>
        ) : (
          <p className="text-gray italic">No description provided.</p>
        )}
      </div>

      {/* Community Stats Card */}
      <div className="card">
        <h2 className="text-xl font-serif font-bold mb-4">Community Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-light rounded-lg">
            <div className="text-3xl font-bold text-dark">
              {community.memberCount.toLocaleString()}
            </div>
            <div className="text-sm text-gray mt-1">Members</div>
          </div>
          <div className="text-center p-4 bg-light rounded-lg">
            <div className="text-3xl font-bold text-dark">
              {community.postCount.toLocaleString()}
            </div>
            <div className="text-sm text-gray mt-1">Posts</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray">Created</span>
            <span className="font-semibold text-dark">{createdDate}</span>
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <div className="card">
        <h2 className="text-xl font-serif font-bold mb-4">Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray">Visibility</span>
            <span className="font-semibold text-dark capitalize">
              {community.visibility}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray">Who can post?</span>
            <span className="font-semibold text-dark capitalize">
              {community.postPermissions}
            </span>
          </div>
        </div>
      </div>

      {/* Moderators Card */}
      <div className="card">
        <h2 className="text-xl font-serif font-bold mb-4">Moderators</h2>
        {moderators.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray text-sm">
              Community creator is the default moderator
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {moderators.map((mod) => (
              <div
                key={mod.userDid}
                className="flex items-center gap-3 p-3 hover:bg-light rounded-lg transition-smooth"
              >
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-dark">
                    {mod.displayName?.charAt(0).toUpperCase() || 'M'}
                  </span>
                </div>
                <div className="flex-grow">
                  <div className="font-semibold text-dark">{mod.displayName}</div>
                  <div className="text-xs text-gray">{mod.role}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ATProto Record Info (for transparency) */}
      {community.atprotoUri && (
        <div className="card bg-blue-50 border-blue-200">
          <h2 className="text-sm font-semibold mb-2 text-dark">
            Decentralized Record
          </h2>
          <p className="text-xs text-gray mb-2">
            This community exists as a verifiable record on the AT Protocol network.
          </p>
          <div className="bg-white rounded p-2 border border-blue-200">
            <code className="text-xs text-dark break-all font-mono">
              {community.atprotoUri}
            </code>
          </div>
        </div>
      )}

      {/* Rules Section (placeholder for future) */}
      <div className="card">
        <h2 className="text-xl font-serif font-bold mb-4">Community Rules</h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-dark text-xs font-bold flex items-center justify-center">
              1
            </span>
            <div>
              <h3 className="font-semibold text-sm text-dark">Be respectful</h3>
              <p className="text-xs text-gray mt-1">
                Treat all community members with respect and courtesy.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-dark text-xs font-bold flex items-center justify-center">
              2
            </span>
            <div>
              <h3 className="font-semibold text-sm text-dark">Stay on topic</h3>
              <p className="text-xs text-gray mt-1">
                Keep posts and comments relevant to the community's purpose.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-dark text-xs font-bold flex items-center justify-center">
              3
            </span>
            <div>
              <h3 className="font-semibold text-sm text-dark">No spam or self-promotion</h3>
              <p className="text-xs text-gray mt-1">
                Excessive self-promotion and spam are not allowed.
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray mt-4 italic">
          Custom community rules can be configured by moderators.
        </p>
      </div>
    </div>
  );
}
