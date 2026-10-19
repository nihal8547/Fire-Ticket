"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", contactPerson: "",
    address: "", city: "", state: "", zipCode: "", siteDetails: "", notes: ""
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Customer name is required"); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.push("/customers");
    } else {
      const d = await res.json();
      setError(d.error || "Failed to create customer");
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/customers"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Customer</h1>
          <p className="text-sm text-gray-500">Create a new customer account</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-red-500" />Company Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={set("name")} placeholder="ABC Fire Safety Ltd" className="mt-1" required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={set("email")} placeholder="contact@company.com" className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={set("phone")} placeholder="555-0100" className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Contact Person</Label>
              <Input value={form.contactPerson} onChange={set("contactPerson")} placeholder="John Smith" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Site Address</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Street Address</Label>
              <Input value={form.address} onChange={set("address")} placeholder="123 Main Street" className="mt-1" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={set("city")} placeholder="New York" className="mt-1" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state} onChange={set("state")} placeholder="NY" className="mt-1" />
            </div>
            <div>
              <Label>ZIP Code</Label>
              <Input value={form.zipCode} onChange={set("zipCode")} placeholder="10001" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Additional Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Site Details</Label>
              <Textarea value={form.siteDetails} onChange={set("siteDetails")} placeholder="Building type, floors, special access..." className="mt-1" rows={3} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={set("notes")} placeholder="Internal notes..." className="mt-1" rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/customers"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Customer"}</Button>
        </div>
      </form>
    </div>
  );
}
