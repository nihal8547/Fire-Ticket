"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Package, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

const ASSET_STATUS = {
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-800" },
  NEEDS_SERVICE: { label: "Needs Service", color: "bg-yellow-100 text-yellow-800" },
  OUT_OF_SERVICE: { label: "Out of Service", color: "bg-red-100 text-red-800" },
};

const ASSET_TYPES = ["EXTINGUISHER", "SPRINKLER", "ALARM", "PANEL", "SUPPRESSION", "OTHER"];

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "", assetType: "EXTINGUISHER", customerId: "", serialNumber: "",
    manufacturer: "", model: "", location: "", status: "ACTIVE",
    installDate: "", lastServiceDate: "", nextServiceDate: "", notes: ""
  });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/assets?${params}`);
      const data = res.ok ? await res.json().catch(() => []) : [];
      setAssets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch assets:", e);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchAssets, 300);
    return () => clearTimeout(t);
  }, [fetchAssets]);

  useEffect(() => {
    fetch("/api/customers?limit=100")
      .then(r => r.ok ? r.json() : {})
      .then((d: any) => setCustomers(d?.customers || []))
      .catch(() => setCustomers([]));
  }, []);

  const openAdd = () => {
    setEditAsset(null);
    setForm({ name: "", assetType: "EXTINGUISHER", customerId: "", serialNumber: "", manufacturer: "", model: "", location: "", status: "ACTIVE", installDate: "", lastServiceDate: "", nextServiceDate: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (asset: any) => {
    setEditAsset(asset);
    setForm({
      name: asset.name || "", assetType: asset.assetType || "EXTINGUISHER",
      customerId: asset.customerId || "", serialNumber: asset.serialNumber || "",
      manufacturer: asset.manufacturer || "", model: asset.model || "",
      location: asset.location || "", status: asset.status || "ACTIVE",
      installDate: asset.installDate ? asset.installDate.split("T")[0] : "",
      lastServiceDate: asset.lastServiceDate ? asset.lastServiceDate.split("T")[0] : "",
      nextServiceDate: asset.nextServiceDate ? asset.nextServiceDate.split("T")[0] : "",
      notes: asset.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.customerId) return;
    setSaving(true);
    const payload: any = { ...form };
    ["installDate", "lastServiceDate", "nextServiceDate"].forEach(k => {
      if (payload[k]) payload[k] = new Date(payload[k]).toISOString();
      else delete payload[k];
    });

    const res = editAsset
      ? await fetch(`/api/assets/${editAsset.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    if (res.ok) { setDialogOpen(false); fetchAssets(); }
    setSaving(false);
  };

  const deleteAsset = async (id: string) => {
    if (!confirm("Delete this asset?")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    fetchAssets();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Assets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{assets.length} assets</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Add Asset</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {Object.entries(ASSET_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-600">Asset</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Serial #</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Next Service</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-6 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">Loading...</td></tr>
            ) : assets.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No assets found</p>
              </td></tr>
            ) : assets.map((a) => {
              const s = ASSET_STATUS[a.status as keyof typeof ASSET_STATUS];
              const nextServiceSoon = a.nextServiceDate && new Date(a.nextServiceDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{a.name}</p>
                    {a.location && <p className="text-xs text-gray-500">{a.location}</p>}
                  </td>
                  <td className="px-6 py-4 text-gray-700">{a.customer?.name}</td>
                  <td className="px-6 py-4 text-gray-600">{a.assetType}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{a.serialNumber || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs ${nextServiceSoon ? "text-orange-600 font-semibold" : "text-gray-600"}`}>
                      {formatDate(a.nextServiceDate)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s?.color}`}>{s?.label}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteAsset(a.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editAsset ? "Edit Asset" : "Add Asset"}</DialogTitle>
            <DialogDescription>Register fire protection equipment</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Asset Name *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="mt-1" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.assetType} onValueChange={v => setForm(f => ({...f, assetType: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
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
                  placeholder="Select customer..."
                  searchPlaceholder="Search customer..."
                />
              </div>
            </div>
            <div><Label>Serial Number</Label><Input value={form.serialNumber} onChange={e => setForm(f => ({...f, serialNumber: e.target.value}))} className="mt-1" /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} className="mt-1" /></div>
            <div><Label>Install Date</Label><Input type="date" value={form.installDate} onChange={e => setForm(f => ({...f, installDate: e.target.value}))} className="mt-1" /></div>
            <div><Label>Next Service</Label><Input type="date" value={form.nextServiceDate} onChange={e => setForm(f => ({...f, nextServiceDate: e.target.value}))} className="mt-1" /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSET_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="mt-1" rows={2} /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.customerId}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
