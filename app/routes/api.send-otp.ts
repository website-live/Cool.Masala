import type { Route } from "./+types/api.send-otp";
import { normalizeIndianPhone, sha256Hex } from "~/lib/customer-auth";
import { sendFast2SmsOtp } from "~/lib/fast2sms";

function store(context: Route.ActionArgs["context"]) {
  const namespace = context.cloudflare.env.ITEMS;
  return namespace.get(namespace.idFromName("default"));
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  let body: { phone?: unknown } = {};
  try { body = await request.json() as typeof body; } catch { return Response.json({ ok: false, message: "Invalid request." }, { status: 400 }); }
  const phone = normalizeIndianPhone(String(body.phone ?? ""));
  if (!phone) return Response.json({ ok: false, message: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });
  const otp = String(Math.floor(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  try {
    await store(context).requestCustomerOtp(phone, await sha256Hex(`${phone}:${otp}`), new Date(Date.now() + 5 * 60 * 1000).toISOString());
    const result = await sendFast2SmsOtp(context.cloudflare.env, phone, otp);
    const diagnostic = context.cloudflare.env.ENVIRONMENT === "staging" ? {
      configured: Boolean(context.cloudflare.env.FAST2SMS_API_KEY?.trim()),
      delivery: result.delivery,
      endpoint: result.endpoint,
      providerStatus: result.providerStatus,
      providerMessage: result.providerMessage,
    } : undefined;
    return Response.json({ ok: true, delivery: result.delivery, expiresIn: 300, resendAfter: 30, ...(diagnostic ? { diagnostic, debugOtp: otp } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP could not be sent. Please try again.";
    const rateLimited = message.includes("Too many OTP requests") || message.includes("Please wait 30 seconds");
    return Response.json({ ok: false, message }, { status: rateLimited ? 429 : 502 });
  }
}

export async function loader() {
  return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
}
