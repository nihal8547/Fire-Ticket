import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { generateTicketNumber } from "@/lib/utils";

export interface FileTestResult {
  fileName: string;
  exists: boolean;
  filePath: string;
  sizeBytes?: number;
  lastModified?: string;
  sheetNames?: string[];
  rowCount?: number;
  error?: string;
}

export interface ConnectionTestResult {
  folderExists: boolean;
  folderPath: string;
  tickets: FileTestResult;
  customers: FileTestResult;
}

function resolvePath(folderPath: string, fileName: string): string {
  if (path.isAbsolute(fileName)) return fileName;
  return path.join(folderPath, fileName);
}

function inspectExcelFile(filePath: string, fileName: string): FileTestResult {
  try {
    if (!fs.existsSync(filePath)) {
      return { fileName, exists: false, filePath, error: "File not found" };
    }
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return { fileName, exists: false, filePath, error: "Path is not a regular file" };
    }

    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    return {
      fileName,
      exists: true,
      filePath,
      sizeBytes: stats.size,
      lastModified: stats.mtime.toISOString(),
      sheetNames: workbook.SheetNames,
      rowCount: rows.length,
    };
  } catch (err: any) {
    return {
      fileName,
      exists: false,
      filePath,
      error: err.message || "Failed to read file",
    };
  }
}

export function testSynologyConnection(
  folderPath: string,
  ticketsFileName: string = "tickets.xlsx",
  customersFileName: string = "customers.xlsx"
): ConnectionTestResult {
  const folderExists = fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory();

  const ticketsPath = resolvePath(folderPath, ticketsFileName);
  const customersPath = resolvePath(folderPath, customersFileName);

  return {
    folderExists,
    folderPath,
    tickets: inspectExcelFile(ticketsPath, ticketsFileName),
    customers: inspectExcelFile(customersPath, customersFileName),
  };
}

export async function syncCustomersFromFile(filePath: string): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
  let created = 0, updated = 0, failed = 0;
  const errors: string[] = [];

  if (!fs.existsSync(filePath)) {
    return { created: 0, updated: 0, failed: 0, errors: [`File not found: ${filePath}`] };
  }

  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  for (const row of rows) {
    try {
      const name = (row["Name"] || row["Customer Name"] || row["Company"])?.toString().trim();
      const email = (row["Email"] || row["Email Address"])?.toString().trim().toLowerCase();
      const externalRef = (row["External Ref"] || row["ID"] || row["CustomerId"])?.toString().trim();

      if (!name) {
        failed++;
        errors.push("Row missing Name");
        continue;
      }

      const data = {
        name,
        email: email || null,
        phone: (row["Phone"] || row["Telephone"])?.toString().trim() || null,
        address: (row["Address"] || row["Street"])?.toString().trim() || null,
        city: (row["City"] || row["Town"])?.toString().trim() || null,
        state: (row["State"] || row["Province"])?.toString().trim() || null,
        zipCode: (row["Zip Code"] || row["Zip"] || row["PostalCode"])?.toString().trim() || null,
        contactPerson: (row["Contact Person"] || row["Contact"])?.toString().trim() || null,
        notes: (row["Notes"] || row["Remarks"])?.toString().trim() || null,
        externalRef: externalRef || null,
      };

      const existing = externalRef
        ? await prisma.customer.findUnique({ where: { externalRef } })
        : email
        ? await prisma.customer.findUnique({ where: { email } })
        : await prisma.customer.findFirst({ where: { name } });

      if (existing) {
        await prisma.customer.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.customer.create({ data });
        created++;
      }
    } catch (err: any) {
      failed++;
      errors.push(err.message || "Failed to process customer row");
    }
  }

  return { created, updated, failed, errors };
}

export async function syncTicketsFromFile(filePath: string): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
  if (!fs.existsSync(filePath)) {
    return { created: 0, updated: 0, failed: 0, errors: [`File not found: ${filePath}`] };
  }

  const { syncTicketsFromBuffer } = await import("@/lib/excel-ticket-parser");
  const buffer = fs.readFileSync(filePath);
  const result = await syncTicketsFromBuffer(buffer, "SYNOLOGY_SYNC");

  return {
    created: result.created,
    updated: result.updated,
    failed: result.failed,
    errors: result.errors,
  };
}

export async function runSynologySync(userId: string = "SYSTEM"): Promise<{ success: boolean; message: string; results?: any }> {
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

  const folderPath = config.folderPath;
  const customersPath = resolvePath(folderPath, config.customersFileName);
  const ticketsPath = resolvePath(folderPath, config.ticketsFileName);

  const errors: string[] = [];
  let totalNew = 0;
  let totalUpdated = 0;
  let totalFailed = 0;

  try {
    await prisma.synologySyncConfig.update({
      where: { id: "default" },
      data: { lastStatus: "RUNNING", lastMessage: "Sync in progress..." },
    });

    // 1. Sync Customers first so tickets can link
    let custResult = { created: 0, updated: 0, failed: 0, errors: [] as string[] };
    if (fs.existsSync(customersPath)) {
      custResult = await syncCustomersFromFile(customersPath);
      totalNew += custResult.created;
      totalUpdated += custResult.updated;
      totalFailed += custResult.failed;
      errors.push(...custResult.errors);

      await prisma.excelImportLog.create({
        data: {
          fileName: config.customersFileName,
          type: "CUSTOMERS",
          totalRows: custResult.created + custResult.updated + custResult.failed,
          newRecords: custResult.created,
          updated: custResult.updated,
          failed: custResult.failed,
          errors: custResult.errors.length > 0 ? JSON.stringify(custResult.errors.slice(0, 20)) : null,
          createdBy: userId,
        },
      });
    } else {
      errors.push(`Customers file not found at ${customersPath}`);
    }

    // 2. Sync Tickets
    let tktResult = { created: 0, updated: 0, failed: 0, errors: [] as string[] };
    if (fs.existsSync(ticketsPath)) {
      tktResult = await syncTicketsFromFile(ticketsPath);
      totalNew += tktResult.created;
      totalUpdated += tktResult.updated;
      totalFailed += tktResult.failed;
      errors.push(...tktResult.errors);

      await prisma.excelImportLog.create({
        data: {
          fileName: config.ticketsFileName,
          type: "TICKETS",
          totalRows: tktResult.created + tktResult.updated + tktResult.failed,
          newRecords: tktResult.created,
          updated: tktResult.updated,
          failed: tktResult.failed,
          errors: tktResult.errors.length > 0 ? JSON.stringify(tktResult.errors.slice(0, 20)) : null,
          createdBy: userId,
        },
      });
    } else {
      errors.push(`Tickets file not found at ${ticketsPath}`);
    }

    const isSuccess = totalFailed === 0 || totalNew > 0 || totalUpdated > 0;
    const summaryMsg = `Synced successfully: +${totalNew} new, ${totalUpdated} updated${totalFailed > 0 ? `, ${totalFailed} failed` : ""}`;

    await prisma.synologySyncConfig.update({
      where: { id: "default" },
      data: {
        lastSyncAt: new Date(),
        lastStatus: isSuccess ? "SUCCESS" : "FAILED",
        lastMessage: summaryMsg,
      },
    });

    return {
      success: isSuccess,
      message: summaryMsg,
      results: {
        customers: custResult,
        tickets: tktResult,
        errors: errors.slice(0, 20),
      },
    };
  } catch (err: any) {
    const errorMsg = err.message || "Unexpected error during Synology sync";
    await prisma.synologySyncConfig.update({
      where: { id: "default" },
      data: {
        lastSyncAt: new Date(),
        lastStatus: "FAILED",
        lastMessage: errorMsg,
      },
    });
    return { success: false, message: errorMsg, results: { errors: [errorMsg] } };
  }
}

export async function checkAndAutoSync(): Promise<void> {
  try {
    const config = await prisma.synologySyncConfig.findUnique({ where: { id: "default" } });
    if (!config || !config.enabled) return;

    const intervalMs = (config.intervalMinutes || 15) * 60 * 1000;
    const now = Date.now();
    const lastSync = config.lastSyncAt ? new Date(config.lastSyncAt).getTime() : 0;

    if (now - lastSync >= intervalMs) {
      await runSynologySync("AUTO_CRON");
    }
  } catch (err) {
    console.error("Auto-sync check error:", err);
  }
}
