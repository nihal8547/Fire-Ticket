import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getReportsData } from "@/lib/reports-data";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await getReportsData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "Failed to generate reports" }, { status: 500 });
  }
}
