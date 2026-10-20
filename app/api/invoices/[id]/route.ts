import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      items: true,
    },
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: any = {};
  if ("status" in body) data.status = body.status;
  if ("paidDate" in body) data.paidDate = body.paidDate ? new Date(body.paidDate) : null;
  if ("dueDate" in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if ("notes" in body) data.notes = body.notes;

  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data,
    include: { customer: { select: { id: true, name: true } } },
  });

  return NextResponse.json(invoice);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.invoice.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
