"use client";

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function ClassCard({ cls }: { cls: any }) {
  const occupancy = (cls.reserved / cls.capacity) * 100;
  const isFull = occupancy >= 100;
  const isAlmostFull = occupancy >= 70;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden border border-gray-100">
      {/* Header color bar */}
      <div
        className={`h-1 ${
          isFull ? "bg-red-500" : isAlmostFull ? "bg-orange-500" : "bg-green-500"
        }`}
      ></div>

      <div className="p-6">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-4">{cls.name}</h3>

        {/* Info grid */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Coach</span>
            <span className="font-medium text-gray-900">{cls.coach}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Day</span>
            <span className="font-medium text-gray-900">
              {dayNames[cls.dayOfWeek]}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Time</span>
            <span className="font-medium text-gray-900">
              {cls.startTime} - {cls.endTime}
            </span>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-600">CAPACITY</span>
            <span className="text-xs font-bold text-gray-900">
              {cls.reserved} / {cls.capacity}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                isFull
                  ? "bg-red-500"
                  : isAlmostFull
                  ? "bg-orange-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${Math.min(occupancy, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Status badge */}
        <div
          className={`text-sm font-semibold py-2 px-3 rounded text-center ${
            isFull
              ? "bg-red-50 text-red-700"
              : isAlmostFull
              ? "bg-orange-50 text-orange-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {isFull ? "Full" : isAlmostFull ? "Almost Full" : "Available"}
        </div>
      </div>
    </div>
  );
}
