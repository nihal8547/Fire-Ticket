import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inspection = await prisma.inspection.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      serviceType: true,
      items: { orderBy: { order: "asc" } },
    },
  });

  if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(inspection);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: any = {};
  const fields = ["status", "scheduledDate", "completedDate", "notes", "overallResult", "certExpiry", "certificate"];
  for (const f of fields) {
    if (f in body) {
      if (["scheduledDate", "completedDate", "certExpiry"].includes(f)) {
        data[f] = body[f] ? new Date(body[f]) : null;
      } else {
        data[f] = body[f];
      }
    }
  }

  const inspection = await prisma.inspection.update({
    where: { id: params.id },
    data,
    include: { customer: { select: { id: true, name: true } } },
  });

  return NextResponse.json(inspection);
}
