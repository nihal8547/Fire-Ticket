"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Settings, Wrench, Mail, CheckCircle, XCircle, Send, Eye, EyeOff } from "lucide-react";
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

  // Email settings state
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: "", smtpPort: "587", smtpSecure: false,
    smtpUser: "", smtpPass: "", emailFrom: "", emailEnabled: false,
  });
  const [showPass, setShowPass] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);

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

  const handleVerifySmtp = async () => {
    setVerifying(true);
    setEmailStatus(null);
    const res = await fetch("/api/email/verify", { method: "POST" });
    const data = await res.json();
    setEmailStatus(res.ok ? { type: "success", msg: "SMTP connection verified successfully!" } : { type: "error", msg: data.error || "Connection failed" });
    setVerifying(false);
  };

  const handleSendTest = async () => {
    if (!testEmail) return;
    setSending(true);
    setEmailStatus(null);
    const res = await fetch("/api/email/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: testEmail }) });
    const data = await res.json();
    setEmailStatus(res.ok ? { type: "success", msg: data.message || "Test email sent!" } : { type: "error", msg: data.error || "Failed to send" });
    setSending(false);
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

      {/* Email / SMTP Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Email Notifications (SMTP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">Configure SMTP to enable automatic email notifications for tickets, inspections, and invoices. Set <code className="bg-gray-100 px-1 rounded text-xs">EMAIL_ENABLED=true</code> in your <code className="bg-gray-100 px-1 rounded text-xs">.env</code> file to activate sending.</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 md:col-span-1">
              <Label>SMTP Host</Label>
              <Input className="mt-1" placeholder="smtp.gmail.com" value={emailConfig.smtpHost}
                onChange={e => setEmailConfig(c => ({ ...c, smtpHost: e.target.value }))} />
            </div>
            <div>
              <Label>Port</Label>
              <Input className="mt-1" placeholder="587" value={emailConfig.smtpPort}
                onChange={e => setEmailConfig(c => ({ ...c, smtpPort: e.target.value }))} />
            </div>
            <div>
              <Label>Username / Email</Label>
              <Input className="mt-1" placeholder="you@gmail.com" value={emailConfig.smtpUser}
                onChange={e => setEmailConfig(c => ({ ...c, smtpUser: e.target.value }))} />
            </div>
            <div>
              <Label>Password / App Password</Label>
              <div className="relative mt-1">
                <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={emailConfig.smtpPass}
                  onChange={e => setEmailConfig(c => ({ ...c, smtpPass: e.target.value }))} />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>From Name / Email</Label>
              <Input className="mt-1" placeholder="FireTicket <noreply@yourcompany.com>" value={emailConfig.emailFrom}
                onChange={e => setEmailConfig(c => ({ ...c, emailFrom: e.target.value }))} />
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <strong>Note:</strong> These settings are read from environment variables at runtime. Update your <code className="bg-amber-100 px-1 rounded text-xs">.env</code> file with the values above and restart the server.
            <div className="mt-2 font-mono text-xs space-y-0.5 text-amber-700">
              {emailConfig.smtpHost && <div>SMTP_HOST="{emailConfig.smtpHost}"</div>}
              {emailConfig.smtpPort && <div>SMTP_PORT="{emailConfig.smtpPort}"</div>}
              {emailConfig.smtpUser && <div>SMTP_USER="{emailConfig.smtpUser}"</div>}
              {emailConfig.smtpPass && <div>SMTP_PASS="{'*'.repeat(emailConfig.smtpPass.length)}"</div>}
              {emailConfig.emailFrom && <div>EMAIL_FROM="{emailConfig.emailFrom}"</div>}
              <div>EMAIL_ENABLED="true"</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleVerifySmtp} disabled={verifying} className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />{verifying ? "Testing..." : "Verify SMTP Connection"}
            </Button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <Label>Send Test Email</Label>
            <div className="flex gap-2 mt-1">
              <Input placeholder="recipient@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="max-w-xs" />
              <Button size="sm" onClick={handleSendTest} disabled={sending || !testEmail} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />{sending ? "Sending..." : "Send Test"}
              </Button>
            </div>
          </div>

          {emailStatus && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${emailStatus.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
              {emailStatus.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              {emailStatus.msg}
            </div>
          )}

          <div className="text-xs text-gray-400 pt-1">
            Notifications are sent automatically for: new tickets, ticket assignments, status changes, scheduled inspections, and new invoices.
          </div>
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
