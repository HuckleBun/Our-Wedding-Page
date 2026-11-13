import guestListData from "@/data/guest-list.json";
import { prisma } from "@/lib/db";
import type { Guest, Household } from "@prisma/client";

export type GuestName = {
  firstName: string;
  lastName: string;
};

export type HouseholdInput = {
  name: string;
  email: string | null;
  phone: string | null;
  plusOnes: number;
  notes: string | null;
  guests: GuestName[];
};

export const MAX_PLUS_ONES = 5;
export const MAX_GUESTS_PER_HOUSEHOLD = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "  Mary-Kate  O'Brien " -> "mary-kate o'brien" (case/spacing-insensitive match key). */
export function nameKey(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(raw: unknown): string | null {
  const email = String(raw ?? "").trim().toLowerCase();
  return email || null;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/**
 * Normalizes a phone number to +<digits>. US numbers can be typed any common way
 * ("(555) 123-4567", "555.123.4567", "1-555-123-4567"); other countries need a
 * leading +. Returns null for blank input, "invalid" when it can't be a phone number.
 */
export function normalizePhone(raw: unknown): string | null | "invalid" {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  if (/[^\d\s()+.\-]/.test(text)) return "invalid";
  const digits = text.replace(/\D/g, "");
  if (text.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : "invalid";
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "invalid";
}

/** "+15551234567" -> "(555) 123-4567"; other countries are shown as stored. */
export function formatPhone(phone: string): string {
  const m = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : phone;
}

export function formatGuestName(guest: GuestName): string {
  return `${guest.firstName} ${guest.lastName}`.trim();
}

/** Joins names as "A", "A & B", or "A, B & C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** Default household label: "John & Jane Smith" or "John Smith & Jane Doe". */
export function defaultHouseholdName(guests: GuestName[]): string {
  if (guests.length === 0) return "";
  const lastNames = new Set(guests.map((g) => g.lastName.toLowerCase()));
  if (lastNames.size === 1) {
    return `${joinNames(guests.map((g) => g.firstName))} ${guests[0].lastName}`;
  }
  return joinNames(guests.map(formatGuestName));
}

/** Greeting for emails: "John & Jane". */
export function householdGreeting(guests: GuestName[]): string {
  return joinNames(guests.map((g) => g.firstName));
}

function parseGuestName(raw: unknown): GuestName | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  const firstName = String(entry.firstName ?? "").trim();
  const lastName = String(entry.lastName ?? "").trim();
  if (!firstName || !lastName) return null;
  return { firstName, lastName };
}

/** Parses a guest list of names; null if any entry is missing a first or last name. */
export function parseGuestNames(raw: unknown, max: number): GuestName[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > max) return null;
  const guests: GuestName[] = [];
  for (const entry of raw) {
    const guest = parseGuestName(entry);
    if (!guest) return null;
    guests.push(guest);
  }
  return guests;
}

export function parseHouseholdInput(
  raw: unknown
): { ok: true; value: HouseholdInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid request." };
  const entry = raw as Record<string, unknown>;

  const guests = parseGuestNames(entry.guests, MAX_GUESTS_PER_HOUSEHOLD);
  if (!guests || guests.length === 0) {
    return { ok: false, error: "Add at least one guest, each with a first and last name." };
  }

  const email = normalizeEmail(entry.email);
  if (email && !isValidEmail(email)) {
    return { ok: false, error: "That email address doesn't look right." };
  }

  const phone = normalizePhone(entry.phone);
  if (phone === "invalid") {
    return {
      ok: false,
      error: "That phone number doesn't look right. Use a 10-digit US number, or start with + for other countries.",
    };
  }

  const plusOnes = Number(entry.plusOnes ?? 0);
  if (!Number.isInteger(plusOnes) || plusOnes < 0 || plusOnes > MAX_PLUS_ONES) {
    return { ok: false, error: `Plus-ones must be a whole number from 0 to ${MAX_PLUS_ONES}.` };
  }

  const name = String(entry.name ?? "").trim() || defaultHouseholdName(guests);
  const notes = String(entry.notes ?? "").trim() || null;

  return { ok: true, value: { name, email, phone, plusOnes, notes, guests } };
}

export type HouseholdWithGuests = Household & { guests: Guest[] };

export function invitedGuests(household: HouseholdWithGuests): Guest[] {
  return household.guests.filter((g) => !g.isPlusOne);
}

export function plusOneGuests(household: HouseholdWithGuests): Guest[] {
  return household.guests.filter((g) => g.isPlusOne);
}

const guestOrder = { orderBy: [{ isPlusOne: "asc" as const }, { createdAt: "asc" as const }] };

export async function listHouseholds(): Promise<HouseholdWithGuests[]> {
  return prisma.household.findMany({
    orderBy: { name: "asc" },
    include: { guests: guestOrder },
  });
}

export async function getHousehold(id: string): Promise<HouseholdWithGuests | null> {
  return prisma.household.findUnique({
    where: { id },
    include: { guests: guestOrder },
  });
}

/** Households containing an invited (non-plus-one) guest with this exact name. */
export async function findHouseholdsByGuestName(
  firstName: string,
  lastName: string
): Promise<HouseholdWithGuests[]> {
  const key = nameKey(firstName, lastName);
  if (!key || !firstName.trim() || !lastName.trim()) return [];
  return prisma.household.findMany({
    where: { guests: { some: { nameKey: key, isPlusOne: false } } },
    include: { guests: guestOrder },
  });
}

export function householdHasGuestNamed(
  household: HouseholdWithGuests,
  firstName: string,
  lastName: string
): boolean {
  const key = nameKey(firstName, lastName);
  return invitedGuests(household).some((g) => g.nameKey === key);
}

export async function createHousehold(input: HouseholdInput) {
  return prisma.household.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      plusOnes: input.plusOnes,
      notes: input.notes,
      guests: {
        create: input.guests.map((g) => ({
          firstName: g.firstName,
          lastName: g.lastName,
          nameKey: nameKey(g.firstName, g.lastName),
        })),
      },
    },
  });
}

/**
 * Updates a household's details and invited guests. Guests whose names are unchanged
 * keep their RSVP answer; removed guests are deleted; plus-ones beyond the new
 * allowance are removed.
 */
export async function updateHousehold(id: string, input: HouseholdInput) {
  const existing = await getHousehold(id);
  if (!existing) return null;

  const current = invitedGuests(existing);
  const keepIds = new Set<string>();
  const toCreate: GuestName[] = [];

  for (const guest of input.guests) {
    const key = nameKey(guest.firstName, guest.lastName);
    const match = current.find((g) => g.nameKey === key && !keepIds.has(g.id));
    if (match) keepIds.add(match.id);
    else toCreate.push(guest);
  }

  const removeIds = current.filter((g) => !keepIds.has(g.id)).map((g) => g.id);
  const extraPlusOnes = plusOneGuests(existing)
    .slice(input.plusOnes)
    .map((g) => g.id);

  await prisma.$transaction([
    prisma.guest.deleteMany({ where: { id: { in: [...removeIds, ...extraPlusOnes] } } }),
    prisma.guest.createMany({
      data: toCreate.map((g) => ({
        householdId: id,
        firstName: g.firstName,
        lastName: g.lastName,
        nameKey: nameKey(g.firstName, g.lastName),
      })),
    }),
    prisma.household.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        plusOnes: input.plusOnes,
        notes: input.notes,
      },
    }),
  ]);

  return getHousehold(id);
}

/** Clears a household's RSVP so they show as "awaiting response" again. */
export async function resetHouseholdResponse(id: string) {
  await prisma.$transaction([
    prisma.guest.deleteMany({ where: { householdId: id, isPlusOne: true } }),
    prisma.guest.updateMany({ where: { householdId: id }, data: { attending: null } }),
    prisma.household.update({
      where: { id },
      data: { respondedAt: null, message: null },
    }),
  ]);
}

/**
 * Imports src/data/guest-list.json. A household matches an existing one when any of
 * its guests' names already belongs to a household; matches are updated and new
 * guests added, but nobody is removed.
 */
export async function importGuestListFromJson(): Promise<{
  created: number;
  updated: number;
  skipped: number;
}> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of guestListData.households) {
    const parsed = parseHouseholdInput(raw);
    if (!parsed.ok) {
      skipped += 1;
      continue;
    }
    const input = parsed.value;

    const keys = input.guests.map((g) => nameKey(g.firstName, g.lastName));
    const existing = await prisma.household.findFirst({
      where: { guests: { some: { nameKey: { in: keys }, isPlusOne: false } } },
      include: { guests: true },
    });

    if (!existing) {
      await createHousehold(input);
      created += 1;
      continue;
    }

    const existingKeys = new Set(existing.guests.map((g) => g.nameKey));
    const mergedGuests = [
      ...invitedGuests(existing).map((g) => ({ firstName: g.firstName, lastName: g.lastName })),
      ...input.guests.filter((g) => !existingKeys.has(nameKey(g.firstName, g.lastName))),
    ];
    await updateHousehold(existing.id, {
      ...input,
      email: input.email ?? existing.email,
      phone: input.phone ?? existing.phone,
      guests: mergedGuests,
    });
    updated += 1;
  }

  return { created, updated, skipped };
}

export type HouseholdStatus = "attending" | "declined" | "awaiting";

export function householdStatus(household: HouseholdWithGuests): HouseholdStatus {
  if (!household.respondedAt) return "awaiting";
  return household.guests.some((g) => g.attending) ? "attending" : "declined";
}

export function summarizeHouseholds(households: HouseholdWithGuests[]) {
  let attending = 0;
  let declined = 0;
  let awaitingGuests = 0;
  let responded = 0;
  for (const household of households) {
    if (household.respondedAt) responded += 1;
    for (const guest of household.guests) {
      if (guest.attending === true) attending += 1;
      else if (guest.attending === false) declined += 1;
      else if (!guest.isPlusOne) awaitingGuests += 1;
    }
  }
  return {
    households: households.length,
    responded,
    awaitingHouseholds: households.length - responded,
    attending,
    declined,
    awaitingGuests,
  };
}

/** Shape sent to the browser for admin tables. */
export function serializeHousehold(household: HouseholdWithGuests) {
  return {
    id: household.id,
    name: household.name,
    email: household.email,
    phone: household.phone,
    phoneDisplay: household.phone ? formatPhone(household.phone) : null,
    greeting: householdGreeting(invitedGuests(household)),
    plusOnes: household.plusOnes,
    notes: household.notes,
    message: household.message,
    respondedAt: household.respondedAt?.toISOString() ?? null,
    status: householdStatus(household),
    guests: household.guests.map((g) => ({
      id: g.id,
      firstName: g.firstName,
      lastName: g.lastName,
      isPlusOne: g.isPlusOne,
      attending: g.attending,
    })),
  };
}

export type SerializedHousehold = ReturnType<typeof serializeHousehold>;
