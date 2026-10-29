"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Upload, Download, Eye, Edit, Trash2, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}&limit=50`);
      const data = res.ok ? await res.json().catch(() => ({})) : {};
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Failed to fetch customers:", e);
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timeout);
  }, [fetchCustomers]);

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("type", "CUSTOMERS");
    const res = await fetch("/api/excel/import", { method: "POST", body: formData });
    const result = await res.json();
    setImportResult(result);
    setImporting(false);
    if (result.success) fetchCustomers();
  };

  const downloadTemplate = () => { window.location.href = "/api/excel/template?type=CUSTOMERS"; };

  const closeImport = () => { setImportOpen(false); setImportResult(null); setSelectedFile(null); };

  const deleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchCustomers();
    } else {
      alert("Failed to delete customer.");
    }
  };

  return (
    <div className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total customers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-2 text-xs">
            <Upload className="h-4 w-4" /> Import Excel
          </Button>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 text-xs">
            <Download className="h-4 w-4" /> Template
          </Button>
          <Link href="/customers/new">
            <Button size="sm" className="gap-2 text-xs bg-red-600 hover:bg-red-700 text-white">
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search customers by name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-md bg-white text-xs sm:text-sm"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 sm:px-6 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 sm:px-6 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 sm:px-6 py-3 font-medium text-gray-600">Location</th>
                <th className="text-left px-4 sm:px-6 py-3 font-medium text-gray-600">Tickets</th>
                <th className="text-left px-4 sm:px-6 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 sm:px-6 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No customers found</td></tr>
              ) : customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-semibold text-sm shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{c.name}</p>
                        {c.contactPerson && <p className="text-xs text-gray-500 truncate">{c.contactPerson}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5">
                    <div className="space-y-0.5 text-xs">
                      {c.email && <div className="flex items-center gap-1.5 text-gray-600"><Mail className="h-3 w-3" />{c.email}</div>}
                      {c.phone && <div className="flex items-center gap-1.5 text-gray-600"><Phone className="h-3 w-3" />{c.phone}</div>}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs">
                    {(c.city || c.state) && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <MapPin className="h-3 w-3" />
                        {[c.city, c.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5">
                    <span className="font-semibold text-gray-900">{c._count?.tickets || 0}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5">
                    <Badge className={c.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                      {c.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/customers/${c.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs" title="View customer"><Eye className="h-3.5 w-3.5" />View</Button>
                      </Link>
                      <Link href={`/customers/${c.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Edit customer"><Edit className="h-3.5 w-3.5" />Edit</Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCustomer(c.id, c.name)}
                        className="h-8 px-2 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete customer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={importOpen} onOpenChange={(v) => { if (!v) closeImport(); else setImportOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Customers from Excel</DialogTitle>
            <DialogDescription>Upload .xlsx file. Existing customers matched by email will be updated.</DialogDescription>
          </DialogHeader>
          {!importResult ? (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-red-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById("excel-file-cust")?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">{selectedFile ? selectedFile.name : "Click to upload Excel file"}</p>
                <p className="text-xs text-gray-500 mt-1">.xlsx files supported</p>
                <input id="excel-file-cust" type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 w-full sm:w-auto">
                  <Download className="h-3.5 w-3.5" /> Template
                </Button>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <Button variant="outline" size="sm" onClick={closeImport}>Cancel</Button>
                  <Button size="sm" onClick={handleImport} disabled={!selectedFile || importing}>
                    {importing ? "Importing..." : "Import"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="font-semibold text-green-800 mb-3">Import Complete</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-2xl font-bold text-green-700">{importResult.newRecords}</p><p className="text-xs text-green-600">New</p></div>
                  <div><p className="text-2xl font-bold text-blue-700">{importResult.updated}</p><p className="text-xs text-blue-600">Updated</p></div>
                  <div><p className="text-2xl font-bold text-red-700">{importResult.failed}</p><p className="text-xs text-red-600">Failed</p></div>
                </div>
              </div>
              {importResult.errors?.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 mb-1">Errors:</p>
                  {importResult.errors.map((e: string, i: number) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                </div>
              )}
              <Button className="w-full" onClick={closeImport}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
