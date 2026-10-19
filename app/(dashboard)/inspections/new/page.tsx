"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewInspectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [form, setForm] = useState({
    customerId: "", type: "ANNUAL", serviceTypeId: "",
    scheduledDate: "", notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/customers?limit=100").then(r => r.json()),
      fetch("/api/service-types").then(r => r.json()),
    ]).then(([c, s]) => {
      setCustomers(c.customers || []);
      setServiceTypes(Array.isArray(s) ? s : []);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId) { setError("Customer is required"); return; }
    setLoading(true);
    setError("");

    const payload: any = { ...form };
    if (!payload.serviceTypeId) delete payload.serviceTypeId;
    if (payload.scheduledDate) payload.scheduledDate = new Date(payload.scheduledDate).toISOString();
    else delete payload.scheduledDate;

    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) router.push("/inspections");
    else { const d = await res.json(); setError(d.error || "Failed to create inspection"); setLoading(false); }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inspections"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Inspection</h1>
          <p className="text-sm text-gray-500">Create a new fire safety inspection</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Inspection Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={v => setForm(f => ({...f, customerId: v}))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Inspection Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="SPECIAL">Special</SelectItem>
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
              <Label>Scheduled Date</Label>
              <Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({...f, scheduledDate: e.target.value}))} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Special requirements, access instructions..." className="mt-1" rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/inspections"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading ? "Scheduling..." : "Schedule Inspection"}</Button>
        </div>
      </form>
    </div>
  );
}
