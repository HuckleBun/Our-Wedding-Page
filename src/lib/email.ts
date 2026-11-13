import emailTemplates from "@/data/email-templates.json";
import { getSite } from "@/lib/site";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { getInvitePageUrl } from "@/lib/invite-page";
import { renderTemplate, type TemplateVars } from "@/lib/template";

export type EmailTemplateKey = keyof typeof emailTemplates;

export type { TemplateVars };

export type SendEmailOptions = {
  toEmail: string;
  toName?: string;
  subject: string;
  body: string;
  templateKey: string;
  householdId?: string;
};

export type BatchSendRecipient = {
  toEmail: string;
  toName?: string;
  vars: TemplateVars;
  householdId?: string;
};

const MAX_BATCH_SIZE = 50;
const BATCH_DELAY_MS = 200;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function getSiteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getCoupleNotificationEmails(): string[] {
  const raw = process.env.COUPLE_NOTIFICATION_EMAIL || "";
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export function getBaseTemplateVars(): TemplateVars {
  const site = getSite();
  const siteUrl = getSiteUrl();
  return {
    coupleNames: site.coupleNames,
    weddingDate: site.weddingDateDisplay,
    venueCity: site.venue.city,
    siteUrl,
    rsvpUrl: `${siteUrl}/rsvp`,
    detailsUrl: `${siteUrl}/details`,
    inviteUrl: getInvitePageUrl(siteUrl) ?? siteUrl,
    adminRsvpUrl: `${siteUrl}/admin/rsvps`,
  };
}

export function getTemplate(key: EmailTemplateKey) {
  return emailTemplates[key];
}

export function listTemplateKeys(): EmailTemplateKey[] {
  return Object.keys(emailTemplates) as EmailTemplateKey[];
}

export function listBulkTemplateKeys(): EmailTemplateKey[] {
  return ["saveTheDate", "invitation", "reminder"];
}

export function renderEmailTemplate(
  key: EmailTemplateKey,
  vars: TemplateVars
): { subject: string; body: string } {
  const template = getTemplate(key);
  return {
    subject: renderTemplate(template.subject, vars),
    body: renderTemplate(template.body, vars),
  };
}

function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #2c2c2c;">${escaped.replace(/\n/g, "<br />")}</div>`;
}

export async function logEmail(
  entry: Omit<SendEmailOptions, "subject" | "body"> & {
    subject: string;
    status: "sent" | "failed";
    error?: string | null;
  }
) {
  await prisma.emailLog.create({
    data: {
      toEmail: entry.toEmail,
      toName: entry.toName ?? null,
      subject: entry.subject,
      templateKey: entry.templateKey,
      status: entry.status,
      error: entry.error ?? null,
      householdId: entry.householdId ?? null,
    },
  });
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM;

  if (!resend || !from) {
    const error = "Email is not configured (RESEND_API_KEY / EMAIL_FROM).";
    await logEmail({
      ...options,
      status: "failed",
      error,
    });
    return { ok: false, error };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: options.toName
        ? `${options.toName} <${options.toEmail}>`
        : options.toEmail,
      subject: options.subject,
      html: plainTextToHtml(options.body),
      text: options.body,
    });

    if (error) {
      await logEmail({
        ...options,
        status: "failed",
        error: error.message,
      });
      return { ok: false, error: error.message };
    }

    await logEmail({ ...options, status: "sent" });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email.";
    await logEmail({
      ...options,
      status: "failed",
      error: message,
    });
    return { ok: false, error: message };
  }
}

export async function sendTemplatedEmail(
  templateKey: EmailTemplateKey,
  toEmail: string,
  vars: TemplateVars,
  options?: { toName?: string; householdId?: string }
): Promise<{ ok: boolean; error?: string }> {
  const { subject, body } = renderEmailTemplate(templateKey, vars);
  return sendEmail({
    toEmail,
    toName: options?.toName,
    subject,
    body,
    templateKey,
    householdId: options?.householdId,
  });
}

export async function sendRsvpEmails(rsvp: {
  householdId: string;
  householdName: string;
  responderFirstName: string;
  responderLastName: string;
  email: string | null;
  attendingNames: string[];
  declinedNames: string[];
  message: string | null;
}) {
  const base = getBaseTemplateVars();
  const vars: TemplateVars = {
    ...base,
    firstName: rsvp.responderFirstName,
    lastName: rsvp.responderLastName,
    greeting: rsvp.responderFirstName,
    householdName: rsvp.householdName,
    guestEmail: rsvp.email || "(none)",
    guestCount: String(rsvp.attendingNames.length),
    attendingNames: rsvp.attendingNames.join(", ") || "(none)",
    declinedNames: rsvp.declinedNames.join(", ") || "(none)",
    guestMessage: rsvp.message || "(none)",
  };

  if (rsvp.email) {
    await sendTemplatedEmail("rsvpConfirmation", rsvp.email, vars, {
      toName: `${rsvp.responderFirstName} ${rsvp.responderLastName}`,
      householdId: rsvp.householdId,
    });
  }

  for (const coupleEmail of getCoupleNotificationEmails()) {
    await sendTemplatedEmail("rsvpNotification", coupleEmail, vars, {
      householdId: rsvp.householdId,
    });
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendBatchTemplatedEmails(
  templateKey: EmailTemplateKey,
  recipients: BatchSendRecipient[]
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const capped = recipients.slice(0, MAX_BATCH_SIZE);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of capped) {
    const vars = { ...getBaseTemplateVars(), ...recipient.vars };
    const result = await sendTemplatedEmail(
      templateKey,
      recipient.toEmail,
      vars,
      {
        toName: recipient.toName,
        householdId: recipient.householdId,
      }
    );

    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      if (result.error) errors.push(`${recipient.toEmail}: ${result.error}`);
    }

    if (capped.length > 1) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return { sent, failed, errors };
}

export { MAX_BATCH_SIZE };
