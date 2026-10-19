"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, ClipboardCheck, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    const res = await fetch(`/api/inspections?${params}`);
    const data = await res.json();
    setInspections(data.inspections || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchInspections(); }, [fetchInspections]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspections</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total inspections</p>
        </div>
        <Link href="/inspections/new">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Schedule Inspection</Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
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

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 font-medium text-gray-600">Inspection #</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Scheduled</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Result</th>
              <th className="text-left px-6 py-3 font-medium text-gray-600">Certificate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">Loading...</td></tr>
            ) : inspections.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <ClipboardCheck className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No inspections scheduled yet</p>
                  <Link href="/inspections/new" className="mt-2 inline-block">
                    <Button size="sm" className="mt-2">Schedule First Inspection</Button>
                  </Link>
                </td>
              </tr>
            ) : (
              inspections.map((ins) => {
                const statusInfo = INSPECTION_STATUS[ins.status] || { label: ins.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <tr key={ins.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-gray-600">{ins.inspectionNumber}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{ins.customer?.name}</td>
                    <td className="px-6 py-4 text-gray-700">{ins.type}</td>
                    <td className="px-6 py-4 text-gray-700">{formatDate(ins.scheduledDate)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {ins.overallResult && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ins.overallResult === "PASS" ? "bg-green-100 text-green-800" :
                          ins.overallResult === "FAIL" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>{ins.overallResult}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {ins.certExpiry && (
                        <span className="text-xs text-gray-600">
                          Expires: {formatDate(ins.certExpiry)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
