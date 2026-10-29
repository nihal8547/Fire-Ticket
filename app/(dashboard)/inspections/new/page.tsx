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
import { SearchableSelect } from "@/components/ui/searchable-select";
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
    <div className="p-3.5 sm:p-5 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2 sm:mb-4">
        <Link href="/inspections"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Schedule Inspection</h1>
          <p className="text-xs sm:text-sm text-gray-500">Create a new fire safety inspection</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm sm:text-base">Inspection Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <Label>Customer *</Label>
              <div className="mt-1">
                <SearchableSelect
                  options={customers.map(c => ({
                    value: c.id,
                    label: c.name,
                    description: c.email || c.phone || undefined,
                  }))}
                  value={form.customerId}
                  onValueChange={v => setForm(f => ({...f, customerId: v}))}
                  placeholder="Search & select customer..."
                  searchPlaceholder="Search customer by name, email..."
                />
              </div>
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
              <div className="mt-1">
                <SearchableSelect
                  options={serviceTypes.map(s => ({
                    value: s.id,
                    label: s.name,
                    description: s.description || undefined,
                  }))}
                  value={form.serviceTypeId}
                  onValueChange={v => setForm(f => ({...f, serviceTypeId: v}))}
                  placeholder="Search & select service..."
                  searchPlaceholder="Search service type..."
                  allowClear
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Scheduled Date</Label>
              <Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({...f, scheduledDate: e.target.value}))} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Special requirements, access instructions..." className="mt-1" rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pt-2">
          <Link href="/inspections"><Button variant="outline" size="sm">Cancel</Button></Link>
          <Button type="submit" size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
            {loading ? "Scheduling..." : "Schedule Inspection"}
          </Button>
        </div>
      </form>
    </div>
  );
}
