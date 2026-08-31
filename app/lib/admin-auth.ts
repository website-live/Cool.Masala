export const ADMIN_COOKIE = "__Host-cool-masala-admin";
export const SESSION_SECONDS = 15 * 60;

type AdminSecretEnv = { ADMIN_ACCESS_KEY?: string; ADMIN_TOTP_SECRET?: string };

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(value: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function equalSecret(left: string, right: string): Promise<boolean> {
  const [leftBytes, rightBytes] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(right)),
  ]);
  const a = new Uint8Array(leftBytes);
  const b = new Uint8Array(rightBytes);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) difference |= (a[index % a.length] ?? 0) ^ (b[index % b.length] ?? 0);
  return difference === 0;
}

function readCookies(request: Request): Record<string, string> {
  const header = request.headers.get("Cookie") ?? "";
  return Object.fromEntries(header.split(";").map((part) => part.trim().split("=")).filter(([key, value]) => key && value));
}

export async function createAdminSession(env: AdminSecretEnv): Promise<string> {
  if (!env.ADMIN_ACCESS_KEY) throw new Error("ADMIN_ACCESS_KEY is not configured");
  const expires = String(Date.now() + SESSION_SECONDS * 1000);
  const signature = base64UrlEncode(await hmac(expires, env.ADMIN_ACCESS_KEY));
  return `${expires}.${signature}`;
}

export async function hasAdminSession(request: Request, env: AdminSecretEnv): Promise<boolean> {
  if (!env.ADMIN_ACCESS_KEY) return false;
  const token = readCookies(request)[ADMIN_COOKIE];
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = base64UrlEncode(await hmac(expires, env.ADMIN_ACCESS_KEY));
  return equalSecret(signature, expected);
}

export async function verifyAdminTotp(otp: string, env: AdminSecretEnv): Promise<boolean> {
  // Bulk approvals are deliberately fail-closed: an unset secret is not a valid configuration.
  const secret = env.ADMIN_TOTP_SECRET;
  if (!secret) return false;
  return verifyTotp(otp, secret);
}

export async function verifyAdminLogin(accessKey: string, otp: string, env: AdminSecretEnv): Promise<{ ok: boolean; reason?: string }> {
  if (!env.ADMIN_ACCESS_KEY) return { ok: false, reason: "setup-required" };
  if (!(await equalSecret(accessKey, env.ADMIN_ACCESS_KEY))) return { ok: false, reason: "invalid-credentials" };
  if (env.ADMIN_TOTP_SECRET && !(await verifyTotp(otp, env.ADMIN_TOTP_SECRET))) return { ok: false, reason: "invalid-otp" };
  return { ok: true };
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

export function sessionCookie(value: string): string {
  return `${ADMIN_COOKIE}=${value}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie(): string {
  return `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

function decodeBase32(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const output: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of clean) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) continue;
    buffer = (buffer << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(output);
}

async function verifyTotp(value: string, secret: string): Promise<boolean> {
  if (!/^\d{6}$/.test(value)) return false;
  const secretBytes = decodeBase32(secret);
  if (!secretBytes.length) return false;
  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  for (const offset of [-1, 0, 1]) {
    const counter = currentCounter + offset;
    const data = new ArrayBuffer(8);
    new DataView(data).setBigUint64(0, BigInt(counter));
    const key = await crypto.subtle.importKey("raw", secretBytes as unknown as BufferSource, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
    const position = digest[digest.length - 1] & 0x0f;
    const code = ((digest[position] & 0x7f) << 24 | (digest[position + 1] & 0xff) << 16 | (digest[position + 2] & 0xff) << 8 | (digest[position + 3] & 0xff)) % 1_000_000;
    if (await equalSecret(value, String(code).padStart(6, "0"))) return true;
  }
  return false;
}
