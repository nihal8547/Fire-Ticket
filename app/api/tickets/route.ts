import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateTicketNumber } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { ticketCreatedEmail, ticketAssignedEmail } from "@/lib/email-templates";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const priority = searchParams.get("priority") || "";
  const customerId = searchParams.get("customerId") || "";
  const technicianId = searchParams.get("technicianId") || "";
  const scheduledFrom = searchParams.get("scheduledFrom") || "";
  const scheduledTo = searchParams.get("scheduledTo") || "";
  const limit = parseInt(searchParams.get("limit") || "25");
  const page = parseInt(searchParams.get("page") || "1");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (customerId) where.customerId = customerId;
  if (technicianId) where.technicianId = technicianId;
  if (scheduledFrom || scheduledTo) {
    where.scheduledDate = {};
    if (scheduledFrom) where.scheduledDate.gte = new Date(scheduledFrom);
    if (scheduledTo) where.scheduledDate.lte = new Date(scheduledTo + "T23:59:59");
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { ticketNumber: { contains: search } },
      { customer: { name: { contains: search } } },
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
        serviceType: { select: { id: true, name: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return NextResponse.json({ tickets, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, customerId, serviceTypeId, priority, technicianId, scheduledDate, dueDate, notes } = body;

  if (!title || !customerId) return NextResponse.json({ error: "Title and customer are required" }, { status: 400 });

  const ticketNumber = generateTicketNumber();

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      title,
      description: description || null,
      customerId,
      serviceTypeId: serviceTypeId || null,
      priority: priority || "MEDIUM",
      technicianId: technicianId || null,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || null,
    },
    include: {
      customer: { select: { id: true, name: true } },
      technician: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "TICKET_CREATED",
      entity: "Ticket",
      entityId: ticket.id,
      userId: (session.user as any).id,
      newValues: JSON.stringify({ ticketNumber, title, priority }),
    },
  });

  // Email: notify managers of new ticket
  const managers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] }, isActive: true },
    select: { email: true },
  });
  if (managers.length > 0) {
    const tpl = ticketCreatedEmail({
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      priority: ticket.priority,
      customerName: ticket.customer?.name || "",
      description: ticket.description || undefined,
      appUrl: process.env.NEXTAUTH_URL,
    });
    await sendEmail({ to: managers.map(m => m.email!), ...tpl });
  }

  // Email: notify assigned technician
  if (ticket.technician?.id) {
    const tech = await prisma.user.findUnique({ where: { id: ticket.technician.id }, select: { email: true } });
    if (tech?.email) {
      const tpl = ticketAssignedEmail({
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        priority: ticket.priority,
        customerName: ticket.customer?.name || "",
        technicianName: ticket.technician.name || "",
        scheduledDate: ticket.scheduledDate?.toLocaleDateString() || undefined,
        appUrl: process.env.NEXTAUTH_URL,
      });
      await sendEmail({ to: tech.email, ...tpl });
    }
  }

  return NextResponse.json(ticket, { status: 201 });
}
