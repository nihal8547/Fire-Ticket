import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { syncWorkbookFromBuffer } from "@/lib/excel-ticket-parser";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const rawSheets = formData.get("sheets") as string | null;

  const rawMapping = formData.get("mapping") as string | null;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const currentUserId = (session.user as any)?.id;

  let targetSheets: string[] | undefined = undefined;
  if (rawSheets) {
    try {
      const parsed = JSON.parse(rawSheets);
      if (Array.isArray(parsed) && parsed.length > 0) {
        targetSheets = parsed;
      }
    } catch {
      if (rawSheets !== "ALL") {
        targetSheets = rawSheets.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
  }

  let customMapping: Record<string, string> | undefined = undefined;
  if (rawMapping) {
    try {
      const parsed = JSON.parse(rawMapping);
      if (parsed && typeof parsed === "object") {
        customMapping = parsed;
      }
    } catch {
      customMapping = undefined;
    }
  }

  // Process all sheets in the workbook (or user-selected sheets) with custom column mapping
  const result = await syncWorkbookFromBuffer(buffer, currentUserId, targetSheets, customMapping);

  if (result.totalRows === 0 && result.failed === 0) {
    return NextResponse.json(
      { success: false, error: "The uploaded Excel file contains no data rows in the selected sheets." },
      { status: 400 }
    );
  }

  // Log the import to ExcelImportLog
  await prisma.excelImportLog.create({
    data: {
      fileName: file.name,
      type: "EXCEL_SYNC",
      totalRows: result.totalRows,
      newRecords: result.created,
      updated: result.updated,
      failed: result.failed,
      errors: result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 20)) : null,
      createdBy: currentUserId || "USER",
    },
  });

  const isSuccess = result.failed === 0 || result.created > 0 || result.updated > 0;

  return NextResponse.json({
    success: isSuccess,
    totalRows: result.totalRows,
    newRecords: result.created,
    created: result.created,
    updated: result.updated,
    failed: result.failed,
    errors: result.errors.slice(0, 20),
    records: result.records.slice(0, 25),
    sheetSummaries: result.sheetSummaries,
    sheetsFound: result.sheetsFound,
  });
}
