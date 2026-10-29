import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Ticket,
  Building2,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  FileText,
  DollarSign,
  ShieldCheck,
  HardDrive,
  Users,
  Package,
  Calendar,
  ArrowRight,
  TrendingUp,
  Activity,
  AlertCircle,
  Flame,
  Phone,
  BarChart3,
  Layers,
} from "lucide-react";
import {
  TICKET_STATUS,
  TICKET_PRIORITY,
  INVOICE_STATUS,
  INSPECTION_STATUS,
  ASSET_TYPES,
  formatDate,
  formatCurrency,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;

  // Fetch all comprehensive data in parallel with optimized aggregations
  const [
    ticketStatusCounts,
    ticketPriorityCounts,

    totalCustomers,
    recentCustomers,

    totalAssets,
    needsServiceAssets,
    assetsByType,

    inspectionStatusCounts,

    totalInvoices,
    paidInvoicesSum,
    pendingInvoicesSum,
    overdueInvoicesCount,

    techniciansCount,
    techniciansList,

    topServiceTypes,

    recentTickets,
    upcomingInspections,
    recentInvoices,

    synologyConfig,
  ] = await Promise.all([
    // Grouped Ticket Statuses
    prisma.ticket.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Grouped Active Ticket Priorities
    prisma.ticket.groupBy({
      by: ["priority"],
      where: { status: { not: "CLOSED" } },
      _count: { id: true },
    }),

    // Customers
    prisma.customer.count({ where: { isActive: true } }),
    prisma.customer.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tickets: true, assets: true } } },
    }),

    // Assets
    prisma.asset.count(),
    prisma.asset.count({ where: { status: "NEEDS_SERVICE" } }),
    prisma.asset.groupBy({
      by: ["assetType"],
      _count: { id: true },
    }),

    // Grouped Inspections
    prisma.inspection.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Invoices
    prisma.invoice.count(),
    prisma.invoice.aggregate({
      where: { status: "PAID" },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ["SENT", "DRAFT"] } },
      _sum: { total: true },
    }),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),

    // Technicians
    prisma.user.count({ where: { role: "TECHNICIAN", isActive: true } }),
    prisma.user.findMany({
      where: { role: "TECHNICIAN", isActive: true },
      take: 6,
      include: {
        _count: {
          select: {
            assignedTickets: {
              where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),

    // Service Types
    prisma.serviceType.findMany({
      take: 5,
      include: {
        _count: { select: { tickets: true } },
      },
      orderBy: { tickets: { _count: "desc" } },
    }),

    // Feeds
    prisma.ticket.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { customer: true, technician: true, serviceType: true },
    }),
    prisma.inspection.findMany({
      take: 5,
      where: { status: "SCHEDULED" },
      orderBy: { scheduledDate: "asc" },
      include: { customer: true, serviceType: true },
    }),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),

    // Synology Sync
    prisma.synologySyncConfig.findUnique({ where: { id: "default" } }),
  ]);

  const ticketStatusMap = Object.fromEntries(ticketStatusCounts.map((c) => [c.status, c._count.id]));
  const totalTickets = Object.values(ticketStatusMap).reduce((acc, curr) => acc + curr, 0);
  const newTickets = ticketStatusMap["NEW"] || 0;
  const assignedTickets = ticketStatusMap["ASSIGNED"] || 0;
  const inProgressTickets = ticketStatusMap["IN_PROGRESS"] || 0;
  const pendingPartsTickets = ticketStatusMap["PENDING_PARTS"] || 0;
  const resolvedTickets = ticketStatusMap["RESOLVED"] || 0;
  const closedTickets = ticketStatusMap["CLOSED"] || 0;

  const ticketPriorityMap = Object.fromEntries(ticketPriorityCounts.map((c) => [c.priority, c._count.id]));
  const emergencyTickets = ticketPriorityMap["EMERGENCY"] || 0;
  const highPriorityTickets = ticketPriorityMap["HIGH"] || 0;
  const mediumPriorityTickets = ticketPriorityMap["MEDIUM"] || 0;
  const lowPriorityTickets = ticketPriorityMap["LOW"] || 0;

  const inspectionStatusMap = Object.fromEntries(inspectionStatusCounts.map((c) => [c.status, c._count.id]));
  const totalInspections = Object.values(inspectionStatusMap).reduce((acc, curr) => acc + curr, 0);
  const scheduledInspections = inspectionStatusMap["SCHEDULED"] || 0;
  const inProgressInspections = inspectionStatusMap["IN_PROGRESS"] || 0;
  const passedInspections = inspectionStatusMap["PASSED"] || 0;
  const failedInspections = inspectionStatusMap["FAILED"] || 0;

  const totalPaid = paidInvoicesSum._sum.total || 0;
  const totalPending = pendingInvoicesSum._sum.total || 0;

  // Active tickets sum
  const activeTicketsCount = newTickets + assignedTickets + inProgressTickets + pendingPartsTickets;
  const inspectionPassRate = totalInspections > 0 ? Math.round((passedInspections / totalInspections) * 100) : 100;

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* ── 1. Top Header & Synology Sync Status Pill ────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md border border-gray-700">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-950/80 border border-red-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Flame className="h-3 w-3 text-red-500" /> Operations Center
            </span>
            {synologyConfig && (
              <span className="flex items-center gap-1.5 text-xs text-gray-300 bg-gray-800/90 border border-gray-700 px-2.5 py-0.5 rounded-full font-mono">
                <span
                  className={`h-2 w-2 rounded-full ${
                    synologyConfig.lastStatus === "SUCCESS"
                      ? "bg-green-400 animate-pulse"
                      : synologyConfig.enabled
                      ? "bg-blue-400"
                      : "bg-gray-400"
                  }`}
                />
                Synology Sync: {synologyConfig.enabled ? "Auto Active" : "Manual Only"}
                {synologyConfig.lastSyncAt && (
                  <span className="text-gray-400 font-sans">
                    ({new Date(synologyConfig.lastSyncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                  </span>
                )}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            Welcome back, {user?.name || "Administrator"}!
          </h1>
          <p className="text-sm text-gray-300 mt-1">
            Real-time operations center for tickets, safety inspections, billing, assets, and field technicians.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href="/tickets/new">
            <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm text-xs">
              <Plus className="h-3.5 w-3.5" /> New Ticket
            </Button>
          </Link>
          <Link href="/inspections/new">
            <Button size="sm" variant="outline" className="gap-1.5 bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 text-xs">
              <Calendar className="h-3.5 w-3.5 text-blue-400" /> New Inspection
            </Button>
          </Link>
          <Link href="/invoices">
            <Button size="sm" variant="outline" className="gap-1.5 bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 text-xs">
              <DollarSign className="h-3.5 w-3.5 text-green-400" /> Invoices
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 2. Critical Emergency Alert Banner (if any) ────────────────────── */}
      {emergencyTickets > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-red-50 border border-red-200 p-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-900">
                ⚠️ {emergencyTickets} Emergency Ticket{emergencyTickets > 1 ? "s" : ""} Require Immediate Attention!
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                Urgent fire alarm / sprinkler incidents reported awaiting dispatch or immediate action.
              </p>
            </div>
          </div>
          <Link href="/tickets?priority=EMERGENCY" className="shrink-0">
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs">
              View Emergency Tickets →
            </Button>
          </Link>
        </div>
      )}

      {/* ── 3. Six Core High-Level KPIs ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Tickets */}
        <Link href="/tickets">
          <Card className="border-gray-200 shadow-sm hover:border-red-400 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">Tickets</span>
                <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <Ticket className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{totalTickets}</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 flex-wrap">
                <span className="font-semibold text-yellow-600">{newTickets} New</span>
                <span>•</span>
                <span className="font-semibold text-blue-600">{activeTicketsCount} Active</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Inspections */}
        <Link href="/inspections">
          <Card className="border-gray-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">Inspections</span>
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{totalInspections}</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 flex-wrap">
                <span className="font-semibold text-indigo-600">{scheduledInspections} Sched</span>
                <span>•</span>
                <span className="font-semibold text-green-600">{passedInspections} Passed</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Active Customers */}
        <Link href="/customers">
          <Card className="border-gray-200 shadow-sm hover:border-purple-400 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">Customers</span>
                <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{totalCustomers}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">Commercial clients</p>
            </CardContent>
          </Card>
        </Link>

        {/* Assets & Equipment */}
        <Link href="/assets">
          <Card className="border-gray-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">Equipment</span>
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{totalAssets}</p>
              <div className="flex items-center gap-1 text-xs mt-1 truncate">
                {needsServiceAssets > 0 ? (
                  <span className="text-amber-600 font-semibold">{needsServiceAssets} Need Service</span>
                ) : (
                  <span className="text-green-600 font-semibold">All In Service</span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Revenue / Invoices */}
        <Link href="/invoices">
          <Card className="border-gray-200 shadow-sm hover:border-green-400 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">Paid Revenue</span>
                <div className="h-8 w-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2 truncate">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                Pending: <span className="text-amber-600 font-medium">{formatCurrency(totalPending)}</span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Field Technicians */}
        <Link href="/technicians">
          <Card className="border-gray-200 shadow-sm hover:border-teal-400 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">Technicians</span>
                <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{techniciansCount}</p>
              <p className="text-xs text-gray-500 mt-1">Field staff on duty</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── 4. Comprehensive Operations Breakdown Section ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ticket Lifecycle Pipeline */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-gray-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-red-600" /> Ticket Status Pipeline
            </CardTitle>
            <span className="text-xs text-gray-400 font-mono">{totalTickets} total</span>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* Visual Progress Bar */}
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
              {totalTickets > 0 ? (
                <>
                  <div style={{ width: `${(newTickets / totalTickets) * 100}%` }} className="bg-yellow-400" title={`New: ${newTickets}`} />
                  <div style={{ width: `${(assignedTickets / totalTickets) * 100}%` }} className="bg-purple-400" title={`Assigned: ${assignedTickets}`} />
                  <div style={{ width: `${(inProgressTickets / totalTickets) * 100}%` }} className="bg-blue-500" title={`In Progress: ${inProgressTickets}`} />
                  <div style={{ width: `${(pendingPartsTickets / totalTickets) * 100}%` }} className="bg-amber-500" title={`Pending Parts: ${pendingPartsTickets}`} />
                  <div style={{ width: `${(resolvedTickets / totalTickets) * 100}%` }} className="bg-teal-500" title={`Resolved: ${resolvedTickets}`} />
                  <div style={{ width: `${(closedTickets / totalTickets) * 100}%` }} className="bg-gray-400" title={`Closed: ${closedTickets}`} />
                </>
              ) : (
                <div className="w-full bg-gray-200" />
              )}
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div className="p-2 rounded bg-yellow-50 border border-yellow-100">
                <span className="text-yellow-700 font-medium block text-[11px]">New</span>
                <span className="text-base font-bold text-yellow-900">{newTickets}</span>
              </div>
              <div className="p-2 rounded bg-blue-50 border border-blue-100">
                <span className="text-blue-700 font-medium block text-[11px]">In Progress</span>
                <span className="text-base font-bold text-blue-900">{inProgressTickets}</span>
              </div>
              <div className="p-2 rounded bg-amber-50 border border-amber-100">
                <span className="text-amber-700 font-medium block text-[11px]">Parts Pending</span>
                <span className="text-base font-bold text-amber-900">{pendingPartsTickets}</span>
              </div>
              <div className="p-2 rounded bg-purple-50 border border-purple-100">
                <span className="text-purple-700 font-medium block text-[11px]">Assigned</span>
                <span className="text-base font-bold text-purple-900">{assignedTickets}</span>
              </div>
              <div className="p-2 rounded bg-teal-50 border border-teal-100">
                <span className="text-teal-700 font-medium block text-[11px]">Resolved</span>
                <span className="text-base font-bold text-teal-900">{resolvedTickets}</span>
              </div>
              <div className="p-2 rounded bg-gray-50 border border-gray-200">
                <span className="text-gray-600 font-medium block text-[11px]">Closed</span>
                <span className="text-base font-bold text-gray-800">{closedTickets}</span>
              </div>
            </div>

            {/* Active Priority Tag Pills */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-medium">Active Priorities:</span>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold font-mono">
                  {emergencyTickets} Emerg
                </span>
                <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-semibold font-mono">
                  {highPriorityTickets} High
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                  {mediumPriorityTickets} Med
                </span>
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono">
                  {lowPriorityTickets} Low
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspections Status & Compliance */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-gray-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" /> Safety & Inspection Compliance
            </CardTitle>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
              {inspectionPassRate}% Pass Rate
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-indigo-700 font-medium block text-[11px]">Scheduled</span>
                  <span className="text-lg font-bold text-indigo-900">{scheduledInspections}</span>
                </div>
                <Calendar className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="p-2.5 rounded bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-blue-700 font-medium block text-[11px]">In Progress</span>
                  <span className="text-lg font-bold text-blue-900">{inProgressInspections}</span>
                </div>
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div className="p-2.5 rounded bg-green-50/70 border border-green-100 flex items-center justify-between">
                <div>
                  <span className="text-green-700 font-medium block text-[11px]">Passed</span>
                  <span className="text-lg font-bold text-green-900">{passedInspections}</span>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div className="p-2.5 rounded bg-red-50/70 border border-red-100 flex items-center justify-between">
                <div>
                  <span className="text-red-700 font-medium block text-[11px]">Failed / Issues</span>
                  <span className="text-lg font-bold text-red-900">{failedInspections}</span>
                </div>
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
            </div>

            {/* Quick Inspection Direct Action */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 text-[11px]">Compliance standard: NFPA 10 / 25 / 72</span>
              <Link href="/schedule">
                <Button variant="ghost" size="sm" className="h-6 text-[11px] text-indigo-600 p-0 hover:bg-transparent hover:underline">
                  View Calendar →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Equipment & Assets Inventory */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-gray-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-amber-600" /> Fire Equipment Categories
            </CardTitle>
            <span className="text-xs text-gray-400 font-mono">{totalAssets} items</span>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {assetsByType.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                No equipment inventory recorded.
                <div className="mt-2">
                  <Link href="/assets">
                    <Button size="sm" variant="outline" className="text-xs h-7">Add Equipment</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {assetsByType.map((ab) => {
                  const typeLabel = ASSET_TYPES[ab.assetType as keyof typeof ASSET_TYPES]?.label || ab.assetType;
                  const pct = totalAssets > 0 ? Math.round((ab._count.id / totalAssets) * 100) : 0;
                  return (
                    <div key={ab.assetType} className="space-y-1">
                      <div className="flex items-center justify-between text-gray-700 font-medium">
                        <span>{typeLabel}</span>
                        <span className="font-mono text-gray-500 font-bold">{ab._count.id} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="h-full bg-amber-500 rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-amber-700 text-[11px] font-medium">
                {needsServiceAssets > 0 ? `⚠️ ${needsServiceAssets} items due for inspection` : "✓ All devices operational"}
              </span>
              <Link href="/assets">
                <Button variant="ghost" size="sm" className="h-6 text-[11px] text-amber-700 p-0 hover:bg-transparent hover:underline">
                  Inventory →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 5. Main Two-Column Analytics & Live Feeds ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Tickets & Invoices Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Tickets Table */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="py-3 px-5 border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-900">
                  <Ticket className="h-4 w-4 text-red-600" />
                  Recent Service Tickets
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Latest customer incidents, dispatch assignments, and maintenance logs
                </p>
              </div>
              <Link href="/tickets">
                <Button variant="ghost" size="sm" className="text-xs text-red-600 hover:text-red-700 h-7 gap-1">
                  View all ({totalTickets}) <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {recentTickets.length === 0 ? (
                <p className="text-xs text-gray-400 p-8 text-center">No service tickets recorded yet.</p>
              ) : (
                <table className="w-full min-w-[600px] text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-600 font-semibold">
                      <th className="text-left px-4 py-2.5">Ticket #</th>
                      <th className="text-left px-4 py-2.5">Subject / Customer</th>
                      <th className="text-left px-4 py-2.5">Priority</th>
                      <th className="text-left px-4 py-2.5">Status</th>
                      <th className="text-left px-4 py-2.5">Technician</th>
                      <th className="text-right px-4 py-2.5">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentTickets.map((t) => {
                      const statusInfo = TICKET_STATUS[t.status as keyof typeof TICKET_STATUS];
                      const priorityInfo = TICKET_PRIORITY[t.priority as keyof typeof TICKET_PRIORITY];
                      return (
                        <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                            <Link href={`/tickets/${t.id}`} className="hover:text-red-600 hover:underline">
                              {t.ticketNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="font-semibold text-gray-900 truncate">{t.title}</p>
                            <p className="text-gray-500 text-[11px] truncate">{t.customer?.name}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityInfo?.color}`}>
                              {priorityInfo?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo?.color}`}>
                              {statusInfo?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {t.technician?.name || <span className="text-gray-400 italic">Unassigned</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400 whitespace-nowrap font-mono text-[11px]">
                            {formatDate(t.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Active Technicians & Fleet Status */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="py-3 px-5 border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-900">
                  <Users className="h-4 w-4 text-teal-600" />
                  Field Technicians Workload
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Assigned dispatches, current tickets on field, and contact details
                </p>
              </div>
              <Link href="/technicians">
                <Button variant="ghost" size="sm" className="text-xs text-teal-700 hover:text-teal-800 h-7 gap-1">
                  Manage Fleet ({techniciansCount}) <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {techniciansList.length === 0 ? (
                <p className="text-xs text-gray-400 p-6 text-center">No active technicians registered.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                  {techniciansList.map((tech) => (
                    <div key={tech.id} className="p-4 hover:bg-gray-50/80 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                            {tech.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-gray-900">{tech.name}</p>
                            <p className="text-[10px] text-gray-400">{tech.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-[11px] text-gray-500">Active Work:</span>
                        <Badge className={`text-[10px] ${tech._count.assignedTickets > 0 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
                          {tech._count.assignedTickets} ticket{tech._count.assignedTickets !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      {tech.phone && (
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-gray-400" /> {tech.phone}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices Table */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="py-3 px-5 border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-900">
                  <FileText className="h-4 w-4 text-green-600" />
                  Recent Billing & Invoices
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Track payments, pending receivables, and client statements
                </p>
              </div>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" className="text-xs text-green-700 hover:text-green-800 h-7 gap-1">
                  View all ({totalInvoices}) <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {recentInvoices.length === 0 ? (
                <p className="text-xs text-gray-400 p-8 text-center">No invoices generated yet.</p>
              ) : (
                <table className="w-full min-w-[600px] text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-600 font-semibold">
                      <th className="text-left px-4 py-2.5">Invoice #</th>
                      <th className="text-left px-4 py-2.5">Customer</th>
                      <th className="text-right px-4 py-2.5">Total Amount</th>
                      <th className="text-center px-4 py-2.5">Status</th>
                      <th className="text-right px-4 py-2.5">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentInvoices.map((inv) => {
                      const statusInfo = INVOICE_STATUS[inv.status as keyof typeof INVOICE_STATUS];
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[180px]">
                            {inv.customer?.name}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono whitespace-nowrap">
                            {formatCurrency(inv.total)}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo?.color}`}>
                              {statusInfo?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap font-mono text-[11px]">
                            {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Upcoming Inspections, Synology Status & Equipment */}
        <div className="space-y-6">
          {/* Upcoming Scheduled Inspections */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="py-3 px-4 border-b border-gray-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-gray-900">
                <Calendar className="h-4 w-4 text-blue-600" />
                Upcoming Inspections
              </CardTitle>
              <Link href="/inspections" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingInspections.length === 0 ? (
                <p className="text-xs text-gray-400 p-6 text-center">No inspections scheduled.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingInspections.map((ins) => (
                    <div key={ins.id} className="p-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] text-gray-500 font-semibold">
                          {ins.inspectionNumber}
                        </span>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded">
                          {ins.type}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-900 truncate">{ins.customer?.name}</p>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                        <span>{ins.serviceType?.name || "General Inspection"}</span>
                        <span className="font-mono text-gray-700">
                          {ins.scheduledDate ? formatDate(ins.scheduledDate) : "TBD"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Synology NAS Excel Live Integration Status Card */}
          <Card className="border-gray-200 shadow-sm bg-gradient-to-br from-blue-50/50 via-white to-gray-50">
            <CardHeader className="py-3 px-4 border-b border-gray-200/70 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-gray-900">
                <HardDrive className="h-4 w-4 text-blue-600" />
                Synology NAS Sync
              </CardTitle>
              {synologyConfig?.enabled ? (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">
                  Auto Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-gray-500">
                  Disabled
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>Mount Path:</span>
                <code className="bg-white border px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {synologyConfig?.folderPath || "/synology"}
                </code>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Frequency:</span>
                <span className="font-medium text-gray-800">
                  Every {synologyConfig?.intervalMinutes || 15} mins
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Last Sync Result:</span>
                <span
                  className={`font-semibold ${
                    synologyConfig?.lastStatus === "SUCCESS"
                      ? "text-green-700"
                      : "text-amber-700"
                  }`}
                >
                  {synologyConfig?.lastStatus || "Never"}
                </span>
              </div>
              {synologyConfig?.lastMessage && (
                <div className="p-2 rounded bg-white border border-gray-200 text-[11px] text-gray-600 line-clamp-2">
                  {synologyConfig.lastMessage}
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 flex justify-end">
                <Link href="/settings">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 bg-white">
                    Configure Sync →
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Top Service Categories */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="py-3 px-4 border-b border-gray-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-gray-900">
                <Layers className="h-4 w-4 text-red-600" />
                Service Categories
              </CardTitle>
              <Link href="/settings" className="text-xs text-red-600 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {topServiceTypes.map((st) => (
                  <div key={st.id} className="p-3 hover:bg-gray-50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                      <span className="font-medium text-gray-900 truncate">{st.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-gray-600 bg-gray-50 shrink-0 font-mono">
                      {st._count.tickets} tickets
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Customers Spotlight */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="py-3 px-4 border-b border-gray-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-gray-900">
                <Building2 className="h-4 w-4 text-purple-600" />
                Recent Clients
              </CardTitle>
              <Link href="/customers" className="text-xs text-purple-600 hover:underline">
                View all ({totalCustomers})
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {recentCustomers.map((c) => (
                  <div key={c.id} className="p-3 hover:bg-gray-50 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{c.city || c.address || "Client Account"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-[10px] text-gray-600 bg-gray-50">
                        {c._count.tickets} tickets
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
