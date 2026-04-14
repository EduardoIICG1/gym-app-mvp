import { mockMembers } from "@/lib/mock-data";
import { MemberRole, MemberStatus } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as MemberRole | null;
  const status = searchParams.get("status") as MemberStatus | null;
  const search = searchParams.get("search")?.toLowerCase();

  let result = [...mockMembers];
  if (role) result = result.filter((m) => m.role === role);
  if (status) result = result.filter((m) => m.status === status);
  if (search) result = result.filter((m) =>
    m.name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search)
  );

  return Response.json(result);
}
