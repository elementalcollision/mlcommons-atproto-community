import type { Community, NewCommunity, Subscription } from "../../db/schema";
import type { BlobRef } from "@atproto/api";

// Base types from database schema (re-export for convenience)
export type { Community, NewCommunity };

// Extended types with computed fields
export interface CommunityWithStats extends Community {
  memberCount: number;
  postCount: number;
  isSubscribed?: boolean;
}

// Input types for service layer
export interface CreateCommunityInput {
  name: string;
  displayName: string;
  description?: string;
  avatar?: File;
  banner?: File;
  visibility: "public" | "unlisted" | "private";
  postPermissions: "anyone" | "approved" | "moderators";
}

export interface UpdateCommunityInput {
  displayName?: string;
  description?: string;
  avatar?: File;
  banner?: File;
  visibility?: "public" | "unlisted" | "private";
  postPermissions?: "anyone" | "approved" | "moderators";
}

// ATProto record types
export interface CommunityRecord {
  $type: "mlcommons.community.definition";
  name: string;
  displayName: string;
  description?: string;
  avatar?: BlobRef;
  banner?: BlobRef;
  visibility: string;
  postPermissions: string;
  createdAt: string;
}

// List/search options
export interface ListCommunitiesOptions {
  limit?: number;
  offset?: number;
  sortBy?: "members" | "posts" | "created" | "name";
  search?: string;
}
