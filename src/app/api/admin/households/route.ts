import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import {
  createHousehold,
  listHouseholds,
  parseHouseholdInput,
  serializeHousehold,
} from "@/lib/households";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const households = await listHouseholds();
  return NextResponse.json({ households: households.map(serializeHousehold) });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseHouseholdInput(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const household = await createHousehold(parsed.value);
  return NextResponse.json({ ok: true, id: household.id });
}
