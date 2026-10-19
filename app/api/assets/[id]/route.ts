import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, assetType, customerId, serialNumber, manufacturer, model, location, status, installDate, lastServiceDate, nextServiceDate, notes } = body;

  const asset = await prisma.asset.update({
    where: { id: params.id },
    data: {
      name, assetType, customerId, serialNumber, manufacturer, model, location, status,
      installDate: installDate ? new Date(installDate) : null,
      lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : null,
      nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
      notes,
    },
    include: { customer: { select: { id: true, name: true } } },
  });

  return NextResponse.json(asset);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.asset.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
