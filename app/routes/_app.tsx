import { Outlet, Link, useLocation, useRouteError, isRouteErrorResponse } from "@remix-run/react";

// Layout for authenticated pages
export default function AppLayout() {
  const location = useLocation();

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
              <Link
                to="/profile"
                className="text-white hover:text-primary no-underline"
              >
                Profile
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <Outlet />
      </main>

      <footer className="bg-dark text-white py-6 mt-auto">
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
