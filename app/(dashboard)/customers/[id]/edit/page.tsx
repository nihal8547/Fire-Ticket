"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", contactPerson: "",
    address: "", city: "", state: "", zipCode: "", siteDetails: "", notes: ""
  });

  useEffect(() => {
    fetch(`/api/customers/${id}`).then(r => r.json()).then(d => {
      setForm({
        name: d.name || "", email: d.email || "", phone: d.phone || "",
        contactPerson: d.contactPerson || "", address: d.address || "",
        city: d.city || "", state: d.state || "", zipCode: d.zipCode || "",
        siteDetails: d.siteDetails || "", notes: d.notes || ""
      });
      setFetching(false);
    });
  }, [id]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.push(`/customers/${id}`);
    } else {
      const d = await res.json();
      setError(d.error || "Update failed");
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-6 text-gray-400">Loading...</div>;

  return (
    <div className="p-3.5 sm:p-5 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2 sm:mb-4">
        <Link href={`/customers/${id}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Customer</h1>
          <p className="text-xs sm:text-sm text-gray-500">Update customer information</p>
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm sm:text-base">Company Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="sm:col-span-2"><Label>Company Name *</Label><Input value={form.name} onChange={set("name")} className="mt-1" required /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={set("email")} className="mt-1" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} className="mt-1" /></div>
            <div className="sm:col-span-2"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={set("contactPerson")} className="mt-1" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm sm:text-base">Site Address</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="sm:col-span-2"><Label>Street Address</Label><Input value={form.address} onChange={set("address")} className="mt-1" /></div>
            <div><Label>City</Label><Input value={form.city} onChange={set("city")} className="mt-1" /></div>
            <div><Label>State</Label><Input value={form.state} onChange={set("state")} className="mt-1" /></div>
            <div><Label>ZIP Code</Label><Input value={form.zipCode} onChange={set("zipCode")} className="mt-1" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm sm:text-base">Additional Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div><Label>Site Details</Label><Textarea value={form.siteDetails} onChange={set("siteDetails")} className="mt-1" rows={3} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={set("notes")} className="mt-1" rows={2} /></div>
          </CardContent>
        </Card>
        <div className="flex gap-3 justify-end pt-2">
          <Link href={`/customers/${id}`}><Button variant="outline" size="sm">Cancel</Button></Link>
          <Button type="submit" size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}
