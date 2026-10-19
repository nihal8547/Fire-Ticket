import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalTickets,
    resolvedThisMonth,
    activeCustomers,
    revenueThisMonth,
    ticketsByStatus,
    ticketsByPriority,
    topCustomersRaw,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: "RESOLVED", resolvedDate: { gte: startOfMonth } } }),
    prisma.customer.count(),
    prisma.invoice.aggregate({ where: { status: "PAID", paidDate: { gte: startOfMonth } }, _sum: { total: true } }),
    prisma.ticket.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.ticket.groupBy({ by: ["priority"], _count: { id: true } }),
    prisma.customer.findMany({
      take: 10,
      include: { _count: { select: { tickets: true } } },
      orderBy: { tickets: { _count: "desc" } },
    }),
  ]);

  // Monthly trend last 6 months
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const [created, resolved] = await Promise.all([
      prisma.ticket.count({ where: { createdAt: { gte: d, lte: end } } }),
      prisma.ticket.count({ where: { resolvedDate: { gte: d, lte: end } } }),
    ]);
    monthlyTrend.push({
      month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      created,
      resolved,
    });
  }

  // Top customers with open/resolved counts
  const topCustomers = await Promise.all(
    topCustomersRaw.map(async (c) => {
      const [openTickets, resolvedTickets] = await Promise.all([
        prisma.ticket.count({ where: { customerId: c.id, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
        prisma.ticket.count({ where: { customerId: c.id, status: { in: ["RESOLVED", "CLOSED"] } } }),
      ]);
      return { id: c.id, name: c.name, totalTickets: c._count.tickets, openTickets, resolvedTickets };
    })
  );

  return NextResponse.json({
    summary: {
      totalTickets,
      resolvedThisMonth,
      activeCustomers,
      revenueThisMonth: revenueThisMonth._sum.total || 0,
    },
    ticketsByStatus: ticketsByStatus.map(s => ({ status: s.status, count: s._count.id })),
    ticketsByPriority: ticketsByPriority.map(p => ({ priority: p.priority, count: p._count.id })),
    monthlyTrend,
    topCustomers,
  });
}
