import { mockMemberships } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const plan = searchParams.get("plan");
  const studentId = searchParams.get("studentId");

  let result = [...mockMemberships];
  if (status) result = result.filter((m) => m.membershipStatus === status);
  if (plan) result = result.filter((m) => m.plan === plan);
  if (studentId) result = result.filter((m) => m.studentId === studentId);

  return Response.json(result);
}
