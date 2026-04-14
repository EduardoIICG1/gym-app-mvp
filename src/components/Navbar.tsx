import Link from "next/link";

export function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-bold text-blue-600">PP</span>
          <span className="ml-2 text-sm font-semibold text-gray-900">
            Primary Performance
          </span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 font-medium text-sm transition"
          >
            Home
          </Link>
          <Link
            href="/classes"
            className="text-gray-600 hover:text-gray-900 font-medium text-sm transition"
          >
            Classes
          </Link>
        </div>
      </div>
    </nav>
  );
}
