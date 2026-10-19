import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const limit = parseInt(searchParams.get("limit") || "25");
  const page = parseInt(searchParams.get("page") || "1");
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tickets: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, phone, address, city, state, zipCode, contactPerson, notes, externalRef } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const customer = await prisma.customer.create({
    data: { name, email: email || null, phone: phone || null, address: address || null, city: city || null, state: state || null, zipCode: zipCode || null, contactPerson: contactPerson || null, notes: notes || null, externalRef: externalRef || null },
  });

  return NextResponse.json(customer, { status: 201 });
}
