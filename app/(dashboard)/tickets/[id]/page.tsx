import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TICKET_STATUS, TICKET_PRIORITY, formatDate } from "@/lib/utils";
import {
  TicketStatusButtons,
  TicketCommentBox,
  TicketTechnicianAssigner,
  TicketDeleteButton,
} from "@/components/tickets/ticket-interactive-actions";

const statusFlow = ["NEW", "ASSIGNED", "IN_PROGRESS", "PENDING_PARTS", "RESOLVED", "CLOSED"];

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 100% Server-side data retrieval - 0 client fetch delay!
  const [ticket, technicians] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        technician: true,
        serviceType: true,
        comments: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "desc" },
        },
        auditLogs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "TECHNICIAN", isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!ticket) {
    notFound();
  }

  const statusInfo = TICKET_STATUS[ticket.status as keyof typeof TICKET_STATUS];
  const priorityInfo = TICKET_PRIORITY[ticket.priority as keyof typeof TICKET_PRIORITY];

  return (
    <div className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3">
          <Link href="/tickets">
            <Button variant="ghost" size="icon" className="mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-gray-500">#{ticket.ticketNumber}</span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-medium ${priorityInfo?.color}`}
              >
                {priorityInfo?.label}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-medium ${statusInfo?.color}`}
              >
                {statusInfo?.label}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">{ticket.title}</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {ticket.customer?.name} · Created {formatDate(ticket.createdAt)}
            </p>
          </div>
        </div>

        <TicketDeleteButton ticketId={ticket.id} ticketNumber={ticket.ticketNumber} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {ticket.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Description</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Status Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-2">
                <div className="flex items-center gap-0 min-w-[500px]">
                  {statusFlow.map((s, i) => {
                    const current = statusFlow.indexOf(ticket.status);
                    const isPast = i <= current;
                    const isCurrent = i === current;
                    const info = TICKET_STATUS[s as keyof typeof TICKET_STATUS];
                    return (
                      <div key={s} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                              isCurrent
                                ? "border-red-600 bg-red-600 text-white"
                                : isPast
                                ? "border-green-500 bg-green-500 text-white"
                                : "border-gray-200 bg-white text-gray-400"
                            }`}
                          >
                            {isPast && !isCurrent ? "✓" : i + 1}
                          </div>
                          <span className="text-[10px] sm:text-xs mt-1 text-gray-500 text-center leading-tight max-w-16">
                            {info?.label}
                          </span>
                        </div>
                        {i < statusFlow.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mb-5 mx-1 ${
                              i < current ? "bg-green-400" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Action Buttons */}
              <TicketStatusButtons ticketId={ticket.id} currentStatus={ticket.status} />
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">
                Comments ({ticket.comments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments?.length === 0 && (
                <p className="text-xs sm:text-sm text-gray-500">No comments yet. Add the first one below.</p>
              )}
              {ticket.comments?.map((c) => (
                <div key={c.id} className="flex gap-2.5 sm:gap-3">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-semibold text-xs sm:text-sm shrink-0">
                    {c.user?.name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{c.user?.name}</span>
                      <span className="text-[10px] sm:text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                      {c.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Add Comment Box */}
              <TicketCommentBox ticketId={ticket.id} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs sm:text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Customer</p>
                <Link
                  href={`/customers/${ticket.customer?.id}`}
                  className="text-red-600 hover:underline font-medium"
                >
                  {ticket.customer?.name}
                </Link>
              </div>
              {ticket.serviceType && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Service Type</p>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: ticket.serviceType.color }}
                    />
                    <span className="text-gray-800">{ticket.serviceType.name}</span>
                  </div>
                </div>
              )}
              {ticket.scheduledDate && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Scheduled</p>
                  <div className="flex items-center gap-1.5 text-gray-800">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {formatDate(ticket.scheduledDate)}
                  </div>
                </div>
              )}
              {ticket.resolvedDate && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Resolved</p>
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {formatDate(ticket.resolvedDate)}
                  </div>
                </div>
              )}
              {ticket.notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Notes</p>
                  <p className="text-gray-700">{ticket.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Assign Technician</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketTechnicianAssigner
                ticketId={ticket.id}
                currentTechnicianId={ticket.technicianId}
                currentStatus={ticket.status}
                technicians={technicians}
              />
              {ticket.technician && (
                <p className="text-xs text-gray-500 mt-2">Currently: {ticket.technician.name}</p>
              )}
            </CardContent>
          </Card>

          {/* Audit Log */}
          {ticket.auditLogs?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">Activity Log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ticket.auditLogs.map((log) => (
                  <div key={log.id} className="text-xs">
                    <span className="font-medium text-gray-700">{log.user?.name}</span>
                    <span className="text-gray-500"> {log.action.toLowerCase()} this ticket</span>
                    <div className="text-gray-400">{new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
