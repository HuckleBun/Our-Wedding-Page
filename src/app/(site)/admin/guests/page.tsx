import { AdminGuestList } from "@/components/AdminGuestList";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminShell } from "@/components/AdminShell";
import { isAdminSession } from "@/lib/auth";
import { getSiteUrl } from "@/lib/email";
import { listHouseholds, serializeHousehold } from "@/lib/households";
import { getInvitePageUrl } from "@/lib/invite-page";

export default async function AdminGuestsPage() {
  const authed = await isAdminSession();

  if (!authed) {
    return (
      <AdminShell title="Admin — Guest list" lead="Sign in to manage your guest list.">
        <AdminLoginForm />
      </AdminShell>
    );
  }

  const households = await listHouseholds();

  return (
    <AdminShell
      title="Admin — Guest list"
      lead="Only people on this list can RSVP. Group guests who RSVP together into one household."
    >
      <AdminGuestList
        households={households.map(serializeHousehold)}
        invitePageUrl={getInvitePageUrl(getSiteUrl())}
      />
    </AdminShell>
  );
}
