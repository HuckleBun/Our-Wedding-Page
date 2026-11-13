import {
  invitedGuests,
  plusOneGuests,
  type HouseholdWithGuests,
} from "@/lib/households";

/** What a guest sees about their own household after looking up their name. */
export function toPublicHousehold(household: HouseholdWithGuests) {
  return {
    id: household.id,
    name: household.name,
    plusOnes: household.plusOnes,
    responded: Boolean(household.respondedAt),
    message: household.message,
    guests: invitedGuests(household).map((g) => ({
      id: g.id,
      firstName: g.firstName,
      lastName: g.lastName,
      attending: g.attending,
    })),
    plusOneGuests: plusOneGuests(household).map((g) => ({
      firstName: g.firstName,
      lastName: g.lastName,
    })),
  };
}

export type PublicHousehold = ReturnType<typeof toPublicHousehold>;
