import { mockMemberships } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const plan = searchParams.get("plan");

  let result = [...mockMemberships];
  if (status) result = result.filter((m) => m.membershipStatus === status);
  if (plan) result = result.filter((m) => m.plan === plan);

  return Response.json(result);
}
