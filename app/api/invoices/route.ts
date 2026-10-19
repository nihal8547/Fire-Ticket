import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { invoiceCreatedEmail } from "@/lib/email-templates";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const customerId = searchParams.get("customerId") || "";
  const limit = parseInt(searchParams.get("limit") || "25");
  const page = parseInt(searchParams.get("page") || "1");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true } }, items: true },
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({ invoices, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { customerId, dueDate, notes, items = [] } = await req.json();
  if (!customerId) return NextResponse.json({ error: "Customer required" }, { status: 400 });

  const subtotal = items.reduce((s: number, i: any) => s + (i.quantity || 1) * (i.unitPrice || 0), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      customerId,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || null,
      subtotal, tax, total,
      items: {
        create: items.map((item: any) => ({
          description: item.description || "",
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          total: (item.quantity || 1) * (item.unitPrice || 0),
        })),
      },
    },
    include: { customer: { select: { id: true, name: true } }, items: true },
  });

  // Email: notify managers of new invoice
  const managers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] }, isActive: true },
    select: { email: true },
  });
  if (managers.length > 0) {
    const tpl = invoiceCreatedEmail({
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer?.name || "",
      total: invoice.total,
      dueDate: invoice.dueDate?.toLocaleDateString() || undefined,
      appUrl: process.env.NEXTAUTH_URL,
    });
    await sendEmail({ to: managers.map(m => m.email!), ...tpl });
  }

  return NextResponse.json(invoice, { status: 201 });
}
