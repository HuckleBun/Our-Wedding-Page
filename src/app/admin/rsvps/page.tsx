import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminRsvpTable } from "@/components/AdminRsvpTable";
import { AdminShell } from "@/components/AdminShell";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseStoredAdditionalGuests, type RsvpRecord } from "@/lib/rsvp";

export default async function AdminRsvpsPage() {
  const authed = await isAdminSession();

  if (!authed) {
    return (
      <AdminShell title="Admin — RSVPs" lead="Sign in to view guest responses.">
        <AdminLoginForm />
      </AdminShell>
    );
  }

  const rsvps = (await prisma.rsvp.findMany({
    orderBy: { createdAt: "desc" },
  })) as RsvpRecord[];

  const rows = rsvps.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    additionalGuests: parseStoredAdditionalGuests(r.additionalGuests),
  }));

  return (
    <AdminShell title="Admin — RSVPs" lead="Guest responses for your wedding.">
      <AdminRsvpTable rsvps={rows} />
    </AdminShell>
  );
}
