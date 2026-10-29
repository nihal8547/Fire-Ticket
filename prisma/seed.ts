import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("==> Seeding clean Production initial data...");

  // 1. Initial Admin User
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@fireticket.com" },
    update: {},
    create: {
      email: "admin@fireticket.com",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // 2. Default System Roles
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

  // 3. Default System Service Types
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

  // 4. Default Synology Sync Config
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

  console.log("==> Clean Production Seed complete!");
  console.log("==> Initial Admin Login: admin@fireticket.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
