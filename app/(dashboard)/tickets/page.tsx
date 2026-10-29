"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
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
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Maximize2,
  Minimize2,
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (expandedIds.size === tickets.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(tickets.map((t) => t.id)));
    }
  };

  const handleQuickStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === "RESOLVED" ? { resolvedDate: new Date().toISOString() } : {}),
        }),
      });
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

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
    if (technicians.length === 0) {
      fetch("/api/users?role=TECHNICIAN")
        .then((r) => r.json())
        .then((d) => setTechnicians(Array.isArray(d) ? d : []))
        .catch(() => setTechnicians([]));
    }
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

  // Priority Pill Renderer (Minimal Linear-style dots)
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "EMERGENCY":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            Emergency
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-blue-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Medium
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            Low
          </span>
        );
    }
  };

  // Status Pill Renderer (Minimal soft tag)
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "CLOSED":
      case "RESOLVED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700">
            Closed
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700">
            In Progress
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700">
            Assigned
          </span>
        );
      case "PENDING_PARTS":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-orange-50 text-orange-700">
            Pending Parts
          </span>
        );
      case "NEW":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 text-sky-700">
            New
          </span>
        );
    }
  };

  return (
    <div className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
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
      {/* 4. Tickets Table (Minimal & Spacious)                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="w-10 px-3 py-3 text-center">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
                    title={expandedIds.size === tickets.length && tickets.length > 0 ? "Collapse all" : "Expand all"}
                  >
                    {expandedIds.size === tickets.length && tickets.length > 0 ? (
                      <Minimize2 className="h-3.5 w-3.5 text-red-600" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-semibold">Ticket & Title</th>
                <th className="text-left px-3 py-3 font-semibold">Client</th>
                <th className="text-left px-3 py-3 font-semibold">Assigned</th>
                <th className="text-left px-3 py-3 font-semibold">Service</th>
                <th className="text-left px-3 py-3 font-semibold">Priority</th>
                <th className="text-left px-3 py-3 font-semibold">Status</th>
                <th className="text-left px-3 py-3 font-semibold">Date</th>
                <th className="text-right px-4 py-3 font-semibold w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-gray-50">
                    <td className="px-3 py-3.5 text-center"><div className="h-4 w-4 bg-gray-100 rounded mx-auto"></div></td>
                    <td className="px-3 py-3.5">
                      <div className="h-3.5 bg-gray-100 rounded w-44 mb-1.5"></div>
                      <div className="h-2.5 bg-gray-50 rounded w-20"></div>
                    </td>
                    <td className="px-3 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-28"></div></td>
                    <td className="px-3 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-24"></div></td>
                    <td className="px-3 py-3.5"><div className="h-3.5 bg-gray-100 rounded w-20"></div></td>
                    <td className="px-3 py-3.5"><div className="h-3 bg-gray-100 rounded w-16"></div></td>
                    <td className="px-3 py-3.5"><div className="h-4 bg-gray-100 rounded-full w-14"></div></td>
                    <td className="px-3 py-3.5"><div className="h-3 bg-gray-100 rounded w-16"></div></td>
                    <td className="px-4 py-3.5 text-right"><div className="h-5 bg-gray-100 rounded w-12 ml-auto"></div></td>
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 px-4">
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
                  const isExpanded = expandedIds.has(t.id);

                  return (
                    <Fragment key={t.id}>
                      {/* Minimal Main Row */}
                      <tr
                        onClick={() => toggleRow(t.id)}
                        className={`group cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                          isExpanded
                            ? "bg-slate-50/70"
                            : "hover:bg-gray-50/50"
                        }`}
                      >
                        {/* Expand Chevron Button */}
                        <td className="w-10 px-3 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(t.id);
                            }}
                            className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mx-auto"
                            title={isExpanded ? "Collapse row" : "Expand details"}
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-gray-800" : ""
                              }`}
                            />
                          </button>
                        </td>

                        {/* Ticket & Title */}
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-gray-500">
                              #{t.ticketNumber}
                            </span>
                            <Link
                              href={`/tickets/${t.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-gray-900 hover:text-red-600 transition-colors text-xs truncate max-w-[280px]"
                            >
                              {t.title}
                            </Link>
                          </div>
                          {t.externalRef && (
                            <span className="text-[10px] text-gray-400 font-mono block pl-0.5">
                              Ref: {t.externalRef}
                            </span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-3 py-3.5">
                          <Link
                            href={`/customers/${t.customer?.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-gray-800 hover:text-red-600 transition-colors block truncate max-w-[170px]"
                          >
                            {t.customer?.name || "—"}
                          </Link>
                          {t.customer?.city && (
                            <span className="text-[11px] text-gray-400 block truncate max-w-[170px]">
                              {t.customer.city}
                            </span>
                          )}
                        </td>

                        {/* Assigned Engineer */}
                        <td className="px-3 py-3.5">
                          {t.technician ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-semibold shrink-0 border border-gray-200/80">
                                {t.technician.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-gray-700 truncate max-w-[110px]">
                                {t.technician.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Unassigned</span>
                          )}
                        </td>

                        {/* Service Type */}
                        <td className="px-3 py-3.5">
                          <span className="text-xs text-gray-600 truncate max-w-[120px] block">
                            {t.serviceType?.name || "—"}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-3 py-3.5">{renderPriorityBadge(t.priority)}</td>

                        {/* Status */}
                        <td className="px-3 py-3.5">{renderStatusBadge(t.status)}</td>

                        {/* Date */}
                        <td className="px-3 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(t.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openEdit(t)}
                              className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                              title="Quick Edit"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTicket(t.id, t.ticketNumber)}
                              className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Minimal Dropdown Expanded Drawer */}
                      {isExpanded && (
                        <tr
                          key={`${t.id}-expanded`}
                          className="bg-gray-50/70 border-b border-gray-200/80"
                        >
                          <td colSpan={9} className="p-0">
                            <div className="px-8 py-4 space-y-3.5">
                              {/* Top Info Bar */}
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-gray-500">
                                    #{t.ticketNumber}
                                  </span>
                                  <span className="font-semibold text-gray-900">{t.title}</span>
                                </div>
                                <Link
                                  href={`/tickets/${t.id}`}
                                  className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 text-xs hover:underline"
                                >
                                  Open Full Work Order <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>

                              {/* 3 Minimal Info Blocks */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                                {/* Block 1: Description & Remarks */}
                                <div className="bg-white p-3.5 rounded-lg border border-gray-200/80 space-y-1.5">
                                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                    Issue Description
                                  </span>
                                  <p className="text-xs text-gray-700 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                                    {t.description || t.notes || "No additional description entered."}
                                  </p>
                                  {t.notes && t.description && t.notes !== t.description && (
                                    <p className="text-[11px] text-gray-500 pt-1.5 border-t border-gray-100">
                                      <span className="font-medium text-gray-600">Notes: </span>
                                      {t.notes}
                                    </p>
                                  )}
                                </div>

                                {/* Block 2: Client & Contact */}
                                <div className="bg-white p-3.5 rounded-lg border border-gray-200/80 space-y-1.5">
                                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                    Client Details
                                  </span>
                                  <div className="space-y-1 text-xs">
                                    <Link
                                      href={`/customers/${t.customer?.id}`}
                                      className="font-semibold text-gray-900 hover:text-red-600 block truncate"
                                    >
                                      {t.customer?.name || "Unspecified"}
                                    </Link>
                                    {t.customer?.address && (
                                      <p className="text-gray-500 text-[11px] truncate">
                                        {t.customer.address}
                                        {t.customer.city ? `, ${t.customer.city}` : ""}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                                      {t.customer?.phone && (
                                        <a
                                          href={`tel:${t.customer.phone}`}
                                          className="text-blue-600 hover:underline font-mono"
                                        >
                                          {t.customer.phone}
                                        </a>
                                      )}
                                      {t.customer?.email && (
                                        <a
                                          href={`mailto:${t.customer.email}`}
                                          className="text-blue-600 hover:underline truncate max-w-[140px]"
                                        >
                                          {t.customer.email}
                                        </a>
                                      )}
                                    </div>
                                    {t.customer?.contactPerson && (
                                      <p className="text-gray-400 text-[11px] pt-0.5">
                                        Contact: {t.customer.contactPerson}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Block 3: Assignment & Dates */}
                                <div className="bg-white p-3.5 rounded-lg border border-gray-200/80 space-y-1.5 text-xs">
                                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                    Service & Assignment
                                  </span>
                                  <div className="space-y-1">
                                    <div className="flex justify-between py-0.5 text-gray-600">
                                      <span className="text-gray-400">Service:</span>
                                      <span className="font-medium text-gray-800">
                                        {t.serviceType?.name || "Standard Maintenance"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-0.5 text-gray-600">
                                      <span className="text-gray-400">Technician:</span>
                                      <span className="font-medium text-gray-800">
                                        {t.technician?.name || "Unassigned"}
                                      </span>
                                    </div>
                                    {t.scheduledDate && (
                                      <div className="flex justify-between py-0.5 text-gray-600">
                                        <span className="text-gray-400">Scheduled:</span>
                                        <span>{formatDate(t.scheduledDate)}</span>
                                      </div>
                                    )}
                                    {t.resolvedDate && (
                                      <div className="flex justify-between py-0.5 text-gray-600">
                                        <span className="text-gray-400">Closed:</span>
                                        <span className="font-medium text-emerald-700">{formatDate(t.resolvedDate)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Quick Status Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/70">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] text-gray-400 font-medium mr-1.5">Status:</span>
                                  {["NEW", "ASSIGNED", "IN_PROGRESS", "PENDING_PARTS", "RESOLVED", "CLOSED"].map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      disabled={t.status === s}
                                      onClick={() => handleQuickStatusChange(t.id, s)}
                                      className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-all ${
                                        t.status === s
                                          ? "bg-gray-900 text-white font-semibold cursor-default"
                                          : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                      }`}
                                    >
                                      {TICKET_STATUS[s as keyof typeof TICKET_STATUS]?.label || s}
                                    </button>
                                  ))}
                                </div>

                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(t)}
                                    className="text-xs text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-1"
                                  >
                                    <Edit className="h-3 w-3" /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTicket(t.id, t.ticketNumber)}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                                  >
                                    <Trash2 className="h-3 w-3" /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
