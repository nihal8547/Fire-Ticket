import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Edit, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteCustomerButton } from "@/components/customers/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TICKET_STATUS, TICKET_PRIORITY, formatDate, formatCurrency } from "@/lib/utils";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      tickets: {
        orderBy: { createdAt: "desc" }, take: 10,
        include: { serviceType: true, technician: { select: { name: true } } }
      },
      assets: { orderBy: { createdAt: "desc" } },
      inspections: { orderBy: { createdAt: "desc" }, take: 5 },
      invoices: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!customer) notFound();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            {customer.contactPerson && <p className="text-sm text-gray-500">Contact: {customer.contactPerson}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/tickets/new?customerId=${customer.id}`}>
            <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />New Ticket</Button>
          </Link>
          <Link href={`/customers/${customer.id}/edit`}>
            <Button className="gap-2"><Edit className="h-4 w-4" />Edit</Button>
          </Link>
          <DeleteCustomerButton id={customer.id} name={customer.name} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-red-500" />Customer Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {customer.email && <div className="flex items-center gap-2 text-gray-700"><Mail className="h-4 w-4 text-gray-400" />{customer.email}</div>}
            {customer.phone && <div className="flex items-center gap-2 text-gray-700"><Phone className="h-4 w-4 text-gray-400" />{customer.phone}</div>}
            {customer.address && (
              <div className="flex items-start gap-2 text-gray-700">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <div>{customer.address}</div>
                  {(customer.city || customer.state) && <div>{[customer.city, customer.state, customer.zipCode].filter(Boolean).join(", ")}</div>}
                </div>
              </div>
            )}
            {customer.siteDetails && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Site Details</p>
                <p className="text-gray-700">{customer.siteDetails}</p>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-xl font-bold text-gray-900">{customer.tickets.length}</p><p className="text-xs text-gray-500">Tickets</p></div>
              <div><p className="text-xl font-bold text-gray-900">{customer.assets.length}</p><p className="text-xs text-gray-500">Assets</p></div>
              <div><p className="text-xl font-bold text-gray-900">{customer.inspections.length}</p><p className="text-xs text-gray-500">Inspections</p></div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Tickets</CardTitle>
                <Link href={`/tickets?customerId=${customer.id}`} className="text-sm text-red-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {customer.tickets.length === 0 ? (
                <p className="text-sm text-gray-400 px-6 pb-4">No tickets yet</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {customer.tickets.map((t) => {
                    const s = TICKET_STATUS[t.status as keyof typeof TICKET_STATUS];
                    const p = TICKET_PRIORITY[t.priority as keyof typeof TICKET_PRIORITY];
                    return (
                      <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                          <p className="text-xs text-gray-500">{formatDate(t.createdAt)}{t.technician ? ` · ${t.technician.name}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p?.color}`}>{p?.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s?.color}`}>{s?.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Equipment Assets</CardTitle>
                <Link href={`/assets?customerId=${customer.id}`} className="text-sm text-red-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {customer.assets.length === 0 ? (
                <p className="text-sm text-gray-400 px-6 pb-4">No assets registered</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {customer.assets.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-500">{a.assetType}{a.serialNumber ? ` · S/N: ${a.serialNumber}` : ""}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === "ACTIVE" ? "bg-green-100 text-green-700" : a.status === "NEEDS_SERVICE" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {a.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Invoices</CardTitle>
                <Link href={`/invoices?customerId=${customer.id}`} className="text-sm text-red-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {customer.invoices.length === 0 ? (
                <p className="text-sm text-gray-400 px-6 pb-4">No invoices yet</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {customer.invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">{formatDate(inv.issueDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === "PAID" ? "bg-green-100 text-green-700" : inv.status === "OVERDUE" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
