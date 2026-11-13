import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
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
import {
  householdGreeting,
  invitedGuests,
  listHouseholds,
  type HouseholdWithGuests,
} from "@/lib/households";

function emailable(households: HouseholdWithGuests[]) {
  return households.filter((h): h is HouseholdWithGuests & { email: string } =>
    Boolean(h.email)
  );
}

type RecipientMode = "all" | "selected" | "nonRsvp" | "single";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const households = await listHouseholds();
  const withEmail = emailable(households);

  return NextResponse.json({
    configured: isEmailConfigured(),
    templates: listTemplateKeys(),
    bulkTemplates: listBulkTemplateKeys(),
    emailableCount: withEmail.length,
    noEmailCount: households.length - withEmail.length,
    nonRsvpCount: withEmail.filter((h) => !h.respondedAt).length,
    previewVars: {
      ...getBaseTemplateVars(),
      greeting: "Jane & John",
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
  const householdIds = Array.isArray(body.householdIds)
    ? body.householdIds.map(String)
    : [];

  if (!listTemplateKeys().includes(templateKey)) {
    return NextResponse.json({ error: "Invalid template." }, { status: 400 });
  }

  if (recipientMode === "single") {
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const householdId = body.householdId ? String(body.householdId) : undefined;

    if (!email || !firstName) {
      return NextResponse.json(
        { error: "Email and first name are required for single send." },
        { status: 400 }
      );
    }

    const vars = {
      ...getBaseTemplateVars(),
      greeting: firstName,
      firstName,
      lastName,
    };

    const result = await sendTemplatedEmail(templateKey, email, vars, {
      toName: `${firstName} ${lastName}`.trim(),
      householdId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to send email." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, sent: 1, failed: 0 });
  }

  const households = emailable(await listHouseholds());

  let targets = households;

  if (recipientMode === "selected") {
    const idSet = new Set(householdIds);
    targets = households.filter((h) => idSet.has(h.id));
  } else if (recipientMode === "nonRsvp") {
    targets = households.filter((h) => !h.respondedAt);
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

  const recipients = targets.map((household) => {
    const guests = invitedGuests(household);
    return {
      toEmail: household.email,
      toName: household.name,
      householdId: household.id,
      vars: {
        greeting: householdGreeting(guests),
        firstName: guests[0]?.firstName ?? "",
        lastName: guests[0]?.lastName ?? "",
        householdName: household.name,
      },
    };
  });

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
    greeting: String(body.greeting || body.firstName || "Jane & John"),
    householdName: "Jane & John Doe",
    attendingNames: "Jane Doe, John Doe",
    declinedNames: "(none)",
    firstName: String(body.firstName || "Jane"),
    lastName: String(body.lastName || "Doe"),
    guestEmail: String(body.guestEmail || "jane@example.com"),
    guestCount: String(body.guestCount || "2"),
    guestMessage: String(body.guestMessage || "Looking forward to it!"),
  };

  const rendered = renderEmailTemplate(templateKey, vars);
  return NextResponse.json({ ok: true, ...rendered });
}
