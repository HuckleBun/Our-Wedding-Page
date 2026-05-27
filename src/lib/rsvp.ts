export type GuestName = {
  firstName: string;
  lastName: string;
};

export type RsvpRecord = {
  id: string;
  createdAt: Date;
  firstName: string;
  lastName: string;
  email: string;
  guestCount: number;
  additionalGuests: unknown;
  message: string | null;
};

export function formatGuestName(guest: GuestName): string {
  return `${guest.firstName} ${guest.lastName}`.trim();
}

export function guestIdentityKey(guest: GuestName): string {
  return `${guest.firstName.trim().toLowerCase()} ${guest.lastName.trim().toLowerCase()}`;
}

export function listRsvpGuests(
  primary: GuestName,
  additionalGuests: GuestName[] | null | undefined
): GuestName[] {
  return [primary, ...(additionalGuests ?? [])];
}

export function countUniqueGuests(
  rsvps: Array<{
    firstName: string;
    lastName: string;
    additionalGuests?: GuestName[] | null;
  }>
): number {
  const seen = new Set<string>();

  for (const rsvp of rsvps) {
    for (const guest of listRsvpGuests(
      { firstName: rsvp.firstName, lastName: rsvp.lastName },
      rsvp.additionalGuests
    )) {
      seen.add(guestIdentityKey(guest));
    }
  }

  return seen.size;
}

export function formatAllGuestNames(
  primary: GuestName,
  additionalGuests: GuestName[] | null | undefined
): string {
  const names = [formatGuestName(primary)];
  for (const guest of additionalGuests ?? []) {
    names.push(formatGuestName(guest));
  }
  return names.join(", ");
}

export function parseAdditionalGuests(
  value: unknown,
  expectedCount: number
): GuestName[] | null {
  if (expectedCount <= 0) return [];
  if (!Array.isArray(value) || value.length !== expectedCount) return null;

  return parseAdditionalGuestsList(value);
}

export function parseAdditionalGuestsList(value: unknown): GuestName[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;

  const guests: GuestName[] = [];
  for (const entry of value) {
    const firstName = String(
      entry && typeof entry === "object" && "firstName" in entry
        ? entry.firstName
        : ""
    ).trim();
    const lastName = String(
      entry && typeof entry === "object" && "lastName" in entry
        ? entry.lastName
        : ""
    ).trim();
    if (!firstName || !lastName) return null;
    guests.push({ firstName, lastName });
  }

  return guests;
}

export function parseStoredAdditionalGuests(value: unknown): GuestName[] {
  const parsed = parseAdditionalGuests(value, Array.isArray(value) ? value.length : 0);
  return parsed ?? [];
}
