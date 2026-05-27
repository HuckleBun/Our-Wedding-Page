import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseInviteeInput } from "@/lib/invitee";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const invitee = parseInviteeInput(body);
  if (!invitee) {
    return NextResponse.json(
      { error: "Valid first name, last name, and email are required." },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.invitee.update({
      where: { id },
      data: invitee,
    });
    return NextResponse.json({ ok: true, invitee: updated });
  } catch {
    return NextResponse.json(
      { error: "Contact not found or email already in use." },
      { status: 404 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await prisma.invitee.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }
}
