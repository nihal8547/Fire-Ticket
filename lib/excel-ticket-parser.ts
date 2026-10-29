import { prisma } from "@/lib/prisma";
import { generateTicketNumber, generateInspectionNumber } from "@/lib/utils";
import * as XLSX from "xlsx";

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === "number") {
    // Excel serial date to JavaScript Date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return null;

    // Check "15-Oct-2026" or "15-Oct-26" or "30 Sep 2026"
    const namedMonthMatch = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})$/);
    if (namedMonthMatch) {
      const day = parseInt(namedMonthMatch[1], 10);
      const mStr = namedMonthMatch[2].substring(0, 3).toLowerCase();
      let year = parseInt(namedMonthMatch[3], 10);
      if (year < 100) year += 2000;
      const month = MONTH_MAP[mStr];
      if (month !== undefined) {
        const d = new Date(year, month, day, 12, 0, 0);
        if (!isNaN(d.getTime())) return d;
      }
    }

    // Check "DD/MM/YYYY" or "DD-MM-YYYY"
    const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) year += 2000;
      const d = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }

    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export function getRowValue(row: Record<string, any>, ...patterns: (string | RegExp)[]): any {
  const keys = Object.keys(row);
  // 1. Exact normalized match (letters and digits only)
  for (const pattern of patterns) {
    if (typeof pattern === "string") {
      const pNorm = pattern.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const k of keys) {
        const kNorm = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (kNorm === pNorm) {
          const val = row[k];
          if (val !== undefined && val !== null && String(val).trim() !== "") return val;
        }
      }
    } else {
      for (const k of keys) {
        if (pattern.test(k)) {
          const val = row[k];
          if (val !== undefined && val !== null && String(val).trim() !== "") return val;
        }
      }
    }
  }

  // 2. Strict prefix match (only if pattern length is at least 4 chars and key starts with it)
  for (const pattern of patterns) {
    if (typeof pattern === "string") {
      const pNorm = pattern.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (pNorm.length < 4) continue;
      for (const k of keys) {
        const kNorm = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (
          kNorm.startsWith(pNorm) &&
          (!kNorm.includes("type") || pNorm.includes("type")) &&
          (!kNorm.includes("result") || pNorm.includes("result")) &&
          (!kNorm.includes("status") || pNorm.includes("status")) &&
          (!kNorm.includes("linked") || pNorm.includes("linked"))
        ) {
          const val = row[k];
          if (val !== undefined && val !== null && String(val).trim() !== "") return val;
        }
      }
    }
  }

  return undefined;
}

export interface SyncResult {
  created: number;
  updated: number;
  failed: number;
  errors: string[];
  records: Array<{
    refNumber: string;
    clientName: string;
    type: string;
    status: string;
    action: "CREATED" | "UPDATED";
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TICKETS & SITE VISITS PARSER
// ─────────────────────────────────────────────────────────────────────────────
export async function syncTicketsFromRows(
  rows: any[],
  currentUserId?: string,
  customMapping?: Record<string, string>
): Promise<SyncResult> {
  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const records: SyncResult["records"] = [];

  // In-memory caches to prevent duplicate entity creation within the same sync batch
  const customerCache = new Map<string, string>();
  const serviceTypeCache = new Map<string, string>();
  const technicianCache = new Map<string, string>();
  const batchTicketMap = new Map<string, any>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    try {
      const getMapped = (fieldKey: string, ...patterns: (string | RegExp)[]) => {
        if (customMapping && customMapping[fieldKey]) {
          const colName = customMapping[fieldKey];
          if (colName === "__skip__") return undefined;
          if (colName && colName !== "__auto__") {
            const val = row[colName];
            if (val !== undefined && val !== null && String(val).trim() !== "") return val;
          }
        }
        return getRowValue(row, ...patterns);
      };

      // Column extractions with custom mapping priority & fallback matching
      const ticketNumVal = getMapped(
        "ticketNumber",
        "Visit Ref #",
        "Visit Ref",
        "VisitRef#",
        "Visit Number",
        "Ticket #",
        "TicketNo",
        "Ticket Number",
        "Ticket ID",
        "Ticket"
      );
      const clientNameVal = getMapped("clientName", "Client Name", "Customer Name", "Client", "Customer", "Company");
      const customerEmailVal = getMapped("customerEmail", "Customer Email", "Email", "Client Email");
      const siteLocationVal = getMapped("siteLocation", "Site / Location", "Site/Location", "Site", "Location", "Address");
      const purposeVal = getMapped("purpose", "Purpose of Visit", "Purpose", "Request type", "Request Type", "Service Type", "Service");
      const systemVal = getMapped("system", "System", "Fire System", "Equipment");
      const engineerVal = getMapped("engineer", "Engineer", "Assigned Engineer", "Technician", "Assigned Technician", "Assigned To");
      const teamVal = getMapped("team", "Team / Technicians", "Team", "Technicians", "Team/Technicians");
      const timeInVal = getMapped("timeIn", "Time In", "TimeIn");
      const timeOutVal = getMapped("timeOut", "Time Out", "TimeOut");
      const hoursOnSiteVal = getMapped("hoursOnSite", "Hours on Site", "Hours", "Duration");
      const workDoneVal = getMapped("workDone", "Work Done / Findings", "Work Done", "Findings", "Last Update", "Update", "Description", "Details");
      const nextActionVal = getMapped("nextAction", "Next Action / Remarks", "Next Action", "Remarks", "Notes");
      const statusVal = getMapped("status", "Status", "Ticket Status");
      const linkedTicketVal = getMapped("linkedTicket", "Linked Ticket / RFQ / Job #", "Linked Ticket", "Job #", "RFQ #");
      const dateVal = getMapped("date", "Date", "Date Raised", "Raised Date", "Created Date");
      const dateClosedVal = getMapped("dateClosed", "Date Closed", "Closed Date", "Resolved Date");
      const typeVal = getMapped("type", "Type (Emergency/Complaint/Request)", "Type", "Priority");
      const titleVal = getMapped("title", "Title", "Subject", "Summary");

      const clientName = (clientNameVal || "").toString().trim();
      const customerEmail = (customerEmailVal || "").toString().trim().toLowerCase();

      // Skip empty row
      if (!clientName && !ticketNumVal && !titleVal && !purposeVal) {
        continue;
      }

      // 2. Resolve or Auto-create Customer (Duplicate-Proof)
      let customerId: string | null = null;
      if (clientName) {
        const cKey = clientName.toLowerCase();
        if (customerCache.has(cKey)) {
          customerId = customerCache.get(cKey)!;
        } else {
          const found = await prisma.customer.findFirst({
            where: { name: { equals: clientName, mode: "insensitive" } },
          });
          if (found) {
            customerId = found.id;
            customerCache.set(cKey, found.id);
            if (siteLocationVal && !found.siteDetails) {
              await prisma.customer.update({
                where: { id: found.id },
                data: { siteDetails: String(siteLocationVal).trim() },
              });
            }
          } else {
            const newCust = await prisma.customer.create({
              data: {
                name: clientName,
                email: customerEmail || null,
                siteDetails: siteLocationVal ? String(siteLocationVal).trim() : null,
                address: siteLocationVal ? String(siteLocationVal).trim() : null,
                externalRef: `CUST-${clientName.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, "")}-${Date.now().toString().slice(-4)}`,
              },
            });
            customerId = newCust.id;
            customerCache.set(cKey, newCust.id);
          }
        }
      } else if (customerEmail) {
        const found = await prisma.customer.findUnique({ where: { email: customerEmail } });
        if (found) customerId = found.id;
      }

      if (!customerId) {
        const defaultCust = await prisma.customer.findFirst();
        if (defaultCust) {
          customerId = defaultCust.id;
        } else {
          const createdCust = await prisma.customer.create({
            data: { name: clientName || "General Client" },
          });
          customerId = createdCust.id;
        }
      }

      // 3. Resolve or Auto-create Service Type (Duplicate-Proof)
      let serviceTypeId: string | null = null;
      const serviceName = purposeVal
        ? String(purposeVal).trim()
        : systemVal
        ? `System: ${String(systemVal).trim()}`
        : null;

      if (serviceName) {
        const stKey = serviceName.toLowerCase();
        if (serviceTypeCache.has(stKey)) {
          serviceTypeId = serviceTypeCache.get(stKey)!;
        } else {
          const foundSt = await prisma.serviceType.findFirst({
            where: { name: { equals: serviceName, mode: "insensitive" } },
          });
          if (foundSt) {
            serviceTypeId = foundSt.id;
            serviceTypeCache.set(stKey, foundSt.id);
          } else {
            const newSt = await prisma.serviceType.create({
              data: {
                name: serviceName,
                description: systemVal ? `System: ${String(systemVal).trim()}` : `Imported: ${serviceName}`,
                color: "#3b82f6",
                defaultDuration: 60,
              },
            });
            serviceTypeId = newSt.id;
            serviceTypeCache.set(stKey, newSt.id);
          }
        }
      }

      // 4. Resolve or Auto-create Assigned Engineer / Technician (Duplicate-Proof)
      let technicianId: string | null = null;
      const engineerName = engineerVal ? String(engineerVal).trim() : null;
      if (engineerName) {
        const techKey = engineerName.toLowerCase();
        if (technicianCache.has(techKey)) {
          technicianId = technicianCache.get(techKey)!;
        } else {
          const foundTech = await prisma.user.findFirst({
            where: { name: { contains: engineerName, mode: "insensitive" } },
          });
          if (foundTech) {
            technicianId = foundTech.id;
            technicianCache.set(techKey, foundTech.id);
          } else {
            const safeSlug = engineerName.toLowerCase().replace(/[^a-z0-9]/g, "") || "tech";
            const techEmail = `${safeSlug}@fireticket.local`;
            const existingUser = await prisma.user.findUnique({ where: { email: techEmail } });
            if (existingUser) {
              technicianId = existingUser.id;
              technicianCache.set(techKey, existingUser.id);
            } else {
              const newTech = await prisma.user.create({
                data: {
                  name: engineerName,
                  email: techEmail,
                  password: "changeme123",
                  role: "TECHNICIAN",
                },
              });
              technicianId = newTech.id;
              technicianCache.set(techKey, newTech.id);
            }
          }
        }
      }

      // 5. Status
      let status = "NEW";
      const sRaw = (statusVal || "").toString().trim().toUpperCase();
      const dateClosed = parseExcelDate(dateClosedVal);

      if (
        sRaw.includes("COMPLET") ||
        sRaw.includes("CLOSE") ||
        sRaw.includes("RESOLV") ||
        sRaw.includes("DONE") ||
        sRaw.includes("FINISH")
      ) {
        status = "CLOSED";
      } else if (sRaw.includes("PROGRESS") || sRaw.includes("WIP") || sRaw.includes("ONGOING") || sRaw.includes("ON SITE")) {
        status = "IN_PROGRESS";
      } else if (sRaw.includes("PENDING") || sRaw.includes("PARTS") || sRaw.includes("WAIT")) {
        status = "PENDING_PARTS";
      } else if (sRaw.includes("ASSIGN") || technicianId) {
        status = "ASSIGNED";
      } else if (dateClosed) {
        status = "CLOSED";
      }

      // 6. Priority
      let priority = "MEDIUM";
      const tRaw = (typeVal || "").toString().trim().toUpperCase();
      if (tRaw.includes("EMERGENCY") || tRaw.includes("URGENT")) {
        priority = "EMERGENCY";
      } else if (tRaw.includes("COMPLAINT") || tRaw.includes("HIGH")) {
        priority = "HIGH";
      } else if (tRaw.includes("LOW")) {
        priority = "LOW";
      } else if (tRaw.includes("REQUEST") || tRaw.includes("MEDIUM")) {
        priority = "MEDIUM";
      }

      // 7. Dates
      const ticketDate = parseExcelDate(dateVal) || new Date();

      // 8. Build detailed title and notes
      let title = titleVal ? String(titleVal).trim() : "";
      if (!title) {
        const pStr = purposeVal ? String(purposeVal).trim() : "";
        const locStr = siteLocationVal ? ` (${String(siteLocationVal).trim()})` : "";
        if (pStr && clientName) {
          title = `${pStr} - ${clientName}${locStr}`;
        } else if (pStr) {
          title = `${pStr}${locStr}`;
        } else if (clientName) {
          title = `Site Visit - ${clientName}${locStr}`;
        } else {
          title = `Field Visit #${ticketNumVal || rowNum}`;
        }
      }

      // Compile notes from visit details
      const notesParts: string[] = [];
      if (siteLocationVal) notesParts.push(`Location: ${siteLocationVal}`);
      if (systemVal) notesParts.push(`System: ${systemVal}`);
      if (teamVal) notesParts.push(`Team: ${teamVal}`);
      if (timeInVal || timeOutVal) notesParts.push(`Hours: ${timeInVal || "?"} - ${timeOutVal || "?"} (${hoursOnSiteVal || "?"}h)`);
      if (workDoneVal) notesParts.push(`Work Done: ${workDoneVal}`);
      if (nextActionVal) notesParts.push(`Next Action: ${nextActionVal}`);
      if (linkedTicketVal) notesParts.push(`Linked Ref: ${linkedTicketVal}`);

      const notes = notesParts.join(" | ") || null;
      const description = workDoneVal ? String(workDoneVal).trim() : (notes || title);

      // 9. Ticket / Visit Number & Signature Key for Duplicate Prevention
      const startOfDay = new Date(ticketDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(ticketDate);
      endOfDay.setHours(23, 59, 59, 999);

      const sigKey = customerId
        ? `${customerId}_${startOfDay.toISOString()}_${(title || purposeVal || "ticket").toString().toLowerCase()}`
        : null;

      let existing = null;
      if (ticketNumVal) {
        const tNum = String(ticketNumVal).trim();
        if (batchTicketMap.has(tNum)) {
          existing = batchTicketMap.get(tNum);
        } else {
          existing = await prisma.ticket.findFirst({
            where: {
              OR: [
                { ticketNumber: tNum },
                { externalRef: tNum },
              ],
            },
          });
        }
      }

      // If no ticket number given or not found by number:
      // Prevent duplicate by matching customer + same date + (matching title OR matching service type)
      if (!existing && customerId) {
        if (sigKey && batchTicketMap.has(sigKey)) {
          existing = batchTicketMap.get(sigKey);
        } else {
          existing = await prisma.ticket.findFirst({
            where: {
              customerId,
              createdAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
              OR: [
                { title: { equals: title, mode: "insensitive" } },
                ...(serviceTypeId ? [{ serviceTypeId }] : []),
              ],
            },
          });
        }
      }

      const ticketNumber = existing
        ? existing.ticketNumber
        : ticketNumVal
        ? String(ticketNumVal).trim()
        : generateTicketNumber();

      if (existing) {
        await prisma.ticket.update({
          where: { id: existing.id },
          data: {
            title,
            description: description || existing.description,
            status,
            priority,
            customerId,
            serviceTypeId: serviceTypeId || existing.serviceTypeId,
            technicianId: technicianId || existing.technicianId,
            resolvedDate: dateClosed || (status === "CLOSED" ? existing.resolvedDate || new Date() : null),
            notes: notes || existing.notes,
          },
        });

        // Add comment only if not already present (prevents duplicate comments on re-upload)
        if (workDoneVal) {
          const authorId = technicianId || currentUserId || (await prisma.user.findFirst())?.id;
          if (authorId) {
            const commentText = String(workDoneVal).trim();
            const existingComment = await prisma.ticketComment.findFirst({
              where: {
                ticketId: existing.id,
                content: commentText,
              },
            });
            if (!existingComment) {
              await prisma.ticketComment.create({
                data: {
                  ticketId: existing.id,
                  userId: authorId,
                  content: commentText,
                },
              });
            }
          }
        }

        batchTicketMap.set(ticketNumber, existing);
        if (sigKey) batchTicketMap.set(sigKey, existing);

        updated++;
        records.push({ refNumber: ticketNumber, clientName: clientName || "N/A", type: "Ticket/Visit", status, action: "UPDATED" });
      } else {
        const createdTicket = await prisma.ticket.create({
          data: {
            ticketNumber,
            title,
            description,
            status,
            priority,
            customerId,
            serviceTypeId,
            technicianId,
            createdAt: ticketDate,
            resolvedDate: dateClosed || (status === "CLOSED" ? new Date() : null),
            notes,
            externalRef: ticketNumber,
          },
        });

        if (workDoneVal) {
          const authorId = technicianId || currentUserId || (await prisma.user.findFirst())?.id;
          if (authorId) {
            await prisma.ticketComment.create({
              data: {
                ticketId: createdTicket.id,
                userId: authorId,
                content: String(workDoneVal).trim(),
              },
            });
          }
        }

        batchTicketMap.set(ticketNumber, createdTicket);
        if (sigKey) batchTicketMap.set(sigKey, createdTicket);

        created++;
        records.push({ refNumber: ticketNumber, clientName: clientName || "N/A", type: "Ticket/Visit", status, action: "CREATED" });
      }
    } catch (err: any) {
      failed++;
      errors.push(`Row ${rowNum}: ${err.message || "Failed to process visit row"}`);
    }
  }

  return { created, updated, failed, errors, records };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PRE-QCDD CHECKS & INSPECTIONS PARSER
// ─────────────────────────────────────────────────────────────────────────────
export async function syncInspectionsFromRows(
  rows: any[],
  currentUserId?: string,
  customMapping?: Record<string, string>
): Promise<SyncResult> {
  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const records: SyncResult["records"] = [];

  // In-memory caches to prevent duplicates in current sync batch
  const customerCache = new Map<string, string>();
  const batchInspectionMap = new Map<string, any>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    try {
      const getMapped = (fieldKey: string, ...patterns: (string | RegExp)[]) => {
        if (customMapping && customMapping[fieldKey]) {
          const colName = customMapping[fieldKey];
          if (colName === "__skip__") return undefined;
          if (colName && colName !== "__auto__") {
            const val = row[colName];
            if (val !== undefined && val !== null && String(val).trim() !== "") return val;
          }
        }
        return getRowValue(row, ...patterns);
      };

      // Columns from user screenshot with custom mapping priority & fallback matching:
      // Date, Client Name, Type (Pre-QCDD Check/Inspection), Status, Engineer, Result (Pass/Fail/N-A)
      const dateVal = getMapped("date", "Date", "Inspection Date", "Scheduled Date");
      const clientNameVal = getMapped("clientName", "Client Name", "Customer Name", "Client", "Customer", "Company");
      const typeVal = getMapped("type", "Type (Pre-QCDD Check/Inspection)", "Type", "Inspection Type", "Category");
      const statusVal = getMapped("status", "Status", "Inspection Status");
      const engineerVal = getMapped("engineer", "Engineer", "Assigned Engineer", "Inspector", "Technician");
      const resultVal = getMapped("result", "Result (Pass/Fail/N-A)", "Result", "Overall Result", "Pass/Fail", "Result (Pass/Fail)");
      const insNumVal = getMapped("inspectionNumber", "Inspection #", "Inspection Number", "InspectionNo", "QCDD Ref #");

      const clientName = (clientNameVal || "").toString().trim();
      if (!clientName && !dateVal && !typeVal) {
        continue;
      }

      // 1. Resolve or Create Customer (Duplicate-Proof)
      let customerId: string | null = null;
      if (clientName) {
        const cKey = clientName.toLowerCase();
        if (customerCache.has(cKey)) {
          customerId = customerCache.get(cKey)!;
        } else {
          const found = await prisma.customer.findFirst({
            where: { name: { equals: clientName, mode: "insensitive" } },
          });
          if (found) {
            customerId = found.id;
            customerCache.set(cKey, found.id);
          } else {
            const newCust = await prisma.customer.create({
              data: {
                name: clientName,
                externalRef: `CUST-${clientName.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, "")}-${Date.now().toString().slice(-4)}`,
              },
            });
            customerId = newCust.id;
            customerCache.set(cKey, newCust.id);
          }
        }
      }

      if (!customerId) {
        const fallback = await prisma.customer.findFirst();
        customerId = fallback ? fallback.id : (await prisma.customer.create({ data: { name: "General Client" } })).id;
      }

      // 2. Type (e.g. Pre-QCDD Check or Inspection)
      const inspectionType = typeVal ? String(typeVal).trim() : "Pre-QCDD Check";

      // 3. Result (PASS / FAIL / N/A)
      let overallResult: string | null = null;
      const rRaw = (resultVal || "").toString().trim().toUpperCase();
      if (rRaw.includes("PASS")) overallResult = "PASS";
      else if (rRaw.includes("FAIL")) overallResult = "FAIL";
      else if (rRaw.includes("N-A") || rRaw.includes("N/A") || rRaw.includes("NA")) overallResult = "N/A";

      // 4. Status
      let status = "SCHEDULED";
      const sRaw = (statusVal || "").toString().trim().toUpperCase();
      if (sRaw.includes("COMPLET") || sRaw.includes("DONE") || overallResult) {
        status = overallResult === "PASS" ? "PASSED" : overallResult === "FAIL" ? "FAILED" : "COMPLETED";
      } else if (sRaw.includes("PROGRESS") || sRaw.includes("WIP")) {
        status = "IN_PROGRESS";
      }

      // 5. Date
      const insDate = parseExcelDate(dateVal) || new Date();
      const startOfDay = new Date(insDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(insDate);
      endOfDay.setHours(23, 59, 59, 999);

      const insSigKey = customerId
        ? `${customerId}_${inspectionType.toLowerCase()}_${startOfDay.toISOString()}`
        : null;

      // 6. Notes
      const engineerName = engineerVal ? String(engineerVal).trim() : null;
      const notes = engineerName ? `Inspecting Engineer: ${engineerName}` : null;

      // 7. Deduplicate inspection:
      let existing = null;
      if (insNumVal) {
        const num = String(insNumVal).trim();
        if (batchInspectionMap.has(num)) {
          existing = batchInspectionMap.get(num);
        } else {
          existing = await prisma.inspection.findFirst({
            where: { inspectionNumber: num },
          });
        }
      }

      // If no inspection number given, deduplicate by customer + type + same day
      if (!existing && customerId) {
        if (insSigKey && batchInspectionMap.has(insSigKey)) {
          existing = batchInspectionMap.get(insSigKey);
        } else {
          existing = await prisma.inspection.findFirst({
            where: {
              customerId,
              type: inspectionType,
              scheduledDate: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          });
        }
      }

      const inspectionNumber = existing
        ? existing.inspectionNumber
        : insNumVal
        ? String(insNumVal).trim()
        : `QCDD-${insDate.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (existing) {
        await prisma.inspection.update({
          where: { id: existing.id },
          data: {
            status,
            overallResult: overallResult || existing.overallResult,
            notes: notes || existing.notes,
            completedDate: status === "PASSED" || status === "FAILED" || status === "COMPLETED" ? insDate : null,
          },
        });

        batchInspectionMap.set(inspectionNumber, existing);
        if (insSigKey) batchInspectionMap.set(insSigKey, existing);

        updated++;
        records.push({ refNumber: existing.inspectionNumber, clientName, type: inspectionType, status, action: "UPDATED" });
      } else {
        const createdIns = await prisma.inspection.create({
          data: {
            inspectionNumber,
            type: inspectionType,
            scheduledDate: insDate,
            completedDate: status === "PASSED" || status === "FAILED" || status === "COMPLETED" ? insDate : null,
            status,
            overallResult,
            notes,
            customerId,
          },
        });

        batchInspectionMap.set(inspectionNumber, createdIns);
        if (insSigKey) batchInspectionMap.set(insSigKey, createdIns);

        created++;
        records.push({ refNumber: createdIns.inspectionNumber, clientName, type: inspectionType, status, action: "CREATED" });
      }
    } catch (err: any) {
      failed++;
      errors.push(`Row ${rowNum}: ${err.message || "Failed to process inspection row"}`);
    }
  }

  return { created, updated, failed, errors, records };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CUSTOMERS PARSER
// ─────────────────────────────────────────────────────────────────────────────
export async function syncCustomersFromRows(rows: any[]): Promise<SyncResult> {
  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const records: SyncResult["records"] = [];
  const batchCustomerMap = new Map<string, any>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    try {
      const emailVal = getRowValue(row, "Email", "Customer Email", "Client Email");
      const extRefVal = getRowValue(row, "External Ref", "Ref #", "Customer ID", "Customer Code");
      const nameVal = getRowValue(row, "Name", "Customer Name", "Client Name", "Client", "Company");
      const name = nameVal ? String(nameVal).trim() : "";
      if (!name) continue;

      const email = emailVal ? String(emailVal).trim().toLowerCase() : null;
      const externalRef = extRefVal ? String(extRefVal).trim() : null;
      const phone = getRowValue(row, "Phone", "Telephone", "Mobile");
      const address = getRowValue(row, "Address", "Street", "Location", "Site");
      const city = getRowValue(row, "City", "Town");
      const state = getRowValue(row, "State", "Province");
      const zipCode = getRowValue(row, "Zip Code", "Zip", "Postal Code");
      const contactPerson = getRowValue(row, "Contact Person", "Contact");
      const notes = getRowValue(row, "Notes", "Remarks");

      const data = {
        name,
        email: email || null,
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
        siteDetails: address ? String(address).trim() : null,
        city: city ? String(city).trim() : null,
        state: state ? String(state).trim() : null,
        zipCode: zipCode ? String(zipCode).trim() : null,
        contactPerson: contactPerson ? String(contactPerson).trim() : null,
        notes: notes ? String(notes).trim() : null,
        externalRef: externalRef || null,
      };

      const nameKey = name.toLowerCase();
      let existing = null;

      if (externalRef && batchCustomerMap.has(externalRef)) {
        existing = batchCustomerMap.get(externalRef);
      } else if (email && batchCustomerMap.has(email)) {
        existing = batchCustomerMap.get(email);
      } else if (batchCustomerMap.has(nameKey)) {
        existing = batchCustomerMap.get(nameKey);
      }

      if (!existing) {
        existing = externalRef
          ? await prisma.customer.findUnique({ where: { externalRef } })
          : email
          ? await prisma.customer.findUnique({ where: { email } })
          : await prisma.customer.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
      }

      if (existing) {
        await prisma.customer.update({ where: { id: existing.id }, data });
        batchCustomerMap.set(nameKey, existing);
        if (externalRef) batchCustomerMap.set(externalRef, existing);
        if (email) batchCustomerMap.set(email, existing);

        updated++;
        records.push({ refNumber: existing.externalRef || existing.id.substring(0, 8), clientName: name, type: "Customer", status: "UPDATED", action: "UPDATED" });
      } else {
        const createdCust = await prisma.customer.create({
          data: {
            ...data,
            externalRef: externalRef || `CUST-${name.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, "")}-${Date.now().toString().slice(-4)}`,
          },
        });
        batchCustomerMap.set(nameKey, createdCust);
        if (externalRef) batchCustomerMap.set(externalRef, createdCust);
        if (email) batchCustomerMap.set(email, createdCust);

        created++;
        records.push({ refNumber: createdCust.externalRef || createdCust.id.substring(0, 8), clientName: name, type: "Customer", status: "ACTIVE", action: "CREATED" });
      }
    } catch (e: any) {
      failed++;
      errors.push(`Row ${rowNum}: ${e.message || "Failed to process customer"}`);
    }
  }

  return { created, updated, failed, errors, records };
}

export function detectSheetType(
  sheetName: string,
  firstRow: Record<string, any>
): "INSPECTIONS" | "CUSTOMERS" | "VISITS" | "TICKETS" {
  const sNameLower = sheetName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const keys = Object.keys(firstRow || {}).map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ""));

  if (
    sNameLower.includes("qcdd") ||
    sNameLower.includes("inspect") ||
    keys.some((k) => k.includes("qcdd") || k.includes("passfail") || k.includes("result") || k.includes("preqcdd"))
  ) {
    return "INSPECTIONS";
  }

  if (
    sNameLower.includes("visit") ||
    keys.some((k) => k.includes("visitref") || k.includes("hoursonsite") || k.includes("timein") || k.includes("workdone"))
  ) {
    return "VISITS";
  }

  if (
    sNameLower.includes("customer") ||
    sNameLower.includes("client") ||
    (keys.some((k) => k.includes("contactperson") || k.includes("zipcode")) &&
      !keys.some((k) => k.includes("ticket") || k.includes("visit") || k.includes("purpose")))
  ) {
    return "CUSTOMERS";
  }

  return "TICKETS";
}

export interface SheetSyncSummary {
  sheetName: string;
  totalRows: number;
  detectedType: "Site Visits" | "Pre-QCDD Checks" | "Tickets" | "Customers";
  created: number;
  updated: number;
  failed: number;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "EMPTY";
}

export interface WorkbookSyncResult extends SyncResult {
  sheetSummaries: SheetSyncSummary[];
  totalRows: number;
  sheetsFound: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MASTER WORKBOOK SYNC (SUPPORTS ALL PAGES & SHEETS IN THE SAME EXCEL FILE)
// ─────────────────────────────────────────────────────────────────────────────
export async function syncWorkbookFromBuffer(
  buffer: Buffer,
  currentUserId?: string,
  targetSheetNames?: string[],
  customMapping?: Record<string, string>
): Promise<WorkbookSyncResult> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let grandTotalRows = 0;
  const allErrors: string[] = [];
  const allRecords: SyncResult["records"] = [];
  const sheetSummaries: SheetSyncSummary[] = [];

  const sheetsToProcess =
    targetSheetNames && targetSheetNames.length > 0
      ? workbook.SheetNames.filter((s) => targetSheetNames.includes(s))
      : workbook.SheetNames;

  for (const sheetName of sheetsToProcess) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      sheetSummaries.push({
        sheetName,
        totalRows: 0,
        detectedType: "Tickets",
        created: 0,
        updated: 0,
        failed: 0,
        status: "EMPTY",
      });
      continue;
    }

    grandTotalRows += rows.length;
    const detected = detectSheetType(sheetName, rows[0]);
    let res: SyncResult;
    let label: SheetSyncSummary["detectedType"];

    if (detected === "INSPECTIONS") {
      label = "Pre-QCDD Checks";
      res = await syncInspectionsFromRows(rows, currentUserId, customMapping);
    } else if (detected === "CUSTOMERS") {
      label = "Customers";
      res = await syncCustomersFromRows(rows);
    } else if (detected === "VISITS") {
      label = "Site Visits";
      res = await syncTicketsFromRows(rows, currentUserId, customMapping);
    } else {
      label = "Tickets";
      res = await syncTicketsFromRows(rows, currentUserId, customMapping);
    }

    totalCreated += res.created;
    totalUpdated += res.updated;
    totalFailed += res.failed;
    allErrors.push(...res.errors);
    allRecords.push(...res.records);

    sheetSummaries.push({
      sheetName,
      totalRows: rows.length,
      detectedType: label,
      created: res.created,
      updated: res.updated,
      failed: res.failed,
      status: res.failed === 0 ? "SUCCESS" : res.created > 0 || res.updated > 0 ? "PARTIAL" : "FAILED",
    });
  }

  return {
    created: totalCreated,
    updated: totalUpdated,
    failed: totalFailed,
    totalRows: grandTotalRows,
    errors: allErrors,
    records: allRecords,
    sheetSummaries,
    sheetsFound: workbook.SheetNames,
  };
}

export const syncTicketsFromBuffer = syncWorkbookFromBuffer;
