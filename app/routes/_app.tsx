import { Outlet, Link, useLocation } from "@remix-run/react";

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
