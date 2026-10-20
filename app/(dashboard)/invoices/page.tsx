"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FileText, DollarSign, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { INVOICE_STATUS, formatDate, formatCurrency } from "@/lib/utils";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    customerId: "", dueDate: "", notes: "",
    items: [{ description: "", quantity: 1, unitPrice: 0 }]
  });

  // Edit Invoice state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    status: "DRAFT",
    dueDate: "",
    notes: "",
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/invoices?${params}`);
      const data = res.ok ? await res.json().catch(() => ({})) : {};
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Failed to fetch invoices:", e);
      setInvoices([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => {
    fetch("/api/customers?limit=100")
      .then(r => r.ok ? r.json() : {})
      .then((d: any) => setCustomers(d?.customers || []))
      .catch(() => setCustomers([]));
  }, []);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: "", quantity: 1, unitPrice: 0 }] }));
  const updateItem = (i: number, k: string, v: any) => setForm(f => {
    const items = [...f.items];
    items[i] = { ...items[i], [k]: v };
    return { ...f, items };
  });
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const subtotal = form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleCreate = async () => {
    if (!form.customerId) return;
    setSaving(true);
    const payload: any = { ...form };
    if (payload.dueDate) payload.dueDate = new Date(payload.dueDate).toISOString();
    else delete payload.dueDate;

    const res = await fetch("/api/invoices", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    });
    if (res.ok) { setDialogOpen(false); fetchInvoices(); }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/invoices/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(status === "PAID" ? { paidDate: new Date().toISOString() } : {}) })
    });
    fetchInvoices();
  };

  const openEdit = (inv: any) => {
    setEditingInvoice(inv);
    setEditForm({
      status: inv.status,
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split("T")[0] : "",
      notes: inv.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingInvoice) return;
    setEditSaving(true);
    const payload: any = {
      status: editForm.status,
      dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
      notes: editForm.notes || null,
    };
    if (editForm.status === "PAID" && !editingInvoice.paidDate) {
      payload.paidDate = new Date().toISOString();
    }

    const res = await fetch(`/api/invoices/${editingInvoice.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setEditDialogOpen(false);
      fetchInvoices();
    } else {
      alert("Failed to update invoice.");
    }
    setEditSaving(false);
  };

  const handleDeleteInvoice = async (id: string, number: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${number}?`)) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchInvoices();
    } else {
      alert("Failed to delete invoice.");
    }
  };

  // Summary cards
  const totalRevenue = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.total, 0);
  const pending = invoices.filter(i => ["SENT", "OVERDUE"].includes(i.status)).reduce((s, i) => s + i.total, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total invoices</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Invoice</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Revenue Collected</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Pending / Overdue</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(pending)}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {Object.entries(INVOICE_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-600">Invoice #</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Due Date</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Issued</th>
              <th className="text-right px-6 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16">
                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No invoices yet</p>
              </td></tr>
            ) : invoices.map((inv) => {
              const s = INVOICE_STATUS[inv.status as keyof typeof INVOICE_STATUS];
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{inv.customer?.name}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(inv.total)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s?.color}`}>{s?.label}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{formatDate(inv.dueDate)}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(inv.issueDate)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {inv.status === "DRAFT" && (
                        <Button variant="outline" size="sm" onClick={() => updateStatus(inv.id, "SENT")} className="h-8 px-2 text-xs">Send</Button>
                      )}
                      {["SENT", "OVERDUE"].includes(inv.status) && (
                        <Button variant="outline" size="sm" onClick={() => updateStatus(inv.id, "PAID")} className="h-8 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50">Mark Paid</Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(inv)}
                        className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Edit invoice"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                        className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete invoice"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Generate a new invoice for a customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
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
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} className="mt-1" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Line Items</Label>
                <button type="button" onClick={addItem} className="text-xs text-red-600 hover:underline">+ Add Item</button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input placeholder="Description" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} className="flex-1" />
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} className="w-16" min="1" />
                    <Input type="number" placeholder="Price" value={item.unitPrice} onChange={e => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)} className="w-24" min="0" step="0.01" />
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 text-sm px-1">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-right mt-2 text-sm font-semibold text-gray-700">Subtotal: {formatCurrency(subtotal)}</div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input placeholder="Payment terms or notes..." value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="mt-1" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.customerId || saving}>{saving ? "Creating..." : "Create Invoice"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update status and details for {editingInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(val) => setEditForm({ ...editForm, status: val })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INVOICE_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={editForm.dueDate}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Payment notes, reference, or terms..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
