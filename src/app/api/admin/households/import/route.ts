import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { importGuestListFromJson } from "@/lib/households";

export async function POST() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await importGuestListFromJson();
  return NextResponse.json({ ok: true, ...result });
}
