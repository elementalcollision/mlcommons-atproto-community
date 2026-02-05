import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";

import "./styles/tailwind.css";
import { ThemeProvider } from "~/components/ThemeProvider";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Roboto+Mono:wght@400;500&display=swap",
  },
];

// Inline script to prevent FOUC (flash of unstyled content)
const themeInitScript = `
  (function() {
    const theme = localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Meta />
        <Links />
      </head>
      <body className="bg-light dark:bg-dark-darkest font-sans text-dark dark:text-gray-100 antialiased transition-colors">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/**
 * Global Error Boundary
 *
 * Catches unhandled errors at the root level.
 */
export function ErrorBoundary() {
  const error = useRouteError();

  // Handle route errors (404, 403, 500, etc.)
  if (isRouteErrorResponse(error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light dark:bg-dark-darkest">
        <div className="text-center max-w-md mx-auto px-4">
          {/* Status Icon */}
          <div className="mb-6">
            {error.status === 404 ? (
              <div className="w-24 h-24 mx-auto text-gray-400 dark:text-gray-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
            ) : error.status === 403 ? (
              <div className="w-24 h-24 mx-auto text-red-400 dark:text-red-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto text-orange-400 dark:text-orange-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
            )}
          </div>

          {/* Error Status Code */}
          <div className="text-6xl font-bold text-gray-300 dark:text-gray-700 mb-4">
            {error.status}
          </div>

          <h1 className="text-3xl font-serif font-bold mb-3 text-dark dark:text-white">
            {error.status === 404
              ? 'Page Not Found'
              : error.status === 403
                ? 'Access Denied'
                : error.status === 500
                  ? 'Server Error'
                  : 'Something went wrong'}
          </h1>

          <p className="text-gray dark:text-gray-400 mb-8">
            {error.status === 404
              ? "The page you're looking for doesn't exist or has been moved."
              : error.status === 403
                ? "You don't have permission to access this page."
                : error.status === 500
                  ? 'Our server encountered an error. Please try again later.'
                  : error.statusText || 'An unexpected error occurred.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
            >
              Go Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-100 dark:bg-dark-light text-dark dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-dark-lighter transition-smooth"
            >
              Go Back
            </button>
          </div>

          {/* Helpful Links for 404 */}
          {error.status === 404 && (
            <div className="mt-12 text-sm text-gray dark:text-gray-400">
              <p className="mb-3">You might be looking for:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/home" className="text-secondary-blue hover:underline">Home Feed</Link>
                <span>•</span>
                <Link to="/discover" className="text-secondary-blue hover:underline">Discover</Link>
                <span>•</span>
                <Link to="/communities" className="text-secondary-blue hover:underline">Communities</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle unexpected errors
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

  return (
    <div className="min-h-screen flex items-center justify-center bg-light dark:bg-dark-darkest">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-24 h-24 mx-auto mb-6 text-red-400 dark:text-red-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-serif font-bold mb-3 text-dark dark:text-white">Oops!</h1>

        <p className="text-gray dark:text-gray-400 mb-6">
          Something unexpected happened. Don't worry, it's not your fault.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <pre className="bg-gray-100 dark:bg-dark-light p-4 rounded-lg text-left text-sm mb-6 overflow-auto max-h-40 text-dark dark:text-gray-300">
            {errorMessage}
          </pre>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
          >
            Try Again
          </button>
          <Link
            to="/"
            className="px-6 py-3 bg-gray-100 dark:bg-dark-light text-dark dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-dark-lighter transition-smooth"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
