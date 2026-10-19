"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Settings, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", defaultDuration: "" });

  const fetchServiceTypes = async () => {
    setLoading(true);
    const res = await fetch("/api/service-types");
    const data = await res.json();
    setServiceTypes(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchServiceTypes(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", description: "", defaultDuration: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description || "", defaultDuration: item.defaultDuration ? String(item.defaultDuration) : "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const payload: any = { ...form };
    if (payload.defaultDuration) payload.defaultDuration = parseInt(payload.defaultDuration);
    else delete payload.defaultDuration;

    const res = editItem
      ? await fetch(`/api/service-types/${editItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/service-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

    if (res.ok) { setDialogOpen(false); fetchServiceTypes(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service type?")) return;
    await fetch(`/api/service-types/${id}`, { method: "DELETE" });
    fetchServiceTypes();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage service types and application configuration</p>
      </div>

      {/* Service Types */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" /> Service Types
            </CardTitle>
            <Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Type</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : serviceTypes.length === 0 ? (
            <p className="text-sm text-gray-500">No service types configured yet.</p>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Description</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Duration (min)</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {serviceTypes.map(st => (
                    <tr key={st.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{st.name}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{st.description || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{st.defaultDuration ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(st)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(st.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" /> System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Application</p>
              <p className="font-medium text-gray-900">Fire Ticket</p>
            </div>
            <div>
              <p className="text-gray-500">Version</p>
              <p className="font-medium text-gray-900">1.0.0</p>
            </div>
            <div>
              <p className="text-gray-500">Database</p>
              <p className="font-medium text-gray-900">SQLite (Prisma ORM)</p>
            </div>
            <div>
              <p className="text-gray-500">Authentication</p>
              <p className="font-medium text-gray-900">NextAuth v5</p>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">Fire Protection Company Ticketing System. For support or configuration changes, contact your system administrator.</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Service Type" : "Add Service Type"}</DialogTitle>
            <DialogDescription>Configure a service type for inspections and tickets</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" placeholder="e.g. Fire Extinguisher Inspection" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Default Duration (minutes)</Label>
              <Input type="number" value={form.defaultDuration} onChange={e => setForm(f => ({ ...f, defaultDuration: e.target.value }))} className="mt-1" placeholder="e.g. 60" />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
