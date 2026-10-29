import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

interface SheetInspection {
  name: string;
  rowCount: number;
  detectedType: "Support Tickets" | "Pre-QCDD Checks" | "Site Visits" | "Customers";
  selected: boolean;
}

const SYSTEM_FIELD_ALIASES: Record<string, string[]> = {
  clientName: ["client name", "customer name", "client", "customer", "company"],
  ticketNumber: ["visit ref #", "visit ref", "visitref#", "ticket #", "ticketno", "ticket number", "ticket id", "ticket"],
  date: ["date", "date raised", "inspection date", "scheduled date", "raised date"],
  siteLocation: ["site / location", "site/location", "site", "location", "address"],
  purpose: ["purpose of visit", "purpose", "request type", "service type", "service"],
  system: ["system", "fire system", "equipment"],
  engineer: ["engineer", "assigned engineer", "technician", "assigned technician", "inspector", "assigned to"],
  team: ["team / technicians", "team", "technicians", "team/technicians"],
  timeIn: ["time in", "timein"],
  timeOut: ["time out", "timeout"],
  hoursOnSite: ["hours on site", "hours", "duration"],
  workDone: ["work done / findings", "work done", "findings", "last update", "description", "details"],
  nextAction: ["next action / remarks", "next action", "remarks", "action", "next step", "recommendation"],
  status: ["status", "ticket status", "qcdd status", "inspection status"],
  priority: ["priority", "urgency", "severity"],
  serialNumber: ["serial #", "serial number", "serialno", "serial", "asset id"],
  phone: ["phone", "contact phone", "mobile", "telephone"],
  email: ["email", "contact email", "e-mail"],
  contactPerson: ["contact person", "contact", "person"],
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: "buffer" });

    const sheets: SheetInspection[] = [];
    const headersSet = new Set<string>();

    for (const name of wb.SheetNames) {
      const sheet = wb.Sheets[name];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const rowCount = rows.length;

      if (rowCount > 0) {
        Object.keys(rows[0] || {}).forEach((h) => {
          const trimmed = String(h).trim();
          if (trimmed !== "") headersSet.add(trimmed);
        });
      }

      let detectedType: SheetInspection["detectedType"] = "Support Tickets";
      if (rowCount > 0) {
        const sNameLower = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const keys = Object.keys(rows[0] || {}).map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ""));

        if (
          sNameLower.includes("qcdd") ||
          sNameLower.includes("inspect") ||
          keys.some((k) => k.includes("qcdd") || k.includes("passfail") || k.includes("result") || k.includes("preqcdd"))
        ) {
          detectedType = "Pre-QCDD Checks";
        } else if (
          sNameLower.includes("visit") ||
          keys.some((k) => k.includes("visitref") || k.includes("hoursonsite") || k.includes("timein") || k.includes("workdone"))
        ) {
          detectedType = "Site Visits";
        } else if (
          sNameLower.includes("customer") ||
          sNameLower.includes("client") ||
          (keys.some((k) => k.includes("contactperson") || k.includes("zipcode")) &&
            !keys.some((k) => k.includes("ticket") || k.includes("visit") || k.includes("purpose")))
        ) {
          detectedType = "Customers";
        }
      }

      sheets.push({
        name,
        rowCount,
        detectedType,
        selected: rowCount > 0 || wb.SheetNames.length === 1,
      });
    }

    const allHeaders = Array.from(headersSet);

    // Compute automatic column mapping on backend
    const suggestedMapping: Record<string, string> = {};
    for (const [fieldKey, aliases] of Object.entries(SYSTEM_FIELD_ALIASES)) {
      for (const h of allHeaders) {
        const hNorm = h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
        if (
          aliases.some((alias) => {
            const aliasNorm = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
            return hNorm === aliasNorm || hNorm.includes(aliasNorm) || aliasNorm.includes(hNorm);
          })
        ) {
          suggestedMapping[fieldKey] = h;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      sheets,
      headers: allHeaders,
      suggestedMapping,
      totalSheets: wb.SheetNames.length,
    });
  } catch (error: any) {
    console.error("Backend Excel Inspection Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to inspect Excel file on backend" },
      { status: 500 }
    );
  }
}
