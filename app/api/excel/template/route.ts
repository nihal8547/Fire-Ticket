import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "ALL").toUpperCase();

  const wb = XLSX.utils.book_new();

  // 1. Site Visits sheet (16 columns from user image 2)
  const visitsHeaders = [
    "Date",
    "Visit Ref #",
    "Client Name",
    "Site / Location",
    "Purpose of Visit",
    "System",
    "Engineer",
    "Team / Technicians",
    "Time In",
    "Time Out",
    "Hours on Site",
    "Work Done / Findings",
    "Next Action / Remarks",
    "Status",
    "Linked Ticket / RFQ / Job #",
    "Dashboard Seq (auto — do not edit)",
  ];
  const visitsRows = [
    [
      "30-Sep-2026",
      "ADM-SV-01",
      "QIMC",
      "ABA SALEEL",
      "Survey / Assessment",
      "Multiple",
      "MINHAJ",
      "SHIBU",
      "11:00",
      "12:30",
      "1.5",
      "Completed visual inspection and assessment of pumps and panels.",
      "Submit revised quote to client",
      "Completed",
      "TKT-0012",
      "1",
    ],
    [
      "02-Oct-2026",
      "ADM-SV-02",
      "DOHA FESTIVAL CITY",
      "ZONE 4",
      "Emergency Troubleshooting",
      "Fire Alarm",
      "AHMED",
      "RAVI",
      "09:30",
      "12:00",
      "2.5",
      "Replaced faulty smoke sensor in corridor.",
      "System restored to normal",
      "Completed",
      "TKT-0015",
      "2",
    ],
  ];

  // 2. Pre-QCDD Checks & Inspections sheet (6 columns from user image 1)
  const inspectionsHeaders = [
    "Date",
    "Client Name",
    "Type (Pre-QCDD Check/Inspection)",
    "Status",
    "Engineer",
    "Result (Pass/Fail/N-A)",
  ];
  const inspectionsRows = [
    [
      "28-Sep-2026",
      "MAGNA AUTO GARAGE",
      "Pre-QCDD Check",
      "Completed",
      "MINHAJ",
      "Fail",
    ],
    [
      "01-Oct-2026",
      "AL WAJBA WAREHOUSE",
      "Inspection",
      "Completed",
      "AHMED",
      "Pass",
    ],
    [
      "05-Oct-2026",
      "DOHA PETROLEUM CENTRE",
      "Pre-QCDD Check",
      "Scheduled",
      "MICHEL",
      "N-A",
    ],
  ];

  // 3. Support Tickets sheet (11 columns from image 1)
  const ticketsHeaders = [
    "Date Raised",
    "Ticket #",
    "Client Name",
    "Type (Emergency/Complaint/Request)",
    "Status",
    "Date Closed",
    "Request type",
    "Assigned Engineer",
    "Last Update",
    "Last Update Date",
    "Days Since Last Update (open tickets)",
  ];
  const ticketsRows = [
    [
      "15-Oct-2026",
      "TKT-0005",
      "SHARQ VILLAGE RESORT AND SPA",
      "Request",
      "Closed",
      "15-Oct-2026",
      "Site visit",
      "Michel",
      "Completed site maintenance and checked equipment",
      "15-Oct-2026",
      "0",
    ],
    [
      "18-Oct-2026",
      "TKT-0006",
      "GRAND HYATT DOHA",
      "Emergency",
      "In Progress",
      "",
      "Fire Alarm Inspection",
      "Ahmed",
      "Technician on route to property",
      "18-Oct-2026",
      "2",
    ],
  ];

  // 4. Customers sheet
  const customersHeaders = [
    "Name",
    "Email",
    "Phone",
    "Address",
    "City",
    "State",
    "Zip Code",
    "Contact Person",
    "Notes",
    "External Ref",
  ];
  const customersRows = [
    [
      "SHARQ VILLAGE RESORT AND SPA",
      "facilities@sharqvillage.qa",
      "+974 4425 6666",
      "Ras Abu Abboud",
      "Doha",
      "Qatar",
      "PO Box 2977",
      "Mohammed Al-Kuwari",
      "VIP Hospitality Client",
      "CUST-SHARQ",
    ],
  ];

  const addSheet = (headers: string[], rows: any[], name: string) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  let filename = "fireticket-template.xlsx";

  if (type === "VISITS" || type === "SITE_VISITS") {
    addSheet(visitsHeaders, visitsRows, "Site Visits");
    filename = "site-visits-template.xlsx";
  } else if (type === "INSPECTIONS" || type === "QCDD") {
    addSheet(inspectionsHeaders, inspectionsRows, "Pre-QCDD Checks");
    filename = "qcdd-inspections-template.xlsx";
  } else if (type === "TICKETS") {
    addSheet(ticketsHeaders, ticketsRows, "Tickets");
    filename = "tickets-template.xlsx";
  } else if (type === "CUSTOMERS") {
    addSheet(customersHeaders, customersRows, "Customers");
    filename = "customers-template.xlsx";
  } else {
    // Master workbook with all sheets
    addSheet(visitsHeaders, visitsRows, "Site Visits");
    addSheet(inspectionsHeaders, inspectionsRows, "Pre-QCDD Checks");
    addSheet(ticketsHeaders, ticketsRows, "Tickets");
    addSheet(customersHeaders, customersRows, "Customers");
    filename = "fireticket-master-template.xlsx";
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
