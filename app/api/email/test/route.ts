import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { testEmail } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: "Recipient email required" }, { status: 400 });

  const template = testEmail((session.user as any).name || "Admin");
  const result = await sendEmail({ to, ...template });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: `Test email sent to ${to}` });
}
