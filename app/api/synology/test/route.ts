import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { testSynologyConnection } from "@/lib/synology-sync";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));

    // If params not supplied, fall back to current saved config or defaults
    let { folderPath, ticketsFileName, customersFileName } = body;

    if (!folderPath || !ticketsFileName || !customersFileName) {
      const config = await prisma.synologySyncConfig.findUnique({ where: { id: "default" } });
      folderPath = folderPath || config?.folderPath || process.env.SYNOLOGY_FOLDER_PATH || "/synology";
      ticketsFileName = ticketsFileName || config?.ticketsFileName || "tickets.xlsx";
      customersFileName = customersFileName || config?.customersFileName || "customers.xlsx";
    }

    const testResults = testSynologyConnection(folderPath, ticketsFileName, customersFileName);

    return NextResponse.json({
      success: true,
      data: testResults,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to test connection" },
      { status: 500 }
    );
  }
}
