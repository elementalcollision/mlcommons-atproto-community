/**
 * Common interface for authentication providers
 * Supports ATProto OAuth, Google SAML, Microsoft Entra, etc.
 */

export interface AuthProvider {
  /** Provider name (e.g., 'atproto', 'google-saml', 'microsoft-entra') */
  name: string;

  /** Initialize authentication flow and return authorization URL */
  initializeFlow(handle?: string): Promise<AuthorizationUrl>;

  /** Handle OAuth/SAML callback and return user data */
  handleCallback(callbackData: CallbackData): Promise<ProviderUser>;

  /** Optional: Refresh access token if supported */
  refreshToken?(refreshToken: string): Promise<TokenResponse>;
}

export interface AuthorizationUrl {
  url: string;
  state?: string;
}

export interface CallbackData {
  code?: string;
  state?: string;
  samlResponse?: string;
  [key: string]: unknown;
}

export interface ProviderUser {
  /** Provider-specific unique identifier (DID, email, Object ID, etc.) */
  providerId: string;

  /** Email address (if available from provider) */
  email?: string;

  /** Display name */
  displayName?: string;

  /** Avatar URL */
  avatar?: string;

  /** Handle or username (ATProto handles, usernames, etc.) */
  handle?: string;

  /** Provider-specific metadata to store in identities.rawData */
  providerMetadata: Record<string, unknown>;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}
