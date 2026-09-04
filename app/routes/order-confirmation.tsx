import { useEffect, useState } from "react";
import { Link, redirect, useLoaderData } from "react-router";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.js";
import Truck from "lucide-react/dist/esm/icons/truck.js";
import { Button } from "~/components/ui/button";
import { getCustomerSession } from "~/lib/customer-auth";
import type { Route } from "./+types/order-confirmation";

function store(context: Route.LoaderArgs["context"]) {
  const namespace = context.cloudflare.env.ITEMS;
  return namespace.get(namespace.idFromName("default"));
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const items = store(context);
  const customer = await getCustomerSession(request, items);
  const orderId = Number(params.id);
  if (!customer || !Number.isInteger(orderId)) throw redirect("/");
  const order = await items.getCustomerOrder(orderId, customer.phone);
  if (!order) throw redirect("/");
  return { order };
}

const formatPrice = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function OrderConfirmation() {
  const { order } = useLoaderData<typeof loader>();
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  useEffect(() => {
    window.history.replaceState(null, document.title, window.location.href);
  }, []);
  return <main className="flex min-h-svh items-center justify-center bg-[#fbfbf5] px-4 py-10"><section className="w-full max-w-2xl rounded-2xl bg-white p-7 shadow-sm sm:p-10"><CheckCircle2 className="size-14 text-[#388e3c]" /><p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#2874f0]">Order confirmation</p><h1 className="mt-2 text-3xl font-semibold">Thank you for shopping with us.</h1><p className="mt-3 text-sm leading-6 text-[#666]">Order <strong>#{order.id}</strong> is {order.paymentMethod === "UPI" ? "awaiting manual UPI verification" : "confirmed on Cash on Delivery"}.</p><div className="mt-7 grid gap-3 rounded-xl border border-[#e4e4e7] p-4 text-sm sm:grid-cols-3"><div><p className="text-xs text-[#71717a]">Status</p><p className="mt-1 font-semibold">{order.orderStatus}</p></div><div><p className="text-xs text-[#71717a]">Payment</p><p className="mt-1 font-semibold">{order.paymentStatus}</p></div><div><p className="text-xs text-[#71717a]">Total</p><p className="mt-1 font-semibold">{formatPrice(order.total)}</p></div></div><div className="mt-6 rounded-xl border border-[#e4e4e7] p-4"><p className="font-semibold">{order.items}</p><p className="mt-2 text-sm text-[#71717a]">Delivery to: {order.address}</p></div><div className="mt-6 flex items-start gap-3 rounded-xl border border-[#bfe8cb] bg-[#f1fff5] p-4"><Truck className="mt-0.5 size-5 shrink-0 text-[#388e3c]" /><div><p className="font-semibold">Tracking updates</p><p className="mt-1 text-sm text-[#71717a]">We&apos;ll contact you on your verified phone before dispatch.</p></div></div><label className="mt-6 flex items-start gap-3 text-sm"><input type="checkbox" checked={whatsappOptIn} onChange={(event) => setWhatsappOptIn(event.target.checked)} className="mt-1" /><span>Send order and delivery updates on WhatsApp.</span></label><Button asChild className="mt-7 rounded-full bg-[#2874f0] px-6 text-white hover:bg-[#1d5fc4]"><Link to="/">Continue shopping</Link></Button></section></main>;
}
