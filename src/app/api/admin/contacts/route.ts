import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listInviteesWithRsvpStatus, parseInviteeInput } from "@/lib/invitee";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitees = await listInviteesWithRsvpStatus();
  const rows = invitees.map((invitee) => ({
    ...invitee,
    createdAt: invitee.createdAt.toISOString(),
    updatedAt: invitee.updatedAt.toISOString(),
  }));

  return NextResponse.json({ invitees: rows });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const invitee = parseInviteeInput(body);
  if (!invitee) {
    return NextResponse.json(
      { error: "Valid first name, last name, and email are required." },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.invitee.create({ data: invitee });
    return NextResponse.json({ ok: true, invitee: created });
  } catch {
    return NextResponse.json(
      { error: "An invitee with that email already exists." },
      { status: 409 }
    );
  }
}
