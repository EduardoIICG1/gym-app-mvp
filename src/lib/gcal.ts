// Builds a Google Calendar "add event" URL — no API or OAuth required.
// The user is taken to calendar.google.com with the event pre-filled.
export function buildGCalURL({
  title,
  sessionDate,
  startTime,
  endTime,
  description,
  location = "Primary Performance",
}: {
  title: string;
  sessionDate: string; // "YYYY-MM-DD"
  startTime: string;   // "HH:mm"
  endTime: string;     // "HH:mm"
  description?: string;
  location?: string;
}): string {
  const fmt = (date: string, time: string) =>
    `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(sessionDate, startTime)}/${fmt(sessionDate, endTime)}`,
    ctz: "America/Santiago",
    location,
    ...(description ? { details: description } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
