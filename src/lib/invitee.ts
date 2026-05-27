import guestListData from "@/data/guest-list.json";
import { prisma } from "@/lib/db";

export type InviteeInput = {
  firstName: string;
  lastName: string;
  email: string;
  notes?: string | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseInviteeInput(raw: unknown): InviteeInput | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  const firstName = String(entry.firstName || "").trim();
  const lastName = String(entry.lastName || "").trim();
  const email = normalizeEmail(String(entry.email || ""));
  const notes = String(entry.notes || "").trim() || null;

  if (!firstName || !lastName || !email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  return { firstName, lastName, email, notes };
}

export async function importGuestListFromJson(): Promise<{
  created: number;
  updated: number;
  skipped: number;
}> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of guestListData.invitees) {
    const invitee = parseInviteeInput(raw);
    if (!invitee) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.invitee.findUnique({
      where: { email: invitee.email },
    });

    if (existing) {
      await prisma.invitee.update({
        where: { id: existing.id },
        data: {
          firstName: invitee.firstName,
          lastName: invitee.lastName,
          notes: invitee.notes,
        },
      });
      updated += 1;
    } else {
      await prisma.invitee.create({ data: invitee });
      created += 1;
    }
  }

  return { created, updated, skipped };
}

export async function getRsvpEmailSet(): Promise<Set<string>> {
  const rsvps = await prisma.rsvp.findMany({ select: { email: true } });
  return new Set(rsvps.map((r) => normalizeEmail(r.email)));
}

export async function inviteeHasRsvp(
  email: string,
  rsvpEmails?: Set<string>
): Promise<boolean> {
  const set = rsvpEmails ?? (await getRsvpEmailSet());
  return set.has(normalizeEmail(email));
}

export async function listInviteesWithRsvpStatus() {
  const [invitees, rsvpEmails] = await Promise.all([
    prisma.invitee.findMany({ orderBy: { lastName: "asc" } }),
    getRsvpEmailSet(),
  ]);

  return invitees.map((invitee) => ({
    ...invitee,
    hasRsvp: rsvpEmails.has(normalizeEmail(invitee.email)),
  }));
}
