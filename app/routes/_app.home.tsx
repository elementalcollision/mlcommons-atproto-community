import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Home - MLCommons Community" },
    { name: "description", content: "Your personalized community feed" },
  ];
};

export default function Home() {
  return (
    <div className="container-custom">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-serif mb-2">Your Feed</h1>
          <p className="text-gray">
            Discover posts from communities you follow
          </p>
        </div>

        {/* Placeholder for feed */}
        <div className="space-y-4">
          <div className="card">
            <div className="text-center py-12">
              <p className="text-gray text-lg mb-4">
                Welcome to MLCommons Community!
              </p>
              <p className="text-gray mb-6">
                Join communities to see their posts in your feed.
              </p>
              <a
                href="/communities"
                className="inline-block bg-secondary-blue text-white px-6 py-3 rounded font-semibold no-underline hover:bg-opacity-90 transition-smooth"
              >
                Explore Communities
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
