import type { AuthProvider, CallbackData, ProviderUser } from './providers/provider.types';

/**
 * Main authenticator class that manages authentication providers
 * Uses Strategy Pattern to support multiple auth methods
 */
class Authenticator {
  private providers: Map<string, AuthProvider> = new Map();

  /**
   * Register an authentication provider
   */
  registerProvider(name: string, provider: AuthProvider): void {
    if (this.providers.has(name)) {
      console.warn(`Provider "${name}" is already registered. Overwriting.`);
    }
    this.providers.set(name, provider);
  }

  /**
   * Get a registered provider by name
   */
  getProvider(name: string): AuthProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Authentication provider "${name}" not found. Available providers: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return provider;
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Initialize authentication flow for a provider
   */
  async initializeFlow(providerName: string, handle?: string) {
    const provider = this.getProvider(providerName);
    return provider.initializeFlow(handle);
  }

  /**
   * Handle authentication callback and return user data
   */
  async authenticate(providerName: string, callbackData: CallbackData): Promise<ProviderUser> {
    const provider = this.getProvider(providerName);
    return provider.handleCallback(callbackData);
  }

  /**
   * Refresh token for a provider (if supported)
   */
  async refreshToken(providerName: string, refreshToken: string) {
    const provider = this.getProvider(providerName);
    if (!provider.refreshToken) {
      throw new Error(`Provider "${providerName}" does not support token refresh`);
    }
    return provider.refreshToken(refreshToken);
  }
}

// Global singleton instance
export const authenticator = new Authenticator();

// Register providers
import { atprotoProvider } from './providers/atproto.server';
authenticator.registerProvider('atproto', atprotoProvider);

// Re-export types for convenience
export type { AuthProvider, ProviderUser, CallbackData } from './providers/provider.types';
