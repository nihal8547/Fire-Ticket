import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.synologySyncConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      enabled: false,
      folderPath: process.env.SYNOLOGY_FOLDER_PATH || "/synology",
      ticketsFileName: "tickets.xlsx",
      customersFileName: "customers.xlsx",
      intervalMinutes: 15,
    },
  });

  const recentLogs = await prisma.excelImportLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ config, recentLogs });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as any).role;
  if (!["ADMIN", "MANAGER"].includes(userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { enabled, folderPath, ticketsFileName, customersFileName, intervalMinutes } = body;

  const data: any = {};
  if (enabled !== undefined) data.enabled = Boolean(enabled);
  if (folderPath !== undefined) data.folderPath = String(folderPath).trim();
  if (ticketsFileName !== undefined) data.ticketsFileName = String(ticketsFileName).trim();
  if (customersFileName !== undefined) data.customersFileName = String(customersFileName).trim();
  if (intervalMinutes !== undefined) data.intervalMinutes = Math.max(1, parseInt(intervalMinutes) || 15);

  const config = await prisma.synologySyncConfig.upsert({
    where: { id: "default" },
    update: data,
    create: {
      id: "default",
      enabled: Boolean(enabled),
      folderPath: folderPath || "/synology",
      ticketsFileName: ticketsFileName || "tickets.xlsx",
      customersFileName: customersFileName || "customers.xlsx",
      intervalMinutes: parseInt(intervalMinutes) || 15,
    },
  });

  return NextResponse.json({ success: true, config });
}
