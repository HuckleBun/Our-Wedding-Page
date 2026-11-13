import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { resetHouseholdResponse } from "@/lib/households";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Clears a household's RSVP (answers, plus-ones, message) without removing them. */
export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await resetHouseholdResponse(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Household not found." }, { status: 404 });
  }
}
