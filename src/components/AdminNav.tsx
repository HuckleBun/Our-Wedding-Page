"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ADMIN_LINKS = [
  { href: "/admin/rsvps", label: "RSVPs" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/email", label: "Send email" },
  { href: "/admin/email-log", label: "Email log" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="admin-nav-wrap">
      <nav className="admin-nav" aria-label="Admin">
        {ADMIN_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`admin-nav-link${pathname === href ? " active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <button type="button" className="btn btn-ghost admin-nav-logout" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}
