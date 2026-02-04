import { NodeOAuthClient } from "@atproto/oauth-client-node";
import type { NodeSavedState, NodeSavedSession } from "@atproto/oauth-client-node";
import { Agent } from "@atproto/api";
import type {
  AuthProvider,
  AuthorizationUrl,
  CallbackData,
  ProviderUser,
} from "./provider.types";

// In-memory stores for state and sessions
// In production, these should be persistent (database, Redis, etc.)
const stateStore = new Map<string, NodeSavedState>();
const sessionStore = new Map<string, NodeSavedSession>();

/**
 * ATProto OAuth Provider Implementation
 * Full production implementation using @atproto/oauth-client-node
 */
class ATProtoProvider implements AuthProvider {
  name = "atproto";
  private client: NodeOAuthClient | null = null;

  /**
   * Initialize OAuth client (lazy initialization)
   */
  private async getClient(): Promise<NodeOAuthClient> {
    if (this.client) {
      return this.client;
    }

    const publicUrl = process.env.PUBLIC_URL || "http://localhost:3000";

    // For simplicity, fetch client metadata from the client_id URL
    // This way we use the static client-metadata.json file
    // In development, publicUrl is http://localhost:3000
    // In production, it will be https://...
    this.client = await NodeOAuthClient.fromClientId({
      clientId: `${publicUrl}/client-metadata.json` as `https://${string}/${string}`,

      // State store: tracks OAuth state during authorization flow
      stateStore: {
        async set(key: string, internalState: NodeSavedState): Promise<void> {
          stateStore.set(key, internalState);
        },
        async get(key: string): Promise<NodeSavedState | undefined> {
          return stateStore.get(key);
        },
        async del(key: string): Promise<void> {
          stateStore.delete(key);
        },
      },

      // Session store: stores user sessions with tokens
      sessionStore: {
        async set(sub: string, session: NodeSavedSession): Promise<void> {
          sessionStore.set(sub, session);
        },
        async get(sub: string): Promise<NodeSavedSession | undefined> {
          return sessionStore.get(sub);
        },
        async del(sub: string): Promise<void> {
          sessionStore.delete(sub);
        },
      },
    });

    return this.client;
  }

  /**
   * Initialize OAuth flow with user's ATProto handle
   */
  async initializeFlow(handle?: string): Promise<AuthorizationUrl> {
    if (!handle) {
      throw new Error("ATProto handle is required");
    }

    // Normalize handle (remove @ prefix if present)
    const normalizedHandle = handle.startsWith("@") ? handle.slice(1) : handle;

    try {
      const client = await this.getClient();

      // Generate random state for CSRF protection
      const state = crypto.randomUUID();

      // Resolve handle and get authorization URL
      // The OAuth client will discover the user's PDS and create the appropriate auth URL
      const authUrl = await client.authorize(normalizedHandle, {
        state,
        scope: "atproto transition:generic",
      });

      return {
        url: authUrl.toString(),
        state,
      };
    } catch (error) {
      console.error("Failed to initialize ATProto OAuth flow:", error);
      throw new Error(
        `Failed to start authentication for handle ${normalizedHandle}. Please ensure the handle is valid.`
      );
    }
  }

  /**
   * Handle OAuth callback and extract user information
   */
  async handleCallback(callbackData: CallbackData): Promise<ProviderUser> {
    const { code, state, iss } = callbackData;

    if (!code || !state) {
      throw new Error("Authorization code and state are required");
    }

    try {
      const client = await this.getClient();

      // Build URLSearchParams from callback data
      const params = new URLSearchParams();
      params.set("code", String(code));
      params.set("state", String(state));
      if (iss) {
        params.set("iss", String(iss));
      }

      // Exchange authorization code for tokens
      const { session } = await client.callback(params);

      // Get user's DID
      const did = session.did;

      // Create authenticated agent to fetch profile
      const agent = new Agent(session);
      const profile = await agent.getProfile({ actor: did });

      return {
        providerId: did,
        email: undefined, // ATProto doesn't provide email in profile
        displayName: profile.data.displayName || profile.data.handle,
        avatar: profile.data.avatar,
        handle: profile.data.handle,
        providerMetadata: {
          did,
          handle: profile.data.handle,
          followersCount: profile.data.followersCount,
          followsCount: profile.data.followsCount,
          postsCount: profile.data.postsCount,
        },
      };
    } catch (error) {
      console.error("Failed to handle ATProto OAuth callback:", error);
      throw new Error(
        "Failed to complete authentication. Please try again."
      );
    }
  }

  /**
   * Get authenticated agent for a user (used by other services)
   */
  async getAgent(did: string): Promise<Agent | null> {
    try {
      const client = await this.getClient();
      const session = await client.restore(did);
      if (!session) return null;
      return new Agent(session);
    } catch (error) {
      console.error(`Failed to restore session for DID ${did}:`, error);
      return null;
    }
  }

  // ATProto OAuth client handles token refresh internally
  refreshToken = undefined;
}

// Export singleton instance
export const atprotoProvider = new ATProtoProvider();
