import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      tickets: { orderBy: { createdAt: "desc" }, take: 10, include: { technician: { select: { name: true } } } },
      assets: { orderBy: { createdAt: "desc" }, take: 5 },
      invoices: { orderBy: { createdAt: "desc" }, take: 5 },
      inspections: { orderBy: { scheduledDate: "desc" }, take: 5 },
    },
  });

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, phone, address, city, state, zipCode, contactPerson, notes } = body;

  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: { name, email: email || null, phone: phone || null, address: address || null, city: city || null, state: state || null, zipCode: zipCode || null, contactPerson: contactPerson || null, notes: notes || null },
  });

  return NextResponse.json(customer);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.customer.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
