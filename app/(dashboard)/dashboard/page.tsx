import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Ticket, Building2, Wrench, AlertTriangle, CheckCircle2, Clock, TrendingUp, Plus } from "lucide-react";
import { TICKET_STATUS, TICKET_PRIORITY, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;

  const [
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedTickets,
    emergencyTickets,
    totalCustomers,
    recentTickets,
    upcomingInspections,
    overdueInvoices,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: "NEW" } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { status: "RESOLVED" } }),
    prisma.ticket.count({ where: { priority: "EMERGENCY", status: { not: "CLOSED" } } }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.ticket.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { customer: true, technician: true, serviceType: true },
    }),
    prisma.inspection.findMany({
      take: 5,
      where: { status: "SCHEDULED", scheduledDate: { gte: new Date() } },
      orderBy: { scheduledDate: "asc" },
      include: { customer: true },
    }),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),
  ]);

  const stats = [
    { label: "Total Tickets", value: totalTickets, icon: Ticket, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Open Tickets", value: openTickets, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "In Progress", value: inProgressTickets, icon: Wrench, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Resolved", value: resolvedTickets, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Emergency", value: emergencyTickets, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Customers", value: totalCustomers, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, {user?.name}. Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <Link href="/tickets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      {/* Emergency Alert */}
      {emergencyTickets > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {emergencyTickets} Emergency Ticket{emergencyTickets > 1 ? "s" : ""} Require Immediate Attention
            </p>
            <Link href="/tickets?priority=EMERGENCY" className="text-xs text-red-600 hover:underline">
              View emergency tickets →
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg} mb-3`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Tickets</CardTitle>
                <Link href="/tickets" className="text-sm text-red-600 hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {recentTickets.length === 0 ? (
                  <p className="text-sm text-gray-500 p-6 text-center">No tickets yet</p>
                ) : (
                  recentTickets.map((ticket) => {
                    const statusInfo = TICKET_STATUS[ticket.status as keyof typeof TICKET_STATUS];
                    const priorityInfo = TICKET_PRIORITY[ticket.priority as keyof typeof TICKET_PRIORITY];
                    return (
                      <Link
                        key={ticket.id}
                        href={`/tickets/${ticket.id}`}
                        className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityInfo?.color}`}>
                              {priorityInfo?.label}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">{ticket.title}</p>
                          <p className="text-xs text-gray-500">{ticket.customer.name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo?.color}`}>
                            {statusInfo?.label}
                          </span>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(ticket.createdAt)}</p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-4">
          {/* Upcoming Inspections */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Upcoming Inspections</CardTitle>
                <Link href="/inspections" className="text-sm text-red-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingInspections.length === 0 ? (
                <p className="text-sm text-gray-500 px-6 pb-4 text-center">No upcoming inspections</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingInspections.map((ins) => (
                    <div key={ins.id} className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{ins.customer.name}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-gray-500">{ins.type}</span>
                        <span className="text-xs text-blue-600 font-medium">{formatDate(ins.scheduledDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Link href="/tickets/new">
                <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                  <Ticket className="h-4 w-4 text-red-500" /> New Ticket
                </Button>
              </Link>
              <Link href="/customers/new">
                <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-blue-500" /> Add Customer
                </Button>
              </Link>
              <Link href="/inspections/new">
                <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" /> New Inspection
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Alerts */}
          {overdueInvoices > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <p className="text-sm font-semibold text-orange-800">Overdue Invoices</p>
                </div>
                <p className="text-xs text-orange-700">
                  {overdueInvoices} invoice{overdueInvoices > 1 ? "s" : ""} past due date
                </p>
                <Link href="/invoices?status=OVERDUE" className="text-xs text-orange-600 hover:underline mt-1 inline-block">
                  Review now →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
