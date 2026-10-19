"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const PRIORITY_COLOR: Record<string, string> = {
  EMERGENCY: "bg-red-500 text-white",
  HIGH: "bg-orange-400 text-white",
  MEDIUM: "bg-yellow-400 text-gray-900",
  LOW: "bg-blue-400 text-white",
};

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tickets, setTickets] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startOfMonth = new Date(year, month, 1).toISOString();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const [tRes, iRes] = await Promise.all([
      fetch(`/api/tickets?limit=200&from=${startOfMonth}&to=${endOfMonth}`),
      fetch(`/api/inspections?limit=200&from=${startOfMonth}&to=${endOfMonth}`),
    ]);
    const [tData, iData] = await Promise.all([tRes.json(), iRes.json()]);
    setTickets(tData.tickets || []);
    setInspections(iData.inspections || []);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const getItemsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTickets = tickets.filter(t => t.scheduledDate?.startsWith(dateStr));
    const dayInspections = inspections.filter(i => i.scheduledDate?.startsWith(dateStr));
    return { dayTickets, dayInspections };
  };

  const today = new Date();
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tickets and inspections calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-base font-semibold w-36 text-center">{MONTHS[month]} {year}</span>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAYS.map(d => (
            <div key={d} className="px-3 py-2 text-center text-xs font-semibold text-gray-500 bg-gray-50">{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        {loading ? (
          <div className="py-20 text-center text-gray-500">Loading schedule...</div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="min-h-[120px] bg-gray-50/50 border-r border-b border-gray-100" />;
              const { dayTickets, dayInspections } = getItemsForDay(day);
              const total = dayTickets.length + dayInspections.length;
              return (
                <div key={i} className={`min-h-[120px] p-2 border-r border-b border-gray-100 ${isToday(day) ? "bg-red-50" : "hover:bg-gray-50"}`}>
                  <div className={`text-sm font-medium mb-1 h-6 w-6 flex items-center justify-center rounded-full ${isToday(day) ? "bg-red-600 text-white" : "text-gray-700"}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayTickets.slice(0, 2).map((t: any) => (
                      <Link key={t.id} href={`/tickets/${t.id}`}>
                        <div className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer ${PRIORITY_COLOR[t.priority] || "bg-gray-200 text-gray-700"}`}>
                          {t.title}
                        </div>
                      </Link>
                    ))}
                    {dayInspections.slice(0, 1).map((ins: any) => (
                      <div key={ins.id} className="text-xs px-1.5 py-0.5 rounded truncate bg-purple-100 text-purple-800">
                        INS: {ins.customer?.name || ins.inspectionNumber}
                      </div>
                    ))}
                    {total > 3 && (
                      <div className="text-xs text-gray-500 px-1">+{total - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs text-gray-600">
        <span className="font-medium">Priority:</span>
        {Object.entries(PRIORITY_COLOR).map(([k, v]) => (
          <span key={k} className={`px-2 py-0.5 rounded ${v}`}>{k}</span>
        ))}
        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800">Inspection</span>
      </div>
    </div>
  );
}
