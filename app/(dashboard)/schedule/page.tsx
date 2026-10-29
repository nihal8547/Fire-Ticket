"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
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

    try {
      const [tRes, iRes] = await Promise.all([
        fetch(`/api/tickets?limit=200&scheduledFrom=${startOfMonth}&scheduledTo=${endOfMonth}`),
        fetch(`/api/inspections?limit=200&scheduledFrom=${startOfMonth}&scheduledTo=${endOfMonth}`),
      ]);
      const tData = tRes.ok ? await tRes.json() : {};
      const iData = iRes.ok ? await iRes.json() : {};
      setTickets(Array.isArray(tData.tickets) ? tData.tickets : []);
      setInspections(Array.isArray(iData.inspections) ? iData.inspections : []);
    } catch (e) {
      console.error("Failed to fetch schedule data", e);
      setTickets([]);
      setInspections([]);
    } finally {
      setLoading(false);
    }
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
    <div className="p-3.5 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Tickets and inspections calendar</p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 bg-white sm:bg-transparent p-1.5 sm:p-0 rounded-lg border sm:border-0 shadow-2xs sm:shadow-none">
          <Button variant="outline" size="sm" onClick={goToday} className="text-xs h-8">Today</Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs sm:text-sm font-semibold w-28 sm:w-36 text-center">{MONTHS[month]} {year}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              {DAYS.map(d => (
                <div key={d} className="px-3 py-2 text-center text-xs font-semibold text-gray-500 bg-gray-50">{d}</div>
              ))}
            </div>

            {/* Calendar cells */}
            {loading ? (
              <div className="py-20 text-center text-gray-500 text-xs sm:text-sm">Loading schedule...</div>
            ) : (
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} className="min-h-[110px] bg-gray-50/50 border-r border-b border-gray-100" />;
                  const { dayTickets, dayInspections } = getItemsForDay(day);
                  const total = dayTickets.length + dayInspections.length;
                  return (
                    <div key={i} className={`min-h-[110px] p-2 border-r border-b border-gray-100 ${isToday(day) ? "bg-red-50/70" : "hover:bg-gray-50/50"}`}>
                      <div className={`text-xs font-semibold mb-1 h-5 w-5 flex items-center justify-center rounded-full ${isToday(day) ? "bg-red-600 text-white" : "text-gray-700"}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayTickets.slice(0, 2).map((t: any) => (
                          <Link key={t.id} href={`/tickets/${t.id}`}>
                            <div className={`text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer ${PRIORITY_COLOR[t.priority] || "bg-gray-200 text-gray-700"}`}>
                              {t.title}
                            </div>
                          </Link>
                        ))}
                        {dayInspections.slice(0, 1).map((ins: any) => (
                          <div key={ins.id} className="text-[10px] px-1.5 py-0.5 rounded truncate bg-purple-100 text-purple-800">
                            INS: {ins.customer?.name || ins.inspectionNumber}
                          </div>
                        ))}
                        {total > 3 && (
                          <div className="text-[10px] text-gray-500 px-1 font-medium">+{total - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-2 sm:gap-4 flex-wrap text-xs text-gray-600 items-center">
        <span className="font-medium text-[11px] sm:text-xs">Priority:</span>
        {Object.entries(PRIORITY_COLOR).map(([k, v]) => (
          <span key={k} className={`px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium ${v}`}>{k}</span>
        ))}
        <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800">Inspection</span>
      </div>
    </div>
  );
}
