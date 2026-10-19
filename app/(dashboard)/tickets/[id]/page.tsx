"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Edit, User, Calendar, AlertTriangle, CheckCircle, Clock, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TICKET_STATUS, TICKET_PRIORITY, formatDate } from "@/lib/utils";

const statusFlow = ["NEW", "ASSIGNED", "IN_PROGRESS", "PENDING_PARTS", "RESOLVED", "CLOSED"];

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);

  const fetchTicket = useCallback(async () => {
    const res = await fetch(`/api/tickets/${id}`);
    const data = await res.json();
    setTicket(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTicket();
    fetch("/api/users?role=TECHNICIAN").then(r => r.json()).then(d => setTechnicians(Array.isArray(d) ? d : []));
  }, [fetchTicket]);

  const updateStatus = async (status: string) => {
    await fetch(`/api/tickets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(status === "RESOLVED" ? { resolvedDate: new Date().toISOString() } : {}) }),
    });
    fetchTicket();
  };

  const assignTechnician = async (technicianId: string) => {
    await fetch(`/api/tickets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technicianId, status: ticket.status === "NEW" ? "ASSIGNED" : ticket.status }),
    });
    fetchTicket();
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    await fetch(`/api/tickets/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    setComment("");
    setSubmitting(false);
    fetchTicket();
  };

  if (loading) return <div className="p-6 text-gray-500">Loading ticket...</div>;
  if (!ticket) return <div className="p-6 text-red-500">Ticket not found</div>;

  const statusInfo = TICKET_STATUS[ticket.status as keyof typeof TICKET_STATUS];
  const priorityInfo = TICKET_PRIORITY[ticket.priority as keyof typeof TICKET_PRIORITY];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/tickets"><Button variant="ghost" size="icon" className="mt-0.5"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityInfo?.color}`}>{priorityInfo?.label}</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo?.color}`}>{statusInfo?.label}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {ticket.customer?.name} · Created {formatDate(ticket.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {ticket.description && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Description</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Status Progress */}
          <Card>
            <CardHeader><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-0">
                {statusFlow.map((s, i) => {
                  const current = statusFlow.indexOf(ticket.status);
                  const isPast = i <= current;
                  const isCurrent = i === current;
                  const info = TICKET_STATUS[s as keyof typeof TICKET_STATUS];
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                          isCurrent ? "border-red-600 bg-red-600 text-white" :
                          isPast ? "border-green-500 bg-green-500 text-white" :
                          "border-gray-200 bg-white text-gray-400"
                        }`}>
                          {isPast && !isCurrent ? "✓" : i + 1}
                        </div>
                        <span className="text-xs mt-1 text-gray-500 text-center leading-tight max-w-16">{info?.label}</span>
                      </div>
                      {i < statusFlow.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-5 mx-1 ${i < current ? "bg-green-400" : "bg-gray-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {statusFlow.filter(s => s !== ticket.status).map(s => (
                  <Button key={s} variant="outline" size="sm" onClick={() => updateStatus(s)}>
                    Move to {TICKET_STATUS[s as keyof typeof TICKET_STATUS]?.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader><CardTitle className="text-base">Comments ({ticket.comments?.length || 0})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments?.length === 0 && (
                <p className="text-sm text-gray-500">No comments yet. Add the first one below.</p>
              )}
              {ticket.comments?.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-semibold text-sm shrink-0">
                    {c.user?.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{c.user?.name}</span>
                      <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{c.content}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                  className="flex-1 resize-none"
                />
                <Button onClick={addComment} disabled={!comment.trim() || submitting} size="icon" className="self-end h-10 w-10">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Customer</p>
                <Link href={`/customers/${ticket.customer?.id}`} className="text-red-600 hover:underline font-medium">
                  {ticket.customer?.name}
                </Link>
              </div>
              {ticket.serviceType && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Service Type</p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: ticket.serviceType.color }} />
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
            <CardHeader><CardTitle className="text-base">Assign Technician</CardTitle></CardHeader>
            <CardContent>
              <Select value={ticket.technicianId || ""} onValueChange={assignTechnician}>
                <SelectTrigger>
                  <User className="h-3.5 w-3.5 mr-2 text-gray-400" />
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {ticket.technician && (
                <p className="text-xs text-gray-500 mt-2">Currently: {ticket.technician.name}</p>
              )}
            </CardContent>
          </Card>

          {/* Audit Log */}
          {ticket.auditLogs?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Activity Log</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {ticket.auditLogs.slice(0, 5).map((log: any) => (
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
