"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    customerId: searchParams.get("customerId") || "",
    serviceTypeId: "",
    priority: "MEDIUM",
    technicianId: "",
    scheduledDate: "",
    dueDate: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/customers?limit=100").then(r => r.json()),
      fetch("/api/users?role=TECHNICIAN").then(r => r.json()),
      fetch("/api/service-types").then(r => r.json()),
    ]).then(([c, t, s]) => {
      setCustomers(c.customers || []);
      setTechnicians(Array.isArray(t) ? t : []);
      setServiceTypes(Array.isArray(s) ? s : []);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.customerId) {
      setError("Title and Customer are required");
      return;
    }
    setLoading(true);
    setError("");

    const payload: any = { ...form };
    if (!payload.technicianId) delete payload.technicianId;
    if (!payload.serviceTypeId) delete payload.serviceTypeId;
    if (!payload.scheduledDate) delete payload.scheduledDate;
    if (!payload.dueDate) delete payload.dueDate;
    if (payload.scheduledDate) payload.scheduledDate = new Date(payload.scheduledDate).toISOString();
    if (payload.dueDate) payload.dueDate = new Date(payload.dueDate).toISOString();

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const ticket = await res.json();
      router.push(`/tickets/${ticket.id}`);
    } else {
      const d = await res.json();
      setError(d.error || "Failed to create ticket");
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tickets"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Ticket</h1>
          <p className="text-sm text-gray-500">Create a new service ticket</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Ticket Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Annual Fire Inspection" className="mt-1" required />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Describe the issue or service needed..." className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer *</Label>
                <Select value={form.customerId} onValueChange={v => setForm(f => ({...f, customerId: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service Type</Label>
                <Select value={form.serviceTypeId} onValueChange={v => setForm(f => ({...f, serviceTypeId: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({...f, priority: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign Technician</Label>
                <Select value={form.technicianId} onValueChange={v => setForm(f => ({...f, technicianId: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scheduled Date</Label>
                <Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({...f, scheduledDate: e.target.value}))} className="mt-1" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Internal notes..." className="mt-1" rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/tickets"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Ticket"}</Button>
        </div>
      </form>
    </div>
  );
}
