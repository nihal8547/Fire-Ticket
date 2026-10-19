const appName = "FireTicket";
const brandColor = "#dc2626";

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:${brandColor};padding:24px 32px;">
      <span style="color:#fff;font-size:20px;font-weight:700;">🔥 ${appName}</span>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#6b7280;">This is an automated message from ${appName}. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

function infoRow(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">${label}</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:500;">${value}</td></tr>`;
}

function table(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>`;
}

function button(text: string, url: string): string {
  return `<div style="margin:24px 0 0;"><a href="${url}" style="display:inline-block;background:${brandColor};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">${text}</a></div>`;
}

function badge(text: string, color: string): string {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;background:${color}20;color:${color};">${text}</span>`;
}

const PRIORITY_COLOR: Record<string, string> = {
  EMERGENCY: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#ca8a04",
  LOW: "#2563eb",
};

// ─── Templates ────────────────────────────────────────────────────────────────

export function ticketCreatedEmail(ticket: {
  ticketNumber: string; title: string; priority: string;
  customerName: string; description?: string; appUrl?: string;
}) {
  const url = ticket.appUrl ? `${ticket.appUrl}/tickets` : "#";
  const body = `
    <p style="color:#374151;font-size:14px;margin:0 0 16px;">A new service ticket has been created and requires attention.</p>
    ${table(
      infoRow("Ticket #", ticket.ticketNumber) +
      infoRow("Customer", ticket.customerName) +
      infoRow("Priority", badge(ticket.priority, PRIORITY_COLOR[ticket.priority] || "#6b7280")) +
      (ticket.description ? infoRow("Description", ticket.description.slice(0, 200)) : "")
    )}
    ${button("View Ticket", url)}`;
  return {
    subject: `[${ticket.priority}] New Ticket: ${ticket.ticketNumber} — ${ticket.title}`,
    html: layout(`New Ticket Created: ${ticket.ticketNumber}`, body),
  };
}

export function ticketAssignedEmail(ticket: {
  ticketNumber: string; title: string; priority: string;
  customerName: string; technicianName: string;
  scheduledDate?: string; appUrl?: string;
}) {
  const url = ticket.appUrl ? `${ticket.appUrl}/tickets` : "#";
  const body = `
    <p style="color:#374151;font-size:14px;margin:0 0 16px;">You have been assigned a new service ticket.</p>
    ${table(
      infoRow("Ticket #", ticket.ticketNumber) +
      infoRow("Title", ticket.title) +
      infoRow("Customer", ticket.customerName) +
      infoRow("Priority", badge(ticket.priority, PRIORITY_COLOR[ticket.priority] || "#6b7280")) +
      (ticket.scheduledDate ? infoRow("Scheduled", ticket.scheduledDate) : "")
    )}
    ${button("Open Ticket", url)}`;
  return {
    subject: `Ticket Assigned: ${ticket.ticketNumber} — ${ticket.title}`,
    html: layout(`Ticket Assigned to You`, body),
  };
}

export function ticketStatusChangedEmail(ticket: {
  ticketNumber: string; title: string;
  oldStatus: string; newStatus: string;
  customerName: string; appUrl?: string;
}) {
  const url = ticket.appUrl ? `${ticket.appUrl}/tickets` : "#";
  const STATUS_COLOR: Record<string, string> = {
    RESOLVED: "#16a34a", CLOSED: "#6b7280", IN_PROGRESS: "#2563eb",
    ASSIGNED: "#7c3aed", PENDING_PARTS: "#ca8a04",
  };
  const body = `
    <p style="color:#374151;font-size:14px;margin:0 0 16px;">The status of your service ticket has been updated.</p>
    ${table(
      infoRow("Ticket #", ticket.ticketNumber) +
      infoRow("Title", ticket.title) +
      infoRow("Customer", ticket.customerName) +
      infoRow("Old Status", badge(ticket.oldStatus, "#6b7280")) +
      infoRow("New Status", badge(ticket.newStatus, STATUS_COLOR[ticket.newStatus] || "#6b7280"))
    )}
    ${button("View Ticket", url)}`;
  return {
    subject: `Ticket ${ticket.ticketNumber} Status Updated: ${ticket.newStatus}`,
    html: layout(`Ticket Status Updated`, body),
  };
}

export function inspectionScheduledEmail(inspection: {
  inspectionNumber: string; type: string;
  customerName: string; scheduledDate?: string; notes?: string; appUrl?: string;
}) {
  const url = inspection.appUrl ? `${inspection.appUrl}/inspections` : "#";
  const body = `
    <p style="color:#374151;font-size:14px;margin:0 0 16px;">A fire safety inspection has been scheduled for your property.</p>
    ${table(
      infoRow("Inspection #", inspection.inspectionNumber) +
      infoRow("Type", inspection.type) +
      infoRow("Customer", inspection.customerName) +
      (inspection.scheduledDate ? infoRow("Scheduled Date", inspection.scheduledDate) : "") +
      (inspection.notes ? infoRow("Notes", inspection.notes) : "")
    )}
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0;">Please ensure access to all fire protection equipment on the scheduled date.</p>
    ${button("View Inspections", url)}`;
  return {
    subject: `Inspection Scheduled: ${inspection.inspectionNumber} — ${inspection.type}`,
    html: layout(`Fire Safety Inspection Scheduled`, body),
  };
}

export function invoiceCreatedEmail(invoice: {
  invoiceNumber: string; customerName: string;
  total: number; dueDate?: string; appUrl?: string;
}) {
  const url = invoice.appUrl ? `${invoice.appUrl}/invoices` : "#";
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(invoice.total);
  const body = `
    <p style="color:#374151;font-size:14px;margin:0 0 16px;">A new invoice has been generated for your account.</p>
    ${table(
      infoRow("Invoice #", invoice.invoiceNumber) +
      infoRow("Customer", invoice.customerName) +
      infoRow("Amount Due", `<strong style="color:#111827;font-size:16px;">${formatted}</strong>`) +
      (invoice.dueDate ? infoRow("Due Date", invoice.dueDate) : "")
    )}
    ${button("View Invoice", url)}`;
  return {
    subject: `Invoice ${invoice.invoiceNumber}: ${formatted} Due`,
    html: layout(`New Invoice: ${invoice.invoiceNumber}`, body),
  };
}

export function testEmail(recipientName: string) {
  const body = `
    <p style="color:#374151;font-size:14px;margin:0 0 16px;">Hello ${recipientName},</p>
    <p style="color:#374151;font-size:14px;margin:0 0 16px;">This is a test email from ${appName}. Your email notification system is configured correctly! ✅</p>
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0;">You will receive automated emails for ticket assignments, status changes, scheduled inspections, and invoices.</p>`;
  return {
    subject: `${appName} — Email Test Successful`,
    html: layout("Email Configuration Test", body),
  };
}
