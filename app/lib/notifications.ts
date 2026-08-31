import { createConnections, type ConnectionsBinding } from "~/lib/connections";

type NotificationEnv = {
  CONNECTIONS?: ConnectionsBinding;
  TELEGRAM_CONNECTION?: string;
  RESEND_CONNECTION?: string;
  ADMIN_NOTIFICATION_EMAIL?: string;
  NOTIFICATION_FROM_EMAIL?: string;
};

type OrderNotification = {
  id: number;
  customerName: string;
  email: string;
  phone: string;
  total: number;
};

type LowStockNotification = { name: string; stock: number; threshold: number };

type Catalog = Awaited<ReturnType<ConnectionsBinding["methods"]>>[number];

async function findConnection(env: NotificationEnv, query: string) {
  if (!env.CONNECTIONS) throw new Error("CONNECTIONS binding is not configured");
  return env.CONNECTIONS.find(query);
}

async function invokeConnection(
  env: NotificationEnv,
  query: string,
  methodNames: string[],
  payload: Record<string, unknown>,
): Promise<void> {
  const entry = await findConnection(env, query);
  const catalog = (await env.CONNECTIONS!.methods()).find((item) => item.alias === entry.alias) as Catalog | undefined;
  const method = catalog?.methods.find((item) => methodNames.includes(item.name));
  if (!method) throw new Error(`No supported notification method found for connection ${entry.alias}`);
  const connections = createConnections({ CONNECTIONS: env.CONNECTIONS! });
  await connections[entry.alias][method.name](payload);
}

function money(value: number) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export async function notifyNewCodOrder(env: NotificationEnv, order: OrderNotification) {
  const text = `🚨 NEW COD ORDER: #${order.id} | Amount: ${money(order.total)} | Customer: ${order.customerName} (${order.phone}) | Status: Pending Approval`;
  await invokeConnection(env, env.TELEGRAM_CONNECTION ?? "telegram", ["send", "send_message", "sendTelegramMessage", "send_telegram_message"], { text, message: text });
}

export async function notifyLowStock(env: NotificationEnv, product: LowStockNotification) {
  const text = `⚠️ RESTOCK ALERT: ${product.name} | Remaining: ${product.stock} | Threshold: ${product.threshold}`;
  await invokeConnection(env, env.TELEGRAM_CONNECTION ?? "telegram", ["send", "send_message", "sendTelegramMessage", "send_telegram_message"], { text, message: text });
}

export async function sendApprovedOrderReceipt(env: NotificationEnv, order: OrderNotification) {
  if (!order.email) throw new Error(`Order #${order.id} has no customer email`);
  if (!env.NOTIFICATION_FROM_EMAIL) throw new Error("NOTIFICATION_FROM_EMAIL must be configured for receipt delivery");
  const entry = await findConnection(env, env.RESEND_CONNECTION ?? "resend");
  const subject = `Cool Masala order #${order.id} approved`;
  const html = `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1>Cool Masala</h1><p>Your COD order <strong>#${order.id}</strong> has been approved.</p><p>Total payable on delivery: <strong>${money(order.total)}</strong></p><p>We will contact you at ${order.phone} before dispatch.</p></main>`;
  const connections = createConnections({ CONNECTIONS: env.CONNECTIONS! });
  const response = await connections[entry.alias].fetch("/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.NOTIFICATION_FROM_EMAIL,
      to: [order.email],
      subject,
      html,
      text: `Your Cool Masala COD order #${order.id} has been approved. Total payable on delivery: ${money(order.total)}.`,
    }),
  });
  if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);
}

export type { NotificationEnv, OrderNotification, LowStockNotification };
