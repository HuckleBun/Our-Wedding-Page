import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "wedding_admin";

const SESSION_SECONDS = 60 * 60 * 24 * 7;

function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  return password && password.length >= 8 ? password : null;
}

/**
 * Key for signing session cookies. Uses SESSION_SECRET if set; otherwise derives one
 * from ADMIN_PASSWORD, so changing the password signs everyone out.
 */
function getSigningKey(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  const password = getAdminPassword();
  return password ? `admin-session:${password}` : null;
}

function safeEqual(a: string, b: string): boolean {
  // Hash first so inputs of different lengths still compare in constant time.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function isAdminPassword(password: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;
  return safeEqual(password, expected);
}

export async function isAdminSession(): Promise<boolean> {
  const key = getSigningKey();
  if (!key) return false;

  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!value) return false;

  const [expires, signature] = value.split(".");
  if (!expires || !signature) return false;
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now() / 1000) return false;

  return safeEqual(signature, sign(`admin.${expires}`, key));
}

export async function setAdminSession(): Promise<void> {
  const key = getSigningKey();
  if (!key) throw new Error("ADMIN_PASSWORD is not configured.");

  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, `${expires}.${sign(`admin.${expires}`, key)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
