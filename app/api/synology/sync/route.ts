import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runSynologySync } from "@/lib/synology-sync";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as any).role;
  if (!["ADMIN", "MANAGER"].includes(userRole)) {
    return NextResponse.json({ error: "Forbidden: Admin or Manager access required" }, { status: 403 });
  }

  try {
    const userId = session.user.id || session.user.email || "ADMIN";
    const result = await runSynologySync(userId);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Manual sync failed" },
      { status: 500 }
    );
  }
}
