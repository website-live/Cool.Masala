import { useEffect, useMemo, useState } from "react";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.js";
import Gift from "lucide-react/dist/esm/icons/gift.js";
import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.js";
import Minus from "lucide-react/dist/esm/icons/minus.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import ShoppingCart from "lucide-react/dist/esm/icons/shopping-cart.js";
import Truck from "lucide-react/dist/esm/icons/truck.js";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { notifyLowStock, notifyNewCodOrder } from "~/lib/notifications";
import type { Route } from "./+types/checkout";

type CartItem = { productId: number; name: string; category: string; image: string; price: number; quantity: number };
type StoredCartValue = {
  quantity?: unknown;
  productId?: unknown;
  id?: unknown;
  product?: { id?: unknown; name?: unknown; category?: unknown; image?: unknown; price?: unknown };
  name?: unknown;
  category?: unknown;
  image?: unknown;
  price?: unknown;
};

type ActionResult = { ok: boolean; message?: string; orderId?: number; total?: number; giftIncluded?: boolean; lowStock?: { productId: number; name: string; stock: number; threshold: number }[] };

function normalizeCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as StoredCartValue;
    const product = value.product && typeof value.product === "object" ? value.product : value;
    const productId = Number(value.productId ?? product.id);
    const quantity = Number(value.quantity);
    const name = String(product.name ?? "");
    const category = String(product.category ?? "");
    const image = String(product.image ?? "");
    const price = Number(product.price);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || !name || !category || !image || !Number.isFinite(price) || price < 0) return [];
    return [{ productId, name, category, image, price, quantity }];
  });
}

function store(context: Route.LoaderArgs["context"]) {
  const namespace = context.cloudflare.env.ITEMS;
  return namespace.get(namespace.idFromName("default"));
}

export async function loader({ context }: Route.LoaderArgs) {
  return { settings: await store(context).getSettings() };
}

export async function action({ request, context }: Route.ActionArgs): Promise<ActionResult> {
  const form = await request.formData();
  const customerName = String(form.get("customerName") ?? "").trim().slice(0, 100);
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 160);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 24);
  const address = String(form.get("address") ?? "").trim().slice(0, 500);
  if (customerName.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 8 || address.length < 10) return { ok: false, message: "Please enter a valid name, email, phone number and complete delivery address." };
  let rawItems: unknown;
  try { rawItems = JSON.parse(String(form.get("cart") ?? "[]")); } catch { return { ok: false, message: "Your cart could not be read. Please return to the store and try again." }; }
  if (!Array.isArray(rawItems)) return { ok: false, message: "Your cart is invalid." };
  const items = rawItems.map((item) => {
    const value = item as { productId?: unknown; quantity?: unknown };
    return { productId: Number(value.productId), quantity: Number(value.quantity) };
  }).filter((item) => Number.isInteger(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0);
  if (!items.length) return { ok: false, message: "Your cart is empty." };
  try {
    const forwardedFor = request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? "unknown";
    const itemsStore = store(context);
    const result = await itemsStore.createOrder({ customerName, email, phone, address, ipAddress: forwardedFor, items });
    const notifications = [
      notifyNewCodOrder(context.cloudflare.env, result.order),
      ...result.lowStock.map((product) => notifyLowStock(context.cloudflare.env, product)),
    ];
    const outcomes = await Promise.allSettled(notifications);
    for (const [index, outcome] of outcomes.entries()) {
      if (outcome.status === "rejected") {
        const message = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
        try {
          await itemsStore.logError("NOTIFICATION_FAILED", message, { orderId: result.order.id, notificationIndex: index });
          await itemsStore.logNotification("FAILED", message, result.order.id, { notificationIndex: index });
        } catch (loggingError) {
          console.error(JSON.stringify({ code: "NOTIFICATION_LOGGING_FAILED", message: loggingError instanceof Error ? loggingError.message : String(loggingError), orderId: result.order.id }));
        }
      }
    }
    return { ok: true, orderId: result.order.id, total: result.order.total, giftIncluded: result.order.giftIncluded === 1, lowStock: result.lowStock };
  } catch (error) {
    try {
      await store(context).logError("ORDER_CREATE_FAILED", error instanceof Error ? error.message : String(error), { route: "/checkout" });
    } catch (loggingError) {
      console.error(JSON.stringify({ code: "ORDER_ERROR_LOGGING_FAILED", message: loggingError instanceof Error ? loggingError.message : String(loggingError) }));
    }
    return { ok: false, message: error instanceof Error ? error.message : "The order could not be created. Please try again." };
  }
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Checkout · Cool Masala" }, { name: "description", content: "Secure COD checkout for Cool Masala masalas and printed t-shirts." }];
}

const formatPrice = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function Checkout() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cool-masala-cart") ?? "[]") as unknown;
      const normalized = normalizeCart(saved);
      setCart(normalized);
      setQuantities(Object.fromEntries(normalized.map((item) => [item.productId, item.quantity])));
    } catch {
      setCart([]);
      setQuantities({});
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (actionData?.ok) {
      localStorage.removeItem("cool-masala-cart");
      setCart([]);
    }
  }, [actionData]);

  const visibleCart = useMemo(() => cart.map((item) => ({ ...item, quantity: quantities[item.productId] ?? item.quantity })).filter((item) => item.quantity > 0), [cart, quantities]);
  const subtotal = visibleCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 499 ? 0 : 49;
  const total = subtotal + shipping;
  const includesTShirt = visibleCart.some((item) => item.category === "Printed T-Shirts");

  function setQuantity(productId: number, amount: number) {
    setQuantities((current) => ({ ...current, [productId]: Math.max(0, (current[productId] ?? 1) + amount) }));
  }

  if (actionData?.ok) return <main className="flex min-h-svh items-center justify-center bg-[#f1f3f6] px-4 py-10"><div className="w-full max-w-lg bg-white p-7 text-center shadow-sm sm:p-10"><CheckCircle2 className="mx-auto size-14 text-[#388e3c]" /><p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#2874f0]">Order placed</p><h1 className="mt-2 text-3xl font-semibold">Thank you for shopping with us.</h1><p className="mt-3 text-sm leading-6 text-[#666]">Order <strong>#{actionData.orderId}</strong> is confirmed on Cash on Delivery. We&apos;ll contact you on your phone before dispatch.</p>{actionData.giftIncluded && <div className="mt-5 flex items-center justify-center gap-2 border border-[#b7dfba] bg-[#edf7ee] p-3 text-sm font-semibold text-[#2e7d32]"><Gift className="size-4" /> Your free mini masala gift is included.</div>}<Button asChild className="mt-7 rounded-sm bg-[#2874f0] text-white hover:bg-[#1d5fc4]"><Link to="/">Continue shopping</Link></Button></div></main>;

  return <div className="min-h-svh bg-[#f1f3f6] text-[#212121]"><header className="bg-[#2874f0] text-white shadow-sm"><div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6"><Link to="/" className="font-display text-xl font-bold italic">cool<span className="text-[#ffe500]">.</span>masala</Link><div className="flex items-center gap-2 text-xs font-semibold sm:text-sm"><LockKeyhole className="size-4" /> Secure checkout</div></div></header><main className="mx-auto max-w-[1180px] px-3 py-5 sm:px-6 sm:py-8"><Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#2874f0]"><ArrowLeft className="size-4" /> Back to store</Link>{!hydrated ? <div className="bg-white p-10 text-center">Loading your basket…</div> : visibleCart.length === 0 ? <div className="bg-white p-12 text-center shadow-sm"><ShoppingCart className="mx-auto size-12 text-[#c2c2c2]" /><h1 className="mt-4 text-2xl font-semibold">Your basket is empty</h1><Button asChild className="mt-6 rounded-sm bg-[#2874f0] text-white hover:bg-[#1d5fc4]"><Link to="/">Browse products</Link></Button></div> : <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><div className="space-y-5"><section className="bg-white shadow-sm"><div className="border-b border-[#e0e0e0] px-5 py-4"><h1 className="text-xl font-semibold">Delivery details</h1><p className="mt-1 text-xs text-[#878787]">We currently accept Cash on Delivery.</p></div><Form method="post" className="space-y-4 p-5"><input type="hidden" name="cart" value={JSON.stringify(visibleCart.map((item) => ({ productId: item.productId, quantity: item.quantity })))} /><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Full name<Input required name="customerName" autoComplete="name" className="mt-1 h-11 rounded-sm" /></label><label className="text-sm font-semibold">Email<Input required type="email" name="email" autoComplete="email" className="mt-1 h-11 rounded-sm" /></label></div><label className="block text-sm font-semibold">Phone number<Input required type="tel" name="phone" autoComplete="tel" className="mt-1 h-11 rounded-sm" /></label><label className="block text-sm font-semibold">Full delivery address<textarea required name="address" autoComplete="street-address" rows={4} className="mt-1 w-full resize-y rounded-sm border border-[#e0e0e0] px-3 py-2 text-sm outline-none focus:border-[#2874f0]" placeholder="House / flat, street, city, state, PIN code" /></label>{actionData && !actionData.ok && <p className="border border-[#f0b8b8] bg-[#fff1f1] p-3 text-sm font-medium text-[#c62828]">{actionData.message}</p>}<div className="flex items-center gap-3 border-t border-[#f0f0f0] pt-4"><Button type="submit" disabled={navigation.state !== "idle"} className="h-11 rounded-sm bg-[#fb641b] px-7 font-semibold text-white hover:bg-[#e85a16]">{navigation.state !== "idle" ? "Placing order…" : "Place COD order"}</Button><span className="text-xs text-[#878787]">No online payment is charged.</span></div></Form></section><section className="flex gap-3 bg-white p-5 text-sm text-[#555] shadow-sm"><ShieldCheck className="size-5 shrink-0 text-[#388e3c]" /><p><strong>Server-validated order.</strong> Current stock and prices are checked again when you place the order, so stale browser values cannot oversell inventory.</p></section></div><aside className="h-fit bg-white shadow-sm"><div className="border-b border-[#e0e0e0] px-5 py-4"><h2 className="text-lg font-semibold">Order summary</h2></div><div className="space-y-4 p-5">{visibleCart.map((item) => <div key={item.productId} className="flex gap-3"><img src={item.image} alt="" className="size-16 object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-[#878787]">{formatPrice(item.price)} × {item.quantity}</p><div className="mt-2 inline-flex items-center border border-[#e0e0e0]"><button type="button" onClick={() => setQuantity(item.productId, -1)} className="grid size-7 place-items-center hover:bg-[#f1f3f6]" aria-label={`Remove one ${item.name}`}><Minus className="size-3" /></button><span className="w-7 text-center text-xs font-bold">{item.quantity}</span><button type="button" onClick={() => setQuantity(item.productId, 1)} className="grid size-7 place-items-center hover:bg-[#f1f3f6]" aria-label={`Add one ${item.name}`}><Plus className="size-3" /></button></div></div><p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p></div>)}{includesTShirt && <div className="flex gap-2 border border-[#b7dfba] bg-[#edf7ee] p-3 text-xs font-semibold text-[#2e7d32]"><Gift className="size-4 shrink-0" /> Free mini masala gift will be packed with your t-shirt order.</div>}<div className="space-y-3 border-t border-[#e0e0e0] pt-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div><div className="flex justify-between"><span>Delivery</span><span>{shipping === 0 ? "FREE" : formatPrice(shipping)}</span></div><div className="flex justify-between border-t border-[#e0e0e0] pt-3 text-lg font-semibold"><span>Total</span><span>{formatPrice(total)}</span></div></div><div className="flex gap-2 text-xs text-[#878787]"><Truck className="size-4 shrink-0" /> Free delivery on orders over ₹499</div></div></aside></div>}</main><footer className="mx-auto max-w-[1180px] px-4 pb-8 text-xs text-[#878787] sm:px-6">{settings.storeName} · COD checkout</footer></div>;
}
