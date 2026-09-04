import type { Route } from "./+types/api.cart";
import { getCustomerSession } from "~/lib/customer-auth";

function store(context: Route.LoaderArgs["context"]) {
  const namespace = context.cloudflare.env.ITEMS;
  return namespace.get(namespace.idFromName("default"));
}

function parseItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as { productId?: unknown; quantity?: unknown };
    const productId = Number(record.productId);
    const quantity = Number(record.quantity);
    return Number.isInteger(productId) && productId > 0 && Number.isInteger(quantity) && quantity > 0 ? [{ productId, quantity: Math.min(quantity, 100) }] : [];
  });
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const customer = await getCustomerSession(request, store(context));
  if (!customer) return Response.json({ ok: false, message: "Login required." }, { status: 401 });
  return Response.json({ ok: true, items: await store(context).getCustomerCart(customer.id) });
}

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
  const customer = await getCustomerSession(request, store(context));
  if (!customer) return Response.json({ ok: false, message: "Login required." }, { status: 401 });
  let body: { items?: unknown } = {};
  try { body = await request.json() as typeof body; } catch { return Response.json({ ok: false, message: "Invalid cart." }, { status: 400 }); }
  return Response.json({ ok: true, items: await store(context).mergeCustomerCart(customer.id, parseItems(body.items)) });
}
