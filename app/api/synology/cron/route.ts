import { NextRequest, NextResponse } from "next/server";
import { checkAndAutoSync } from "@/lib/synology-sync";
import { prisma } from "@/lib/prisma";

// This endpoint can be called by an internal interval, external cron or client heartbeat
export async function GET(req: NextRequest) {
  try {
    const config = await prisma.synologySyncConfig.findUnique({ where: { id: "default" } });
    if (!config || !config.enabled) {
      return NextResponse.json({ message: "Synology sync is disabled", enabled: false });
    }

    await checkAndAutoSync();

    const updatedConfig = await prisma.synologySyncConfig.findUnique({ where: { id: "default" } });
    return NextResponse.json({
      message: "Sync check completed",
      lastSyncAt: updatedConfig?.lastSyncAt,
      lastStatus: updatedConfig?.lastStatus,
      lastMessage: updatedConfig?.lastMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to run cron auto-sync" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
