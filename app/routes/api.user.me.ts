import type { Route } from "./+types/api.user.me";
import { getCustomerSession } from "~/lib/customer-auth";

export async function loader({ request, context }: Route.LoaderArgs) {
  const namespace = context.cloudflare.env.ITEMS;
  const items = namespace.get(namespace.idFromName("default"));
  const user = await getCustomerSession(request, items);
  if (!user) return Response.json({ ok: false, user: null }, { status: 401 });
  return Response.json({ ok: true, user: { id: user.id, phone: user.phone, isVerified: user.isVerified } });
}

export async function action() {
  return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
}
