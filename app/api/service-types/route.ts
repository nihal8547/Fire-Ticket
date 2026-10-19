import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceTypes = await prisma.serviceType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(serviceTypes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userRole = (session.user as any).role;
  if (!["ADMIN", "MANAGER"].includes(userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description, defaultDuration, price } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const serviceType = await prisma.serviceType.create({
    data: { name, description: description || null, defaultDuration: defaultDuration || 60, price: price || 0 },
  });

  return NextResponse.json(serviceType, { status: 201 });
}
