import { prisma } from "@/lib/prisma";
import { Wrench, Phone, Mail, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TechniciansPage() {
  const technicians = await prisma.user.findMany({
    where: { role: "TECHNICIAN", isActive: true },
    include: {
      assignedTickets: {
        where: { status: { notIn: ["CLOSED", "RESOLVED"] } },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: {
        select: {
          assignedTickets: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const openTicketsCount = async (techId: string) => {
    return prisma.ticket.count({ where: { technicianId: techId, status: { notIn: ["CLOSED", "RESOLVED"] } } });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Technicians</h1>
          <p className="text-sm text-gray-500 mt-0.5">{technicians.length} active technicians</p>
        </div>
        <Link href="/users">
          <Button variant="outline" className="gap-2">Manage Users</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {technicians.map((tech) => {
          const openTickets = tech.assignedTickets.length;
          return (
            <Card key={tech.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-lg">
                    {tech.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{tech.name}</p>
                    <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {tech.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />{tech.email}
                    </div>
                  )}
                  {tech.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />{tech.phone}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{openTickets}</p>
                    <p className="text-xs text-gray-500">Open Tickets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{tech._count.assignedTickets}</p>
                    <p className="text-xs text-gray-500">Total Assigned</p>
                  </div>
                </div>

                {tech.assignedTickets.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Current Jobs:</p>
                    <div className="space-y-1">
                      {tech.assignedTickets.slice(0, 3).map((t) => (
                        <Link key={t.id} href={`/tickets/${t.id}`} className="block">
                          <div className="text-xs p-2 bg-white rounded border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors">
                            <p className="font-medium text-gray-800 truncate">{t.title}</p>
                            <p className="text-gray-500">{t.customer.name}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <Link href={`/tickets?technicianId=${tech.id}`} className="block mt-3">
                  <Button variant="outline" size="sm" className="w-full gap-1.5">
                    <Ticket className="h-3.5 w-3.5" /> View All Tickets
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
