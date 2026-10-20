"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Upload,
  Download,
  Eye,
  Filter,
  Edit,
  Trash2,
  Clock,
  Ticket as TicketIcon,
  Building2,
  User,
  Flame,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  X,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
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

  const [editOpen, setEditOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "NEW",
    priority: "MEDIUM",
    technicianId: "NONE",
    notes: "",
  });
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, limit: "100" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
      const res = await fetch(`/api/tickets?${params}`);
      const data = res.ok ? await res.json().catch(() => ({})) : {};
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Failed to fetch tickets:", e);
      setTickets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    fetch("/api/users?role=TECHNICIAN")
      .then((r) => r.json())
      .then((d) => setTechnicians(Array.isArray(d) ? d : []))
      .catch(() => setTechnicians([]));
  }, []);

  const openEdit = (t: any) => {
    setEditingTicket(t);
    setEditForm({
      title: t.title || "",
      description: t.description || "",
      status: t.status || "NEW",
      priority: t.priority || "MEDIUM",
      technicianId: t.technicianId || "NONE",
      notes: t.notes || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTicket || !editForm.title.trim()) return;
    setSavingEdit(true);
    const payload = {
      ...editForm,
      technicianId: editForm.technicianId === "NONE" ? null : editForm.technicianId,
    };
    const res = await fetch(`/api/tickets/${editingTicket.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEditOpen(false);
      fetchTickets();
    } else {
      alert("Failed to update ticket.");
    }
    setSavingEdit(false);
  };

  const handleDeleteTicket = async (id: string, ticketNumber: string) => {
    if (!confirm(`Are you sure you want to delete ticket ${ticketNumber}?`)) return;
    const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchTickets();
    } else {
      alert("Failed to delete ticket.");
    }
  };

  // Quick statistics calculated from tickets array
  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status !== "CLOSED" && t.status !== "RESOLVED").length;
    const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;
    const emergency = tickets.filter((t) => t.priority === "EMERGENCY" && t.status !== "CLOSED").length;
    const closed = tickets.filter((t) => t.status === "CLOSED" || t.status === "RESOLVED").length;
    return { open, inProgress, emergency, closed };
  }, [tickets]);

  // Priority Pill Renderer
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "EMERGENCY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs ring-1 ring-rose-500/10">
            <Flame className="h-3 w-3 text-rose-600 animate-pulse" />
            Emergency
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/70">
            Medium
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200/80">
            Low
          </span>
        );
    }
  };

  // Status Pill Renderer
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "CLOSED":
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Closed
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
            In Progress
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Assigned
          </span>
        );
      case "PENDING_PARTS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Pending Parts
          </span>
        );
      case "NEW":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            New
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. Header & Actions                                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm">
              <TicketIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Tickets Management</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Track, assign, and resolve fire protection maintenance & inspection requests
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="gap-2 bg-white text-xs h-9 font-medium shadow-xs border-gray-200 hover:bg-gray-50 hover:text-green-700"
          >
            <Upload className="h-3.5 w-3.5 text-green-600" />
            Import Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/api/excel/template?type=TICKETS")}
            className="gap-2 bg-white text-xs h-9 font-medium shadow-xs border-gray-200 hover:bg-gray-50"
          >
            <Download className="h-3.5 w-3.5 text-gray-500" />
            Template
          </Button>

          <Link href="/tickets/new">
            <Button size="sm" className="gap-2 bg-red-600 hover:bg-red-700 text-white text-xs h-9 shadow-sm font-medium">
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. Top Summary KPI Cards                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("ALL");
            setPriorityFilter("ALL");
          }}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            statusFilter === "ALL" && priorityFilter === "ALL"
              ? "bg-gray-900 text-white border-gray-900 shadow-sm"
              : "bg-white text-gray-800 border-gray-200/80 hover:border-gray-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs opacity-80 mb-1">
            <span>Total Tickets</span>
            <TicketIcon className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold tracking-tight">{total}</div>
          <div className="text-[11px] opacity-70 mt-0.5">All tickets in system</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("NEW");
            setPriorityFilter("ALL");
          }}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            statusFilter === "NEW"
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-gray-800 border-gray-200/80 hover:border-blue-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs opacity-80 mb-1">
            <span>Active / Open</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-blue-600">{stats.open}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Needs action / response</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setPriorityFilter("EMERGENCY");
            setStatusFilter("ALL");
          }}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            priorityFilter === "EMERGENCY"
              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
              : "bg-white text-gray-800 border-gray-200/80 hover:border-rose-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs opacity-80 mb-1">
            <span className="text-rose-600 font-semibold">Emergency</span>
            <Flame className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-rose-600">{stats.emergency}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">High urgency dispatch</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("CLOSED");
            setPriorityFilter("ALL");
          }}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            statusFilter === "CLOSED"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white text-gray-800 border-gray-200/80 hover:border-emerald-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs opacity-80 mb-1">
            <span>Resolved / Closed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600">{stats.closed}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Completed successfully</div>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. Search and Filters Bar                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by ticket #, client, issue, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 text-xs h-9 bg-gray-50/50 border-gray-200 focus:bg-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs border-gray-200 bg-white">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.entries(TICKET_STATUS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 h-9 text-xs border-gray-200 bg-white">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              {Object.entries(TICKET_PRIORITY).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(statusFilter !== "ALL" || priorityFilter !== "ALL" || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("ALL");
                setPriorityFilter("ALL");
                setSearch("");
              }}
              className="h-9 px-2 text-xs text-gray-500 hover:text-gray-900 gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. Tickets Table                                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/80 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5">Ticket</th>
                <th className="text-left px-5 py-3.5">Client / Customer</th>
                <th className="text-left px-5 py-3.5">Assigned Engineer</th>
                <th className="text-left px-5 py-3.5">Service Type</th>
                <th className="text-left px-5 py-3.5">Priority</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-left px-5 py-3.5">Date & Age</th>
                <th className="text-right px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-4 bg-gray-200 rounded w-36 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-20"></div>
                    </td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-5 py-4"><div className="h-5 bg-gray-200 rounded-full w-16"></div></td>
                    <td className="px-5 py-4"><div className="h-5 bg-gray-200 rounded-full w-16"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-5 py-4 text-right"><div className="h-7 bg-gray-200 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 px-4">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                        <TicketIcon className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">No tickets found</h3>
                      <p className="text-xs text-gray-500">
                        {search || statusFilter !== "ALL" || priorityFilter !== "ALL"
                          ? "Try clearing your search query or filters to see more tickets."
                          : "No tickets have been created or imported yet."}
                      </p>
                      <div className="flex justify-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setImportOpen(true)}
                          className="gap-1.5 text-xs"
                        >
                          <Upload className="h-3.5 w-3.5 text-green-600" /> Import Excel
                        </Button>
                        <Link href="/tickets/new">
                          <Button size="sm" className="gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white">
                            <Plus className="h-3.5 w-3.5" /> Create Ticket
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const daysOpen = Math.max(
                    0,
                    Math.floor((Date.now() - new Date(t.updatedAt || t.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                  );
                  const isClosed = t.status === "CLOSED" || t.status === "RESOLVED";

                  return (
                    <tr
                      key={t.id}
                      className="group hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Ticket Column */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-gray-700 bg-gray-100/90 group-hover:bg-red-50 group-hover:text-red-700 group-hover:border-red-200 px-2 py-0.5 rounded border border-gray-200/70 transition-colors">
                              {t.ticketNumber}
                            </span>
                          </div>
                          <Link
                            href={`/tickets/${t.id}`}
                            className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors text-sm line-clamp-1 block"
                            title={t.title}
                          >
                            {t.title}
                          </Link>
                          {(t.notes || t.description) && (
                            <p
                              className="text-[11px] text-gray-500 line-clamp-1 flex items-center gap-1 font-normal"
                              title={t.notes || t.description}
                            >
                              <MessageSquare className="h-3 w-3 shrink-0 text-gray-400" />
                              {t.notes || t.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Customer Column */}
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/customers/${t.customer?.id}`}
                          className="font-medium text-gray-800 hover:text-red-600 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Building2 className="h-3.5 w-3.5 text-gray-400 group-hover:text-red-500 shrink-0" />
                          <span className="truncate max-w-[170px]">{t.customer?.name || "—"}</span>
                        </Link>
                      </td>

                      {/* Technician Column */}
                      <td className="px-5 py-3.5">
                        {t.technician ? (
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs shrink-0">
                              {t.technician.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800 text-xs truncate max-w-[130px]">
                              {t.technician.name}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-full px-2.5 py-0.5 italic">
                            <User className="h-3 w-3" />
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Service Type Column */}
                      <td className="px-5 py-3.5">
                        {t.serviceType ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 border border-gray-200/70 text-gray-700">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: t.serviceType.color || "#ef4444" }}
                            />
                            <span className="truncate max-w-[120px]">{t.serviceType.name}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Priority Column */}
                      <td className="px-5 py-3.5">{renderPriorityBadge(t.priority)}</td>

                      {/* Status Column */}
                      <td className="px-5 py-3.5">{renderStatusBadge(t.status)}</td>

                      {/* Date & Age Column */}
                      <td className="px-5 py-3.5 text-xs">
                        <p className="font-medium text-gray-800">{formatDate(t.createdAt)}</p>
                        {isClosed ? (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {t.resolvedDate ? `Closed ${formatDate(t.resolvedDate)}` : "Closed"}
                          </p>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium mt-0.5 border ${
                              daysOpen >= 7
                                ? "bg-red-50 text-red-700 border-red-200"
                                : daysOpen >= 3
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {daysOpen === 0 ? "Updated today" : `${daysOpen}d since update`}
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Link href={`/tickets/${t.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                            onClick={() => openEdit(t)}
                            title="Quick Edit ticket"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            onClick={() => handleDeleteTicket(t.id, t.ticketNumber)}
                            title="Delete ticket"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with total count */}
        {tickets.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing <b>{tickets.length}</b> of <b>{total}</b> tickets
            </span>
            <span className="font-mono text-[11px] text-gray-400">
              Updated live from database
            </span>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. Import Excel Dialog                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={importOpen}
        onOpenChange={(v) => {
          setImportOpen(v);
          if (!v) {
            setImportResult(null);
            setSelectedFile(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Import Tickets from Excel
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Upload your Excel sheet. Supports: Date Raised, Ticket #, Client Name, Type, Status, Date Closed, Request type, Assigned Engineer, Last Update.
            </DialogDescription>
          </DialogHeader>

          {!importResult ? (
            <div className="space-y-4 pt-2">
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? "border-green-400 bg-green-50/40"
                    : "border-gray-300 hover:border-red-400 bg-gray-50/50"
                }`}
                onClick={() => document.getElementById("ticket-excel")?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800">
                  {selectedFile ? selectedFile.name : "Click to choose or drop Excel file"}
                </p>
                <p className="text-xs text-gray-500 mt-1">.xlsx or .xls spreadsheets supported</p>
                <input
                  id="ticket-excel"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setImportOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import & Sync"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                <p className="font-semibold text-green-800 text-sm mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Import Complete
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded border border-green-200">
                    <p className="text-xl font-bold text-green-700">{importResult.newRecords ?? importResult.created ?? 0}</p>
                    <p className="text-[11px] text-green-600">New Tickets</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-blue-200">
                    <p className="text-xl font-bold text-blue-700">{importResult.updated ?? 0}</p>
                    <p className="text-[11px] text-blue-600">Updated</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-red-200">
                    <p className="text-xl font-bold text-red-700">{importResult.failed ?? 0}</p>
                    <p className="text-[11px] text-red-600">Failed</p>
                  </div>
                </div>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-800 mb-1">Errors encountered:</p>
                  {importResult.errors.map((e: string, i: number) => (
                    <p key={i} className="text-xs text-red-600">
                      • {e}
                    </p>
                  ))}
                </div>
              )}

              <Button
                className="w-full bg-gray-900 text-white hover:bg-gray-800"
                onClick={() => {
                  setImportOpen(false);
                  setImportResult(null);
                  setSelectedFile(null);
                }}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. Edit Ticket Dialog                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Edit Ticket #{editingTicket?.ticketNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update details, technician assignment, priority, and notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-xs font-semibold">Title *</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Ticket title"
                className="mt-1 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(val) => setEditForm({ ...editForm, status: val })}
                >
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Priority</Label>
                <Select
                  value={editForm.priority}
                  onValueChange={(val) => setEditForm({ ...editForm, priority: val })}
                >
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_PRIORITY).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Assigned Technician</Label>
              <div className="mt-1">
                <SearchableSelect
                  options={[
                    { value: "NONE", label: "Unassigned" },
                    ...technicians.map((t) => ({
                      value: t.id,
                      label: t.name,
                      description: t.email || undefined,
                      badge: t.role || undefined,
                    })),
                  ]}
                  value={editForm.technicianId || "NONE"}
                  onValueChange={(val) => setEditForm({ ...editForm, technicianId: val })}
                  placeholder="Select technician..."
                  searchPlaceholder="Search technician..."
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Detailed description..."
                className="mt-1 text-sm"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Latest Update / Internal Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Internal notes or latest dispatch update..."
                className="mt-1 text-sm"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={savingEdit || !editForm.title.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
