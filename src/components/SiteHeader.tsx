"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FloralDivider } from "@/components/FloralDivider";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/photos", label: "Photos" },
  { href: "/wedding-party", label: "Wedding Party" },
  { href: "/registry", label: "Registry" },
  { href: "/rsvp", label: "RSVP" },
];

type SiteHeaderProps = {
  coupleNames: string;
};

export function SiteHeader({ coupleNames }: SiteHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="container header-top">
        <div className="header-brand">
          <FloralDivider className="floral-divider" />
          <Link href="/" className="couple-link">
            <h1 className="couple-names">{coupleNames}</h1>
          </Link>
        </div>
      </div>
      <nav className="site-nav" aria-label="Main">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link${pathname === href ? " active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
