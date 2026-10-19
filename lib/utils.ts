import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateTicketNumber(): string {
  const prefix = "TKT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateInspectionNumber(): string {
  const prefix = "INS";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateInvoiceNumber(): string {
  const prefix = "INV";
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${year}-${random}`;
}

export const TICKET_STATUS = {
  NEW: { label: "New", color: "bg-blue-100 text-blue-800" },
  ASSIGNED: { label: "Assigned", color: "bg-purple-100 text-purple-800" },
  IN_PROGRESS: { label: "In Progress", color: "bg-yellow-100 text-yellow-800" },
  PENDING_PARTS: { label: "Pending Parts", color: "bg-orange-100 text-orange-800" },
  RESOLVED: { label: "Resolved", color: "bg-green-100 text-green-800" },
  CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-800" },
};

export const TICKET_PRIORITY = {
  LOW: { label: "Low", color: "bg-green-100 text-green-800" },
  MEDIUM: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  HIGH: { label: "High", color: "bg-orange-100 text-orange-800" },
  EMERGENCY: { label: "Emergency", color: "bg-red-100 text-red-800" },
};

export const USER_ROLES = {
  ADMIN: { label: "Admin", color: "bg-red-100 text-red-800" },
  MANAGER: { label: "Manager", color: "bg-blue-100 text-blue-800" },
  TECHNICIAN: { label: "Technician", color: "bg-green-100 text-green-800" },
  CUSTOMER: { label: "Customer", color: "bg-gray-100 text-gray-800" },
};

export const INVOICE_STATUS = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-800" },
  SENT: { label: "Sent", color: "bg-blue-100 text-blue-800" },
  PAID: { label: "Paid", color: "bg-green-100 text-green-800" },
  PARTIAL: { label: "Partial", color: "bg-yellow-100 text-yellow-800" },
  OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-800" },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-800" },
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
