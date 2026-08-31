import { createRequestHandler } from "react-router";
import type { CamelAiBinding } from "./camelai-binding";
import type { ItemStore } from "./item-store";
import type { ConnectionsBinding } from "../app/lib/connections";

export { ItemStore } from "./item-store";

interface Env {
  ASSETS?: { fetch(request: Request): Promise<Response> | Response };
  CAMELAI: CamelAiBinding;
  ITEMS: DurableObjectNamespace<ItemStore>;
  /** Configure these as Cloudflare secrets before opening /admin. */
  ADMIN_ACCESS_KEY?: string;
  ADMIN_TOTP_SECRET?: string;
  /** Workspace-managed notification connections; credentials stay behind the platform binding. */
  CONNECTIONS?: ConnectionsBinding;
  TELEGRAM_CONNECTION?: string;
  RESEND_CONNECTION?: string;
  ADMIN_NOTIFICATION_EMAIL?: string;
  NOTIFICATION_FROM_EMAIL?: string;
}

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: { env: Env; ctx: ExecutionContext };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

function shouldServeAsset(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;
  const pathname = new URL(request.url).pathname;
  return pathname.startsWith("/assets/") || pathname.includes(".") || pathname === "/robots.txt";
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (env.ASSETS && shouldServeAsset(request)) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;
    }
    try {
      const response = await requestHandler(request, { cloudflare: { env, ctx } });
      const headers = new Headers(response.headers);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set("X-Frame-Options", "DENY");
      headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
      headers.set("Cross-Origin-Opener-Policy", "same-origin");
      headers.set("Cross-Origin-Resource-Policy", "same-site");
      headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      console.error(JSON.stringify({ code: "WORKER_REQUEST_FAILED", message: error instanceof Error ? error.message : String(error), path: new URL(request.url).pathname, method: request.method }));
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;
