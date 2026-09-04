import type { Route } from "./+types/api.checkout-intent";
import { getCustomerSession } from "~/lib/customer-auth";

function store(context: Route.ActionArgs["context"]) {
  const namespace = context.cloudflare.env.ITEMS;
  return namespace.get(namespace.idFromName("default"));
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  const items = store(context);
  const customer = await getCustomerSession(request, items);
  if (!customer) return Response.json({ ok: false, message: "Login required." }, { status: 401 });
  let body: { phone?: unknown; items?: unknown } = {};
  try { body = await request.json() as typeof body; } catch { return Response.json({ ok: false, message: "Invalid checkout intent." }, { status: 400 }); }
  const cart = Array.isArray(body.items) ? body.items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { productId?: unknown; quantity?: unknown };
    const productId = Number(row.productId); const quantity = Number(row.quantity);
    return Number.isInteger(productId) && productId > 0 && Number.isInteger(quantity) && quantity > 0 ? [{ productId, quantity: Math.min(quantity, 100) }] : [];
  }) : [];
  await items.recordCheckoutIntent(customer.id, String(body.phone ?? customer.phone), cart);
  return Response.json({ ok: true });
}
