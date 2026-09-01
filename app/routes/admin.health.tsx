import { Link, useLoaderData } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { hasAdminSession } from "~/lib/admin-auth";
import type { Route } from "./+types/admin.health";

function store(context: Route.LoaderArgs["context"]) {
  const namespace = context.cloudflare.env.ITEMS;
  return namespace.get(namespace.idFromName("default"));
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  if (!(await hasAdminSession(request, env))) return { authenticated: false as const };
  const started = performance.now();
  const health = await store(context).getHealthMetrics();
  return {
    authenticated: true as const,
    health,
    requestLatencyMs: Math.round((performance.now() - started) * 100) / 100,
    secrets: { adminAccessKey: Boolean(env.ADMIN_ACCESS_KEY), adminTotpSecret: Boolean(env.ADMIN_TOTP_SECRET), connectionsBinding: Boolean(env.CONNECTIONS), notificationFromEmail: Boolean(env.NOTIFICATION_FROM_EMAIL) },
  };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Cool Masala Admin Health" }, { name: "robots", content: "noindex, nofollow" }];
}

export default function AdminHealth() {
  const data = useLoaderData<typeof loader>();
  if (!data.authenticated) return <main className="admin-shell grid min-h-svh place-items-center bg-[#fbfbf5] p-6"><div className="w-full max-w-md rounded-xl border border-[#e4e4e7] bg-white p-7 text-center shadow-sm"><h1 className="text-xl font-semibold">Admin session required</h1><p className="mt-2 text-sm text-[#71717a]">Sign in to inspect store health.</p><Link to="/admin"><Button className="mt-5 rounded-full bg-black text-white">Open admin sign-in</Button></Link></div></main>;
  const { health, requestLatencyMs, secrets } = data;
  const counts = [["Orders", health.orders], ["Pending approvals", health.pendingApproval], ["Rejected", health.rejected], ["Cancelled", health.cancelled], ["Low-stock products", health.lowStock], ["Error logs", health.errorLogs], ["Notification logs", health.notificationLogs]] as const;
  return <main className="admin-shell min-h-svh bg-[#fbfbf5] p-5 text-black sm:p-8"><div className="mx-auto max-w-6xl"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><Link to="/admin" className="text-sm font-semibold text-black">← Back to admin</Link><h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">System health</h1><p className="mt-1 max-w-2xl text-sm text-[#71717a]">Live Durable Object counts, request timing, and notification configuration. Secret values are never exposed.</p></div><Badge className="rounded-full border-0 bg-[#c1fbd4] px-3 py-2 text-black">Authenticated session</Badge></div><section className="grid gap-4 sm:grid-cols-2"><Metric label="Request latency" value={`${requestLatencyMs} ms`} detail="Admin health loader" /><Metric label="Database latency" value={`${health.dbLatencyMs} ms`} detail="Durable Object SQL health query" /></section><section className="mt-6 rounded-xl border border-[#e4e4e7] bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Durable Object health counts</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{counts.map(([label, value]) => <div key={label} className="rounded-lg border border-[#e4e4e7] bg-[#fbfbf5] p-4"><p className="text-xs text-[#71717a]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div></section><section className="mt-6 rounded-xl border border-[#e4e4e7] bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Secret configuration</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><SecretStatus label="ADMIN_ACCESS_KEY" configured={secrets.adminAccessKey} /><SecretStatus label="ADMIN_TOTP_SECRET" configured={secrets.adminTotpSecret} /><SecretStatus label="CONNECTIONS binding" configured={secrets.connectionsBinding} /><SecretStatus label="NOTIFICATION_FROM_EMAIL" configured={secrets.notificationFromEmail} /></div><p className="mt-4 text-xs leading-5 text-[#71717a]">Only whether each secret is configured is shown; secret values are never exposed.</p></section></div></main>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-xl border border-[#e4e4e7] bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">{label}</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs text-[#71717a]">{detail}</p></div>; }
function SecretStatus({ label, configured }: { label: string; configured: boolean }) { return <div className={`flex items-center justify-between rounded-lg border p-4 ${configured ? "border-[#bfe8cb] bg-[#c1fbd4]" : "border-[#d4d4d8] bg-[#f4f4f5]"}`}><code className="text-sm">{label}</code><span className="text-xs font-semibold">{configured ? "Configured" : "Not configured"}</span></div>; }
