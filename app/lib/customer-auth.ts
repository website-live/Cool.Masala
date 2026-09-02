import type { ItemStore, CustomerUser } from "../../workers/item-store";

export const CUSTOMER_SESSION_COOKIE = "cm_customer_session";
export const CUSTOMER_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function normalizeIndianPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function customerSessionCookie(token: string): string {
  return `${CUSTOMER_SESSION_COOKIE}=${token}; Path=/; Max-Age=${CUSTOMER_SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCustomerSessionCookie(): string {
  return `${CUSTOMER_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export function customerSessionToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${CUSTOMER_SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

export async function getCustomerSession(request: Request, items: DurableObjectStub<ItemStore>): Promise<CustomerUser | null> {
  const token = customerSessionToken(request);
  if (!token) return null;
  return items.getCustomerBySession(await sha256Hex(token));
}
