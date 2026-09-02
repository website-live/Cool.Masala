type Fast2SmsEnv = {
  APP_ENV?: string;
  FAST2SMS_API_KEY?: string;
  FAST2SMS_OTP_ID?: string;
  FAST2SMS_SENDER_ID?: string;
};

export type Fast2SmsResult = {
  delivery: "sms" | "console";
  endpoint: string | null;
  providerStatus: number | null;
  providerMessage: string | null;
};

function responseMessage(responseText: string): string | null {
  try {
    const payload = JSON.parse(responseText) as { message?: unknown; msg?: unknown; error?: unknown };
    const message = payload.message ?? payload.msg ?? payload.error;
    return message == null ? null : String(message).slice(0, 240);
  } catch {
    const text = responseText.trim();
    return text ? text.slice(0, 240) : null;
  }
}

export async function sendFast2SmsOtp(env: Fast2SmsEnv, phone: string, otp: string): Promise<Fast2SmsResult> {
  const apiKey = env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) {
    if (env.APP_ENV === "staging") {
      const providerMessage = "FAST2SMS_API_KEY is not configured on the Worker.";
      console.warn(JSON.stringify({ code: "OTP_STAGING_CONSOLE_FALLBACK", phone, otp, configured: false, providerStatus: null, providerMessage }));
      return { delivery: "console", endpoint: null, providerStatus: null, providerMessage };
    }
    throw new Error("SMS delivery is not configured.");
  }

  const phoneNumber = phone.replace(/^\+91/, "");
  const message = `Your OTP for Cool Masala login is ${otp}. @cool-masala-staging.luxerion-furnish.workers.dev #${otp}`;
  const endpoint = "https://www.fast2sms.com/dev/bulkV2";
  const body = { route: "q", message, language: "english", flash: 0, numbers: phoneNumber };
  const consoleFallback = (reason: string, providerStatus: number | null, providerMessage: string | null): Fast2SmsResult => {
    if (env.APP_ENV === "staging" || env.APP_ENV === "development") {
      console.warn(JSON.stringify({ code: "OTP_CONSOLE_FALLBACK", phone, otp, configured: true, endpoint, providerStatus, providerMessage, reason }));
      return { delivery: "console", endpoint, providerStatus, providerMessage: providerMessage ?? reason };
    }
    throw new Error(reason);
  };

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "POST", headers: { authorization: apiKey, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    return consoleFallback("Fast2SMS could not be reached.", null, null);
  }
  const responseText = await response.text();
  const providerMessage = responseMessage(responseText);
  if (!response.ok) return consoleFallback(`Fast2SMS returned HTTP ${response.status}.`, response.status, providerMessage);
  let payload: { return?: boolean; message?: string } = {};
  try { payload = JSON.parse(responseText) as typeof payload; } catch {}
  if (payload.return === false) return consoleFallback(payload.message || "Fast2SMS rejected the OTP request.", response.status, providerMessage);
  return { delivery: "sms", endpoint, providerStatus: response.status, providerMessage };
}
