import type { Post, NewPost } from '../../db/schema/posts';
import type { Vote } from '../../db/schema/votes';
import type { BlobRef } from '@atproto/api';

// Re-export base types from schema
export type { Post, NewPost, Vote };

/**
 * Post with aggregated vote information
 */
export interface PostWithVotes extends Post {
  voteCount: number;
  userVote?: 'up' | 'down' | null;
  isUpvoted?: boolean;
  isDownvoted?: boolean;
}

/**
 * Input for creating a new post
 */
export interface CreatePostInput {
  communityId: string;
  title?: string;
  text: string;
  images?: File[];
  externalLink?: {
    url: string;
    title: string;
    description: string;
    thumb?: File;
  };
  tags?: string[];
  replyTo?: {
    root: string;  // URI
    parent: string; // URI
  };
}

/**
 * Input for updating an existing post
 */
export interface UpdatePostInput {
  title?: string;
  text?: string;
}

/**
 * Options for listing posts
 */
export interface ListPostsOptions {
  communityId?: string;
  authorDid?: string;
  replyRoot?: string;  // Get comments for a post
  limit?: number;
  offset?: number;
  sortBy?: 'hot' | 'new' | 'top';
}

/**
 * Embed types for posts
 */
export type PostEmbedType = 'images' | 'external' | 'record';

export interface PostEmbedImages {
  images: BlobRef[];
}

export interface PostEmbedExternal {
  uri: string;
  title: string;
  description: string;
  thumb?: BlobRef;
}

export interface PostEmbedRecord {
  record: string; // AT URI
}

export type PostEmbed = PostEmbedImages | PostEmbedExternal | PostEmbedRecord;

/**
 * ATProto post record structure
 */
export interface PostRecord {
  $type: 'mlcommons.community.post';
  text: string;
  title?: string;
  communityRef: string; // AT URI of community
  embed?: PostEmbed;
  tags?: string[];
  reply?: {
    root: string;
    parent: string;
  };
  createdAt: string;
}

/**
 * ATProto vote record structure
 */
export interface VoteRecord {
  $type: 'mlcommons.community.vote';
  subject: {
    uri: string;
    cid: string;
  };
  direction: 'up' | 'down';
  createdAt: string;
}
