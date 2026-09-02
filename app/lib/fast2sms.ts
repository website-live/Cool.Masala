type Fast2SmsEnv = {
  APP_ENV?: string;
  FAST2SMS_API_KEY?: string;
  FAST2SMS_OTP_ID?: string;
  FAST2SMS_SENDER_ID?: string;
};

export async function sendFast2SmsOtp(env: Fast2SmsEnv, phone: string, otp: string, request: Request): Promise<"sms" | "console"> {
  const apiKey = env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) {
    if (env.APP_ENV === "staging") {
      console.warn(JSON.stringify({ code: "OTP_STAGING_CONSOLE_FALLBACK", phone, otp, message: "FAST2SMS_API_KEY is not configured; OTP was not sent over SMS." }));
      return "console";
    }
    throw new Error("SMS delivery is not configured.");
  }

  const phoneNumber = phone.replace(/^\+91/, "");
  const origin = new URL(request.url).origin;
  const message = `Your OTP for Cool Masala login is ${otp}. ${origin} #${otp}`;
  const endpoint = env.FAST2SMS_OTP_ID ? "https://www.fast2sms.com/dev/otp/send" : "https://www.fast2sms.com/dev/bulkV2";
  const body = env.FAST2SMS_OTP_ID
    ? { mobile: phoneNumber, otp_id: env.FAST2SMS_OTP_ID, otp, otp_length: 6 }
    : env.FAST2SMS_SENDER_ID
      ? { route: "q", language: "english", flash: 0, numbers: phoneNumber, message, sender_id: env.FAST2SMS_SENDER_ID }
      : { route: "otp", variables_values: otp, numbers: phoneNumber };
  const response = await fetch(endpoint, { method: "POST", headers: { authorization: apiKey, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Fast2SMS returned HTTP ${response.status}.`);
  let payload: { return?: boolean; message?: string } = {};
  try { payload = JSON.parse(responseText) as typeof payload; } catch {}
  if (payload.return === false) throw new Error(payload.message || "Fast2SMS rejected the OTP request.");
  return "sms";
}
