import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInspectionNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const customerId = searchParams.get("customerId") || "";
  const scheduledFrom = searchParams.get("scheduledFrom") || "";
  const scheduledTo = searchParams.get("scheduledTo") || "";
  const limit = parseInt(searchParams.get("limit") || "25");
  const page = parseInt(searchParams.get("page") || "1");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (scheduledFrom || scheduledTo) {
    where.scheduledDate = {};
    if (scheduledFrom) where.scheduledDate.gte = new Date(scheduledFrom);
    if (scheduledTo) where.scheduledDate.lte = new Date(scheduledTo + "T23:59:59");
  }

  const [inspections, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      skip,
      take: limit,
      orderBy: { scheduledDate: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        serviceType: { select: { id: true, name: true } },
      },
    }),
    prisma.inspection.count({ where }),
  ]);

  return NextResponse.json({ inspections, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { customerId, type, serviceTypeId, scheduledDate, notes } = body;

  if (!customerId) return NextResponse.json({ error: "Customer is required" }, { status: 400 });

  const inspectionNumber = generateInspectionNumber();

  const inspection = await prisma.inspection.create({
    data: {
      inspectionNumber,
      customerId,
      type: type || "ANNUAL",
      serviceTypeId: serviceTypeId || null,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      notes: notes || null,
    },
    include: {
      customer: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(inspection, { status: 201 });
}
