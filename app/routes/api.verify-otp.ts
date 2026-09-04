import type { Route } from "./+types/api.verify-otp";
import { customerSessionCookie, normalizeIndianPhone, randomToken, sha256Hex } from "~/lib/customer-auth";

function store(context: Route.ActionArgs["context"]) {
  const namespace = context.cloudflare.env.ITEMS;
  return namespace.get(namespace.idFromName("default"));
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  let body: { phone?: unknown; otp?: unknown } = {};
  try { body = await request.json() as typeof body; } catch { return Response.json({ ok: false, message: "Invalid request." }, { status: 400 }); }
  const phone = normalizeIndianPhone(String(body.phone ?? ""));
  const otp = String(body.otp ?? "").trim();
  if (!phone || !/^[0-9]{6}$/.test(otp)) return Response.json({ ok: false, message: "Enter a valid 6-digit OTP." }, { status: 400 });
  try {
    const user = await store(context).verifyCustomerOtp(phone, await sha256Hex(`${phone}:${otp}`));
    const token = randomToken();
    await store(context).createCustomerSession(user.id, await sha256Hex(token), new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString());
    return Response.json({ ok: true, user: { id: user.id, phone: user.phone, isVerified: user.isVerified } }, { headers: { "Set-Cookie": customerSessionCookie(token) } });
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : "OTP verification failed." }, { status: 400 });
  }
}

export async function loader() {
  return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
}
