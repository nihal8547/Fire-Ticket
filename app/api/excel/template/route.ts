import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "customers";

  let headers: string[] = [];
  let sampleRows: any[] = [];

  if (type === "customers") {
    headers = ["Name", "Email", "Phone", "Address", "City", "State", "Zip Code", "Contact Person", "Notes", "External Ref"];
    sampleRows = [
      ["Acme Fire Co", "contact@acme.com", "555-1234", "123 Main St", "Springfield", "IL", "62701", "John Smith", "VIP customer", "ACME-001"],
    ];
  } else if (type === "tickets") {
    headers = ["Title", "Description", "Customer Email", "Priority", "Status", "Notes", "Ticket Number", "External Ref"];
    sampleRows = [
      ["Annual Inspection", "Perform annual fire safety inspection", "contact@acme.com", "MEDIUM", "NEW", "", "", "EXT-001"],
    ];
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, type === "customers" ? "Customers" : "Tickets");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${type}-template.xlsx"`,
    },
  });
}
