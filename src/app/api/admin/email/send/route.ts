import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getBaseTemplateVars,
  isEmailConfigured,
  listBulkTemplateKeys,
  listTemplateKeys,
  MAX_BATCH_SIZE,
  renderEmailTemplate,
  sendBatchTemplatedEmails,
  sendTemplatedEmail,
  type EmailTemplateKey,
} from "@/lib/email";
import { getRsvpEmailSet } from "@/lib/invitee";

type RecipientMode = "all" | "selected" | "nonRsvp" | "single";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [invitees, rsvpEmails] = await Promise.all([
    prisma.invitee.findMany({ orderBy: { lastName: "asc" } }),
    getRsvpEmailSet(),
  ]);

  const nonRsvpCount = invitees.filter(
    (i) => !rsvpEmails.has(i.email.trim().toLowerCase())
  ).length;

  return NextResponse.json({
    configured: isEmailConfigured(),
    templates: listTemplateKeys(),
    bulkTemplates: listBulkTemplateKeys(),
    inviteeCount: invitees.length,
    nonRsvpCount,
    previewVars: {
      ...getBaseTemplateVars(),
      firstName: "Jane",
      lastName: "Doe",
      guestEmail: "jane@example.com",
      guestCount: "2",
      guestMessage: "Looking forward to it!",
    },
  });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const templateKey = String(body.templateKey || "") as EmailTemplateKey;
  const recipientMode = String(body.recipientMode || "") as RecipientMode;
  const inviteeIds = Array.isArray(body.inviteeIds)
    ? body.inviteeIds.map(String)
    : [];

  if (!listTemplateKeys().includes(templateKey)) {
    return NextResponse.json({ error: "Invalid template." }, { status: 400 });
  }

  if (recipientMode === "single") {
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const inviteeId = body.inviteeId ? String(body.inviteeId) : undefined;
    const rsvpId = body.rsvpId ? String(body.rsvpId) : undefined;

    if (!email || !firstName) {
      return NextResponse.json(
        { error: "Email and first name are required for single send." },
        { status: 400 }
      );
    }

    const vars = {
      ...getBaseTemplateVars(),
      firstName,
      lastName,
    };

    const result = await sendTemplatedEmail(templateKey, email, vars, {
      toName: `${firstName} ${lastName}`.trim(),
      inviteeId,
      rsvpId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to send email." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, sent: 1, failed: 0 });
  }

  const [invitees, rsvpEmails] = await Promise.all([
    prisma.invitee.findMany({ orderBy: { lastName: "asc" } }),
    getRsvpEmailSet(),
  ]);

  let targets = invitees;

  if (recipientMode === "selected") {
    const idSet = new Set(inviteeIds);
    targets = invitees.filter((i) => idSet.has(i.id));
  } else if (recipientMode === "nonRsvp") {
    targets = invitees.filter(
      (i) => !rsvpEmails.has(i.email.trim().toLowerCase())
    );
  } else if (recipientMode !== "all") {
    return NextResponse.json({ error: "Invalid recipient mode." }, { status: 400 });
  }

  if (targets.length === 0) {
    return NextResponse.json({ error: "No recipients matched." }, { status: 400 });
  }

  if (targets.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      {
        error: `Too many recipients (${targets.length}). Maximum ${MAX_BATCH_SIZE} per send. Split into smaller batches.`,
      },
      { status: 400 }
    );
  }

  const recipients = targets.map((invitee) => ({
    toEmail: invitee.email,
    toName: `${invitee.firstName} ${invitee.lastName}`,
    inviteeId: invitee.id,
    vars: {
      firstName: invitee.firstName,
      lastName: invitee.lastName,
    },
  }));

  const result = await sendBatchTemplatedEmails(templateKey, recipients);
  return NextResponse.json({ ok: true, ...result });
}

export async function PUT(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const templateKey = String(body.templateKey || "") as EmailTemplateKey;

  if (!listTemplateKeys().includes(templateKey)) {
    return NextResponse.json({ error: "Invalid template." }, { status: 400 });
  }

  const vars = {
    ...getBaseTemplateVars(),
    firstName: String(body.firstName || "Jane"),
    lastName: String(body.lastName || "Doe"),
    guestEmail: String(body.guestEmail || "jane@example.com"),
    guestCount: String(body.guestCount || "2"),
    guestMessage: String(body.guestMessage || "Looking forward to it!"),
  };

  const rendered = renderEmailTemplate(templateKey, vars);
  return NextResponse.json({ ok: true, ...rendered });
}
