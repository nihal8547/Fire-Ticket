"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading reports...</div>;
  if (!data) return <div className="p-6 text-gray-500">No data available</div>;

  const statusChartData = (data.ticketsByStatus || []).map((s: any) => ({ name: s.status, value: s.count }));
  const priorityChartData = (data.ticketsByPriority || []).map((p: any) => ({ name: p.priority, value: p.count }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Operational insights and performance metrics</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Tickets", value: data.summary?.totalTickets ?? 0 },
          { label: "Resolved This Month", value: data.summary?.resolvedThisMonth ?? 0 },
          { label: "Active Customers", value: data.summary?.activeCustomers ?? 0 },
          { label: "Revenue This Month", value: formatCurrency(data.summary?.revenueThisMonth ?? 0) },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tickets by Status */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tickets by Status</CardTitle></CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {statusChartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-500 text-center py-10">No data</p>}
          </CardContent>
        </Card>

        {/* Tickets by Priority */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tickets by Priority</CardTitle></CardHeader>
          <CardContent>
            {priorityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={priorityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-500 text-center py-10">No data</p>}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      {data.monthlyTrend?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Ticket Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#ef4444" strokeWidth={2} name="Created" />
                <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Customers */}
      {data.topCustomers?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top Customers by Tickets</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topCustomers.map((c: any, i: number) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400 w-5">{i + 1}</span>
                    <span className="text-sm font-medium text-gray-900">{c.name}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>{c.totalTickets} total</span>
                    <span className="text-orange-600">{c.openTickets} open</span>
                    <span className="text-green-600">{c.resolvedTickets} resolved</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
