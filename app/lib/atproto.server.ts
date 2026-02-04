import { Agent, BlobRef } from "@atproto/api";
import { atprotoProvider } from "./auth/providers/atproto.server";
import { TID } from "@atproto/common";

/**
 * ATProto Agent Factory
 * Creates authenticated agents for making API calls to ATProto network
 */

/**
 * Get an authenticated ATProto agent for a user by their DID
 * Uses the OAuth session stored by the ATProto provider
 */
export async function getAgentForUser(did: string): Promise<Agent | null> {
  return await atprotoProvider.getAgent(did);
}

/**
 * Upload a blob (image) to ATProto network
 * Returns a blob reference that can be included in records
 */
export async function uploadBlob(
  agent: Agent,
  data: Uint8Array,
  mimeType: string
): Promise<BlobRef> {
  const response = await agent.uploadBlob(data, {
    encoding: mimeType,
  });

  return response.data.blob;
}

/**
 * Create a community record on ATProto network
 * Returns the URI and CID of the created record
 */
export async function createCommunityRecord(
  agent: Agent,
  userDid: string,
  record: {
    name: string;
    displayName: string;
    description?: string;
    avatar?: BlobRef;
    banner?: BlobRef;
    visibility: string;
    postPermissions: string;
    rules?: string[];
    tags?: string[];
  }
): Promise<{ uri: string; cid: string; rkey: string }> {
  // Generate a TID (timestamp-based ID) for the record key
  const rkey = TID.nextStr();

  // Create the record with proper $type
  const fullRecord = {
    $type: "mlcommons.community.definition",
    ...record,
    createdAt: new Date().toISOString(),
  };

  // Create the record on ATProto
  const response = await agent.com.atproto.repo.createRecord({
    repo: userDid,
    collection: "mlcommons.community.definition",
    rkey,
    record: fullRecord,
  });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
    rkey,
  };
}

/**
 * Update a community record on ATProto network
 */
export async function updateCommunityRecord(
  agent: Agent,
  userDid: string,
  rkey: string,
  record: {
    name: string;
    displayName: string;
    description?: string;
    avatar?: BlobRef;
    banner?: BlobRef;
    visibility: string;
    postPermissions: string;
    rules?: string[];
    tags?: string[];
    createdAt: string;
  }
): Promise<{ uri: string; cid: string }> {
  const fullRecord = {
    $type: "mlcommons.community.definition",
    ...record,
  };

  const response = await agent.com.atproto.repo.putRecord({
    repo: userDid,
    collection: "mlcommons.community.definition",
    rkey,
    record: fullRecord,
  });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
  };
}

/**
 * Delete a community record from ATProto network
 */
export async function deleteCommunityRecord(
  agent: Agent,
  userDid: string,
  rkey: string
): Promise<void> {
  await agent.com.atproto.repo.deleteRecord({
    repo: userDid,
    collection: "mlcommons.community.definition",
    rkey,
  });
}
