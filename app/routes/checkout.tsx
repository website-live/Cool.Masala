import { useEffect, useMemo, useRef, useState } from "react";
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
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
import { getCustomerSession } from "~/lib/customer-auth";
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

type ActionResult = { ok: boolean; message?: string; orderId?: number; total?: number; paymentMethod?: "COD" | "UPI"; giftIncluded?: boolean; lowStock?: { productId: number; name: string; stock: number; threshold: number }[] };
type CheckoutSettings = { storeName: string; codEnabled?: number; codMaxOrder?: number; upiVpa?: string; googlePlacesApiKey?: string; blockedPincodes?: string[] };

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

export async function loader({ request, context }: Route.LoaderArgs) {
  const items = store(context);
  const customer = await getCustomerSession(request, items);
  if (!customer) throw redirect("/?checkout=required");
  return { settings: await items.getSettings(), customer: { phone: customer.phone } };
}

export async function action({ request, context }: Route.ActionArgs): Promise<ActionResult | Response> {
  const itemsStore = store(context);
  const customer = await getCustomerSession(request, itemsStore);
  if (!customer) return { ok: false, message: "Please verify your phone number to proceed with your order." };
  const form = await request.formData();
  const customerName = String(form.get("customerName") ?? "").trim().slice(0, 100);
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 160);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 20);
  const addressLine = String(form.get("addressLine") ?? "").trim().slice(0, 220);
  const addressLine2 = String(form.get("addressLine2") ?? "").trim().slice(0, 120);
  const city = String(form.get("city") ?? "").trim().slice(0, 80);
  const state = String(form.get("state") ?? "").trim().slice(0, 80);
  const pincode = String(form.get("pincode") ?? "").trim().slice(0, 6);
  const paymentMethod = String(form.get("paymentMethod") ?? "COD") as "COD" | "UPI";
  const utr = String(form.get("utr") ?? "").trim().slice(0, 12);
  const screenshotUrl = String(form.get("paymentScreenshotUrl") ?? "").trim().slice(0, 500);
  const namePattern = /^\p{L}(?:[\p{L} ]{0,98}\p{L})?$/u;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phonePattern = /^[6-9]\d{9}$/;
  const addressPattern = /^[\p{L}\p{N}\s,./#'()\-]{10,220}$/u;
  const localityPattern = /^[\p{L}](?:[\p{L} \-]{0,78}\p{L})?$/u;
  const pincodePattern = /^[1-9]\d{5}$/;
  const addressLine2Pattern = /^[\p{L}\p{N}\s,./#'()\-]{1,120}$/u;
  if (!namePattern.test(customerName)) return { ok: false, message: "Enter your name using letters and spaces only." };
  if (!emailPattern.test(email)) return { ok: false, message: "Enter a valid email address, for example name@example.com." };
  if (!phonePattern.test(phone)) return { ok: false, message: "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9." };
  if (!addressPattern.test(addressLine)) return { ok: false, message: "Enter a complete delivery address using letters, numbers and common address characters only." };
  if (addressLine2 && !addressLine2Pattern.test(addressLine2)) return { ok: false, message: "Enter a valid optional apartment, floor or landmark detail." };
  if (!localityPattern.test(city) || !localityPattern.test(state)) return { ok: false, message: "Enter a valid city and state using letters, spaces or hyphens only." };
  if (!pincodePattern.test(pincode)) return { ok: false, message: "Enter a valid 6-digit PIN code." };
  const storeSettings = await itemsStore.getSettings();
  if (!(paymentMethod === "COD" || paymentMethod === "UPI")) return { ok: false, message: "Choose a valid payment method." };
  if (paymentMethod === "COD" && storeSettings.codEnabled === 0) return { ok: false, message: "Cash on Delivery is currently unavailable. Please choose UPI." };
  if (storeSettings.blockedPincodes.includes(pincode) && paymentMethod === "COD") return { ok: false, message: "Cash on Delivery is unavailable for this PIN code. Please choose UPI." };
  if (paymentMethod === "UPI" && !storeSettings.upiVpa) return { ok: false, message: "Online UPI is not configured yet. Please choose Cash on Delivery." };
  if (paymentMethod === "UPI" && !/^[0-9]{12}$/.test(utr)) return { ok: false, message: "Enter the 12-digit UTR / transaction ID to continue." };
  if (screenshotUrl && !/^https:\/\//i.test(screenshotUrl)) return { ok: false, message: "Payment screenshot must be a secure https URL." };
  const address = `${addressLine}${addressLine2 ? `, ${addressLine2}` : ""}, ${city}, ${state} - ${pincode}`;
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
    const result = await itemsStore.createOrder({ customerName, email, phone, address, ipAddress: forwardedFor, items, paymentMethod, utr, screenshotUrl });
    await itemsStore.markCheckoutIntentConverted(customer.id, result.order.id);
    const notifications = [
      ...(paymentMethod === "COD" ? [notifyNewCodOrder(context.cloudflare.env, result.order)] : []),
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
    return redirect(`/orders/${result.order.id}`);
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
  const data = useLoaderData<typeof loader>();
  const { settings } = data;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "UPI">("COD");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const addressInputRef = useRef<HTMLInputElement>(null);
  const checkoutIntentSent = useRef(false);

  function validateField(name: string, value: string) {
    const message = name === "phone" && !/^[6-9]\d{9}$/.test(value.replace(/\D/g, "")) ? "Enter a valid 10-digit Indian mobile number." : name === "pincode" && !/^[1-9]\d{5}$/.test(value) ? "Enter a valid 6-digit PIN code." : "";
    setFieldErrors((current) => ({ ...current, [name]: message }));
  }

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
    setPhone(data.customer.phone);
  }, [data.customer.phone]);

  useEffect(() => {
    if (actionData?.ok) {
      localStorage.removeItem("cool-masala-cart");
      setCart([]);
    }
  }, [actionData]);

  const visibleCart = useMemo(() => cart.map((item) => ({ ...item, quantity: quantities[item.productId] ?? item.quantity })).filter((item) => item.quantity > 0), [cart, quantities]);

  useEffect(() => {
    if (!hydrated || !phone || !visibleCart.length || checkoutIntentSent.current) return;
    checkoutIntentSent.current = true;
    void fetch("/api/checkout-intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, items: visibleCart.map((item) => ({ productId: item.productId, quantity: item.quantity })) }) });
  }, [hydrated, phone, visibleCart]);

  const subtotal = visibleCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const baseShipping = subtotal === 0 || subtotal >= 499 ? 0 : 49;
  const upiDiscount = Math.round(subtotal * 0.1 * 100) / 100;

  const codFee = 50;
  const blockedPincodes = settings.blockedPincodes ?? [];
  const pincodeBlocked = /^[1-9][0-9]{5}$/.test(pincode) && blockedPincodes.includes(pincode);
  const codTotal = subtotal + baseShipping + codFee;
  const codAvailable = settings.codEnabled !== 0 && !pincodeBlocked && codTotal <= Number(settings.codMaxOrder ?? 2000);
  const upiAvailable = Boolean(settings.upiVpa);
  const shipping = paymentMethod === "COD" ? baseShipping + codFee : baseShipping;
  const discount = paymentMethod === "UPI" ? upiDiscount : 0;
  const total = subtotal - discount + shipping;
  const includesTShirt = visibleCart.some((item) => item.category === "Printed T-Shirts");

  function setQuantity(productId: number, amount: number) {
    setQuantities((current) => ({ ...current, [productId]: Math.max(0, (current[productId] ?? 1) + amount) }));
  }

  useEffect(() => {
    if (paymentMethod === "COD" && !codAvailable && upiAvailable) setPaymentMethod("UPI");
  }, [codAvailable, paymentMethod, upiAvailable]);

  useEffect(() => {
    const apiKey = settings.googlePlacesApiKey;
    if (!apiKey || typeof window === "undefined") return;
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-places]");
    const setup = () => {
      const autocomplete = new (window as any).google.maps.places.Autocomplete(addressInputRef.current, { types: ["address"], componentRestrictions: { country: "in" }, fields: ["address_components"] });
      autocomplete.addListener("place_changed", () => {
        const components = autocomplete.getPlace()?.address_components ?? [];
        const find = (type: string) => components.find((component: any) => component.types.includes(type))?.long_name ?? "";
        const setField = (name: string, value: string) => { const field = document.querySelector<HTMLInputElement>(`input[name="${name}"]`); if (field && value) { field.value = value; field.dispatchEvent(new Event("input", { bubbles: true })); } };
        setField("city", find("locality") || find("administrative_area_level_2"));
        setField("state", find("administrative_area_level_1"));
        setField("pincode", find("postal_code"));
        setPincode(find("postal_code"));
      });
    };
    if (existing) { if ((window as any).google?.maps?.places) setup(); else existing.addEventListener("load", setup, { once: true }); return; }
    const script = document.createElement("script"); script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`; script.async = true; script.defer = true; script.dataset.googlePlaces = "true"; script.addEventListener("load", setup, { once: true }); document.head.appendChild(script);
  }, [settings.googlePlacesApiKey]);

  if (actionData?.ok) return <main className="checkout-shell flex min-h-svh items-center justify-center bg-[#fbfbf5] px-4 py-10"><div className="w-full max-w-lg bg-white p-7 text-center shadow-sm sm:p-10"><CheckCircle2 className="mx-auto size-14 text-[#388e3c]" /><p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#2874f0]">Order placed</p><h1 className="mt-2 text-3xl font-semibold">Thank you for shopping with us.</h1><p className="mt-3 text-sm leading-6 text-[#666]">Order <strong>#{actionData.orderId}</strong> is confirmed{actionData.paymentMethod === "UPI" ? " and awaiting manual UPI verification" : " on Cash on Delivery"}. We&apos;ll contact you on your phone before dispatch.</p>{actionData.giftIncluded && <div className="mt-5 flex items-center justify-center gap-2 border border-[#b7dfba] bg-[#edf7ee] p-3 text-sm font-semibold text-[#2e7d32]"><Gift className="size-4" /> Your free mini masala gift is included.</div>}<Button asChild className="mt-7 rounded-sm bg-[#2874f0] text-white hover:bg-[#1d5fc4]"><Link to="/">Continue shopping</Link></Button></div></main>;

  return <div className="checkout-shell min-h-svh bg-[#fbfbf5] text-black"><header className="bg-black text-white shadow-sm"><div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6"><Link to="/" className="font-display text-xl font-bold italic">cool<span className="text-[#ffe500]">.</span>masala</Link><div className="flex items-center gap-2 text-xs font-semibold sm:text-sm"><LockKeyhole className="size-4" /> Secure checkout</div></div></header><main className="mx-auto max-w-[1180px] px-3 py-5 sm:px-6 sm:py-8"><Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-black"><ArrowLeft className="size-4" /> Back to store</Link>{!hydrated ? <div className="bg-white p-10 text-center">Loading your basket…</div> : visibleCart.length === 0 ? <div className="bg-white p-12 text-center shadow-sm"><ShoppingCart className="mx-auto size-12 text-[#c2c2c2]" /><h1 className="mt-4 text-2xl font-semibold">Your basket is empty</h1><Button asChild className="mt-6 rounded-sm bg-[#2874f0] text-white hover:bg-[#1d5fc4]"><Link to="/">Browse products</Link></Button></div> : <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><div className="space-y-5"><section className="rounded-lg border border-[#e4e4e7] bg-white shadow-sm"><div className="border-b border-[#e4e4e7] px-5 py-4"><h1 className="text-xl font-semibold">Delivery details</h1><p className="mt-1 text-xs text-[#878787]">We currently accept Cash on Delivery. Use valid contact and delivery details so we can dispatch your order.</p></div><Form method="post" className="space-y-4 p-5"><input type="hidden" name="cart" value={JSON.stringify(visibleCart.map((item) => ({ productId: item.productId, quantity: item.quantity })))} /><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Full name<Input required name="customerName" autoComplete="name" minLength={2} maxLength={100} pattern="[A-Za-zÀ-ÖØ-öø-ÿ ]{2,100}" title="Use letters and spaces only." className="mt-1 h-11 rounded-sm" /></label><label className="text-sm font-semibold">Email<Input required type="email" name="email" inputMode="email" autoComplete="email" maxLength={160} title="Enter a valid email address." className="mt-1 h-11 rounded-sm" /></label></div><label className="block text-sm font-semibold">Verified phone number<Input required type="tel" name="phone" inputMode="numeric" autoComplete="tel" minLength={10} maxLength={10} pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number." value={phone.replace("+91", "")} onBlur={(event) => validateField("phone", event.currentTarget.value)} readOnly className="mt-1 h-11 rounded-sm bg-[#f4f4f5]" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "phone-error" : undefined} />{fieldErrors.phone && <span id="phone-error" className="mt-1 block text-xs font-medium text-[#c62828]">{fieldErrors.phone}</span>}<span className="mt-1 block text-xs font-normal text-[#71717a]">Verified by phone OTP</span></label><label className="block text-sm font-semibold">Address line 1<Input ref={addressInputRef} required name="addressLine" autoComplete="address-line1" minLength={10} maxLength={220} pattern="[A-Za-z0-9À-ÖØ-öø-ÿ\\s,./#'()\\-]{10,220}" title="Enter a complete address using letters, numbers and common address characters." placeholder="House / flat, street, landmark" className="mt-1 h-11 rounded-sm" /></label><label className="block text-sm font-semibold">Address line 2 <span className="font-normal text-[#878787]">(optional)</span><Input name="addressLine2" autoComplete="address-line2" maxLength={120} placeholder="Apartment, floor, landmark" className="mt-1 h-11 rounded-sm" /></label><div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-semibold">City<Input required name="city" autoComplete="address-level2" minLength={2} maxLength={80} pattern="[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ \\-]{0,78}[A-Za-zÀ-ÖØ-öø-ÿ]" title="Use letters, spaces or hyphens only." className="mt-1 h-11 rounded-sm" /></label><label className="text-sm font-semibold">State<Input required name="state" autoComplete="address-level1" minLength={2} maxLength={80} pattern="[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ \\-]{0,78}[A-Za-zÀ-ÖØ-öø-ÿ]" title="Use letters, spaces or hyphens only." className="mt-1 h-11 rounded-sm" /></label><label className="text-sm font-semibold">PIN code<Input required name="pincode" inputMode="numeric" autoComplete="postal-code" minLength={6} maxLength={6} pattern="[1-9][0-9]{5}" title="Enter a valid 6-digit PIN code." value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\\D/g, "").slice(0, 6))} onBlur={(event) => validateField("pincode", event.currentTarget.value)} className="mt-1 h-11 rounded-sm" aria-invalid={Boolean(fieldErrors.pincode)} aria-describedby={fieldErrors.pincode ? "pincode-error" : undefined} />{fieldErrors.pincode && <span id="pincode-error" className="mt-1 block text-xs font-medium text-[#c62828]">{fieldErrors.pincode}</span>}</label></div>{pincodeBlocked && <p className="border border-[#f1b6a7] bg-[#fff4f2] p-3 text-sm font-medium text-[#d72c0d]">Cash on Delivery is unavailable for this PIN code. You can continue with UPI.</p>}<div className="rounded-lg border border-[#e4e4e7] p-4"><p className="text-sm font-bold">Choose payment method</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${paymentMethod === "COD" ? "border-black bg-[#fbfbf5]" : "border-[#e4e4e7]"} ${!codAvailable ? "cursor-not-allowed opacity-50" : ""}`}><input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} disabled={!codAvailable} /><span><strong>Cash on Delivery</strong><span className="mt-1 block text-xs text-[#71717a]">₹50 handling charge · WhatsApp confirmation</span></span></label><label className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${paymentMethod === "UPI" ? "border-black bg-[#c1fbd4]" : "border-[#e4e4e7]"} ${!upiAvailable ? "cursor-not-allowed opacity-50" : ""}`}><input type="radio" name="paymentMethod" value="UPI" checked={paymentMethod === "UPI"} onChange={() => setPaymentMethod("UPI")} disabled={!upiAvailable} /><span><strong>UPI prepaid</strong><span className="mt-1 block text-xs font-semibold text-[#006e52]">Get 10% instant OFF</span></span></label></div>{!codAvailable && <p className="mt-3 text-xs font-medium text-[#d72c0d]">COD is unavailable{pincodeBlocked ? " for this PIN code" : ` above ${formatPrice(Number(settings.codMaxOrder ?? 2000))}`}. Choose UPI instead.</p>}{!upiAvailable && <p className="mt-3 text-xs text-[#71717a]">UPI payment will appear after the store configures its UPI VPA.</p>}</div>{paymentMethod === "UPI" && upiAvailable && <div className="rounded-lg border border-[#bfe8cb] bg-[#f1fff5] p-4"><p className="font-bold text-[#006e52]">Pay Online via UPI &amp; Get 10% Instant OFF!</p><div className="mt-3 flex flex-col items-center gap-3 sm:flex-row"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${settings.upiVpa}&pn=${settings.storeName}&am=${total.toFixed(2)}&cu=INR`)}`} alt="UPI payment QR code" className="size-36 rounded bg-white p-2" /><div className="min-w-0 flex-1"><p className="text-xs text-[#71717a]">Scan to pay</p><div className="mt-1 flex items-center gap-2"><code className="truncate text-sm font-bold">{settings.upiVpa}</code><button type="button" onClick={() => void navigator.clipboard?.writeText(settings.upiVpa ?? "")} className="shrink-0 rounded-full border border-[#006e52] px-2 py-1 text-[11px] font-bold text-[#006e52]">Copy UPI ID</button></div><p className="mt-2 text-xs text-[#71717a]">Your order is verified manually after payment.</p></div></div><label className="mt-4 block text-sm font-semibold">Enter 12-Digit UTR / Transaction ID<Input required name="utr" inputMode="numeric" minLength={12} maxLength={12} pattern="[0-9]{12}" title="Enter exactly 12 numeric digits." className="mt-1 h-11 rounded-sm" /></label><label className="mt-3 block text-sm font-semibold">Payment screenshot URL <span className="font-normal text-[#878787]">(optional)</span><Input name="paymentScreenshotUrl" type="url" placeholder="https://…" className="mt-1 h-11 rounded-sm" /></label></div>}{actionData && !actionData.ok && <p className="border border-[#f0b8b8] bg-[#fff1f1] p-3 text-sm font-medium text-[#c62828]">{actionData.message}</p>}<div className="flex items-center gap-3 border-t border-[#f0f0f0] pt-4"><Button type="submit" disabled={navigation.state !== "idle" || (paymentMethod === "COD" && !codAvailable) || (paymentMethod === "UPI" && !upiAvailable)} className="h-11 rounded-full bg-black px-7 font-semibold text-white hover:bg-[#3f3f46]">{navigation.state !== "idle" ? "Placing order…" : paymentMethod === "UPI" ? "Submit UPI order" : "Place COD order"}</Button><span className="text-xs text-[#878787]">{paymentMethod === "UPI" ? "Payment is verified manually before processing." : "COD order gets WhatsApp confirmation."}</span></div></Form></section><section className="flex gap-3 bg-white p-5 text-sm text-[#555] shadow-sm"><ShieldCheck className="size-5 shrink-0 text-[#388e3c]" /><p><strong>Server-validated order.</strong> Current stock and prices are checked again when you place the order, so stale browser values cannot oversell inventory.</p></section></div><aside className="h-fit rounded-lg border border-[#e4e4e7] bg-white shadow-sm"><div className="border-b border-[#e0e0e0] px-5 py-4"><h2 className="text-lg font-semibold">Order summary</h2></div><div className="space-y-4 p-5">{visibleCart.map((item) => <div key={item.productId} className="flex gap-3"><img src={item.image} alt="" className="size-16 object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-[#878787]">{formatPrice(item.price)} × {item.quantity}</p><div className="mt-2 inline-flex items-center border border-[#e0e0e0]"><button type="button" onClick={() => setQuantity(item.productId, -1)} className="grid size-7 place-items-center hover:bg-[#f1f3f6]" aria-label={`Remove one ${item.name}`}><Minus className="size-3" /></button><span className="w-7 text-center text-xs font-bold">{item.quantity}</span><button type="button" onClick={() => setQuantity(item.productId, 1)} className="grid size-7 place-items-center hover:bg-[#f1f3f6]" aria-label={`Add one ${item.name}`}><Plus className="size-3" /></button></div></div><p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p></div>)}{includesTShirt && <div className="flex gap-2 border border-[#b7dfba] bg-[#edf7ee] p-3 text-xs font-semibold text-[#2e7d32]"><Gift className="size-4 shrink-0" /> Free mini masala gift will be packed with your t-shirt order.</div>}<div className="space-y-3 border-t border-[#e0e0e0] pt-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>{discount > 0 && <div className="flex justify-between font-semibold text-[#006e52]"><span>UPI discount (10%)</span><span>-{formatPrice(discount)}</span></div>}<div className="flex justify-between"><span>Delivery</span><span>{baseShipping === 0 ? "FREE" : formatPrice(baseShipping)}</span></div>{paymentMethod === "COD" && <div className="flex justify-between"><span>COD handling</span><span>{formatPrice(codFee)}</span></div>}<div className="flex justify-between border-t border-[#e0e0e0] pt-3 text-lg font-semibold"><span>Total</span><span>{formatPrice(total)}</span></div></div><div className="flex gap-2 text-xs text-[#878787]"><Truck className="size-4 shrink-0" /> Free delivery on orders over ₹499</div></div></aside></div>}</main><footer className="mx-auto max-w-[1180px] px-4 pb-8 text-xs text-[#878787] sm:px-6">{settings.storeName} · COD checkout</footer></div>;
}
