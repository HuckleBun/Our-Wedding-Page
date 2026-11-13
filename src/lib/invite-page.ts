import { timingSafeEqual } from "crypto";

/**
 * The private save-the-date / invitation page lives at /invite/<INVITE_PAGE_TOKEN>.
 * It isn't linked from the site and is hidden from search engines; anyone without
 * the exact token gets a 404. If the token is unset or too short, the page is off.
 */
const MIN_TOKEN_LENGTH = 12;

export function getInvitePageToken(): string | null {
  const token = (process.env.INVITE_PAGE_TOKEN || "").trim();
  return token.length >= MIN_TOKEN_LENGTH ? token : null;
}

export function isValidInvitePageToken(candidate: string): boolean {
  const token = getInvitePageToken();
  if (!token) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function getInvitePageUrl(siteUrl: string): string | null {
  const token = getInvitePageToken();
  return token ? `${siteUrl}/invite/${encodeURIComponent(token)}` : null;
}
