"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Upload, Download, Eye, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TICKET_STATUS, TICKET_PRIORITY, formatDate } from "@/lib/utils";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, limit: "50" });
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
    const res = await fetch(`/api/tickets?${params}`);
    const data = await res.json();
    setTickets(data.tickets || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    const t = setTimeout(fetchTickets, 300);
    return () => clearTimeout(t);
  }, [fetchTickets]);

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("type", "TICKETS");
    const res = await fetch("/api/excel/import", { method: "POST", body: formData });
    const result = await res.json();
    setImportResult(result);
    setImporting(false);
    if (result.success) fetchTickets();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total tickets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Import Excel
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/api/excel/template?type=TICKETS"} className="gap-2">
            <Download className="h-4 w-4" /> Template
          </Button>
          <Link href="/tickets/new">
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Ticket</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tickets, customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {Object.entries(TICKET_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priority</SelectItem>
            {Object.entries(TICKET_PRIORITY).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-600">Ticket</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Technician</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Service</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Priority</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Date</th>
              <th className="text-right px-6 py-3 font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">Loading...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">No tickets found</td></tr>
            ) : (
              tickets.map((t) => {
                const s = TICKET_STATUS[t.status as keyof typeof TICKET_STATUS];
                const p = TICKET_PRIORITY[t.priority as keyof typeof TICKET_PRIORITY];
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 truncate max-w-48">{t.title}</p>
                      <p className="text-xs font-mono text-gray-400">{t.ticketNumber}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{t.customer?.name}</td>
                    <td className="px-6 py-4 text-gray-700">{t.technician?.name || <span className="text-gray-400">Unassigned</span>}</td>
                    <td className="px-6 py-4">
                      {t.serviceType && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: t.serviceType.color }} />
                          <span className="text-gray-700 text-xs">{t.serviceType.name}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p?.color}`}>
                        {p?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s?.color}`}>
                        {s?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(t.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/tickets/${t.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) { setImportResult(null); setSelectedFile(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Tickets from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file. Existing tickets matched by ID will be updated.
            </DialogDescription>
          </DialogHeader>
          {!importResult ? (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-red-400 cursor-pointer"
                onClick={() => document.getElementById("ticket-excel")?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">{selectedFile ? selectedFile.name : "Click to upload Excel file"}</p>
                <p className="text-xs text-gray-500 mt-1">.xlsx files supported</p>
                <input id="ticket-excel" type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={!selectedFile || importing}>
                  {importing ? "Importing..." : "Import"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="font-semibold text-green-800 mb-2">Import Complete</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-2xl font-bold text-green-700">{importResult.newRecords}</p><p className="text-xs text-green-600">New</p></div>
                  <div><p className="text-2xl font-bold text-blue-700">{importResult.updated}</p><p className="text-xs text-blue-600">Updated</p></div>
                  <div><p className="text-2xl font-bold text-red-700">{importResult.failed}</p><p className="text-xs text-red-600">Failed</p></div>
                </div>
              </div>
              {importResult.errors?.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 max-h-32 overflow-y-auto">
                  {importResult.errors.map((e: string, i: number) => (
                    <p key={i} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
              )}
              <Button className="w-full" onClick={() => { setImportOpen(false); setImportResult(null); setSelectedFile(null); }}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
