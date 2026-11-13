import { Suspense } from "react";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminShell } from "@/components/AdminShell";
import { AdminEmailComposer } from "@/components/AdminEmailComposer";
import { isAdminSession } from "@/lib/auth";

export default async function AdminEmailPage() {
  const authed = await isAdminSession();

  if (!authed) {
    return (
      <AdminShell title="Admin — Send email" lead="Sign in to send emails.">
        <AdminLoginForm />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Admin — Send email"
      lead="Send save-the-date, invitations, reminders, or a single email."
    >
      <Suspense fallback={<p className="page-lead">Loading email composer…</p>}>
        <AdminEmailComposer />
      </Suspense>
    </AdminShell>
  );
}
