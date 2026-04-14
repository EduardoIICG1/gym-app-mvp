import { mockClasses } from "@/lib/mock-data";
import { GymClass } from "@/lib/types";

export async function GET() {
  return Response.json(mockClasses);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, serviceType, dayOfWeek, startTime, endTime, coach, maxCapacity, note } = body;

    if (!name || !startTime || !endTime || !coach) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const newClass: GymClass = {
      id: String(Date.now()),
      name,
      serviceType: serviceType || "group",
      dayOfWeek: Number(dayOfWeek) as import("@/lib/types").DayOfWeek,
      startTime,
      endTime,
      coach,
      maxCapacity: Number(maxCapacity) || 20,
      reservedCount: 0,
      status: "active",
      note: note || undefined,
    };

    mockClasses.push(newClass);
    return Response.json(newClass, { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
