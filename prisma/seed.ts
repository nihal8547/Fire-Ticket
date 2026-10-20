import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@fireticket.com" },
    update: {},
    create: {
      email: "admin@fireticket.com",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // Manager user
  const managerPassword = await bcrypt.hash("manager123", 10);
  await prisma.user.upsert({
    where: { email: "manager@fireticket.com" },
    update: {},
    create: {
      email: "manager@fireticket.com",
      name: "Manager User",
      password: managerPassword,
      role: "MANAGER",
    },
  });

  // Technician users
  const techPassword = await bcrypt.hash("tech123", 10);
  await prisma.user.upsert({
    where: { email: "tech1@fireticket.com" },
    update: {},
    create: {
      email: "tech1@fireticket.com",
      name: "Alex Johnson",
      password: techPassword,
      role: "TECHNICIAN",
      phone: "555-0101",
    },
  });
  await prisma.user.upsert({
    where: { email: "tech2@fireticket.com" },
    update: {},
    create: {
      email: "tech2@fireticket.com",
      name: "Maria Garcia",
      password: techPassword,
      role: "TECHNICIAN",
      phone: "555-0102",
    },
  });

  // System Roles
  const defaultRoles = [
    {
      name: "ADMIN",
      displayName: "Administrator",
      description: "Full access to all system features, settings, users, and audit logs.",
      color: "#ef4444",
      permissions: JSON.stringify(["tickets:all", "inspections:all", "customers:all", "invoices:all", "assets:all", "users:all", "reports:all", "settings:all", "synology:all"]),
      isSystem: true,
    },
    {
      name: "MANAGER",
      displayName: "Operations Manager",
      description: "Can manage dispatching, schedule inspections, oversee tickets and invoices.",
      color: "#3b82f6",
      permissions: JSON.stringify(["tickets:all", "inspections:all", "customers:all", "invoices:all", "assets:all", "reports:all", "users:view"]),
      isSystem: true,
    },
    {
      name: "TECHNICIAN",
      displayName: "Field Technician",
      description: "Field staff performing fire equipment servicing, inspections, and status updates.",
      color: "#10b981",
      permissions: JSON.stringify(["tickets:view", "tickets:edit", "inspections:view", "inspections:edit", "assets:view", "assets:edit"]),
      isSystem: true,
    },
    {
      name: "DISPATCHER",
      displayName: "Dispatcher / Coordinator",
      description: "Coordinates incoming customer calls, creates tickets, and assigns technicians.",
      color: "#8b5cf6",
      permissions: JSON.stringify(["tickets:all", "customers:all", "inspections:view"]),
      isSystem: false,
    },
    {
      name: "ACCOUNTANT",
      displayName: "Billing / Accountant",
      description: "Manages invoices, accounts receivable, and customer billing statements.",
      color: "#f59e0b",
      permissions: JSON.stringify(["invoices:all", "customers:view", "reports:all"]),
      isSystem: false,
    },
    {
      name: "CUSTOMER",
      displayName: "Customer Portal",
      description: "Client portal view to monitor service history, tickets, and invoices.",
      color: "#6b7280",
      permissions: JSON.stringify(["tickets:view", "invoices:view", "assets:view"]),
      isSystem: true,
    },
  ];

  for (const role of defaultRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  // Synology Config
  await prisma.synologySyncConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      folderPath: "/synology",
      ticketsFileName: "tickets.xlsx",
      customersFileName: "customers.xlsx",
      intervalMinutes: 15,
      enabled: false,
      lastStatus: "IDLE",
    },
  });

  // Default service types
  const serviceTypeData = [
    { name: "Annual Inspection", description: "Complete annual fire safety inspection", defaultDuration: 120, price: 299 },
    { name: "Quarterly Inspection", description: "Quarterly fire suppression system check", defaultDuration: 60, price: 149 },
    { name: "System Installation", description: "New fire protection system installation", defaultDuration: 480, price: 2500 },
    { name: "Emergency Repair", description: "Emergency repair service", defaultDuration: 120, price: 450 },
    { name: "Maintenance Service", description: "Routine maintenance and servicing", defaultDuration: 90, price: 199 },
    { name: "Testing & Certification", description: "System testing and certification", defaultDuration: 180, price: 399 },
  ];

  for (const st of serviceTypeData) {
    await prisma.serviceType.upsert({
      where: { name: st.name },
      update: {},
      create: st,
    });
  }

  // Sample customers
  const customer1 = await prisma.customer.upsert({
    where: { email: "contact@acmecorp.com" },
    update: {},
    create: {
      name: "Acme Corporation",
      email: "contact@acmecorp.com",
      phone: "555-1000",
      address: "100 Industrial Blvd",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      contactPerson: "Robert Smith",
      externalRef: "ACME-001",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: "info@greenplaza.com" },
    update: {},
    create: {
      name: "Green Plaza Mall",
      email: "info@greenplaza.com",
      phone: "555-2000",
      address: "500 Mall Drive",
      city: "Chicago",
      state: "IL",
      zipCode: "60602",
      contactPerson: "Sarah Williams",
    },
  });

  console.log("Seed complete");
  console.log(`Admin: admin@fireticket.com / admin123`);
  console.log(`Manager: manager@fireticket.com / manager123`);
  console.log(`Technician: tech1@fireticket.com / tech123`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
