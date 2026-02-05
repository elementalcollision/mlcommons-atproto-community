import { Outlet, Link, useLocation, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { useState } from "react";

// Layout for authenticated pages
export default function AppLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-light dark:bg-dark-darkest transition-colors">
      {/* Skip to content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-dark focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>

      <header className="bg-dark text-white sticky top-0 z-50 shadow-natural dark:border-b dark:border-gray-800" role="banner">
        <div className="container-custom py-4">
          <div className="flex items-center justify-between">
            <Link to="/home" className="text-xl font-serif text-primary hover:text-primary-dark no-underline" aria-label="MLCommons Community - Go to home">
              MLCommons
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link
                to="/home"
                className={`no-underline transition-colors ${
                  location.pathname === '/home'
                    ? 'text-primary font-semibold'
                    : 'text-white hover:text-primary'
                }`}
              >
                Home
              </Link>
              <Link
                to="/discover"
                className={`no-underline transition-colors ${
                  location.pathname === '/discover'
                    ? 'text-primary font-semibold'
                    : 'text-white hover:text-primary'
                }`}
              >
                Discover
              </Link>
              <Link
                to="/communities"
                className={`no-underline transition-colors ${
                  location.pathname.startsWith('/communities')
                    ? 'text-primary font-semibold'
                    : 'text-white hover:text-primary'
                }`}
              >
                Communities
              </Link>
              <Link
                to="/c/create"
                className="bg-primary text-dark px-4 py-2 rounded font-semibold no-underline hover:bg-primary-dark transition-smooth"
              >
                Create Community
              </Link>

              {/* User Actions */}
              <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-700">
                {/* Search */}
                <Link
                  to="/search"
                  className={`p-2 rounded-lg transition-colors ${
                    location.pathname === '/search'
                      ? 'text-primary bg-gray-800'
                      : 'text-white hover:text-primary hover:bg-gray-800'
                  }`}
                  title="Search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </Link>

                {/* Bookmarks */}
                <Link
                  to="/bookmarks"
                  className={`p-2 rounded-lg transition-colors ${
                    location.pathname === '/bookmarks'
                      ? 'text-primary bg-gray-800'
                      : 'text-white hover:text-primary hover:bg-gray-800'
                  }`}
                  title="Saved Posts"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </Link>

                {/* Notifications */}
                <Link
                  to="/notifications"
                  className={`p-2 rounded-lg transition-colors relative ${
                    location.pathname === '/notifications'
                      ? 'text-primary bg-gray-800'
                      : 'text-white hover:text-primary hover:bg-gray-800'
                  }`}
                  title="Notifications"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </Link>

                {/* Settings */}
                <Link
                  to="/settings"
                  className={`p-2 rounded-lg transition-colors ${
                    location.pathname === '/settings'
                      ? 'text-primary bg-gray-800'
                      : 'text-white hover:text-primary hover:bg-gray-800'
                  }`}
                  title="Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>

                {/* Profile */}
                <Link
                  to="/profile"
                  className={`p-2 rounded-lg transition-colors ${
                    location.pathname === '/profile'
                      ? 'text-primary bg-gray-800'
                      : 'text-white hover:text-primary hover:bg-gray-800'
                  }`}
                  title="Profile"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
              </div>
            </nav>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center gap-3">
              {/* Mobile icon shortcuts */}
              <Link
                to="/notifications"
                className={`p-2 rounded-lg transition-colors ${
                  location.pathname === '/notifications'
                    ? 'text-primary bg-gray-800'
                    : 'text-white hover:text-primary'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-white hover:bg-gray-800 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <nav className="lg:hidden mt-4 pt-4 border-t border-gray-700">
              <div className="flex flex-col gap-2">
                <Link
                  to="/home"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg no-underline transition-colors ${
                    location.pathname === '/home'
                      ? 'bg-gray-800 text-primary font-semibold'
                      : 'text-white hover:bg-gray-800'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/discover"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg no-underline transition-colors ${
                    location.pathname === '/discover'
                      ? 'bg-gray-800 text-primary font-semibold'
                      : 'text-white hover:bg-gray-800'
                  }`}
                >
                  Discover
                </Link>
                <Link
                  to="/communities"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg no-underline transition-colors ${
                    location.pathname.startsWith('/communities')
                      ? 'bg-gray-800 text-primary font-semibold'
                      : 'text-white hover:bg-gray-800'
                  }`}
                >
                  Communities
                </Link>
                <Link
                  to="/c/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-primary text-dark px-4 py-3 rounded-lg font-semibold no-underline hover:bg-primary-dark transition-smooth text-center"
                >
                  Create Community
                </Link>

                <div className="border-t border-gray-700 mt-2 pt-2">
                  <Link
                    to="/search"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg no-underline transition-colors ${
                      location.pathname === '/search'
                        ? 'bg-gray-800 text-primary font-semibold'
                        : 'text-white hover:bg-gray-800'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </Link>
                  <Link
                    to="/bookmarks"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg no-underline transition-colors ${
                      location.pathname === '/bookmarks'
                        ? 'bg-gray-800 text-primary font-semibold'
                        : 'text-white hover:bg-gray-800'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Saved Posts
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg no-underline transition-colors ${
                      location.pathname === '/settings'
                        ? 'bg-gray-800 text-primary font-semibold'
                        : 'text-white hover:bg-gray-800'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg no-underline transition-colors ${
                      location.pathname === '/profile'
                        ? 'bg-gray-800 text-primary font-semibold'
                        : 'text-white hover:bg-gray-800'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </Link>
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>

      <main id="main-content" className="flex-1 py-4 sm:py-8 pb-20 lg:pb-8 text-dark dark:text-gray-100" role="main">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-darker border-t border-gray-200 dark:border-gray-700 z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16">
          <Link
            to="/home"
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              location.pathname === '/home'
                ? 'text-primary'
                : 'text-gray dark:text-gray-400 hover:text-primary'
            }`}
            aria-label="Home"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] mt-1 font-medium">Home</span>
          </Link>

          <Link
            to="/discover"
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              location.pathname === '/discover'
                ? 'text-primary'
                : 'text-gray dark:text-gray-400 hover:text-primary'
            }`}
            aria-label="Discover"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span className="text-[10px] mt-1 font-medium">Discover</span>
          </Link>

          <Link
            to="/c/create"
            className="flex flex-col items-center justify-center w-full h-full text-primary"
            aria-label="Create"
          >
            <div className="w-10 h-10 rounded-full bg-primary text-dark flex items-center justify-center -mt-4 shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>

          <Link
            to="/search"
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              location.pathname === '/search'
                ? 'text-primary'
                : 'text-gray dark:text-gray-400 hover:text-primary'
            }`}
            aria-label="Search"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[10px] mt-1 font-medium">Search</span>
          </Link>

          <Link
            to="/settings"
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              location.pathname === '/settings'
                ? 'text-primary'
                : 'text-gray dark:text-gray-400 hover:text-primary'
            }`}
            aria-label="Profile"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] mt-1 font-medium">Profile</span>
          </Link>
        </div>
      </nav>

      <footer className="hidden lg:block bg-dark text-white py-6 mt-auto dark:border-t dark:border-gray-800">
        <div className="container-custom text-center text-sm text-gray-400">
          <p>Built with AT Protocol • Powered by MLCommons</p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Error Boundary for the App Layout
 *
 * Displays errors within the app shell (header/footer intact)
 */
export function ErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();

  // Determine error details
  let status = 500;
  let title = 'Something went wrong';
  let message = 'An unexpected error occurred.';

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = 'Page Not Found';
      message = "The page you're looking for doesn't exist or has been moved.";
    } else if (error.status === 403) {
      title = 'Access Denied';
      message = "You don't have permission to access this page.";
    } else if (error.status === 500) {
      title = 'Server Error';
      message = 'Our server encountered an error. Please try again later.';
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <header className="bg-dark text-white sticky top-0 z-50 shadow-natural">
        <div className="container-custom py-4">
          <div className="flex items-center justify-between">
            <Link to="/home" className="text-xl font-serif text-primary hover:text-primary-dark no-underline">
              MLCommons
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                to="/home"
                className={`no-underline transition-colors ${
                  location.pathname === '/home'
                    ? 'text-primary font-semibold'
                    : 'text-white hover:text-primary'
                }`}
              >
                Home
              </Link>
              <Link
                to="/discover"
                className={`no-underline transition-colors ${
                  location.pathname === '/discover'
                    ? 'text-primary font-semibold'
                    : 'text-white hover:text-primary'
                }`}
              >
                Discover
              </Link>
              <Link
                to="/communities"
                className={`no-underline transition-colors ${
                  location.pathname.startsWith('/communities')
                    ? 'text-primary font-semibold'
                    : 'text-white hover:text-primary'
                }`}
              >
                Communities
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container-custom">
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl font-bold text-gray">{status}</span>
              </div>

              <h1 className="text-3xl font-serif font-bold mb-3">{title}</h1>
              <p className="text-gray mb-6">{message}</p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/home"
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
        </div>
      </main>

      <footer className="bg-dark text-white py-6 mt-auto">
        <div className="container-custom text-center text-sm text-gray-400">
          <p>Built with AT Protocol • Powered by MLCommons</p>
        </div>
      </footer>
    </div>
  );
}
