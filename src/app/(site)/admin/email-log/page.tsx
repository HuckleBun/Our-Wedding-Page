import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminShell } from "@/components/AdminShell";
import { AdminEmailLogTable } from "@/components/AdminEmailLogTable";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminEmailLogPage() {
  const authed = await isAdminSession();

  if (!authed) {
    return (
      <AdminShell title="Admin — Email log" lead="Sign in to view send history.">
        <AdminLoginForm />
      </AdminShell>
    );
  }

  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rows = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <AdminShell title="Admin — Email log" lead="History of sent and failed emails.">
      <AdminEmailLogTable logs={rows} />
    </AdminShell>
  );
}
