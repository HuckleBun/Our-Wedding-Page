import { SiteHeader } from "@/components/SiteHeader";
import { getSite } from "@/lib/site";

/** Layout for the public site and admin: header, nav, and main content area. */
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = getSite();

  return (
    <>
      <SiteHeader coupleNames={site.coupleNames} />
      <main>{children}</main>
    </>
  );
}
