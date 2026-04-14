"use client";

import { useEffect, useState } from "react";
import { ClassCard } from "@/components/ClassCard";

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/classes");
        if (!res.ok) throw new Error("Failed to fetch classes");
        const data = await res.json();
        setClasses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading classes");
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Classes</h1>
          <p className="text-gray-600">
            Browse and book your favorite fitness classes
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-gray-600">Loading classes...</div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
            Error: {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && classes.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No classes available.</p>
          </div>
        )}

        {/* Classes grid */}
        {!loading && classes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
