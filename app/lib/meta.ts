/**
 * SEO Meta Tag Utilities
 * Helpers for generating consistent meta tags across pages
 */

interface MetaOptions {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
}

const SITE_NAME = 'MLCommons Community';
const DEFAULT_DESCRIPTION = 'A decentralized community platform built on AT Protocol. Join communities, share posts, and engage with others.';
const DEFAULT_IMAGE = '/og-image.png';

/**
 * Generate meta tags for a page
 */
export function generateMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
}: MetaOptions) {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;

  const meta: Array<{ title?: string; name?: string; property?: string; content?: string }> = [
    { title: fullTitle },
    { name: 'description', content: description },

    // Open Graph
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:type', content: type },
    { property: 'og:site_name', content: SITE_NAME },
  ];

  // Add image if provided
  if (image) {
    meta.push({ property: 'og:image', content: image });
    meta.push({ name: 'twitter:image', content: image });
  }

  // Add URL if provided
  if (url) {
    meta.push({ property: 'og:url', content: url });
  }

  // Twitter Card
  meta.push(
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: description }
  );

  // No index for private/utility pages
  if (noIndex) {
    meta.push({ name: 'robots', content: 'noindex, nofollow' });
  }

  return meta;
}

/**
 * Generate meta for a community page
 */
export function communityMeta(community: {
  name: string;
  displayName: string;
  description?: string | null;
  memberCount?: number;
  avatar?: string | null;
}) {
  const description = community.description
    ? `${community.description.slice(0, 150)}${community.description.length > 150 ? '...' : ''}`
    : `Join the ${community.displayName} community on MLCommons. ${community.memberCount?.toLocaleString() || 0} members.`;

  return generateMeta({
    title: `c/${community.name}`,
    description,
    type: 'website',
  });
}

/**
 * Generate meta for a post page
 */
export function postMeta(post: {
  title: string;
  text?: string;
  authorName?: string;
  communityName?: string;
}) {
  const description = post.text
    ? `${post.text.slice(0, 150)}${post.text.length > 150 ? '...' : ''}`
    : `Posted in c/${post.communityName || 'community'} by ${post.authorName || 'Anonymous'}`;

  return generateMeta({
    title: post.title,
    description,
    type: 'article',
  });
}

/**
 * Generate meta for a user profile page
 */
export function profileMeta(user: {
  displayName?: string | null;
  email?: string | null;
  bio?: string | null;
  totalKarma?: number;
}) {
  const name = user.displayName || user.email || 'User';
  const description = user.bio
    ? `${user.bio.slice(0, 150)}${user.bio.length > 150 ? '...' : ''}`
    : `${name}'s profile on MLCommons Community. ${user.totalKarma?.toLocaleString() || 0} karma.`;

  return generateMeta({
    title: name,
    description,
    type: 'profile',
  });
}
