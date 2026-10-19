import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const customerId = searchParams.get("customerId") || "";

  const where: any = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { serialNumber: { contains: search, mode: "insensitive" } },
      { manufacturer: { contains: search, mode: "insensitive" } },
    ];
  }

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { id: true, name: true } } },
  });

  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, assetType, customerId, serialNumber, manufacturer, model, location, status, installDate, lastServiceDate, nextServiceDate, notes } = body;

  if (!name || !customerId) return NextResponse.json({ error: "Name and customer required" }, { status: 400 });

  const asset = await prisma.asset.create({
    data: {
      name, assetType: assetType || "OTHER", customerId, serialNumber, manufacturer, model,
      location, status: status || "ACTIVE",
      installDate: installDate ? new Date(installDate) : null,
      lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : null,
      nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
      notes,
    },
    include: { customer: { select: { id: true, name: true } } },
  });

  return NextResponse.json(asset, { status: 201 });
}
