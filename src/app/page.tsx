import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Transform Your Fitness Journey
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Book classes with experienced coaches. Start today.
          </p>
          <Link
            href="/classes"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition"
          >
            Browse Classes
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {/* Feature 1 */}
          <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Easy Booking
            </h3>
            <p className="text-gray-600 text-sm">
              Browse available classes and book in seconds. Real-time capacity updates.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Expert Coaches
            </h3>
            <p className="text-gray-600 text-sm">
              Learn from experienced fitness professionals dedicated to your goals.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
            <div className="text-4xl mb-4">💪</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Transform
            </h3>
            <p className="text-gray-600 text-sm">
              Achieve your fitness goals with diverse class options and communities.
            </p>
          </div>
        </div>

        {/* Stats section */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-12">
            Why Choose Primary Performance?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl font-bold text-blue-600">10+</div>
              <p className="text-gray-600 text-sm mt-2">Classes per week</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">6+</div>
              <p className="text-gray-600 text-sm mt-2">Expert coaches</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">300+</div>
              <p className="text-gray-600 text-sm mt-2">Active members</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">100%</div>
              <p className="text-gray-600 text-sm mt-2">Satisfaction</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
