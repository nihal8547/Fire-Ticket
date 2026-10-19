import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      technician: { select: { id: true, name: true, email: true } },
      serviceType: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, role: true } } },
      },
      attachments: true,
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const old = await prisma.ticket.findUnique({ where: { id: params.id } });
  if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: any = {};
  const allowed = ["status", "priority", "technicianId", "scheduledDate", "dueDate", "title", "description", "notes", "resolvedDate"];
  for (const key of allowed) {
    if (key in body) {
      if (["scheduledDate", "dueDate", "resolvedDate"].includes(key)) {
        updateData[key] = body[key] ? new Date(body[key]) : null;
      } else {
        updateData[key] = body[key];
      }
    }
  }

  if (body.status === "RESOLVED" && old.status !== "RESOLVED") {
    updateData.resolvedDate = new Date();
  }

  const ticket = await prisma.ticket.update({
    where: { id: params.id },
    data: updateData,
    include: {
      customer: { select: { id: true, name: true } },
      technician: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "TICKET_UPDATED",
      entity: "Ticket",
      entityId: ticket.id,
      userId: (session.user as any).id,
      oldValues: JSON.stringify({ status: old.status, priority: old.priority }),
      newValues: JSON.stringify(updateData),
    },
  });

  return NextResponse.json(ticket);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return PATCH(req, { params });
}
