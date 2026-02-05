import { Link, useRouteError, isRouteErrorResponse } from '@remix-run/react';

/**
 * Error Boundary Component
 *
 * Catches errors and displays user-friendly error messages.
 * Handles both route errors (404, etc.) and unexpected errors.
 */
export function ErrorBoundary() {
  const error = useRouteError();

  // Handle route errors (404, 403, 500, etc.)
  if (isRouteErrorResponse(error)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-4xl font-bold text-gray">{error.status}</span>
          </div>

          <h1 className="text-3xl font-serif font-bold mb-3">
            {error.status === 404
              ? 'Page Not Found'
              : error.status === 403
                ? 'Access Denied'
                : error.status === 500
                  ? 'Server Error'
                  : 'Something went wrong'}
          </h1>

          <p className="text-gray mb-6">
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
              className="px-6 py-2 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
            >
              Go Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-gray-100 text-dark rounded-lg font-semibold hover:bg-gray-200 transition-smooth"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle unexpected errors
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-serif font-bold mb-3">Oops!</h1>

        <p className="text-gray mb-6">
          Something unexpected happened. Don't worry, it's not your fault.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <pre className="bg-gray-100 p-4 rounded-lg text-left text-sm mb-6 overflow-auto max-h-40">
            {errorMessage}
          </pre>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
          >
            Try Again
          </button>
          <Link
            to="/"
            className="px-6 py-2 bg-gray-100 text-dark rounded-lg font-semibold hover:bg-gray-200 transition-smooth"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Error Card
 *
 * For inline error display within pages
 */
export function ErrorCard({
  title = 'Error',
  message = 'Something went wrong',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card bg-red-50 border border-red-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-red-800">{title}</h3>
          <p className="text-sm text-red-700">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
