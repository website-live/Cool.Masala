import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { useMemo, useState } from "react";
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
import Activity from "lucide-react/dist/esm/icons/activity.js";
import ArrowUpRight from "lucide-react/dist/esm/icons/arrow-up-right.js";
import Bell from "lucide-react/dist/esm/icons/bell.js";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import Command from "lucide-react/dist/esm/icons/command.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import Filter from "lucide-react/dist/esm/icons/filter.js";
import Home from "lucide-react/dist/esm/icons/home.js";
import LineChart from "lucide-react/dist/esm/icons/line-chart.js";
import Menu from "lucide-react/dist/esm/icons/menu.js";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import Tag from "lucide-react/dist/esm/icons/tag.js";
import X from "lucide-react/dist/esm/icons/x.js";

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
  const [section, setSection] = useState("dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productStatus, setProductStatus] = useState("all");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!data.authenticated) {
    return <main className="flex min-h-svh items-center justify-center bg-[#f6f6f7] px-4 py-10"><div className="w-full max-w-md rounded-2xl border border-[#e1e1e3] bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,.08)]"><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[#1f2937] text-lg font-bold text-white">cm</div><div><p className="text-lg font-semibold tracking-[-0.03em] text-[#202223]">Cool Masala Admin</p><p className="text-xs text-[#6d7175]">A calm control room for your store</p></div></div><div className="mt-8 rounded-xl border border-[#dfe3e8] bg-[#f6f6f7] p-4 text-sm leading-6 text-[#4d5156]"><div className="flex items-center gap-2 font-semibold text-[#202223]"><ShieldCheck className="size-4 text-[#008060]" /> Protected admin access</div><p className="mt-2">Your secure session expires after 15 minutes. Sign in with the store access key and authenticator code.</p></div>{data.setupRequired && <div className="mt-4 rounded-xl border border-[#f1c232] bg-[#fff8e1] p-4 text-sm leading-6 text-[#6a4b00]"><p className="font-semibold">Secure setup required</p><p className="mt-1">Configure <code>ADMIN_ACCESS_KEY</code> before opening this panel.</p></div>}<Form method="post" className="mt-6 space-y-4"><input type="hidden" name="intent" value="login" /><label className="block text-sm font-semibold text-[#202223]">Admin access key<Input name="accessKey" type="password" autoComplete="current-password" required className="mt-2 h-11 rounded-xl" disabled={data.setupRequired} /></label>{data.twoFactorConfigured && <label className="block text-sm font-semibold text-[#202223]">Authenticator code<Input name="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required className="mt-2 h-11 rounded-xl" /></label>}{actionData && !actionData.ok && <p className="text-sm font-medium text-[#d72c0d]">{actionData.message}</p>}<Button type="submit" disabled={data.setupRequired || saving} className="h-11 w-full rounded-xl bg-[#008060] font-semibold text-white hover:bg-[#006e52]">{saving ? "Checking…" : "Open admin panel"}</Button></Form><Link to="/" className="mt-5 flex items-center justify-center gap-1 text-sm font-semibold text-[#006e52]">Back to storefront <ChevronRight className="size-4" /></Link></div></main>;
  }

  const products = data.products;
  const orders = data.orders;
  const lowStockProducts = products.filter((product) => product.active === 1 && product.stock <= data.settings.lowStockThreshold);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = !productQuery.trim() || [product.name, product.description, product.category].join(" ").toLowerCase().includes(productQuery.toLowerCase());
    const matchesStatus = productStatus === "all" || (productStatus === "active" ? product.active === 1 : product.active === 0);
    return matchesQuery && matchesStatus;
  }), [products, productQuery, productStatus]);
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesQuery = !orderQuery.trim() || [String(order.id), order.customerName, order.phone, order.items].join(" ").toLowerCase().includes(orderQuery.toLowerCase());
    const status = String(order.orderStatus);
    const matchesFilter = orderFilter === "all" || (orderFilter === "pending" && status === "PENDING_ADMIN_APPROVAL") || (orderFilter === "unfulfilled" && ["APPROVED", "Pending", "Packed"].includes(status)) || (orderFilter === "fulfilled" && status === "Delivered") || (orderFilter === "cancelled" && ["CANCELLED", "REJECTED"].includes(status));
    return matchesQuery && matchesFilter;
  }), [orders, orderQuery, orderFilter]);
  const totalOrderValue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const averageOrderValue = orders.length ? totalOrderValue / orders.length : 0;
  const chartValues = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - index));
      const key = day.toISOString().slice(0, 10);
      return { label: day.toLocaleDateString("en-IN", { weekday: "short" }), value: orders.filter((order) => String(order.createdAt).slice(0, 10) === key).reduce((sum, order) => sum + Number(order.total || 0), 0) };
    });
  }, [orders]);
  const maxChartValue = Math.max(1, ...chartValues.map((item) => item.value));
  const navItems = [
    { id: "dashboard", label: "Home", icon: Home },
    { id: "orders", label: "Orders", icon: ClipboardList, count: data.pendingApprovals.length },
    { id: "products", label: "Products", icon: Box },
    { id: "customers", label: "Customers", icon: Users, planned: true },
    { id: "analytics", label: "Analytics", icon: LineChart, planned: true },
    { id: "discounts", label: "Discounts", icon: Tag, planned: true },
  ];
  const goTo = (id: string) => { setSection(id); setMobileNavOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const globalSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const value = globalSearch.toLowerCase(); goTo(value.includes("order") ? "orders" : value.includes("product") || value.includes("stock") ? "products" : "dashboard"); };

  return <div className="min-h-svh bg-[#f6f6f7] text-[#202223]">
    <header className="sticky top-0 z-40 border-b border-[#303030] bg-[#1a1a1a] text-white shadow-sm"><div className="flex h-16 items-center gap-3 px-4 lg:px-6"><button type="button" onClick={() => setMobileNavOpen(!mobileNavOpen)} className="rounded-lg p-2 hover:bg-white/10 lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></button><Link to="/" className="flex shrink-0 items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-[#95bf47] text-sm font-black text-white">cm</span><span className="hidden text-sm font-semibold tracking-[-0.02em] sm:block">cool.masala</span></Link><span className="hidden rounded-md border border-white/20 px-2 py-1 text-[11px] text-white/70 xl:block">Staging control room</span><form onSubmit={globalSearchSubmit} className="mx-auto flex w-full max-w-xl items-center rounded-lg border border-white/15 bg-white/10 px-3 focus-within:border-white/40"><Search className="size-4 shrink-0 text-white/60" /><input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Search products, orders, settings" className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/50" /><span className="hidden items-center gap-1 rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/50 sm:flex"><Command className="size-3" /> K</span></form><Link to="/" target="_blank" className="hidden items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10 md:flex">Live store <ExternalLink className="size-3" /></Link><button type="button" className="relative rounded-lg p-2 hover:bg-white/10" aria-label="Notifications"><Bell className="size-5 text-white/80" /><span className="absolute right-1 top-1 grid size-3.5 place-items-center rounded-full bg-[#e51c23] text-[9px] font-bold">{Math.min(9, data.pendingApprovals.length)}</span></button><button type="button" className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-white/10"><span className="grid size-8 place-items-center rounded-lg bg-[#aee9d1] text-xs font-bold text-[#005c46]">RM</span><ChevronDown className="hidden size-4 text-white/60 sm:block" /></button></div></header>
    <div className="flex">
      <aside className={(mobileNavOpen ? "fixed inset-y-16 left-0 z-30 flex " : "hidden ") + "w-64 shrink-0 flex-col border-r border-[#e1e3e5] bg-white lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)]"}><div className="flex-1 space-y-1 overflow-y-auto p-4"><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#8c9196]">Store management</p>{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => goTo(item.id)} className={(section === item.id ? "bg-[#e3f1ed] text-[#006e52] " : "text-[#4d5156] hover:bg-[#f6f6f7] ") + "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition"}><Icon className="size-4" /><span className="flex-1 text-left">{item.label}</span>{item.planned && <span className="rounded bg-[#f1f2f3] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#8c9196]">Soon</span>}{item.count ? <span className="rounded-full bg-[#f1c232] px-2 py-0.5 text-[10px] font-bold text-[#202223]">{item.count}</span> : null}</button>; })}<div className="my-5 border-t border-[#e1e3e5]" /><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#8c9196]">Configuration</p><button type="button" onClick={() => goTo("settings")} className={(section === "settings" ? "bg-[#e3f1ed] text-[#006e52] " : "text-[#4d5156] hover:bg-[#f6f6f7] ") + "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold"}><Settings className="size-4" /> <span className="flex-1 text-left">Settings</span></button><Link to="/admin/health" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#4d5156] hover:bg-[#f6f6f7]"><ShieldCheck className="size-4" /> System health</Link></div><div className="border-t border-[#e1e3e5] p-4"><div className="flex items-center gap-3 rounded-lg bg-[#f6f6f7] p-3"><span className="grid size-9 place-items-center rounded-full bg-[#d9f2e7] text-xs font-bold text-[#006e52]">RM</span><div className="min-w-0"><p className="truncate text-xs font-semibold">Store admin</p><p className="text-[10px] text-[#6d7175]">Secure session · 15 min</p></div><Form method="post" className="ml-auto"><input type="hidden" name="intent" value="logout" /><button type="submit" className="rounded p-1 text-[#6d7175] hover:bg-white" aria-label="Sign out"><LogOut className="size-4" /></button></Form></div></div></aside>
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#6d7175]"><span>Home</span><ChevronRight className="size-3" /><span className="text-[#202223]">{section === "dashboard" ? "Overview" : section.charAt(0).toUpperCase() + section.slice(1)}</span></div><h1 className="text-3xl font-bold tracking-[-0.04em]">{section === "dashboard" ? "Good morning, Rohit" : section === "products" ? "Products" : section === "orders" ? "Orders" : section === "settings" ? "Settings" : section.charAt(0).toUpperCase() + section.slice(1)}</h1><p className="mt-1 text-sm text-[#6d7175]">Run your store from one calm, focused workspace.</p></div><div className="flex flex-wrap gap-2"><Link to="/" target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-[#c9cccf] bg-white px-3 py-2 text-sm font-semibold text-[#202223] shadow-sm hover:bg-[#f6f6f7]"><Store className="size-4" /> View store</Link><button type="button" onClick={() => goTo("products")} className="inline-flex items-center gap-2 rounded-lg bg-[#008060] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#006e52]"><Plus className="size-4" /> Add product</button></div></div>
          {actionData?.message && <div className={(actionData.ok ? "border-[#a7d7c5] bg-[#e3f1ed] text-[#006e52]" : "border-[#f1b6a7] bg-[#fff4f2] text-[#d72c0d]") + " mb-6 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium"}>{actionData.ok ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}{actionData.message}</div>}
          {section === "dashboard" && <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total order value" value={money(totalOrderValue)} note="Across recorded orders" icon={IndianRupee} tone="green" /><MetricCard label="Total orders" value={orders.length} note={data.pendingApprovals.length + " need approval"} icon={ClipboardList} tone="blue" /><MetricCard label="Average order value" value={money(averageOrderValue)} note={orders.length ? "Calculated from orders" : "No orders yet"} icon={Activity} tone="purple" /><MetricCard label="Online sessions" value="Not tracked" note="Analytics module planned" icon={Users} tone="gray" /></div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.85fr]"><section className="rounded-xl border border-[#e1e3e5] bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><LineChart className="size-4 text-[#008060]" /><h2 className="font-bold">Order value trend</h2></div><p className="mt-1 text-xs text-[#6d7175]">Last 7 days from recorded order data</p></div><span className="inline-flex items-center gap-1 rounded-lg border border-[#e1e3e5] px-2.5 py-1.5 text-xs font-semibold text-[#6d7175]"><CalendarDays className="size-3.5" /> 7 days</span></div><div className="mt-8 flex h-48 items-end gap-2 sm:gap-4">{chartValues.map((item) => <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="w-full max-w-10 rounded-t-md bg-[#95bf47] transition" style={{ height: Math.max(8, Math.round((item.value / maxChartValue) * 150)) }} title={money(item.value)} /><span className="text-[10px] font-medium text-[#8c9196]">{item.label}</span></div>)}</div>{totalOrderValue === 0 && <p className="mt-3 text-xs text-[#8c9196]">No order value has been recorded yet; the chart will populate from real orders.</p>}</section><div className="space-y-6"><ActionCard title="Needs your attention" icon={CircleAlert} tone="amber"><button type="button" onClick={() => goTo("orders")} className="flex w-full items-center justify-between border-b border-[#f0f1f2] py-3 text-left"><span><span className="block text-sm font-semibold">Pending approvals</span><span className="text-xs text-[#6d7175]">COD orders waiting for review</span></span><span className="rounded-full bg-[#fff3cd] px-2 py-1 text-xs font-bold text-[#8a6116]">{data.pendingApprovals.length}</span></button><button type="button" onClick={() => goTo("products")} className="flex w-full items-center justify-between py-3 text-left"><span><span className="block text-sm font-semibold">Low stock alerts</span><span className="text-xs text-[#6d7175]">Products at or below threshold</span></span><span className="rounded-full bg-[#fff1f0] px-2 py-1 text-xs font-bold text-[#d72c0d]">{lowStockProducts.length}</span></button></ActionCard><ActionCard title="Quick links" icon={ArrowUpRight} tone="blue"><button type="button" onClick={() => goTo("products")} className="flex w-full items-center justify-between border-b border-[#f0f1f2] py-3 text-left text-sm font-semibold">Manage catalog <ChevronRight className="size-4 text-[#8c9196]" /></button><button type="button" onClick={() => goTo("settings")} className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold">Store settings <ChevronRight className="size-4 text-[#8c9196]" /></button></ActionCard></div></div>
            <section className="mt-6 rounded-xl border border-[#e1e3e5] bg-white shadow-sm"><SectionHeader title="Recent orders" subtitle="A quick view of the latest activity" actionLabel="View all orders" onAction={() => goTo("orders")} /><OrderTable orders={orders.slice(0, 6)} saving={saving} compact /></section>
          </>}
          {section === "products" && <><section className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm"><SectionHeader title="Products" subtitle={products.length + " products in your catalog"} actionLabel="Add product" onAction={() => document.getElementById("add-product")?.scrollIntoView({ behavior: "smooth" })} /><div className="flex flex-col gap-3 border-b border-[#e1e3e5] p-4 md:flex-row"><div className="flex flex-1 items-center rounded-lg border border-[#c9cccf] px-3"><Search className="size-4 text-[#8c9196]" /><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Search products" className="h-10 w-full bg-transparent px-2 text-sm outline-none" /></div><div className="flex items-center gap-2 rounded-lg border border-[#c9cccf] px-3"><Filter className="size-4 text-[#8c9196]" /><select value={productStatus} onChange={(event) => setProductStatus(event.target.value)} className="h-10 bg-transparent text-sm font-semibold outline-none"><option value="all">All products</option><option value="active">Active</option><option value="draft">Hidden / draft</option></select></div></div><ProductTable products={filteredProducts} saving={saving} /></section><section id="add-product" className="mt-6 rounded-xl border border-[#e1e3e5] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-lg bg-[#e3f1ed] text-[#008060]"><Plus className="size-5" /></div><div><h2 className="font-bold">Add a new product</h2><p className="text-xs text-[#6d7175]">Create a catalog item and make it visible in your storefront.</p></div></div><Form method="post" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><input type="hidden" name="intent" value="add-product" /><label className="text-sm font-semibold">Product name<Input name="name" required placeholder="e.g. Kitchen King Masala" className="mt-1 h-10 rounded-lg" /></label><label className="text-sm font-semibold">Description / pack size<Input name="description" required placeholder="Everyday blend · 100 g" className="mt-1 h-10 rounded-lg" /></label><label className="text-sm font-semibold">Category<select name="category" className="mt-1 h-10 w-full rounded-lg border border-[#c9cccf] bg-white px-3 text-sm font-normal"><option>Blended Masala</option><option>Whole Spices</option><option>Chilli Powders</option><option>Turmeric</option><option>Gift Packs</option><option>Printed T-Shirts</option></select></label><label className="text-sm font-semibold">Image URL<Input name="image" required type="url" placeholder="https://…" className="mt-1 h-10 rounded-lg" /></label><label className="text-sm font-semibold">Sale price<Input name="price" required type="number" min="0" step="1" placeholder="149" className="mt-1 h-10 rounded-lg" /></label><label className="text-sm font-semibold">Compare-at price / MRP<Input name="mrp" required type="number" min="0" step="1" placeholder="179" className="mt-1 h-10 rounded-lg" /></label><label className="text-sm font-semibold">Opening stock<Input name="stock" required type="number" min="0" step="1" placeholder="50" className="mt-1 h-10 rounded-lg" /></label><label className="text-sm font-semibold">Badge (optional)<Input name="badge" placeholder="Bestseller" className="mt-1 h-10 rounded-lg" /></label><div className="md:col-span-2 xl:col-span-4"><Button type="submit" disabled={saving} className="rounded-lg bg-[#008060] text-white hover:bg-[#006e52]"><Plus className="mr-2 size-4" /> Add product</Button></div></Form></section></>}
          {section === "orders" && <><section className="rounded-xl border border-[#e1e3e5] bg-white shadow-sm"><SectionHeader title="Orders" subtitle={orders.length + " recorded orders"} actionLabel="Export" onAction={() => window.print()} /><div className="flex gap-1 overflow-x-auto border-b border-[#e1e3e5] px-4 pt-3">{[{ id: "all", label: "All" }, { id: "pending", label: "Pending approval" }, { id: "unfulfilled", label: "Unfulfilled" }, { id: "fulfilled", label: "Fulfilled" }, { id: "cancelled", label: "Cancelled" }].map((tab) => <button type="button" key={tab.id} onClick={() => setOrderFilter(tab.id)} className={(orderFilter === tab.id ? "border-b-2 border-[#008060] text-[#006e52]" : "text-[#6d7175]") + " whitespace-nowrap px-3 py-3 text-sm font-semibold"}>{tab.label}</button>)}</div><div className="flex items-center border-b border-[#e1e3e5] p-4"><div className="flex flex-1 items-center rounded-lg border border-[#c9cccf] px-3"><Search className="size-4 text-[#8c9196]" /><input value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} placeholder="Search orders or customers" className="h-10 w-full bg-transparent px-2 text-sm outline-none" /></div><button type="button" className="ml-3 rounded-lg border border-[#c9cccf] p-2.5" aria-label="More order actions"><MoreHorizontal className="size-4" /></button></div><OrderTable orders={filteredOrders} saving={saving} /></section><section className="mt-6 rounded-xl border border-[#e1e3e5] bg-white shadow-sm"><SectionHeader title="Pending approvals" subtitle="COD orders must be approved before fulfilment" /><div className="p-4">{data.pendingApprovals.length === 0 ? <EmptyState icon={CheckCircle2} title="No pending approvals" text="New COD orders will appear here for review." /> : <div className="space-y-3">{data.pendingApprovals.map((order) => <div key={order.id} className="flex flex-col gap-3 rounded-lg border border-[#f0d98c] bg-[#fffaf0] p-4 md:flex-row md:items-center"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-bold">Order #{order.id}</span><StatusPill status="PENDING_ADMIN_APPROVAL" /></div><p className="mt-1 text-sm text-[#4d5156]">{order.customerName} · {order.phone} · {money(order.total)}</p><p className="mt-1 text-xs text-[#6d7175]">{order.items}</p></div><div className="flex gap-2"><Form method="post"><input type="hidden" name="intent" value="approve-order" /><input type="hidden" name="id" value={order.id} /><Button type="submit" disabled={saving} className="rounded-lg bg-[#008060] text-xs text-white hover:bg-[#006e52]">Approve</Button></Form><Form method="post"><input type="hidden" name="intent" value="reject-order" /><input type="hidden" name="id" value={order.id} /><Button type="submit" disabled={saving} variant="outline" className="rounded-lg border-[#d72c0d] text-xs text-[#d72c0d]">Reject</Button></Form></div></div>)}</div>}</div></section></>}
          {section === "settings" && <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><div className="rounded-xl border border-[#e1e3e5] bg-white p-5 shadow-sm"><SectionHeader title="Store settings" subtitle="Keep the storefront basics up to date" /><Form method="post" className="space-y-5"><input type="hidden" name="intent" value="settings" /><label className="block text-sm font-semibold">Store name<Input name="storeName" defaultValue={data.settings.storeName} className="mt-2 h-11 rounded-lg" /></label><label className="block text-sm font-semibold">Announcement bar text<Input name="announcement" defaultValue={data.settings.announcement} className="mt-2 h-11 rounded-lg" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Support phone<Input name="supportPhone" defaultValue={data.settings.supportPhone} placeholder="+91 …" className="mt-2 h-11 rounded-lg" /></label><label className="block text-sm font-semibold">Low-stock alert at<Input name="lowStockThreshold" type="number" min="0" defaultValue={data.settings.lowStockThreshold} className="mt-2 h-11 rounded-lg" /></label></div><Button type="submit" disabled={saving} className="rounded-lg bg-[#008060] text-white hover:bg-[#006e52]"><Save className="mr-2 size-4" /> Save settings</Button></Form></div><div className="space-y-6"><ActionCard title="Security" icon={ShieldCheck} tone="green"><SecurityRow done label="Secure admin session" detail="HttpOnly, Secure and SameSite cookie" /><SecurityRow done={data.twoFactorConfigured} label="Authenticator 2FA" detail={data.twoFactorConfigured ? "TOTP verification is enabled" : "Configure ADMIN_TOTP_SECRET"} /><SecurityRow done label="Origin validation" detail="Cross-site mutations are blocked" /></ActionCard><ActionCard title="Coming next" icon={Activity} tone="gray"><RoadmapItem label="Customers" detail="Customer profiles and order history" /><RoadmapItem label="Analytics" detail="Time-series sales and conversion metrics" /><RoadmapItem label="Discounts" detail="Coupon rules and usage limits" /></ActionCard></div></section>}
          {section === "customers" && <RoadmapPage title="Customers" icon={Users} text="Customer profiles are planned next. The current data model stores customer details on orders, so this area is intentionally not showing invented customer metrics." />}
          {section === "analytics" && <RoadmapPage title="Analytics" icon={LineChart} text="The dashboard uses live order aggregates today. Time-series sessions, conversion and product analytics need a dedicated data model before they can be shown accurately." />}
          {section === "discounts" && <RoadmapPage title="Discounts" icon={Tag} text="Discount codes are not implemented yet. This placeholder keeps the navigation honest until discount rules and checkout validation are added end to end." />}
        </div>
      </main>
    </div>
  </div>;
}

type AdminProduct = { id: number; name: string; description: string; category: string; price: number; mrp: number; image: string; badge: string | null; stock: number; active: number };
type AdminOrder = { id: number; customerName: string; phone: string; email: string; address: string; items: string; subtotal: number; shippingFee: number; discount: number; total: number; paymentStatus: string; orderStatus: string; createdAt: string };
type IconComponent = typeof Home;

function MetricCard({ label, value, note, icon: Icon, tone }: { label: string; value: string | number; note: string; icon: IconComponent; tone: "green" | "blue" | "purple" | "gray" }) {
  const tones = { green: "bg-[#e3f1ed] text-[#008060]", blue: "bg-[#eaf4ff] text-[#006fbb]", purple: "bg-[#f3eaff] text-[#7b61a8]", gray: "bg-[#f1f2f3] text-[#6d7175]" };
  return <div className="rounded-xl border border-[#e1e3e5] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#6d7175]">{label}</p><p className="mt-2 text-2xl font-bold tracking-[-0.04em]">{value}</p></div><span className={tones[tone] + " grid size-9 place-items-center rounded-lg"}><Icon className="size-4" /></span></div><p className="mt-3 text-xs text-[#8c9196]">{note}</p></div>;
}

function ActionCard({ title, icon: Icon, tone, children }: { title: string; icon: IconComponent; tone: "green" | "blue" | "amber" | "gray"; children: React.ReactNode }) {
  const tones = { green: "text-[#008060] bg-[#e3f1ed]", blue: "text-[#006fbb] bg-[#eaf4ff]", amber: "text-[#8a6116] bg-[#fff3cd]", gray: "text-[#6d7175] bg-[#f1f2f3]" };
  return <section className="rounded-xl border border-[#e1e3e5] bg-white p-5 shadow-sm"><div className="mb-2 flex items-center gap-2"><span className={tones[tone] + " grid size-8 place-items-center rounded-lg"}><Icon className="size-4" /></span><h2 className="font-bold">{title}</h2></div>{children}</section>;
}

function SectionHeader({ title, subtitle, actionLabel, onAction }: { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="flex flex-col justify-between gap-3 border-b border-[#e1e3e5] p-5 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold">{title}</h2>{subtitle && <p className="mt-1 text-xs text-[#6d7175]">{subtitle}</p>}</div>{actionLabel && <button type="button" onClick={onAction} className="inline-flex items-center gap-2 self-start rounded-lg border border-[#c9cccf] bg-white px-3 py-2 text-xs font-semibold shadow-sm hover:bg-[#f6f6f7]">{actionLabel === "Export" ? <ArrowUpRight className="size-3.5" /> : <Plus className="size-3.5" />}{actionLabel}</button>}</div>;
}

function ProductTable({ products, saving }: { products: AdminProduct[]; saving: boolean }) {
  if (!products.length) return <div className="p-8"><EmptyState icon={Box} title="No products match" text="Try a different search or filter." /></div>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-[#fafbfb] text-[11px] uppercase tracking-wider text-[#6d7175]"><tr><th className="px-5 py-3">Product</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">Inventory</th><th className="px-5 py-3 text-right">Save</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-[#f0f1f2] align-top"><td className="px-5 py-4"><div className="flex min-w-[300px] gap-3"><img src={product.image} alt="" className="size-12 rounded-lg object-cover" /><div><p className="font-semibold">{product.name}</p><p className="mt-1 text-xs text-[#6d7175]">{product.category} · {product.description}</p>{product.badge && <span className="mt-2 inline-flex rounded bg-[#f1f2f3] px-2 py-1 text-[10px] font-semibold text-[#6d7175]">{product.badge}</span>}</div></div></td><td className="px-3 py-4"><span className={(product.active ? "bg-[#e3f1ed] text-[#006e52]" : "bg-[#f1f2f3] text-[#6d7175]") + " inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold"}>{product.active ? "Active" : "Hidden"}</span></td><td className="px-3 py-4"><p className="font-semibold">{money(product.price)}</p><p className="text-xs text-[#8c9196]">MRP {money(product.mrp)}</p></td><td className="px-3 py-4"><span className={(product.stock <= 10 ? "text-[#d72c0d]" : "text-[#202223]") + " font-semibold"}>{product.stock} units</span><p className="text-xs text-[#8c9196]">{product.stock <= 10 ? "Low stock" : "In stock"}</p></td><td className="px-5 py-4"><Form method="post" id={"product-" + product.id} className="flex justify-end gap-2"><input type="hidden" name="intent" value="update-product" /><input type="hidden" name="id" value={product.id} /><input type="hidden" name="description" value={product.description} /><input type="hidden" name="image" value={product.image} /><input type="hidden" name="badge" value={product.badge || ""} /><input type="hidden" name="name" value={product.name} /><input type="hidden" name="price" value={product.price} /><input type="hidden" name="mrp" value={product.mrp} /><input type="hidden" name="stock" value={product.stock} /><input type="hidden" name="active" value={product.active ? "on" : ""} /><button type="submit" disabled={saving} className="rounded-lg border border-[#c9cccf] px-3 py-2 text-xs font-semibold hover:bg-[#f6f6f7]">{saving ? "Saving…" : "Quick save"}</button></Form></td></tr>)}</tbody></table></div>;
}

function OrderTable({ orders, saving, compact = false }: { orders: AdminOrder[]; saving: boolean; compact?: boolean }) {
  if (!orders.length) return <div className="p-8"><EmptyState icon={ClipboardList} title="No orders found" text="Orders will appear here after customers place them." /></div>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#fafbfb] text-[11px] uppercase tracking-wider text-[#6d7175]"><tr><th className="px-5 py-3">Order</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-t border-[#f0f1f2] align-top"><td className="px-5 py-4"><p className="font-bold">#{order.id}</p><p className="text-xs text-[#8c9196]">{order.createdAt}</p></td><td className="px-3 py-4"><p className="font-semibold">{order.customerName}</p><p className="text-xs text-[#6d7175]">{order.phone}</p>{!compact && <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-[#006e52]">View details</summary><div className="mt-2 max-w-xs space-y-1 text-[#6d7175]"><p>{order.items}</p><p>{order.address || "No address recorded"}</p><p>Subtotal {money(order.subtotal)} · Delivery {money(order.shippingFee)} · Total {money(order.total)}</p></div></details>}</td><td className="px-3 py-4 font-semibold">{money(order.total)}</td><td className="px-3 py-4"><StatusPill status={order.paymentStatus} /></td><td className="px-3 py-4"><StatusPill status={order.orderStatus} /></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2">{order.orderStatus === "PENDING_ADMIN_APPROVAL" ? <><Form method="post"><input type="hidden" name="intent" value="approve-order" /><input type="hidden" name="id" value={order.id} /><button type="submit" disabled={saving} className="rounded-lg bg-[#008060] px-3 py-2 text-xs font-semibold text-white hover:bg-[#006e52]">Approve</button></Form><Form method="post"><input type="hidden" name="intent" value="reject-order" /><input type="hidden" name="id" value={order.id} /><button type="submit" disabled={saving} className="rounded-lg border border-[#d72c0d] px-3 py-2 text-xs font-semibold text-[#d72c0d]">Reject</button></Form></> : <Form method="post"><input type="hidden" name="intent" value="order-status" /><input type="hidden" name="id" value={order.id} /><select name="orderStatus" defaultValue={order.orderStatus} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="rounded-lg border border-[#c9cccf] bg-white px-2 py-2 text-xs font-semibold"><option>Pending</option><option>Packed</option><option>Dispatched</option><option>Delivered</option></select></Form>}</div></td></tr>)}</tbody></table></div>;
}

function StatusPill({ status }: { status: string }) {
  const value = status.toLowerCase();
  const tone = value.includes("pending") || value.includes("unpaid") || value.includes("cod") ? "bg-[#fff3cd] text-[#8a6116]" : value.includes("reject") || value.includes("cancel") ? "bg-[#fff1f0] text-[#d72c0d]" : value.includes("deliver") || value.includes("paid") || value.includes("approve") || value.includes("pack") ? "bg-[#e3f1ed] text-[#006e52]" : "bg-[#f1f2f3] text-[#6d7175]";
  return <span className={tone + " inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold"}>{status}</span>;
}

function EmptyState({ icon: Icon, title, text }: { icon: IconComponent; title: string; text: string }) {
  return <div className="flex flex-col items-center justify-center py-8 text-center"><span className="grid size-10 place-items-center rounded-full bg-[#f1f2f3] text-[#8c9196]"><Icon className="size-5" /></span><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-[#6d7175]">{text}</p></div>;
}

function RoadmapPage({ title, icon: Icon, text }: { title: string; icon: IconComponent; text: string }) {
  return <section className="rounded-xl border border-[#e1e3e5] bg-white p-8 shadow-sm"><div className="mx-auto max-w-xl text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#f1f2f3] text-[#6d7175]"><Icon className="size-6" /></span><h2 className="mt-4 text-xl font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#6d7175]">{text}</p><span className="mt-5 inline-flex rounded-full bg-[#f1f2f3] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#6d7175]">Planned module</span></div></section>;
}

function RoadmapItem({ label, detail }: { label: string; detail: string }) {
  return <div className="flex items-center justify-between border-b border-[#f0f1f2] py-3 last:border-0"><div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-[#8c9196]">{detail}</p></div><span className="rounded bg-[#f1f2f3] px-2 py-1 text-[10px] font-bold uppercase text-[#8c9196]">Soon</span></div>;
}

function SecurityRow({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return <div className="flex gap-3 border-b border-[#f0f1f2] py-3 last:border-0"><span className={(done ? "bg-[#e3f1ed] text-[#008060]" : "bg-[#fff3cd] text-[#8a6116]") + " grid size-5 shrink-0 place-items-center rounded-full"}>{done ? <CheckCircle2 className="size-3" /> : <CircleAlert className="size-3" />}</span><div><p className="text-sm font-semibold">{label}</p><p className="mt-0.5 text-xs text-[#8c9196]">{detail}</p></div></div>;
}
