import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminRsvpTable } from "@/components/AdminRsvpTable";
import { AdminShell } from "@/components/AdminShell";
import { isAdminSession } from "@/lib/auth";
import {
  listHouseholds,
  serializeHousehold,
  summarizeHouseholds,
} from "@/lib/households";

export default async function AdminRsvpsPage() {
  const authed = await isAdminSession();

  if (!authed) {
    return (
      <AdminShell title="Admin — RSVPs" lead="Sign in to view guest responses.">
        <AdminLoginForm />
      </AdminShell>
    );
  }

  const households = await listHouseholds();

  return (
    <AdminShell title="Admin — RSVPs" lead="Guest responses for your wedding.">
      <AdminRsvpTable
        households={households.map(serializeHousehold)}
        summary={summarizeHouseholds(households)}
      />
    </AdminShell>
  );
}
