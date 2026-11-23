import type { Metadata } from "next";
import { Pinyon_Script } from "next/font/google";
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

const script = Pinyon_Script({ subsets: ["latin"], weight: "400" });

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

/** "2027-05-15" -> "5.15.27" */
function shortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${m}.${d}.${String(y).slice(-2)}`;
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
  const photo = page.photo?.trim();

  const actions = (
    <>
      <div className="invite-rsvp">
        <p className="invite-rsvp-title">Please RSVP on our wedding website</p>
        <p className="invite-rsvp-note">{copy.rsvpNote}</p>
        <Link href="/rsvp" className="invite-btn invite-btn-primary">
          RSVP on our website
        </Link>
      </div>
      <p className="invite-calendar">
        Add to calendar:{" "}
        <a href={cal.google} target="_blank" rel="noopener noreferrer">
          Google
        </a>
        <span aria-hidden="true"> · </span>
        <a href={cal.ics} download="save-the-date.ics">
          Apple / Outlook
        </a>
      </p>
      <Link href="/" className="invite-site-link">
        Visit our wedding website
      </Link>
    </>
  );

  if (photo) {
    return (
      <div className="invite-page">
        <article className="invite-card invite-card--photo">
          <div
            className="invite-photo-hero"
            style={{ backgroundImage: `url(${photo})` }}
            role="img"
            aria-label={`${site.coupleNames}`}
          >
            <div className="invite-photo-text">
              <FloralDivider className="invite-photo-floral" />
              <p className="invite-photo-names">
                {first}
                {second ? (
                  <>
                    {" "}
                    <span className="invite-photo-amp">&amp;</span>{" "}
                    {second}
                  </>
                ) : null}
              </p>
              <h1
                className={`invite-photo-script ${script.className}${
                  copy.eyebrow.length > 16 ? " invite-photo-script--long" : ""
                }`}
              >
                {copy.eyebrow}
              </h1>
              <div className="invite-photo-rule" aria-hidden="true" />
              <p className="invite-photo-when">
                <span>{shortDate(site.weddingDate)}</span>
                <span className="invite-photo-sep" aria-hidden="true">
                  |
                </span>
                <span>{location}</span>
              </p>
            </div>
          </div>

          <div className="invite-photo-body">
            <p className="invite-message">{copy.message}</p>
            {actions}
            {copy.footnote ? <p className="invite-footnote">{copy.footnote}</p> : null}
          </div>
        </article>
      </div>
    );
  }

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

        <p className="invite-message">{copy.message}</p>

        <div className="invite-rule" aria-hidden="true" />
        <p className="invite-date">{site.weddingDateDisplay}</p>
        <p className="invite-location">{location}</p>
        <div className="invite-rule" aria-hidden="true" />

        {copy.footnote ? <p className="invite-footnote">{copy.footnote}</p> : null}
        {actions}
      </article>
    </div>
  );
}
