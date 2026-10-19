import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const type = (formData.get("type") as string) || "customers";

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  let created = 0, updated = 0, failed = 0;
  const errors: string[] = [];

  if (type === "customers") {
    for (const row of rows) {
      try {
        const email = row["Email"]?.toString().trim().toLowerCase();
        const externalRef = row["External Ref"]?.toString().trim();
        const name = row["Name"]?.toString().trim();
        if (!name) { failed++; errors.push("Row missing Name"); continue; }
        const data = {
          name, email: email || null,
          phone: row["Phone"]?.toString().trim() || null,
          address: row["Address"]?.toString().trim() || null,
          city: row["City"]?.toString().trim() || null,
          state: row["State"]?.toString().trim() || null,
          zipCode: row["Zip Code"]?.toString().trim() || null,
          contactPerson: row["Contact Person"]?.toString().trim() || null,
          notes: row["Notes"]?.toString().trim() || null,
          externalRef: externalRef || null,
        };
        const existing = externalRef
          ? await prisma.customer.findUnique({ where: { externalRef } })
          : email ? await prisma.customer.findUnique({ where: { email } }) : null;
        if (existing) { await prisma.customer.update({ where: { id: existing.id }, data }); updated++; }
        else { await prisma.customer.create({ data }); created++; }
      } catch (e: any) { failed++; errors.push(e.message || "Unknown error"); }
    }
  } else if (type === "tickets") {
    for (const row of rows) {
      try {
        const title = row["Title"]?.toString().trim();
        const ticketNumber = row["Ticket Number"]?.toString().trim();
        const externalRef = row["External Ref"]?.toString().trim();
        const customerEmail = row["Customer Email"]?.toString().trim().toLowerCase();
        if (!title) { failed++; errors.push("Row missing Title"); continue; }
        let customerId: string | null = null;
        if (customerEmail) {
          const c = await prisma.customer.findUnique({ where: { email: customerEmail } });
          if (c) customerId = c.id;
        }
        if (!customerId) { failed++; errors.push(`Customer not found for: ${title}`); continue; }
        const data: any = {
          title, description: row["Description"]?.toString().trim() || null,
          priority: row["Priority"]?.toString().trim().toUpperCase() || "MEDIUM",
          status: row["Status"]?.toString().trim().toUpperCase() || "NEW",
          notes: row["Notes"]?.toString().trim() || null,
          customerId, externalRef: externalRef || null,
        };
        const existing = ticketNumber
          ? await prisma.ticket.findUnique({ where: { ticketNumber } })
          : externalRef ? await prisma.ticket.findFirst({ where: { externalRef } }) : null;
        if (existing) { await prisma.ticket.update({ where: { id: existing.id }, data }); updated++; }
        else {
          const { generateTicketNumber } = await import("@/lib/utils");
          await prisma.ticket.create({ data: { ...data, ticketNumber: ticketNumber || generateTicketNumber() } });
          created++;
        }
      } catch (e: any) { failed++; errors.push(e.message || "Unknown error"); }
    }
  }

  await prisma.excelImportLog.create({
    data: {
      fileName: file.name, type, totalRows: rows.length,
      newRecords: created, updated, failed,
      errors: errors.length > 0 ? JSON.stringify(errors.slice(0, 20)) : null,
      createdBy: (session.user as any).id,
    },
  });

  return NextResponse.json({ created, updated, failed, errors: errors.slice(0, 10) });
}
