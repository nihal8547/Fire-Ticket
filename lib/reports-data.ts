import { prisma } from "@/lib/prisma";

export async function getReportsData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalTickets,
    resolvedThisMonth,
    activeCustomers,
    revenueThisMonth,
    ticketsByStatus,
    ticketsByPriority,
    topCustomersRaw,
    sixMonthTickets,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: "RESOLVED", resolvedDate: { gte: startOfMonth } } }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.invoice.aggregate({ where: { status: "PAID", paidDate: { gte: startOfMonth } }, _sum: { total: true } }),
    prisma.ticket.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.ticket.groupBy({ by: ["priority"], _count: { id: true } }),
    prisma.customer.findMany({
      take: 10,
      include: { _count: { select: { tickets: true } } },
      orderBy: { tickets: { _count: "desc" } },
    }),
    prisma.ticket.findMany({
      where: {
        OR: [
          { createdAt: { gte: sixMonthsAgo } },
          { resolvedDate: { gte: sixMonthsAgo } },
        ],
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        resolvedDate: true,
      },
    }),
  ]);

  // Aggregate monthly trends from sixMonthTickets in memory (fast, 0 extra queries!)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const dTime = d.getTime();
    const endTime = end.getTime();

    const created = sixMonthTickets.filter(
      (t) => t.createdAt.getTime() >= dTime && t.createdAt.getTime() <= endTime
    ).length;

    const resolved = sixMonthTickets.filter(
      (t) => t.resolvedDate && t.resolvedDate.getTime() >= dTime && t.resolvedDate.getTime() <= endTime
    ).length;

    monthlyTrend.push({
      month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      created,
      resolved,
    });
  }

  // Top customers - batch query ticket status counts instead of looping
  const topCustomerIds = topCustomersRaw.map((c) => c.id);
  const customerTicketStats = topCustomerIds.length > 0
    ? await prisma.ticket.groupBy({
        by: ["customerId", "status"],
        where: { customerId: { in: topCustomerIds } },
        _count: { id: true },
      })
    : [];

  const topCustomers = topCustomersRaw.map((c) => {
    let openCount = 0;
    let resolvedCount = 0;

    for (const stat of customerTicketStats) {
      if (stat.customerId === c.id) {
        if (stat.status === "RESOLVED" || stat.status === "CLOSED") {
          resolvedCount += stat._count.id;
        } else {
          openCount += stat._count.id;
        }
      }
    }

    return {
      id: c.id,
      name: c.name,
      totalTickets: c._count.tickets,
      openTickets: openCount,
      resolvedTickets: resolvedCount,
    };
  });

  return {
    summary: {
      totalTickets,
      resolvedThisMonth,
      activeCustomers,
      revenueThisMonth: revenueThisMonth._sum.total || 0,
    },
    ticketsByStatus: ticketsByStatus.map((s) => ({ status: s.status, count: s._count.id })),
    ticketsByPriority: ticketsByPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
    monthlyTrend,
    topCustomers,
  };
}
