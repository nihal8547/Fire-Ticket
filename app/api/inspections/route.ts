import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInspectionNumber } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { inspectionScheduledEmail } from "@/lib/email-templates";

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

  const parseDate = (dStr: string, isEnd: boolean) => {
    if (!dStr) return undefined;
    if (dStr.includes("T")) {
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? undefined : d;
    }
    const d = new Date(dStr + (isEnd ? "T23:59:59.999Z" : "T00:00:00.000Z"));
    return isNaN(d.getTime()) ? new Date(dStr) : d;
  };

  const fromDate = parseDate(scheduledFrom, false);
  const toDate = parseDate(scheduledTo, true);
  if (fromDate || toDate) {
    where.scheduledDate = {};
    if (fromDate) where.scheduledDate.gte = fromDate;
    if (toDate) where.scheduledDate.lte = toDate;
  }

  try {
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
  } catch (err: any) {
    console.error("GET /api/inspections error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch inspections", inspections: [], total: 0 }, { status: 500 });
  }
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

  // Email: notify managers of new inspection
  const managers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] }, isActive: true },
    select: { email: true },
  });
  if (managers.length > 0) {
    const tpl = inspectionScheduledEmail({
      inspectionNumber: inspection.inspectionNumber,
      type: inspection.type,
      customerName: inspection.customer?.name || "",
      scheduledDate: inspection.scheduledDate?.toLocaleDateString() || undefined,
      notes: inspection.notes || undefined,
      appUrl: process.env.NEXTAUTH_URL,
    });
    await sendEmail({ to: managers.map(m => m.email!), ...tpl });
  }

  return NextResponse.json(inspection, { status: 201 });
}
