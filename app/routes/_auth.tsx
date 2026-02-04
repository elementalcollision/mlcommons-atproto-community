import { Outlet } from "@remix-run/react";

// Layout for authentication pages
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-darkest to-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-primary mb-2">MLCommons Community</h1>
          <p className="text-gray-300">Sign in with your AT Protocol handle</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
