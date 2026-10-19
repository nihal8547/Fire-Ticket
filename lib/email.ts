import nodemailer from "nodemailer";

const isEnabled = process.env.EMAIL_ENABLED === "true";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  if (!isEnabled) {
    console.log(`[EMAIL DISABLED] To: ${payload.to} | Subject: ${payload.subject}`);
    return { success: true };
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { success: false, error: "SMTP credentials not configured" };
  }
  try {
    const transport = createTransport();
    await transport.sendMail({
      from: process.env.EMAIL_FROM || "FireTicket <noreply@fireticket.com>",
      to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return { success: true };
  } catch (err: any) {
    console.error("[EMAIL ERROR]", err.message);
    return { success: false, error: err.message };
  }
}

export async function verifySmtp(): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { success: false, error: "SMTP credentials not configured" };
  }
  try {
    const transport = createTransport();
    await transport.verify();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
