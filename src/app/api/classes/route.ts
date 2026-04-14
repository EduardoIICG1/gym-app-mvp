import { NextRequest, NextResponse } from "next/server";
import { mockClasses } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  return NextResponse.json(mockClasses);
}
