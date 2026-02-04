import type {
  AuthProvider,
  AuthorizationUrl,
  CallbackData,
  ProviderUser,
} from "./provider.types";

/**
 * ATProto OAuth Provider Implementation
 * Note: This is a simplified implementation for Phase 2
 * Full OAuth client integration will be completed when database is available
 */
class ATProtoProvider implements AuthProvider {
  name = "atproto";

  /**
   * Initialize OAuth flow with user's ATProto handle
   */
  async initializeFlow(handle?: string): Promise<AuthorizationUrl> {
    if (!handle) {
      throw new Error("ATProto handle is required");
    }

    // For Phase 2, we'll create a placeholder OAuth flow
    // This will be fully implemented once database migrations are run
    const publicUrl = process.env.PUBLIC_URL || "http://localhost:3000";
    const state = crypto.randomUUID();

    // TODO: Implement full OAuth client initialization with @atproto/oauth-client-node
    // For now, return a placeholder that explains the setup process
    return {
      url: `${publicUrl}/auth/callback/atproto?code=placeholder&state=${state}`,
      state,
    };
  }

  /**
   * Handle OAuth callback and extract user information
   */
  async handleCallback(callbackData: CallbackData): Promise<ProviderUser> {
    const { code } = callbackData;

    if (!code) {
      throw new Error("Authorization code is required");
    }

    // TODO: Implement full OAuth callback handling with @atproto/oauth-client-node
    // For Phase 2, return mock data to demonstrate the flow
    // This will be replaced with actual ATProto API calls

    return {
      providerId: "did:plc:placeholder", // Mock DID
      email: "user@atproto",
      displayName: "Test User",
      avatar: undefined,
      handle: "test.bsky.social",
      providerMetadata: {
        did: "did:plc:placeholder",
        handle: "test.bsky.social",
        message: "This is a placeholder. Full ATProto OAuth will be implemented after database setup.",
      },
    };
  }

  // ATProto uses short-lived tokens managed by the OAuth client
  refreshToken = undefined;
}

// Export singleton instance
export const atprotoProvider = new ATProtoProvider();
