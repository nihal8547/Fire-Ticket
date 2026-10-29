"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  FileCheck,
  Building,
  UserCheck,
  Clock,
  Sparkles,
  ClipboardCheck,
  MapPin,
  Layers,
  CheckSquare,
  Square,
  ShieldCheck,
  SlidersHorizontal,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SheetInfo {
  name: string;
  rowCount: number;
  detectedType: "Site Visits" | "Pre-QCDD Checks" | "Support Tickets" | "Customers";
  selected: boolean;
}

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  hint: string;
  category: "ticket" | "inspection" | "all";
  aliases: string[];
}

const SYSTEM_FIELDS: FieldDef[] = [
  {
    key: "clientName",
    label: "Client / Customer Name",
    required: true,
    hint: "Required. Creates client if not found in database",
    category: "all",
    aliases: ["client name", "customer name", "client", "customer", "company"],
  },
  {
    key: "ticketNumber",
    label: "Visit Ref # / Ticket #",
    hint: "Identifier like ADM-SV-01, TKT-001 (used to prevent duplicates)",
    category: "ticket",
    aliases: ["visit ref #", "visit ref", "visitref#", "ticket #", "ticketno", "ticket number", "ticket id", "ticket"],
  },
  {
    key: "date",
    label: "Date",
    hint: "Visit date, inspection date, or date raised",
    category: "all",
    aliases: ["date", "date raised", "inspection date", "scheduled date", "raised date"],
  },
  {
    key: "siteLocation",
    label: "Site / Location",
    hint: "Site address, building, or location details",
    category: "ticket",
    aliases: ["site / location", "site/location", "site", "location", "address"],
  },
  {
    key: "purpose",
    label: "Purpose of Visit / Service Type",
    hint: "Survey, Inspection, PPM, Repair, etc.",
    category: "ticket",
    aliases: ["purpose of visit", "purpose", "request type", "service type", "service"],
  },
  {
    key: "system",
    label: "Fire System / Equipment",
    hint: "Fire Alarm, Sprinkler, Pumps, FM200, Multiple",
    category: "ticket",
    aliases: ["system", "fire system", "equipment"],
  },
  {
    key: "engineer",
    label: "Assigned Engineer / Inspector",
    hint: "Assigned technician or lead engineer",
    category: "all",
    aliases: ["engineer", "assigned engineer", "technician", "assigned technician", "inspector", "assigned to"],
  },
  {
    key: "team",
    label: "Team / Technicians",
    hint: "Assisting technician(s)",
    category: "ticket",
    aliases: ["team / technicians", "team", "technicians", "team/technicians"],
  },
  {
    key: "timeIn",
    label: "Time In",
    hint: "Arrival time, e.g. 11:00 AM",
    category: "ticket",
    aliases: ["time in", "timein"],
  },
  {
    key: "timeOut",
    label: "Time Out",
    hint: "Departure time, e.g. 12:30 PM",
    category: "ticket",
    aliases: ["time out", "timeout"],
  },
  {
    key: "hoursOnSite",
    label: "Hours on Site",
    hint: "Duration in hours, e.g. 1.5",
    category: "ticket",
    aliases: ["hours on site", "hours", "duration"],
  },
  {
    key: "workDone",
    label: "Work Done / Findings",
    hint: "Field notes & work performed description",
    category: "ticket",
    aliases: ["work done / findings", "work done", "findings", "last update", "description", "details"],
  },
  {
    key: "nextAction",
    label: "Next Action / Remarks",
    hint: "Follow-up items, quotation, remarks",
    category: "ticket",
    aliases: ["next action / remarks", "next action", "remarks", "notes"],
  },
  {
    key: "status",
    label: "Status",
    hint: "Completed, In Progress, Pending Parts, Scheduled",
    category: "all",
    aliases: ["status", "ticket status", "inspection status"],
  },
  {
    key: "result",
    label: "Inspection Result (Pass/Fail/N-A)",
    hint: "QCDD result: Pass, Fail, or N/A",
    category: "inspection",
    aliases: ["result (pass/fail/n-a)", "result", "overall result", "pass/fail", "result (pass/fail)"],
  },
  {
    key: "inspectionNumber",
    label: "Inspection Ref #",
    hint: "QCDD Inspection reference number",
    category: "inspection",
    aliases: ["inspection #", "inspection number", "inspectionno", "qcdd ref #"],
  },
  {
    key: "type",
    label: "Type / Category / Priority",
    hint: "Pre-QCDD Check, Inspection, Emergency, Complaint",
    category: "all",
    aliases: ["type (pre-qcdd check/inspection)", "type (emergency/complaint/request)", "type", "priority"],
  },
  {
    key: "linkedTicket",
    label: "Linked Ticket / RFQ / Job #",
    hint: "Cross-reference ticket or job code",
    category: "ticket",
    aliases: ["linked ticket / rfq / job #", "linked ticket", "job #", "rfq #"],
  },
  {
    key: "customerEmail",
    label: "Customer Email",
    hint: "Contact email address",
    category: "all",
    aliases: ["customer email", "email", "client email"],
  },
];

export function ExcelUploadCard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedSheets, setDetectedSheets] = useState<SheetInfo[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showMappingPanel, setShowMappingPanel] = useState(false);
  const [filterCategory, setFilterCategory] = useState<"all" | "ticket" | "inspection">("all");
  const [parsingWorkbook, setParsingWorkbook] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeFormatTab, setActiveFormatTab] = useState<"visits" | "qcdd" | "tickets">("visits");

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/synology/config");
      if (res.ok) {
        const data = await res.json();
        if (data.recentLogs) setLogs(data.recentLogs);
      }
    } catch (e) {
      console.error("Failed to load logs", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const inspectFileSheets = async (file: File) => {
    setParsingWorkbook(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/excel/inspect", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to inspect Excel file on backend");
      }

      const allHeaders: string[] = data.headers || [];
      const sheets: SheetInfo[] = data.sheets || [];
      const suggestedMapping: Record<string, string> = data.suggestedMapping || {};

      setExcelHeaders(allHeaders);
      setDetectedSheets(sheets);

      // Build mapping with default empty strings for unmatched fields
      const fullMapping: Record<string, string> = {};
      const matchedHeaders = new Set<string>();

      for (const field of SYSTEM_FIELDS) {
        if (suggestedMapping[field.key]) {
          fullMapping[field.key] = suggestedMapping[field.key];
          matchedHeaders.add(suggestedMapping[field.key]);
        } else {
          fullMapping[field.key] = "";
        }
      }

      setColumnMapping(fullMapping);

      // If there are unmapped headers, expand the mapping panel automatically
      const unmapped = allHeaders.filter((h) => !matchedHeaders.has(h));
      if (unmapped.length > 0) {
        setShowMappingPanel(true);
      }
    } catch (err) {
      console.error("Backend Excel inspection error:", err);
      setDetectedSheets([]);
      setExcelHeaders([]);
      setColumnMapping({});
    } finally {
      setParsingWorkbook(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setResult(null);
      inspectFileSheets(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setResult(null);
      inspectFileSheets(file);
    }
  };

  const handleResetMapping = () => {
    const autoMapping: Record<string, string> = {};
    for (const field of SYSTEM_FIELDS) {
      const match = excelHeaders.find((h) => {
        const hNorm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        return field.aliases.some((a) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === hNorm);
      });
      autoMapping[field.key] = match || "";
    }
    setColumnMapping(autoMapping);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const selectedNames = detectedSheets.filter((s) => s.selected).map((s) => s.name);
      if (selectedNames.length > 0) {
        formData.append("sheets", JSON.stringify(selectedNames));
      }

      // Pass user-configured column mapping
      formData.append("mapping", JSON.stringify(columnMapping));

      const res = await fetch("/api/excel/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
      if (data.success) {
        fetchLogs();
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || "Upload and sync failed due to network error",
      });
    } finally {
      setUploading(false);
    }
  };

  const selectedCount = detectedSheets.filter((s) => s.selected).length;

  // Compute mapped vs unmapped headers in uploaded file
  const mappedExcelCols = new Set(Object.values(columnMapping).filter((v) => v && v !== "__skip__"));
  const unmappedExcelCols = excelHeaders.filter((h) => !mappedExcelCols.has(h));

  const filteredFields = SYSTEM_FIELDS.filter((f) => {
    if (filterCategory === "all") return true;
    return f.category === filterCategory || f.category === "all";
  });

  return (
    <div className="space-y-6">
      {/* Main Upload Card */}
      <Card className="border-gray-200 shadow-xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Excel Auto-Sync with Manual Column Configuration
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Upload spreadsheets to auto-sync Site Visits, Pre-QCDD Checks, and Tickets. Supports <b>custom column mapping</b> and <b>multiple pages</b>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/excel/template?type=ALL"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-800 hover:bg-gray-50 shadow-2xs"
              >
                <Download className="h-3.5 w-3.5 text-green-600" />
                Master Multi-Sheet Workbook (.xlsx)
              </a>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Format Specification Banner */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-blue-100 pb-2.5">
              <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Standard Column Formats (Auto-Mapped or Custom-Configurable)
              </span>

              {/* Sub-tabs for previewing columns */}
              <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-lg border border-blue-200 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveFormatTab("visits")}
                  className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                    activeFormatTab === "visits"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  Site Visits (16 Cols)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormatTab("qcdd")}
                  className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                    activeFormatTab === "qcdd"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  Pre-QCDD Checks (6 Cols)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormatTab("tickets")}
                  className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                    activeFormatTab === "tickets"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  Support Tickets (11 Cols)
                </button>
              </div>
            </div>

            {/* TAB 1: SITE VISITS */}
            {activeFormatTab === "visits" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-blue-950">
                  <span className="font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    Field Site Visits & Survey Reports:
                  </span>
                  <a
                    href="/api/excel/template?type=VISITS"
                    download
                    className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Download className="h-3 w-3" /> Download Visits Template
                  </a>
                </div>
                <div className="overflow-x-auto pb-1">
                  <div className="flex gap-1.5 min-w-max text-[11px]">
                    {[
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
                    ].map((col, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded bg-white border border-blue-200 text-blue-900 font-medium whitespace-nowrap shadow-2xs"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PRE-QCDD CHECKS */}
            {activeFormatTab === "qcdd" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-blue-950">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5 text-blue-600" />
                    Pre-QCDD Checks & Inspections:
                  </span>
                  <a
                    href="/api/excel/template?type=INSPECTIONS"
                    download
                    className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Download className="h-3 w-3" /> Download QCDD Template
                  </a>
                </div>
                <div className="overflow-x-auto pb-1">
                  <div className="flex gap-2 min-w-max text-[11px]">
                    {[
                      "Date",
                      "Client Name",
                      "Type (Pre-QCDD Check/Inspection)",
                      "Status",
                      "Engineer",
                      "Result (Pass/Fail/N-A)",
                    ].map((col, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded bg-white border border-blue-200 text-blue-900 font-medium whitespace-nowrap shadow-2xs"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SUPPORT TICKETS */}
            {activeFormatTab === "tickets" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-blue-950">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    Support & Maintenance Tickets:
                  </span>
                  <a
                    href="/api/excel/template?type=TICKETS"
                    download
                    className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Download className="h-3 w-3" /> Download Tickets Template
                  </a>
                </div>
                <div className="overflow-x-auto pb-1">
                  <div className="flex gap-1.5 min-w-max text-[11px]">
                    {[
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
                    ].map((col, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded bg-white border border-blue-200 text-blue-900 font-medium whitespace-nowrap shadow-2xs"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs text-blue-800">
              <div className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Auto-creates Clients if missing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Auto-maps Engineers & Technicians</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Fetches all workbook pages/sheets</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="text-emerald-800 font-semibold">Duplicate Prevention Active</span>
              </div>
            </div>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("excel-file-input")?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-red-500 bg-red-50/50"
                : selectedFile
                ? "border-green-400 bg-green-50/30"
                : "border-gray-300 hover:border-gray-400 bg-gray-50/40"
            }`}
          >
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <FileCheck className="h-10 w-10 text-green-600 mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB · {detectedSheets.length} page(s) · {excelHeaders.length} columns found
                  </p>
                </div>
                <p className="text-xs text-blue-600 font-medium pt-1">
                  Click or drag another file to replace
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 text-gray-400 mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Drop your Excel file here, or{" "}
                    <span className="text-red-600 hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Supports any column names (auto-detects or manually maps them)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* MULTI-PAGE / SHEET SELECTOR */}
          {selectedFile && detectedSheets.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-red-600" />
                    Detected Excel Pages / Sheets ({detectedSheets.length} found)
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Select which pages/sheets you want to fetch and sync from this Excel file:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetectedSheets(detectedSheets.map((s) => ({ ...s, selected: true })))}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setDetectedSheets(detectedSheets.map((s) => ({ ...s, selected: false })))}
                    className="text-[11px] font-semibold text-gray-600 hover:text-gray-800 underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {detectedSheets.map((sheet, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setDetectedSheets(
                        detectedSheets.map((s, i) => (i === idx ? { ...s, selected: !s.selected } : s))
                      );
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      sheet.selected
                        ? "bg-white border-red-500 shadow-xs ring-1 ring-red-500/30"
                        : "bg-white/60 border-gray-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {sheet.selected ? (
                        <CheckSquare className="h-4 w-4 text-red-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{sheet.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                              sheet.detectedType === "Site Visits"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : sheet.detectedType === "Pre-QCDD Checks"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : sheet.detectedType === "Customers"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-orange-50 text-orange-700 border-orange-200"
                            }`}
                          >
                            {sheet.detectedType}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {sheet.rowCount > 0 ? `${sheet.rowCount} rows` : "Empty"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MANUAL COLUMN CONFIGURATION / FIELD MAPPER */}
          {selectedFile && excelHeaders.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
              <div
                onClick={() => setShowMappingPanel(!showMappingPanel)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-gray-50/80 cursor-pointer hover:bg-gray-100/70 border-b border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="h-4 w-4 text-red-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                      Configure & Map Excel Columns
                      {unmappedExcelCols.length > 0 ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {unmappedExcelCols.length} Unmapped Columns
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-green-200 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          All Columns Auto-Mapped
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Match columns from your uploaded Excel sheet to FireTicket system fields.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-[11px] text-gray-600 font-medium">
                    {showMappingPanel ? "Collapse Mapping" : "Customize / View Mapping"}
                  </span>
                  {showMappingPanel ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </div>
              </div>

              {showMappingPanel && (
                <div className="p-4 space-y-4">
                  {/* Alert if unmapped columns exist */}
                  {unmappedExcelCols.length > 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        Unmapped Excel Columns Found:
                      </div>
                      <p className="text-[11px] text-amber-800">
                        The following columns from your Excel file were not automatically recognized. You can assign them to any field below:
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {unmappedExcelCols.map((col, idx) => (
                          <span
                            key={idx}
                            className="bg-white border border-amber-300 text-amber-900 px-2 py-0.5 rounded font-mono font-medium text-[11px] shadow-2xs"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filter tabs and Reset button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setFilterCategory("all")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          filterCategory === "all" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        All Fields ({SYSTEM_FIELDS.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterCategory("ticket")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          filterCategory === "ticket" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Site Visits & Tickets
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterCategory("inspection")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          filterCategory === "inspection" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Pre-QCDD Checks
                      </button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetMapping}
                      className="text-xs h-7 gap-1.5 text-gray-600 hover:text-gray-900"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset to Auto-Detect
                    </Button>
                  </div>

                  {/* Column Mapping Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {filteredFields.map((field) => {
                      const currentVal = columnMapping[field.key] || "";
                      const isMapped = currentVal && currentVal !== "__skip__";
                      const isSkipped = currentVal === "__skip__";

                      return (
                        <div
                          key={field.key}
                          className={`p-3 rounded-lg border transition-all ${
                            isMapped
                              ? "bg-blue-50/30 border-blue-200"
                              : isSkipped
                              ? "bg-gray-50/60 border-gray-200 opacity-60"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                                {field.label}
                                {field.required && <span className="text-red-500 font-bold">*</span>}
                              </p>
                              <p className="text-[10px] text-gray-500 leading-tight">{field.hint}</p>
                            </div>
                            {isMapped ? (
                              <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-800 border-blue-300">
                                Mapped
                              </Badge>
                            ) : isSkipped ? (
                              <Badge variant="outline" className="text-[9px] bg-gray-100 text-gray-600 border-gray-300">
                                Skipped
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] text-gray-400">
                                Auto
                              </Badge>
                            )}
                          </div>

                          <select
                            value={currentVal}
                            onChange={(e) => {
                              setColumnMapping({
                                ...columnMapping,
                                [field.key]: e.target.value,
                              });
                            }}
                            className="w-full text-xs rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                          >
                            <option value="">(Auto-Detect / Default)</option>
                            <option value="__skip__">❌ (Skip / Do Not Import)</option>
                            <optgroup label="Excel Columns in Uploaded File:">
                              {excelHeaders.map((header, hIdx) => (
                                <option key={hIdx} value={header}>
                                  Excel Column: {header}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="text-xs text-gray-500">
              {selectedFile ? (
                <span>
                  Selected: <b>{selectedFile.name}</b> (<b>{selectedCount}</b> of{" "}
                  <b>{detectedSheets.length}</b> page(s) marked for sync)
                </span>
              ) : (
                <span>Select an Excel file to begin syncing</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setDetectedSheets([]);
                    setExcelHeaders([]);
                    setColumnMapping({});
                    setResult(null);
                  }}
                  disabled={uploading}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading || (detectedSheets.length > 0 && selectedCount === 0)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs gap-2 px-4 shadow-sm"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Fetching & Syncing Pages...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    {detectedSheets.length > 1
                      ? `Fetch & Sync Selected Pages (${selectedCount})`
                      : "Upload & Sync Now"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Upload Result Alert */}
          {result && (
            <div
              className={`rounded-xl border p-4 space-y-4 ${
                result.success
                  ? "bg-green-50/70 border-green-200"
                  : "bg-red-50/70 border-red-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      {result.success ? "Sync Completed Successfully!" : "Sync Failed"}
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Fetched and processed data across {result.sheetSummaries?.length || 1} Excel page(s).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/tickets"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-white border border-red-200 px-3 py-1 rounded-lg shadow-2xs"
                  >
                    View Tickets <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/inspections"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-blue-200 px-3 py-1 rounded-lg shadow-2xs"
                  >
                    View Inspections <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-white rounded-lg border border-gray-200/80 shadow-2xs">
                  <p className="text-xl font-bold text-gray-900">{result.totalRows || 0}</p>
                  <p className="text-[11px] text-gray-500">Total Rows</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200/80 shadow-2xs">
                  <p className="text-xl font-bold text-green-600">+{result.newRecords ?? result.created ?? 0}</p>
                  <p className="text-[11px] text-green-700 font-medium">New Records</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200/80 shadow-2xs">
                  <p className="text-xl font-bold text-blue-600">{result.updated ?? 0}</p>
                  <p className="text-[11px] text-blue-700 font-medium">Updated</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200/80 shadow-2xs">
                  <p className="text-xl font-bold text-red-600">{result.failed ?? 0}</p>
                  <p className="text-[11px] text-red-700 font-medium">Failed</p>
                </div>
              </div>

              {/* SHEET-BY-SHEET / PAGE BREAKDOWN */}
              {result.sheetSummaries && result.sheetSummaries.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-gray-500" />
                    Sheet-by-Sheet / Page Breakdown:
                  </p>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px] text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                          <th className="text-left px-3 py-2">Page / Sheet</th>
                          <th className="text-left px-3 py-2">Detected Format</th>
                          <th className="text-center px-3 py-2">Rows</th>
                          <th className="text-center px-3 py-2">Created</th>
                          <th className="text-center px-3 py-2">Updated</th>
                          <th className="text-center px-3 py-2">Failed</th>
                          <th className="text-right px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.sheetSummaries.map((ss: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2 font-bold text-gray-900">{ss.sheetName}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                  ss.detectedType === "Site Visits"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : ss.detectedType === "Pre-QCDD Checks"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : ss.detectedType === "Customers"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-orange-50 text-orange-700 border-orange-200"
                                }`}
                              >
                                {ss.detectedType}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-medium">{ss.totalRows}</td>
                            <td className="px-3 py-2 text-center font-semibold text-green-600">+{ss.created}</td>
                            <td className="px-3 py-2 text-center font-semibold text-blue-600">{ss.updated}</td>
                            <td className="px-3 py-2 text-center font-semibold text-red-600">{ss.failed}</td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  ss.status === "SUCCESS"
                                    ? "bg-green-100 text-green-800"
                                    : ss.status === "PARTIAL"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : ss.status === "EMPTY"
                                    ? "bg-gray-100 text-gray-600"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {ss.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Synced Records Sample */}
              {result.records && result.records.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-semibold text-gray-700">Processed Records (Recent):</p>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px] text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
                          <th className="text-left px-3 py-1.5">Ref #</th>
                          <th className="text-left px-3 py-1.5">Client</th>
                          <th className="text-left px-3 py-1.5">Type</th>
                          <th className="text-left px-3 py-1.5">Status</th>
                          <th className="text-right px-3 py-1.5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.records.map((r: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-3 py-1.5 font-mono font-medium text-gray-900">{r.refNumber}</td>
                            <td className="px-3 py-1.5 text-gray-700 truncate max-w-[200px]">{r.clientName}</td>
                            <td className="px-3 py-1.5 text-gray-600">{r.type}</td>
                            <td className="px-3 py-1.5">
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {r.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  r.action === "CREATED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {r.action}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors List if any */}
              {result.errors && result.errors.length > 0 && (
                <div className="rounded-lg bg-red-100/70 border border-red-200 p-3 max-h-36 overflow-y-auto space-y-1">
                  <p className="text-xs font-semibold text-red-900">Encountered Issues:</p>
                  {result.errors.map((err: string, i: number) => (
                    <p key={i} className="text-xs text-red-700 flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync History Card */}
      <Card className="border-gray-200 shadow-xs">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Recent Excel Sync Activity
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingLogs ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {logs.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">
              No recent sync logs recorded. Upload a spreadsheet above to begin.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 text-xs">
              {logs.map((log: any) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{log.fileName}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(log.createdAt).toLocaleString()} · {log.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-700">
                      <span className="text-green-600">+{log.newRecords}</span> /{" "}
                      <span className="text-blue-600">{log.updated}</span> /{" "}
                      <span className="text-red-500">{log.failed}</span>
                    </p>
                    <p className="text-[10px] text-gray-400">{log.totalRows} rows total</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
