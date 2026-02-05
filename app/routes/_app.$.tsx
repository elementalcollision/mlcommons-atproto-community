/**
 * Catch-all 404 route for the app layout
 * This handles any unmatched routes under _app
 */

import { Link } from "@remix-run/react";

export async function loader() {
  throw new Response("Not Found", { status: 404 });
}

export default function CatchAll() {
  // This won't render due to the loader throwing
  return null;
}

/**
 * Custom error boundary for unmatched app routes
 */
export function ErrorBoundary() {
  return (
    <div className="container-custom py-16">
      <div className="max-w-lg mx-auto text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto text-gray-300 dark:text-gray-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-serif font-bold mb-4 text-dark dark:text-white">
          Page Not Found
        </h1>

        <p className="text-gray dark:text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/home"
            className="px-6 py-3 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
          >
            Go to Home Feed
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-100 dark:bg-dark-light text-dark dark:text-white rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-dark-lighter transition-smooth"
          >
            Go Back
          </button>
        </div>

        {/* Quick Links */}
        <div className="mt-12 p-6 bg-gray-50 dark:bg-dark-light rounded-xl">
          <h3 className="font-semibold mb-4 text-dark dark:text-white">
            Popular Destinations
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/home"
              className="flex items-center gap-2 text-secondary-blue hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home Feed
            </Link>
            <Link
              to="/discover"
              className="flex items-center gap-2 text-secondary-blue hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Discover
            </Link>
            <Link
              to="/communities"
              className="flex items-center gap-2 text-secondary-blue hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Communities
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
