import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FloralDivider } from "@/components/FloralDivider";
import { isValidInvitePageToken } from "@/lib/invite-page";
import { getSite } from "@/lib/site";

export const dynamic = "force-dynamic";

// Keep the private link out of search results and out of Referer headers.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

type PageProps = {
  params: Promise<{ token: string }>;
};

function calendarLinks(title: string, isoDate: string, location: string) {
  const start = isoDate.replace(/-/g, "");
  const next = new Date(`${isoDate}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = next.toISOString().slice(0, 10).replace(/-/g, "");

  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", title);
  google.searchParams.set("dates", `${start}/${end}`);
  google.searchParams.set("location", location);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//wedding//save-the-date//EN",
    "BEGIN:VEVENT",
    `UID:${start}-wedding@save-the-date`,
    `DTSTAMP:${start}T000000Z`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${title.replace(/[,;]/g, "\\$&")}`,
    `LOCATION:${location.replace(/[,;]/g, "\\$&")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    google: google.toString(),
    ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`,
  };
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  if (!isValidInvitePageToken(decodeURIComponent(token))) notFound();

  const site = getSite();
  const page = site.invitePage;
  const isInvitation = page.mode === "invitation";
  const copy = isInvitation ? page.invitation : page.saveTheDate;
  const [first, second] = site.coupleNames.split("&").map((s) => s.trim());
  const location = [site.venue.name, site.venue.city].filter(Boolean).join(", ");
  const cal = calendarLinks(`${site.coupleNames}'s Wedding`, site.weddingDate, location);

  return (
    <div className="invite-page">
      <article className="invite-card">
        <FloralDivider className="invite-floral" />
        <p className="invite-eyebrow">{copy.eyebrow}</p>

        <h1 className="invite-names">
          <span>{first}</span>
          {second ? (
            <>
              <span className="invite-amp">&amp;</span>
              <span>{second}</span>
            </>
          ) : null}
        </h1>

        {page.photo ? (
          <Image
            src={page.photo}
            alt={site.coupleNames}
            width={900}
            height={600}
            className="invite-photo"
            unoptimized
          />
        ) : null}

        <p className="invite-message">{copy.message}</p>

        <div className="invite-rule" aria-hidden="true" />
        <p className="invite-date">{site.weddingDateDisplay}</p>
        <p className="invite-location">{location}</p>
        <div className="invite-rule" aria-hidden="true" />

        {copy.footnote ? <p className="invite-footnote">{copy.footnote}</p> : null}

        <div className="invite-actions">
          {isInvitation ? (
            <Link href="/rsvp" className="invite-btn invite-btn-primary">
              RSVP
            </Link>
          ) : null}
          <a
            href={cal.google}
            className="invite-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            Add to Google Calendar
          </a>
          <a href={cal.ics} download="save-the-date.ics" className="invite-btn">
            Add to Apple / Outlook
          </a>
        </div>

        <Link href="/" className="invite-site-link">
          Visit our wedding website
        </Link>
      </article>
    </div>
  );
}
