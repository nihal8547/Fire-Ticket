"use client";

import { useState, useEffect } from "react";
import {
  HardDrive,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  Play,
  Save,
  FolderCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SynologySyncCard() {
  const [config, setConfig] = useState<any>({
    enabled: false,
    folderPath: "/synology",
    ticketsFileName: "tickets.xlsx",
    customersFileName: "customers.xlsx",
    intervalMinutes: 15,
    lastSyncAt: null,
    lastStatus: null,
    lastMessage: null,
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/synology/config");
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        if (data.recentLogs) setLogs(data.recentLogs);
      }
    } catch (e) {
      console.error("Failed to load Synology config", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    // Background polling for sync status every 30 seconds
    const interval = setInterval(fetchConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/synology/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Synology sync configuration saved successfully!" });
        setConfig(data.config);
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to save configuration" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/synology/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderPath: config.folderPath,
          ticketsFileName: config.ticketsFileName,
          customersFileName: config.customersFileName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setTestResult(data.data);
      } else {
        setTestResult({ error: data.error || "Connection test failed" });
      }
    } catch (err: any) {
      setTestResult({ error: err.message || "Failed to contact test endpoint" });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/synology/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: "success", text: data.message || "Sync completed successfully!" });
      } else {
        setStatusMsg({
          type: "error",
          text: data.message || data.error || "Sync encountered errors.",
        });
      }
      fetchConfig();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Sync failed to start" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <HardDrive className="h-5 w-5 text-blue-600" />
            Synology NAS Excel Auto-Sync
          </CardTitle>
          <div className="flex items-center gap-2">
            {config.lastStatus && (
              <Badge
                variant="outline"
                className={`text-xs uppercase font-medium ${
                  config.lastStatus === "SUCCESS"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : config.lastStatus === "RUNNING"
                    ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {config.lastStatus}
              </Badge>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              {config.lastSyncAt
                ? `Last synced: ${new Date(config.lastSyncAt).toLocaleString()}`
                : "Never synced"}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <p className="text-sm text-gray-600">
          Automatically synchronize existing Excel files (Tickets & Customers) from your Synology NAS or shared network folder directly into FireTicket on a recurring schedule.
        </p>

        {/* Status Alert if any */}
        {statusMsg && (
          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
              statusMsg.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {statusMsg.text}
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <Label className="text-sm font-semibold text-gray-900">Enable Automated Background Sync</Label>
              <p className="text-xs text-gray-500">
                Periodically check the folder and import newly added or updated rows
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="md:col-span-2">
              <Label className="text-xs font-semibold text-gray-700">Synology Mount / Folder Path</Label>
              <Input
                className="mt-1 font-mono text-sm bg-white"
                value={config.folderPath}
                onChange={(e) => setConfig({ ...config, folderPath: e.target.value })}
                placeholder="/synology or ./synology_data"
              />
              <p className="text-xs text-gray-500 mt-1">
                Docker mapped directory. Mount your Synology SMB/NFS share to this path in <code>docker-compose.yml</code>.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Customers Excel File Name</Label>
              <Input
                className="mt-1 bg-white text-sm"
                value={config.customersFileName}
                onChange={(e) => setConfig({ ...config, customersFileName: e.target.value })}
                placeholder="customers.xlsx"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Tickets Excel File Name</Label>
              <Input
                className="mt-1 bg-white text-sm"
                value={config.ticketsFileName}
                onChange={(e) => setConfig({ ...config, ticketsFileName: e.target.value })}
                placeholder="tickets.xlsx"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Sync Frequency</Label>
              <Select
                value={String(config.intervalMinutes || 15)}
                onValueChange={(val) => setConfig({ ...config, intervalMinutes: parseInt(val) || 15 })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every 1 hour</SelectItem>
                  <SelectItem value="180">Every 3 hours</SelectItem>
                  <SelectItem value="1440">Once a day (24 hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Last Message</Label>
              <div className="mt-1 p-2 rounded bg-white border border-gray-200 text-xs text-gray-600 truncate">
                {config.lastMessage || "No sync activity recorded yet"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing}
                className="gap-1.5 bg-white text-xs"
              >
                <FolderCheck className="h-3.5 w-3.5" />
                {testing ? "Testing Connection..." : "Test Connection"}
              </Button>

              <Button
                size="sm"
                onClick={handleSyncNow}
                disabled={syncing}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <Play className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        {/* Live Test Results Card */}
        {testResult && (
          <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <FolderCheck className="h-4 w-4 text-blue-600" />
              Connection Test Report
            </h4>

            {testResult.error ? (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                {testResult.error}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Folder status */}
                <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Folder</span>
                    {testResult.folderExists ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">
                        Accessible
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">
                        Not Found
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-gray-600 truncate">{testResult.folderPath}</p>
                </div>

                {/* Customers File */}
                <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Customers File</span>
                    {testResult.customers?.exists ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">
                        Valid Excel
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                        Missing
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-gray-600 truncate">
                    {testResult.customers?.fileName}
                  </p>
                  {testResult.customers?.exists && (
                    <div className="text-[11px] text-gray-500">
                      Rows: <b>{testResult.customers.rowCount}</b> | Sheets:{" "}
                      {testResult.customers.sheetNames?.join(", ")}
                    </div>
                  )}
                </div>

                {/* Tickets File */}
                <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Tickets File</span>
                    {testResult.tickets?.exists ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">
                        Valid Excel
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                        Missing
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-gray-600 truncate">
                    {testResult.tickets?.fileName}
                  </p>
                  {testResult.tickets?.exists && (
                    <div className="text-[11px] text-gray-500">
                      Rows: <b>{testResult.tickets.rowCount}</b> | Sheets:{" "}
                      {testResult.tickets.sheetNames?.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Import / Sync History */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-gray-500" />
              Recent Sync / Import History
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchConfig}
              className="text-xs text-gray-500 hover:text-gray-900 gap-1 h-7"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400">
              No sync or import operations have been recorded yet.
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Date & Time</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">File</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">New</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Updated</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Failed</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Triggered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[150px]">
                        {log.fileName}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {log.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center text-green-600 font-semibold">
                        +{log.newRecords}
                      </td>
                      <td className="px-3 py-2 text-center text-blue-600">
                        {log.updated}
                      </td>
                      <td className="px-3 py-2 text-center text-red-600">
                        {log.failed > 0 ? log.failed : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">
                        {log.createdBy || "SYSTEM"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
