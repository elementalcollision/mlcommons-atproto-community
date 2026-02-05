/**
 * Security Headers Configuration
 *
 * Provides secure HTTP headers for production deployments.
 */

/**
 * Generate Content Security Policy header
 */
function generateCSP(nonce?: string): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      // Allow inline scripts for Remix hydration
      "'unsafe-inline'",
      // For Google Fonts
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Tailwind CSS uses inline styles
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      // ATProto CDN
      'https://cdn.bsky.app',
      'https://av-cdn.bsky.app',
      // Allow any HTTPS for user-provided images
      'https:',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
    ],
    'connect-src': [
      "'self'",
      // ATProto servers
      'https://bsky.social',
      'https://*.bsky.network',
      'https://plc.directory',
    ],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  // Add nonce if provided
  if (nonce) {
    directives['script-src'].push(`'nonce-${nonce}'`);
    directives['style-src'].push(`'nonce-${nonce}'`);
  }

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key;
      }
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Get security headers for responses
 */
export function getSecurityHeaders(options: {
  nonce?: string;
  isDevelopment?: boolean;
} = {}): HeadersInit {
  const { nonce, isDevelopment = process.env.NODE_ENV === 'development' } = options;

  // Base headers that apply to all environments
  const headers: HeadersInit = {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS filter
    'X-XSS-Protection': '1; mode=block',

    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions policy (disable sensitive features)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()', // Opt out of FLoC
    ].join(', '),
  };

  // Add CSP in production
  if (!isDevelopment) {
    headers['Content-Security-Policy'] = generateCSP(nonce);
  }

  // HSTS header (for HTTPS)
  if (!isDevelopment) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
}

/**
 * Apply security headers to a Response
 */
export function withSecurityHeaders(
  response: Response,
  options: { nonce?: string; isDevelopment?: boolean } = {}
): Response {
  const headers = getSecurityHeaders(options);

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

/**
 * Generate a cryptographic nonce for CSP
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}
