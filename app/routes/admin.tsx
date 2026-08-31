import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3.js";
import Box from "lucide-react/dist/esm/icons/box.js";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import CircleAlert from "lucide-react/dist/esm/icons/circle-alert.js";
import ClipboardList from "lucide-react/dist/esm/icons/clipboard-list.js";
import IndianRupee from "lucide-react/dist/esm/icons/indian-rupee.js";
import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.js";
import LogOut from "lucide-react/dist/esm/icons/log-out.js";
import PackageCheck from "lucide-react/dist/esm/icons/package-check.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Save from "lucide-react/dist/esm/icons/save.js";
import Settings from "lucide-react/dist/esm/icons/settings.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import Store from "lucide-react/dist/esm/icons/store.js";
import Truck from "lucide-react/dist/esm/icons/truck.js";
import Users from "lucide-react/dist/esm/icons/users.js";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { isSameOrigin, clearSessionCookie, createAdminSession, hasAdminSession, sessionCookie, verifyAdminLogin, verifyAdminTotp } from "~/lib/admin-auth";
import { sendApprovedOrderReceipt } from "~/lib/notifications";
import type { Route } from "./+types/admin";

function store(context: Route.LoaderArgs["context"]) {
  const namespace = context.cloudflare.env.ITEMS;
  return namespace.get(namespace.idFromName("default"));
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const authenticated = await hasAdminSession(request, env);
  if (!authenticated) return { authenticated: false as const, setupRequired: !env.ADMIN_ACCESS_KEY, twoFactorConfigured: Boolean(env.ADMIN_TOTP_SECRET) };
  const items = store(context);
  const [dashboard, products, orders, pendingApprovals, expenses, settings] = await Promise.all([items.getDashboard(), items.listProducts(true), items.listOrders(), items.listPendingApprovals(), items.listExpenses(), items.getSettings()]);
  return { authenticated: true as const, dashboard, products, orders, pendingApprovals, expenses, settings, twoFactorConfigured: Boolean(env.ADMIN_TOTP_SECRET) };
}

export async function action({ request, context }: Route.ActionArgs) {
  if (!isSameOrigin(request)) return { ok: false, message: "Request blocked: origin validation failed." };
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const env = context.cloudflare.env;

  if (intent === "login") {
    const result = await verifyAdminLogin(String(form.get("accessKey") ?? ""), String(form.get("otp") ?? ""), env);
    if (!result.ok) {
      return { ok: false, message: result.reason === "setup-required" ? "Admin setup is incomplete. Configure ADMIN_ACCESS_KEY before signing in." : result.reason === "invalid-otp" ? "The verification code is invalid or expired." : "The access key is invalid." };
    }
    return redirect("/admin", { headers: { "Set-Cookie": sessionCookie(await createAdminSession(env)) } });
  }

  if (intent === "logout") return redirect("/admin", { headers: { "Set-Cookie": clearSessionCookie() } });
  if (!(await hasAdminSession(request, env))) return { ok: false, message: "Your admin session expired. Sign in again." };

  const items = store(context);
  if (intent === "update-product") {
    const id = Number(form.get("id"));
    const stock = Number(form.get("stock"));
    const price = Number(form.get("price"));
    const mrp = Number(form.get("mrp"));
    const name = String(form.get("name") ?? "").trim().slice(0, 120);
    const description = String(form.get("description") ?? "").trim().slice(0, 180);
    const image = String(form.get("image") ?? "").trim().slice(0, 500);
    const badge = String(form.get("badge") ?? "").trim().slice(0, 40) || null;
    if (!Number.isInteger(id) || !name || !description || !/^https:\/\//i.test(image) || !Number.isInteger(stock) || stock < 0 || stock > 1_000_000 || !Number.isFinite(price) || price < 0 || !Number.isFinite(mrp) || mrp < price) return { ok: false, message: "Check product, image, stock and pricing values." };
    await items.updateProduct(id, { name, description, price, mrp, stock, image, badge, active: form.get("active") === "on" ? 1 : 0 });
    return { ok: true, message: "Product updated." };
  }

  if (intent === "add-product") {
    const name = String(form.get("name") ?? "").trim().slice(0, 120);
    const description = String(form.get("description") ?? "").trim().slice(0, 180);
    const category = String(form.get("category") ?? "Blended Masala");
    const allowedCategories = ["Blended Masala", "Whole Spices", "Chilli Powders", "Turmeric", "Gift Packs", "Printed T-Shirts"];
    const price = Number(form.get("price"));
    const mrp = Number(form.get("mrp"));
    const stock = Number(form.get("stock"));
    const image = String(form.get("image") ?? "").trim().slice(0, 500);
    const badge = String(form.get("badge") ?? "").trim().slice(0, 40) || null;
    if (!name || !description || !allowedCategories.includes(category) || !/^https:\/\//i.test(image) || !Number.isFinite(price) || !Number.isFinite(mrp) || mrp < price || !Number.isInteger(stock) || stock < 0) return { ok: false, message: "Complete the product fields with valid values." };
    await items.createProduct({ name, description, category: category as "Blended Masala", price, mrp, image, badge, stock });
    return { ok: true, message: "Product added to the catalogue." };
  }

  if (intent === "order-status") {
    const id = Number(form.get("id"));
    const status = String(form.get("orderStatus"));
    const allowedOrderStatuses = ["Pending", "Packed", "Dispatched", "Delivered"] as const;
    if (Number.isInteger(id) && (allowedOrderStatuses as readonly string[]).includes(status)) await items.updateOrderStatus(id, status as typeof allowedOrderStatuses[number]);
    return { ok: true, message: "Order status updated." };
  }

  if (intent === "approve-order" || intent === "reject-order") {
    const id = Number(form.get("id"));
    if (!Number.isInteger(id) || id < 1) return { ok: false, message: "Invalid order." };
    try {
      if (intent === "approve-order") {
        const order = await items.approveOrder(id);
        try {
          await sendApprovedOrderReceipt(env, order);
          await items.logNotification("EMAIL_SENT", `Approval receipt sent for order #${id}`, id, {});
        } catch (notificationError) {
          const message = notificationError instanceof Error ? notificationError.message : String(notificationError);
          try {
            await items.logError("APPROVAL_RECEIPT_FAILED", message, { orderId: id });
            await items.logNotification("EMAIL_FAILED", message, id, {});
          } catch (loggingError) {
            console.error(JSON.stringify({ code: "APPROVAL_NOTIFICATION_LOGGING_FAILED", message: loggingError instanceof Error ? loggingError.message : String(loggingError), orderId: id }));
          }
        }
        return { ok: true, message: `Order #${id} approved. Receipt delivery was attempted.` };
      }
      await items.rejectOrder(id);
      return { ok: true, message: `Order #${id} rejected and inventory restored.` };
    } catch (error) {
      try { await items.logError("ADMIN_ORDER_ACTION_FAILED", error instanceof Error ? error.message : String(error), { intent, orderId: id }); } catch (loggingError) { console.error(JSON.stringify({ code: "ADMIN_ERROR_LOGGING_FAILED", message: loggingError instanceof Error ? loggingError.message : String(loggingError), orderId: id })); }
      return { ok: false, message: error instanceof Error ? error.message : "The order could not be updated." };
    }
  }

  if (intent === "bulk-approve-orders") {
    if (!(await verifyAdminTotp(String(form.get("otp") ?? ""), env))) return { ok: false, message: "Bulk approvals require a configured ADMIN_TOTP_SECRET and a valid 6-digit OTP." };
    const submittedIds = form.getAll("orderId").map((value) => Number(value)).filter((id) => Number.isInteger(id) && id > 0);
    const ids = form.get("bulk") === "all" ? (await items.listPendingApprovals()).map((order) => order.id) : submittedIds;
    if (!ids.length) return { ok: true, message: "There are no pending approvals." };
    try {
      const approved = await items.bulkApproveOrders([...new Set(ids)]);
      let receiptFailures = 0;
      for (const order of approved) {
        try {
          await sendApprovedOrderReceipt(env, order);
          await items.logNotification("EMAIL_SENT", `Approval receipt sent for order #${order.id}`, order.id, { bulk: true });
        } catch (notificationError) {
          receiptFailures += 1;
          const message = notificationError instanceof Error ? notificationError.message : String(notificationError);
          try {
            await items.logError("APPROVAL_RECEIPT_FAILED", message, { orderId: order.id, bulk: true });
            await items.logNotification("EMAIL_FAILED", message, order.id, { bulk: true });
          } catch (loggingError) {
            console.error(JSON.stringify({ code: "APPROVAL_NOTIFICATION_LOGGING_FAILED", message: loggingError instanceof Error ? loggingError.message : String(loggingError), orderId: order.id }));
          }
        }
      }
      return { ok: true, message: `${approved.length} pending order${approved.length === 1 ? "" : "s"} approved.${receiptFailures ? ` ${receiptFailures} receipt(s) need attention in System health.` : ""}` };
    } catch (error) {
      try { await items.logError("BULK_APPROVAL_FAILED", error instanceof Error ? error.message : String(error), { count: ids.length }); } catch (loggingError) { console.error(JSON.stringify({ code: "BULK_ERROR_LOGGING_FAILED", message: loggingError instanceof Error ? loggingError.message : String(loggingError) })); }
      return { ok: false, message: error instanceof Error ? error.message : "Bulk approval could not be completed." };
    }
  }

  if (intent === "settings") {
    const threshold = Number(form.get("lowStockThreshold"));
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 1_000_000) return { ok: false, message: "Low-stock threshold must be a whole number." };
    await items.updateSettings({ storeName: String(form.get("storeName") ?? "Cool Masala").trim().slice(0, 80), supportPhone: String(form.get("supportPhone") ?? "").trim().slice(0, 30), lowStockThreshold: threshold, announcement: String(form.get("announcement") ?? "").trim().slice(0, 160) });
    return { ok: true, message: "Store settings saved." };
  }

  return { ok: false, message: "Unknown admin action." };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Cool Masala Admin" }, { name: "robots", content: "noindex, nofollow" }];
}

const money = (value: number) => `₹${Number(value).toLocaleString("en-IN")}`;

export default function Admin() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const saving = navigation.state !== "idle";

  if (!data.authenticated) {
    return <main className="flex min-h-svh items-center justify-center bg-[#f1f3f6] px-4 py-10"><div className="w-full max-w-md overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,.12)]"><div className="bg-[#172b6b] px-7 py-8 text-white"><Link to="/" className="font-display text-xl font-bold italic">cool<span className="text-[#ffe500]">.</span>masala</Link><div className="mt-7 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-white/10"><LockKeyhole className="size-5" /></span><div><h1 className="text-xl font-semibold">Admin control room</h1><p className="mt-1 text-xs text-white/70">Inventory, orders and store settings</p></div></div></div><div className="px-7 py-7"><div className="mb-5 border border-[#d7e3fc] bg-[#f5f8ff] p-4 text-sm leading-6 text-[#475569]"><div className="flex gap-2 font-semibold text-[#2874f0]"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> Protected admin access</div><p className="mt-2">Sessions use an HttpOnly, Secure, SameSite cookie and expire 15 minutes after sign-in. This URL is not publicised, but the secret URL itself is not a security control.</p></div>{data.setupRequired && <div className="mb-5 border border-[#f0c36d] bg-[#fff8e7] p-4 text-sm leading-6 text-[#7a5613]"><p className="font-semibold">Secure setup required</p><p className="mt-1">Configure the server secret <code className="rounded bg-[#fff0c7] px-1">ADMIN_ACCESS_KEY</code> before this panel can be opened. Optional TOTP 2FA can be enabled with <code className="rounded bg-[#fff0c7] px-1">ADMIN_TOTP_SECRET</code>.</p></div>}<Form method="post" className="space-y-4"><input type="hidden" name="intent" value="login" /><label className="block text-sm font-semibold">Admin access key<Input name="accessKey" type="password" autoComplete="current-password" required className="mt-2 h-11 rounded-sm" disabled={data.setupRequired} /></label>{data.twoFactorConfigured && <label className="block text-sm font-semibold">Authenticator code<Input name="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required className="mt-2 h-11 rounded-sm" /></label>}{actionData && !actionData.ok && <p className="text-sm font-medium text-[#d32f2f]">{actionData.message}</p>}<Button type="submit" disabled={data.setupRequired || saving} className="h-11 w-full rounded-sm bg-[#2874f0] font-semibold text-white hover:bg-[#1d5fc4]">{saving ? "Checking…" : "Open admin panel"}</Button></Form><Link to="/" className="mt-5 flex items-center justify-center gap-1 text-sm font-semibold text-[#2874f0]">Back to storefront <ChevronRight className="size-4" /></Link></div></div></main>;
  }

  const { dashboard, products, pendingApprovals, orders, expenses, settings } = data;
  return <div className="min-h-svh bg-[#f1f3f6] text-[#212121]"><header className="sticky top-0 z-20 bg-[#172b6b] text-white shadow-md"><div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-7"><Link to="/" className="font-display text-xl font-bold italic">cool<span className="text-[#ffe500]">.</span>masala <span className="ml-2 hidden text-xs font-normal not-italic text-white/70 sm:inline">admin panel</span></Link><div className="flex items-center gap-3"><Link to="/" className="hidden items-center gap-1 text-sm text-white/80 hover:text-white sm:flex"><Store className="size-4" /> View storefront</Link><Form method="post"><input type="hidden" name="intent" value="logout" /><Button type="submit" variant="ghost" className="gap-2 rounded-sm text-white hover:bg-white/10"><LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span></Button></Form></div></div></header><div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row"><aside className="hidden w-60 shrink-0 border-r border-[#e0e0e0] bg-white lg:block"><nav className="sticky top-16 space-y-1 p-4"><a href="#dashboard" className="flex items-center gap-3 bg-[#e8f0fe] px-4 py-3 text-sm font-semibold text-[#2874f0]"><BarChart3 className="size-4" /> Dashboard</a><a href="#inventory" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#555] hover:bg-[#f1f3f6]"><Box className="size-4" /> Products & inventory</a><a href="#orders" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#555] hover:bg-[#f1f3f6]"><ClipboardList className="size-4" /> Orders</a><a href="#pending-approvals" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#555] hover:bg-[#f1f3f6]"><ShieldCheck className="size-4" /> Pending approvals</a><a href="#settings" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#555] hover:bg-[#f1f3f6]"><Settings className="size-4" /> Store settings</a><div className="my-5 border-t border-[#e0e0e0]" /><Link to="/admin/health" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#555] hover:bg-[#f1f3f6]"><ShieldCheck className="size-4" /> System health</Link><p className="px-4 text-[10px] font-bold uppercase tracking-wider text-[#878787]">Security</p><div className="mt-3 flex gap-2 px-4 text-xs leading-5 text-[#388e3c]"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /> Session protection active</div></nav></aside><main className="min-w-0 flex-1 px-4 py-5 sm:px-7 sm:py-7"><div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#2874f0]">Good to see you</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Store overview</h1><p className="mt-1 text-sm text-[#878787]">One simple place to run your masala store.</p></div><Badge className="w-fit rounded-sm border-0 bg-[#e8f0fe] px-3 py-2 text-[#2874f0] hover:bg-[#e8f0fe]"><ShieldCheck className="mr-1 size-3" /> Secure session · 15 min</Badge></div><nav className="mb-5 flex gap-2 overflow-x-auto lg:hidden"><a href="#dashboard" className="whitespace-nowrap rounded-sm bg-white px-3 py-2 text-xs font-semibold shadow-sm">Dashboard</a><a href="#inventory" className="whitespace-nowrap rounded-sm bg-white px-3 py-2 text-xs font-semibold shadow-sm">Inventory</a><a href="#orders" className="whitespace-nowrap rounded-sm bg-white px-3 py-2 text-xs font-semibold shadow-sm">Orders</a><a href="#pending-approvals" className="whitespace-nowrap rounded-sm bg-white px-3 py-2 text-xs font-semibold shadow-sm">Approvals</a><a href="#settings" className="whitespace-nowrap rounded-sm bg-white px-3 py-2 text-xs font-semibold shadow-sm">Settings</a></nav>{actionData?.message && <div className={`mb-5 flex items-center gap-2 border px-4 py-3 text-sm ${actionData.ok ? "border-[#b7dfba] bg-[#edf7ee] text-[#2e7d32]" : "border-[#f0b8b8] bg-[#fff1f1] text-[#c62828]"}`}>{actionData.ok ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}{actionData.message}</div>}

<section id="dashboard" className="scroll-mt-24"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Today's orders" value={dashboard.orderCount} note={`${dashboard.pendingOrders} pending / packed`} icon={ClipboardList} /><StatCard label="Paid sales" value={money(dashboard.sales)} note="From recorded paid orders" icon={IndianRupee} /><StatCard label="Total stock" value={dashboard.stockUnits} note={`${dashboard.activeProducts} active products`} icon={PackageCheck} /><StatCard label="Low stock alerts" value={dashboard.lowStockCount} note={`At or below ${settings.lowStockThreshold} units`} icon={CircleAlert} danger={dashboard.lowStockCount > 0} /></div></section>

<section id="pending-approvals" className="mt-7 scroll-mt-24 bg-white shadow-sm"><div className="flex flex-col justify-between gap-4 border-b border-[#e0e0e0] px-5 py-5 lg:flex-row lg:items-end"><div><h2 className="text-xl font-semibold">Pending approvals</h2><p className="mt-1 text-sm text-[#878787]">Approve or reject COD orders before fulfilment. Bulk approval always requires TOTP.</p></div><Form method="post" id="bulk-approval-form" className="flex flex-wrap items-end gap-2"><input type="hidden" name="intent" value="bulk-approve-orders" /><label className="text-xs font-semibold">6-digit OTP<Input name="otp" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className="mt-1 h-9 w-28 rounded-sm text-sm" /></label><Button type="submit" name="bulk" value="selected" disabled={saving || !data.twoFactorConfigured} className="h-9 rounded-sm bg-[#2874f0] px-3 text-xs text-white hover:bg-[#1d5fc4]">Approve selected</Button><Button type="submit" name="bulk" value="all" disabled={saving || !data.twoFactorConfigured} className="h-9 rounded-sm border border-[#2874f0] bg-white px-3 text-xs text-[#2874f0] hover:bg-[#e8f0fe]">Approve all pending</Button></Form></div>{!data.twoFactorConfigured && <p className="border-b border-[#f0c36d] bg-[#fff8e7] px-5 py-3 text-xs text-[#7a5613]">Bulk approval is disabled until <code>ADMIN_TOTP_SECRET</code> is configured.</p>}{pendingApprovals.length === 0 ? <div className="px-5 py-10 text-center text-sm text-[#878787]">No orders are waiting for approval.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#fafafa] text-xs uppercase tracking-wider text-[#878787]"><tr><th className="w-12 px-5 py-3">Select</th><th className="px-3 py-3">Order</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Total</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{pendingApprovals.map((order) => <tr key={order.id} className="border-t border-[#f0f0f0]"><td className="px-5 py-4"><input form="bulk-approval-form" type="checkbox" name="orderId" value={order.id} aria-label={`Select order #${order.id}`} className="size-4 accent-[#2874f0]" /></td><td className="px-3 py-4 font-semibold">#{order.id}<p className="text-xs font-normal text-[#878787]">{order.createdAt}</p></td><td className="px-3 py-4">{order.customerName}<p className="text-xs text-[#878787]">{order.phone}</p></td><td className="px-3 py-4 font-semibold">{money(order.total)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Form method="post"><input type="hidden" name="intent" value="approve-order" /><input type="hidden" name="id" value={order.id} /><Button type="submit" disabled={saving} className="h-8 rounded-sm bg-[#388e3c] px-3 text-xs text-white hover:bg-[#2e7d32]">Approve order</Button></Form><Form method="post"><input type="hidden" name="intent" value="reject-order" /><input type="hidden" name="id" value={order.id} /><Button type="submit" disabled={saving} variant="outline" className="h-8 rounded-sm border-[#d32f2f] px-3 text-xs text-[#d32f2f] hover:bg-[#fff1f1]">Reject / cancel</Button></Form></div></td></tr>)}</tbody></table></div>}</section>

<section id="inventory" className="mt-7 scroll-mt-24 bg-white shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-[#e0e0e0] px-5 py-5 sm:flex-row sm:items-center"><div><h2 className="text-xl font-semibold">Products & inventory</h2><p className="mt-1 text-sm text-[#878787]">Edit prices, pack details, visibility and stock. Zero stock automatically hides the buy action.</p></div><a href="#add-product" className="flex w-fit items-center gap-1 text-sm font-semibold text-[#2874f0]">Add new product <Plus className="size-4" /></a></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#fafafa] text-xs uppercase tracking-wider text-[#878787]"><tr><th className="px-5 py-3 font-semibold">Product</th><th className="px-3 py-3 font-semibold">Price / MRP</th><th className="px-3 py-3 font-semibold">Stock</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Save</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-[#f0f0f0] align-top"><td className="px-5 py-4"><div className="flex w-64 gap-3"><img className="size-14 shrink-0 object-cover" src={product.image} alt="" /><div className="min-w-0"><Input form={`product-${product.id}`} name="name" defaultValue={product.name} aria-label={`Name for ${product.name}`} className="h-8 w-full rounded-sm px-2 text-sm font-semibold" /><p className="mt-1 truncate text-xs text-[#878787]">{product.description}</p><span className="mt-2 inline-block rounded-sm bg-[#f1f3f6] px-2 py-1 text-[10px] text-[#555]">{product.category}</span></div></div></td><td className="px-3 py-4"><Form method="post" id={`product-${product.id}`} className="flex gap-2"><input type="hidden" name="intent" value="update-product" /><input type="hidden" name="id" value={product.id} /><input type="hidden" name="description" value={product.description} /><input type="hidden" name="image" value={product.image} /><input type="hidden" name="badge" value={product.badge ?? ""} /><div><label className="text-[10px] text-[#878787]">Sale</label><Input name="price" type="number" min="0" step="1" defaultValue={product.price} className="mt-1 h-9 w-20 rounded-sm text-xs" /></div><div><label className="text-[10px] text-[#878787]">MRP</label><Input name="mrp" type="number" min="0" step="1" defaultValue={product.mrp} className="mt-1 h-9 w-20 rounded-sm text-xs" /></div></Form></td><td className="px-3 py-4"><Input form={`product-${product.id}`} name="stock" type="number" min="0" max="1000000" defaultValue={product.stock} className={`h-9 w-20 rounded-sm text-xs ${product.stock <= settings.lowStockThreshold ? "border-[#d32f2f] text-[#d32f2f]" : ""}`} /></td><td className="px-3 py-4"><div className="flex flex-col gap-2"><label className="flex items-center gap-2 text-xs"><input form={`product-${product.id}`} name="active" type="checkbox" defaultChecked={product.active === 1} className="size-4 accent-[#2874f0]" /> Visible in store</label>{product.stock <= settings.lowStockThreshold && <span className="flex items-center gap-1 text-xs font-semibold text-[#d32f2f]"><CircleAlert className="size-3" /> Low stock</span>}</div></td><td className="px-5 py-4 text-right"><Button form={`product-${product.id}`} type="submit" className="rounded-sm bg-[#2874f0] px-3 text-xs text-white hover:bg-[#1d5fc4]"><Save className="mr-1 size-3" /> Save</Button></td></tr>)}</tbody></table></div></section>

<section id="add-product" className="mt-7 scroll-mt-24 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Plus className="size-5 text-[#2874f0]" /><div><h2 className="text-xl font-semibold">Add a product</h2><p className="mt-1 text-sm text-[#878787]">Sell masalas and printed apparel. Every eligible t-shirt order includes a free mini masala gift.</p></div></div><Form method="post" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><input type="hidden" name="intent" value="add-product" /><label className="text-sm font-semibold">Product name<Input name="name" required placeholder="e.g. Kitchen King Masala" className="mt-1 h-10 rounded-sm" /></label><label className="text-sm font-semibold">Description / pack size<Input name="description" required placeholder="Everyday blend · 100 g" className="mt-1 h-10 rounded-sm" /></label><label className="text-sm font-semibold">Category<select name="category" className="mt-1 h-10 w-full rounded-sm border border-[#e0e0e0] bg-white px-3 text-sm font-normal"><option>Blended Masala</option><option>Whole Spices</option><option>Chilli Powders</option><option>Turmeric</option><option>Gift Packs</option><option>Printed T-Shirts</option></select></label><label className="text-sm font-semibold">Image URL<Input name="image" required type="url" placeholder="https://…" className="mt-1 h-10 rounded-sm" /></label><label className="text-sm font-semibold">Sale price<Input name="price" required type="number" min="0" step="1" placeholder="149" className="mt-1 h-10 rounded-sm" /></label><label className="text-sm font-semibold">MRP<Input name="mrp" required type="number" min="0" step="1" placeholder="179" className="mt-1 h-10 rounded-sm" /></label><label className="text-sm font-semibold">Opening stock<Input name="stock" required type="number" min="0" step="1" placeholder="50" className="mt-1 h-10 rounded-sm" /></label><label className="text-sm font-semibold">Badge (optional)<Input name="badge" placeholder="Bestseller" className="mt-1 h-10 rounded-sm" /></label><div className="md:col-span-2 xl:col-span-4"><Button type="submit" disabled={saving} className="rounded-sm bg-[#2874f0] text-white hover:bg-[#1d5fc4]"><Plus className="mr-2 size-4" /> Add product</Button></div></Form></section>

<section id="orders" className="mt-7 scroll-mt-24 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#e0e0e0] px-5 py-5"><div><h2 className="text-xl font-semibold">Orders & sales</h2><p className="mt-1 text-sm text-[#878787]">Track payment and fulfilment status in one table.</p></div><ClipboardList className="size-5 text-[#2874f0]" /></div>{orders.length === 0 ? <div className="px-5 py-12 text-center"><ClipboardList className="mx-auto size-10 text-[#c2c2c2]" /><p className="mt-3 font-semibold">No orders recorded yet</p><p className="mt-1 text-sm text-[#878787]">COD orders from the storefront appear here after customers place them.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#fafafa] text-xs uppercase tracking-wider text-[#878787]"><tr><th className="px-5 py-3">Order</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Payment</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-t border-[#f0f0f0]"><td className="px-5 py-4 font-semibold">#{order.id}</td><td className="px-3 py-4">{order.customerName}<p className="text-xs text-[#878787]">{order.phone}</p></td><td className="max-w-[240px] truncate px-3 py-4 text-[#555]">{order.items}</td><td className="px-3 py-4 font-semibold">{money(order.total)}</td><td className="px-3 py-4">{order.paymentStatus}</td><td className="px-5 py-4"><Form method="post"><input type="hidden" name="intent" value="order-status" /><input type="hidden" name="id" value={order.id} /><select name="orderStatus" defaultValue={order.orderStatus} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="h-9 rounded-sm border border-[#e0e0e0] bg-white px-2 text-xs"><option>PENDING_ADMIN_APPROVAL</option><option>APPROVED</option><option>REJECTED</option><option>CANCELLED</option><option>Pending</option><option>Packed</option><option>Dispatched</option><option>Delivered</option></select></Form></td></tr>)}</tbody></table></div>}</section>

<section id="settings" className="mt-7 scroll-mt-24 grid gap-7 lg:grid-cols-[1.15fr_.85fr]"><div className="bg-white p-5 shadow-sm"><div className="mb-5 flex items-center gap-2"><Settings className="size-5 text-[#2874f0]" /><div><h2 className="text-xl font-semibold">Store settings</h2><p className="mt-1 text-sm text-[#878787]">Change the storefront basics without touching code.</p></div></div><Form method="post" className="space-y-4"><input type="hidden" name="intent" value="settings" /><label className="block text-sm font-semibold">Store name<Input name="storeName" defaultValue={settings.storeName} className="mt-1 h-10 rounded-sm" /></label><label className="block text-sm font-semibold">Announcement bar text<Input name="announcement" defaultValue={settings.announcement} className="mt-1 h-10 rounded-sm" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Support phone<Input name="supportPhone" defaultValue={settings.supportPhone} placeholder="+91 …" className="mt-1 h-10 rounded-sm" /></label><label className="block text-sm font-semibold">Low-stock alert at<Input name="lowStockThreshold" type="number" min="0" defaultValue={settings.lowStockThreshold} className="mt-1 h-10 rounded-sm" /></label></div><Button type="submit" disabled={saving} className="rounded-sm bg-[#2874f0] text-white hover:bg-[#1d5fc4]"><Save className="mr-2 size-4" /> Save settings</Button></Form></div><div className="bg-white p-5 shadow-sm"><div className="mb-5 flex items-center gap-2"><ShieldCheck className="size-5 text-[#388e3c]" /><div><h2 className="text-xl font-semibold">Security checklist</h2><p className="mt-1 text-sm text-[#878787]">Current protections in this panel.</p></div></div><ul className="space-y-4 text-sm"><SecurityRow done label="HttpOnly + Secure session cookie" detail="JavaScript cannot read the admin session." /><SecurityRow done label="SameSite + origin validation" detail="Cross-site mutation requests are blocked." /><SecurityRow done label="15-minute session expiry" detail="Sign in again after the session expires." /><SecurityRow done={data.twoFactorConfigured} label="Authenticator 2FA" detail={data.twoFactorConfigured ? "TOTP verification is enabled." : "Configure ADMIN_TOTP_SECRET to enable it."} /><SecurityRow done label="Noindex admin route" detail="Search engines are told not to index this panel." /></ul><div className="mt-5 border-t border-[#e0e0e0] pt-4 text-xs leading-5 text-[#878787]">Security is a strong foundation, not a promise of absolute security. Before real payments or customer data go live, add Cloudflare Access/WAF, managed payment-provider webhooks, backups, audit logs, secret rotation, and an independent security review.</div></div></section>

<section className="mt-7 grid gap-3 pb-5 sm:grid-cols-3"><MiniStat icon={Users} label="Customers" value="Captured in orders" /><MiniStat icon={IndianRupee} label="Expenses" value={expenses.length ? money(expenses.reduce((sum, expense) => sum + expense.amount, 0)) : "No expenses yet"} /><MiniStat icon={Truck} label="Fulfilment" value="Order workflow ready" /></section>
</main></div></div>;
}

function StatCard({ label, value, note, icon: Icon, danger = false }: { label: string; value: string | number; note: string; icon: typeof BarChart3; danger?: boolean }) {
  return <div className={`bg-white p-5 shadow-sm ${danger ? "border-l-4 border-[#d32f2f]" : "border-l-4 border-[#2874f0]"}`}><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-[#878787]">{label}</p><Icon className={`size-5 ${danger ? "text-[#d32f2f]" : "text-[#2874f0]"}`} /></div><p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs text-[#878787]">{note}</p></div>;
}

function SecurityRow({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return <li className="flex gap-3"><span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${done ? "bg-[#e8f5e9] text-[#388e3c]" : "bg-[#fff4e5] text-[#ef6c00]"}`}>{done ? <CheckCircle2 className="size-3" /> : <CircleAlert className="size-3" />}</span><div><p className="font-semibold">{label}</p><p className="mt-0.5 text-xs text-[#878787]">{detail}</p></div></li>;
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return <div className="flex items-center gap-3 bg-white p-4 shadow-sm"><Icon className="size-5 text-[#2874f0]" /><div><p className="text-xs text-[#878787]">{label}</p><p className="text-sm font-semibold">{value}</p></div></div>;
}
