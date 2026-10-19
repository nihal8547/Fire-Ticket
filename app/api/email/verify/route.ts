import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifySmtp } from "@/lib/email";

export async function POST() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await verifySmtp();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: "SMTP connection verified" });
}
