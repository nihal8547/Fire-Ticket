"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, ClipboardCheck, Filter, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

const INSPECTION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "Scheduled", color: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: { label: "In Progress", color: "bg-yellow-100 text-yellow-800" },
  PASSED: { label: "Passed", color: "bg-green-100 text-green-800" },
  FAILED: { label: "Failed", color: "bg-red-100 text-red-800" },
  PENDING_REVIEW: { label: "Pending Review", color: "bg-orange-100 text-orange-800" },
};

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Edit inspection state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: "SCHEDULED",
    overallResult: "NONE",
    scheduledDate: "",
    notes: "",
  });

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/inspections?${params}`);
      const data = res.ok ? await res.json().catch(() => ({})) : {};
      setInspections(data.inspections || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Failed to fetch inspections:", e);
      setInspections([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchInspections(); }, [fetchInspections]);

  const openEdit = (ins: any) => {
    setEditingInspection(ins);
    setForm({
      status: ins.status || "SCHEDULED",
      overallResult: ins.overallResult || "NONE",
      scheduledDate: ins.scheduledDate ? new Date(ins.scheduledDate).toISOString().split("T")[0] : "",
      notes: ins.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingInspection) return;
    setSaving(true);
    const payload = {
      status: form.status,
      overallResult: form.overallResult === "NONE" ? null : form.overallResult,
      scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).toISOString() : null,
      notes: form.notes || null,
    };

    const res = await fetch(`/api/inspections/${editingInspection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setDialogOpen(false);
      fetchInspections();
    } else {
      alert("Failed to update inspection.");
    }
    setSaving(false);
  };

  const deleteInspection = async (id: string, number: string) => {
    if (!confirm(`Are you sure you want to delete inspection ${number}?`)) return;
    const res = await fetch(`/api/inspections/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchInspections();
    } else {
      alert("Failed to delete inspection.");
    }
  };

  return (
    <div className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspections</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total inspections</p>
        </div>
        <Link href="/inspections/new">
          <Button size="sm" className="gap-2 text-xs bg-red-600 hover:bg-red-700 text-white">
            <Plus className="h-4 w-4" /> Schedule Inspection
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 text-xs bg-white">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {Object.entries(INSPECTION_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-600">Inspection #</th>
                <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-600">Scheduled</th>
                <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-600">Result</th>
                <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-600">Certificate</th>
                <th className="text-right px-4 sm:px-6 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Loading...</td></tr>
              ) : inspections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <ClipboardCheck className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No inspections scheduled yet</p>
                    <Link href="/inspections/new" className="mt-2 inline-block">
                      <Button size="sm" className="mt-2 bg-red-600 hover:bg-red-700 text-white">Schedule First Inspection</Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                inspections.map((ins) => {
                  const statusInfo = INSPECTION_STATUS[ins.status] || { label: ins.status, color: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={ins.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-3.5">
                        <span className="font-mono text-xs font-semibold text-gray-900">{ins.inspectionNumber}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 font-medium text-gray-900">{ins.customer?.name}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-gray-700 text-xs">{ins.type}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-gray-700 text-xs">{formatDate(ins.scheduledDate)}</td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        {ins.overallResult && (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            ins.overallResult === "PASS" ? "bg-green-100 text-green-800" :
                            ins.overallResult === "FAIL" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>{ins.overallResult}</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        {ins.certExpiry && (
                          <span className="text-xs text-gray-600 font-mono">
                            Expires: {formatDate(ins.certExpiry)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(ins)}
                            className="h-8 px-2 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Edit inspection"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteInspection(ins.id, ins.inspectionNumber)}
                            className="h-8 px-2 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete inspection"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Inspection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Inspection</DialogTitle>
            <DialogDescription>
              Update inspection {editingInspection?.inspectionNumber} for {editingInspection?.customer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INSPECTION_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Overall Result</Label>
              <Select value={form.overallResult} onValueChange={(val) => setForm({ ...form, overallResult: val })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not Evaluated</SelectItem>
                  <SelectItem value="PASS">PASS</SelectItem>
                  <SelectItem value="FAIL">FAIL</SelectItem>
                  <SelectItem value="CONDITIONAL">CONDITIONAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Inspection notes or findings..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
