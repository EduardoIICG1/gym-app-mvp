import { mockClasses, mockReservations } from "@/lib/mock-data";
import { GymClass } from "@/lib/types";

export async function GET() {
  // Compute reservedCount from live reservation data — single source of truth
  const result = mockClasses.map(cls => ({
    ...cls,
    reservedCount: mockReservations.filter(
      r => r.classId === cls.id && r.status !== "cancelled"
    ).length,
  }));
  return Response.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name, serviceType, dayOfWeek, startTime, endTime, coach, maxCapacity, note,
      hasBookingCutoff, bookingCutoffValue, bookingCutoffUnit, bookingMode,
      eventType,
    } = body;

    if (!name || !startTime || !endTime || !coach) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const isBlocked = eventType === "blocked_time";

    const newClass: GymClass = {
      id: String(Date.now()),
      name,
      eventType: isBlocked ? "blocked_time" : "class",
      serviceType: isBlocked ? "blocked_time" : (serviceType || "group"),
      dayOfWeek: Number(dayOfWeek) as import("@/lib/types").DayOfWeek,
      startTime,
      endTime,
      coach,
      maxCapacity: isBlocked ? 0 : (Number(maxCapacity) || 20),
      reservedCount: 0,
      status: "active",
      note: note || undefined,
      hasBookingCutoff: isBlocked ? false : (hasBookingCutoff !== false),
      bookingCutoffValue: isBlocked ? 0 : (Number(bookingCutoffValue) || 3),
      bookingCutoffUnit: bookingCutoffUnit || "hours",
      bookingMode: isBlocked ? "regular" : (bookingMode || "regular"),
    };

    mockClasses.push(newClass);
    return Response.json(newClass, { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
