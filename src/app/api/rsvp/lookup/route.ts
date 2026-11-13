import { NextResponse } from "next/server";
import { findHouseholdsByGuestName } from "@/lib/households";
import { toPublicHousehold } from "@/lib/public-household";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const LOOKUPS_PER_WINDOW = 15;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  if (!rateLimit(`lookup:${clientIp(request)}`, LOOKUPS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many lookups. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "Please enter your first and last name." },
        { status: 400 }
      );
    }

    const households = await findHouseholdsByGuestName(firstName, lastName);
    if (households.length === 0) {
      return NextResponse.json(
        {
          error:
            "We couldn't find that name on our guest list. Try the name as it appears on your invitation, or reach out to us.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ households: households.map(toPublicHousehold) });
  } catch (err) {
    console.error("RSVP lookup error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
