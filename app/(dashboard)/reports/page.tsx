import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getReportsData } from "@/lib/reports-data";

// Dynamically import heavy Recharts component with zero SSR blocking
const DynamicReportsCharts = dynamic(
  () => import("@/components/reports/reports-charts"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-sm text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        Loading analytics charts...
      </div>
    ),
  }
);

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Pure server-side aggregation - 0 client fetch waterfall!
  const data = await getReportsData();

  return (
    <div className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Operational insights and performance metrics</p>
      </div>

      {/* Summary stats - Rendered on server, 0ms client wait */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {[
          { label: "Total Tickets", value: data.summary?.totalTickets ?? 0 },
          { label: "Resolved This Month", value: data.summary?.resolvedThisMonth ?? 0 },
          { label: "Active Customers", value: data.summary?.activeCustomers ?? 0 },
          { label: "Revenue This Month", value: formatCurrency(data.summary?.revenueThisMonth ?? 0) },
        ].map((s) => (
          <Card key={s.label} className="shadow-2xs">
            <CardContent className="p-3.5 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-500">{s.label}</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Code-split dynamic charts */}
      <DynamicReportsCharts
        ticketsByStatus={data.ticketsByStatus}
        ticketsByPriority={data.ticketsByPriority}
        monthlyTrend={data.monthlyTrend}
      />

      {/* Top Customers - Rendered directly on server */}
      {data.topCustomers && data.topCustomers.length > 0 && (
        <Card className="shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base">Top Customers by Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topCustomers.map((c: any, i: number) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-100 last:border-0 gap-1 sm:gap-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400 w-5">{i + 1}</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900">{c.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-gray-500 pl-7 sm:pl-0">
                    <span>{c.totalTickets} total</span>
                    <span className="text-orange-600 font-medium">{c.openTickets} open</span>
                    <span className="text-green-600 font-medium">{c.resolvedTickets} resolved</span>
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
