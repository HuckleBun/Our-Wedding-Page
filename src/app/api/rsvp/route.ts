import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendRsvpEmails } from "@/lib/email";
import { parseAdditionalGuestsList } from "@/lib/rsvp";
import { Prisma } from "@prisma/client";

const MAX_GUESTS = 10;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "").trim();

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required." },
        { status: 400 }
      );
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const additionalGuests = parseAdditionalGuestsList(body.additionalGuests);
    if (additionalGuests === null) {
      return NextResponse.json(
        { error: "Please enter a first and last name for each guest." },
        { status: 400 }
      );
    }

    if (additionalGuests.length > MAX_GUESTS - 1) {
      return NextResponse.json(
        { error: `A maximum of ${MAX_GUESTS} guests is allowed per RSVP.` },
        { status: 400 }
      );
    }

    const guestCount = 1 + additionalGuests.length;

    const rsvp = await prisma.rsvp.create({
      data: {
        firstName,
        lastName,
        email,
        guestCount,
        additionalGuests:
          additionalGuests.length > 0 ? additionalGuests : Prisma.JsonNull,
        message: String(body.message || "").trim() || null,
      },
    });

    try {
      await sendRsvpEmails({
        id: rsvp.id,
        firstName: rsvp.firstName,
        lastName: rsvp.lastName,
        email: rsvp.email,
        guestCount: rsvp.guestCount,
        message: rsvp.message,
      });
    } catch (emailErr) {
      console.error("RSVP email error:", emailErr);
    }

    return NextResponse.json({ ok: true, id: rsvp.id });
  } catch (err) {
    console.error("RSVP error:", err);
    return NextResponse.json(
      { error: "Failed to save RSVP. Please try again." },
      { status: 500 }
    );
  }
}
