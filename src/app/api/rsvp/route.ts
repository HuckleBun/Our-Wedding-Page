import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendRsvpEmails } from "@/lib/email";
import {
  formatGuestName,
  getHousehold,
  householdHasGuestNamed,
  invitedGuests,
  isValidEmail,
  nameKey,
  normalizeEmail,
  parseGuestNames,
} from "@/lib/households";
import { toPublicHousehold } from "@/lib/public-household";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const SUBMITS_PER_WINDOW = 20;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 2000;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(request: Request) {
  if (!rateLimit(`rsvp:${clientIp(request)}`, SUBMITS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const householdId = String(body.householdId || "");
    const lookupFirstName = String(body.lookupFirstName || "").trim();
    const lookupLastName = String(body.lookupLastName || "").trim();

    const household = householdId ? await getHousehold(householdId) : null;
    // Re-check the looked-up name so a household id alone can't be used to RSVP.
    if (
      !household ||
      !householdHasGuestNamed(household, lookupFirstName, lookupLastName)
    ) {
      return NextResponse.json(
        { error: "We couldn't match your invitation. Please look up your name again." },
        { status: 403 }
      );
    }

    // Every invited guest needs a yes/no.
    const answers = new Map<string, boolean>();
    if (Array.isArray(body.responses)) {
      for (const r of body.responses) {
        if (r && typeof r === "object" && typeof r.attending === "boolean") {
          answers.set(String(r.guestId), r.attending);
        }
      }
    }
    const guests = invitedGuests(household);
    if (guests.some((g) => !answers.has(g.id))) {
      return badRequest("Please let us know whether each person can attend.");
    }

    const plusOnes = parseGuestNames(body.plusOneGuests, household.plusOnes);
    if (plusOnes === null) {
      return badRequest(
        household.plusOnes > 0
          ? `Please enter a first and last name for each guest (up to ${household.plusOnes}).`
          : "Your invitation doesn't include additional guests."
      );
    }
    const anyoneAttending = guests.some((g) => answers.get(g.id));
    if (plusOnes.length > 0 && !anyoneAttending) {
      return badRequest("A guest can only be added if someone in your party is attending.");
    }

    const email = normalizeEmail(body.email);
    if (email && !isValidEmail(email)) {
      return badRequest("That email address doesn't look right.");
    }

    const message =
      String(body.message || "").trim().slice(0, MAX_MESSAGE_LENGTH) || null;

    await prisma.$transaction([
      ...guests.map((g) =>
        prisma.guest.update({
          where: { id: g.id },
          data: { attending: answers.get(g.id) },
        })
      ),
      prisma.guest.deleteMany({ where: { householdId, isPlusOne: true } }),
      prisma.guest.createMany({
        data: plusOnes.map((p) => ({
          householdId,
          firstName: p.firstName,
          lastName: p.lastName,
          nameKey: nameKey(p.firstName, p.lastName),
          isPlusOne: true,
          attending: true,
        })),
      }),
      prisma.household.update({
        where: { id: householdId },
        data: {
          message,
          respondedAt: new Date(),
          ...(email ? { email } : {}),
        },
      }),
    ]);

    const updated = (await getHousehold(householdId))!;
    const responder =
      guests.find((g) => g.nameKey === nameKey(lookupFirstName, lookupLastName)) ??
      guests[0];

    try {
      await sendRsvpEmails({
        householdId,
        householdName: updated.name,
        responderFirstName: responder.firstName,
        responderLastName: responder.lastName,
        email: email ?? updated.email,
        attendingNames: updated.guests.filter((g) => g.attending).map(formatGuestName),
        declinedNames: updated.guests
          .filter((g) => g.attending === false)
          .map(formatGuestName),
        message,
      });
    } catch (emailErr) {
      console.error("RSVP email error:", emailErr);
    }

    return NextResponse.json({ ok: true, household: toPublicHousehold(updated) });
  } catch (err) {
    console.error("RSVP error:", err);
    return NextResponse.json(
      { error: "Failed to save RSVP. Please try again." },
      { status: 500 }
    );
  }
}
