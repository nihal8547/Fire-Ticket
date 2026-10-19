"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FileText, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    const res = await fetch(`/api/invoices?${params}`);
    const data = await res.json();
    setInvoices(data.invoices || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => {
    fetch("/api/customers?limit=100").then(r => r.json()).then(d => setCustomers(d.customers || []));
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
        <Button onClick={() => { setForm({ customerId: "", dueDate: "", notes: "", items: [{ description: "", quantity: 1, unitPrice: 0 }] }); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
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
                    <div className="flex justify-end gap-1">
                      {inv.status === "DRAFT" && (
                        <Button variant="outline" size="sm" onClick={() => updateStatus(inv.id, "SENT")}>Send</Button>
                      )}
                      {["SENT", "OVERDUE"].includes(inv.status) && (
                        <Button variant="outline" size="sm" onClick={() => updateStatus(inv.id, "PAID")} className="text-green-600 border-green-200 hover:bg-green-50">Mark Paid</Button>
                      )}
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
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Generate a new invoice for a customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Customer *</Label>
                <Select value={form.customerId} onValueChange={v => setForm(f => ({...f, customerId: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} className="mt-1" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <Button variant="ghost" size="sm" onClick={addItem} className="text-xs h-6">+ Add Line</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-6 text-xs" placeholder="Description" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} />
                    <Input className="col-span-2 text-xs" type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, "quantity", parseFloat(e.target.value))} />
                    <Input className="col-span-3 text-xs" type="number" placeholder="Price" value={item.unitPrice} onChange={e => updateItem(i, "unitPrice", parseFloat(e.target.value))} />
                    <Button variant="ghost" size="sm" className="col-span-1 h-8 p-0 text-red-500 hover:text-red-600" onClick={() => removeItem(i)}>×</Button>
                  </div>
                ))}
              </div>
              <div className="text-right mt-2 text-sm">
                <span className="text-gray-500">Subtotal: </span><span className="font-medium">{formatCurrency(subtotal)}</span>
                <span className="text-gray-500 ml-4">Tax (10%): </span><span className="font-medium">{formatCurrency(subtotal * 0.1)}</span>
                <span className="text-gray-500 ml-4">Total: </span><span className="font-bold text-gray-900">{formatCurrency(subtotal * 1.1)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.customerId}>{saving ? "Creating..." : "Create Invoice"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
