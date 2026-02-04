import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "MLCommons Community Platform" },
    { name: "description", content: "Community engagement and syndication on AT Protocol" },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-dark text-white sticky top-0 z-50">
        <div className="container-custom py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-serif text-white">MLCommons Community</h1>
            <nav className="flex gap-6">
              <Link to="/login" className="text-primary hover:text-primary-dark no-underline">
                Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 bg-dark-darkest text-white">
          <div className="container-custom text-center">
            <h2 className="text-3xl font-serif mb-6 text-white">
              Community Engagement on AT Protocol
            </h2>
            <p className="text-lg max-w-2xl mx-auto mb-8 text-gray-300">
              A decentralized Reddit-lite platform built on AT Protocol. Create communities,
              share content, and engage with others while maintaining full ownership of your data.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/login"
                className="inline-block bg-secondary-blue text-white px-6 py-3 rounded font-semibold no-underline hover:bg-opacity-90 transition-smooth"
              >
                Get Started
              </Link>
              <Link
                to="/about"
                className="inline-block bg-primary text-dark px-6 py-3 rounded font-semibold no-underline hover:bg-primary-dark transition-smooth"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container-custom">
            <h3 className="text-2xl font-serif text-center mb-12">Features</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card">
                <h4 className="text-lg font-semibold mb-3 text-secondary-blue">
                  Decentralized Communities
                </h4>
                <p className="text-gray">
                  Create and manage topic-based communities with full control over rules,
                  moderation, and membership.
                </p>
              </div>
              <div className="card">
                <h4 className="text-lg font-semibold mb-3 text-secondary-blue">
                  Content Syndication
                </h4>
                <p className="text-gray">
                  Discover content from across the AT Protocol network through
                  algorithmic feeds and community curation.
                </p>
              </div>
              <div className="card">
                <h4 className="text-lg font-semibold mb-3 text-secondary-blue">
                  Reputation System
                </h4>
                <p className="text-gray">
                  Build your reputation through quality contributions. Earn karma
                  from posts and comments valued by the community.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-dark text-white py-8">
        <div className="container-custom text-center">
          <p className="text-sm text-gray-400">
            Built with AT Protocol • Powered by MLCommons
          </p>
        </div>
      </footer>
    </div>
  );
}
