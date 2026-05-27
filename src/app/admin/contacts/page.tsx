import { AdminContactTable } from "@/components/AdminContactTable";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminShell } from "@/components/AdminShell";
import { isAdminSession } from "@/lib/auth";
import { listInviteesWithRsvpStatus } from "@/lib/invitee";

export default async function AdminContactsPage() {
  const authed = await isAdminSession();

  if (!authed) {
    return (
      <AdminShell title="Admin — Contacts" lead="Sign in to manage your guest list.">
        <AdminLoginForm />
      </AdminShell>
    );
  }

  const invitees = await listInviteesWithRsvpStatus();
  const rows = invitees.map((invitee) => ({
    id: invitee.id,
    firstName: invitee.firstName,
    lastName: invitee.lastName,
    email: invitee.email,
    notes: invitee.notes,
    hasRsvp: invitee.hasRsvp,
  }));

  return (
    <AdminShell
      title="Admin — Contacts"
      lead="Manage invitees, import from JSON, and track RSVP status."
    >
      <AdminContactTable invitees={rows} />
    </AdminShell>
  );
}
