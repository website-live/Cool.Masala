import { DurableObject } from "cloudflare:workers";

export type ProductCategory = "Blended Masala" | "Whole Spices" | "Chilli Powders" | "Turmeric" | "Gift Packs" | "Printed T-Shirts";

interface ItemStoreEnv {}

export interface StoreProduct extends Record<string, SqlStorageValue> {
  id: number;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  image: string;
  badge: string | null;
  stock: number;
  active: number;
  updatedAt: string;
}

export type OrderApprovalStatus = "PENDING_ADMIN_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED";
export type OrderFulfilmentStatus = "Pending" | "Packed" | "Dispatched" | "Delivered";
export type StoreOrderStatus = OrderApprovalStatus | OrderFulfilmentStatus;

export interface StoreOrder extends Record<string, SqlStorageValue> {
  id: number;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  items: string;
  itemData: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  giftIncluded: number;
  paymentStatus: "Paid" | "COD" | "Pending";
  orderStatus: StoreOrderStatus;
  createdAt: string;
}

export interface LowStockItem { productId: number; name: string; stock: number; threshold: number; }
export interface CreateOrderResult { order: StoreOrder; lowStock: LowStockItem[] }
export interface StoreHealthSummary extends Record<string, SqlStorageValue> { orders: number; pendingApproval: number; rejected: number; cancelled: number; lowStock: number; errorLogs: number; notificationLogs: number; }
export interface StoreHealthMetrics extends StoreHealthSummary { dbLatencyMs: number; }
export interface StoreHealthMetrics extends StoreHealthSummary { dbLatencyMs: number; }

export interface StoreExpense extends Record<string, SqlStorageValue> {
  id: number;
  label: string;
  amount: number;
  category: string;
  createdAt: string;
}

export interface DashboardSummary {
  productCount: number;
  activeProducts: number;
  stockUnits: number;
  lowStockCount: number;
  orderCount: number;
  pendingOrders: number;
  sales: number;
  expenses: number;
}

export interface StoreSettings extends Record<string, SqlStorageValue> {
  storeName: string;
  supportPhone: string;
  lowStockThreshold: number;
  announcement: string;
}

const seedProducts: Omit<StoreProduct, "id" | "updatedAt" | "active">[] = [
  { name: "Royal Garam Masala", description: "Aromatic house blend · 100 g", category: "Blended Masala", price: 149, mrp: 179, rating: 4.9, reviews: 128, image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=85", badge: "Bestseller", stock: 48 },
  { name: "Kashmiri Lal Mirch", description: "Vibrant colour, gentle heat · 100 g", category: "Chilli Powders", price: 129, mrp: 159, rating: 4.8, reviews: 94, image: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=900&q=85", badge: "New arrival", stock: 23 },
  { name: "Green Cardamom", description: "Handpicked whole pods · 50 g", category: "Whole Spices", price: 249, mrp: 299, rating: 5, reviews: 67, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85", badge: null, stock: 8 },
  { name: "Haldi Sunshine", description: "Single-origin turmeric · 100 g", category: "Turmeric", price: 99, mrp: 125, rating: 4.9, reviews: 156, image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=900&q=85", badge: "Daily essential", stock: 61 },
  { name: "The Tadka Gift Pack", description: "Six pantry masalas · 6 × 50 g", category: "Gift Packs", price: 599, mrp: 699, rating: 4.9, reviews: 42, image: "https://images.unsplash.com/photo-1599909533730-f9d3802a7f30?auto=format&fit=crop&w=900&q=85", badge: "Gift favourite", stock: 12 },
  { name: "Black Peppercorns", description: "Bold Malabar pepper · 100 g", category: "Whole Spices", price: 179, mrp: 219, rating: 4.8, reviews: 73, image: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=900&q=85", badge: null, stock: 34 },
  { name: "Chaat Masala Zing", description: "Tangy street-style blend · 100 g", category: "Blended Masala", price: 119, mrp: 145, rating: 4.7, reviews: 86, image: "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=900&q=85", badge: "Popular", stock: 27 },
  { name: "Cumin Seeds", description: "Earthy whole jeera · 100 g", category: "Whole Spices", price: 109, mrp: 135, rating: 4.8, reviews: 61, image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=85", badge: null, stock: 18 },
];

const seedApparel: Omit<StoreProduct, "id" | "updatedAt" | "active">[] = [
  { name: "Masala Mood Graphic Tee", description: "Unisex printed cotton t-shirt · S–XXL", category: "Printed T-Shirts", price: 699, mrp: 999, rating: 4.8, reviews: 0, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85", badge: "Free mini masala", stock: 25 },
  { name: "Chilli Pepper Oversized Tee", description: "Street-fit printed t-shirt · S–XXL", category: "Printed T-Shirts", price: 799, mrp: 1199, rating: 4.7, reviews: 0, image: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85", badge: "New arrival", stock: 18 },
  { name: "Tadka Club Black Tee", description: "Premium oversized cotton · S–XXL", category: "Printed T-Shirts", price: 749, mrp: 1099, rating: 4.9, reviews: 0, image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85", badge: "Free masala gift", stock: 14 },
];

export class ItemStore extends DurableObject<ItemStoreEnv> {
  constructor(ctx: DurableObjectState, env: ItemStoreEnv) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        mrp REAL NOT NULL,
        rating REAL NOT NULL DEFAULT 0,
        reviews INTEGER NOT NULL DEFAULT 0,
        image TEXT NOT NULL,
        badge TEXT,
        stock INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        payment_status TEXT NOT NULL,
        order_status TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    const orderColumns = new Set(this.ctx.storage.sql.exec<{ name: string }>("PRAGMA table_info(orders)").toArray().map((column) => column.name));
    if (!orderColumns.has("email")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN email TEXT NOT NULL DEFAULT ''");
    if (!orderColumns.has("address")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN address TEXT NOT NULL DEFAULT ''");
    if (!orderColumns.has("subtotal")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN subtotal REAL NOT NULL DEFAULT 0");
    if (!orderColumns.has("shipping_fee")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN shipping_fee REAL NOT NULL DEFAULT 0");
    if (!orderColumns.has("discount")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN discount REAL NOT NULL DEFAULT 0");
    if (!orderColumns.has("gift_included")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN gift_included INTEGER NOT NULL DEFAULT 0");
    if (!orderColumns.has("item_data")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN item_data TEXT NOT NULL DEFAULT '{}'");
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS order_rate_limits (phone TEXT NOT NULL, ip TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS idx_order_rate_limits_lookup ON order_rate_limits(phone, ip, created_at);
      CREATE TABLE IF NOT EXISTS error_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, message TEXT NOT NULL, context TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS notification_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, message TEXT NOT NULL, order_id INTEGER, payload TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    `);
    const count = this.ctx.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM products").one().count;
    if (count === 0) {
      for (const product of seedProducts) this.insertSeedProduct(product);
    }
    const apparelCount = this.ctx.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM products WHERE category = 'Printed T-Shirts'").one().count;
    if (apparelCount === 0) {
      for (const product of seedApparel) this.insertSeedProduct(product);
    }
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('storeName', 'Cool Masala')");
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('supportPhone', '')");
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('lowStockThreshold', '10')");
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('announcement', 'Free delivery on orders over ₹499')");
  }

  private insertSeedProduct(product: Omit<StoreProduct, "id" | "updatedAt" | "active">): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO products (name, description, category, price, mrp, rating, reviews, image, badge, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      product.name, product.description, product.category, product.price, product.mrp, product.rating, product.reviews, product.image, product.badge, product.stock,
    );
  }

  listProducts(includeInactive = false): StoreProduct[] {
    const query = includeInactive
      ? "SELECT id, name, description, category, price, mrp, rating, reviews, image, badge, stock, active, updated_at AS updatedAt FROM products ORDER BY id DESC"
      : "SELECT id, name, description, category, price, mrp, rating, reviews, image, badge, stock, active, updated_at AS updatedAt FROM products WHERE active = 1 ORDER BY id DESC";
    return this.ctx.storage.sql.exec<StoreProduct>(query).toArray();
  }

  getDashboard(): DashboardSummary {
    const products = this.ctx.storage.sql.exec<{ productCount: number; activeProducts: number; stockUnits: number }>("SELECT COUNT(*) AS productCount, SUM(active) AS activeProducts, COALESCE(SUM(stock), 0) AS stockUnits FROM products").one();
    const orders = this.ctx.storage.sql.exec<{ orderCount: number; pendingOrders: number; sales: number }>("SELECT COUNT(*) AS orderCount, SUM(CASE WHEN order_status IN ('PENDING_ADMIN_APPROVAL', 'Pending', 'Packed') THEN 1 ELSE 0 END) AS pendingOrders, COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total ELSE 0 END), 0) AS sales FROM orders").one();
    const expenses = this.ctx.storage.sql.exec<{ expenses: number }>("SELECT COALESCE(SUM(amount), 0) AS expenses FROM expenses").one().expenses;
    const threshold = Number(this.getSettings().lowStockThreshold);
    const lowStockCount = this.ctx.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM products WHERE active = 1 AND stock <= ?", threshold).one().count;
    return { productCount: products.productCount, activeProducts: products.activeProducts ?? 0, stockUnits: products.stockUnits ?? 0, lowStockCount, orderCount: orders.orderCount, pendingOrders: orders.pendingOrders ?? 0, sales: orders.sales ?? 0, expenses };
  }

  listOrders(): StoreOrder[] {
    return this.ctx.storage.sql.exec<StoreOrder>("SELECT id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, order_status AS orderStatus, created_at AS createdAt FROM orders ORDER BY id DESC").toArray();
  }

  listPendingApprovals(): StoreOrder[] {
    return this.ctx.storage.sql.exec<StoreOrder>("SELECT id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, order_status AS orderStatus, created_at AS createdAt FROM orders WHERE order_status = 'PENDING_ADMIN_APPROVAL' ORDER BY id ASC").toArray();
  }

  listExpenses(): StoreExpense[] {
    return this.ctx.storage.sql.exec<StoreExpense>("SELECT id, label, amount, category, created_at AS createdAt FROM expenses ORDER BY id DESC").toArray();
  }

  getSettings(): StoreSettings {
    const rows = this.ctx.storage.sql.exec<{ key: string; value: string }>("SELECT key, value FROM settings").toArray();
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return { storeName: values.storeName ?? "Cool Masala", supportPhone: values.supportPhone ?? "", lowStockThreshold: Number(values.lowStockThreshold ?? 10), announcement: values.announcement ?? "" };
  }

  updateProduct(id: number, fields: Partial<Pick<StoreProduct, "name" | "description" | "category" | "price" | "mrp" | "image" | "badge" | "stock" | "active">>): void {
    const allowed = new Set(["name", "description", "category", "price", "mrp", "image", "badge", "stock", "active"]);
    const entries = Object.entries(fields).filter(([key, value]) => allowed.has(key) && value !== undefined);
    if (!entries.length) return;
    const assignments = entries.map(([key]) => `${key === "updatedAt" ? "updated_at" : key} = ?`).join(", ");
    const values = entries.map(([, value]) => value === null ? null : value);
    this.ctx.storage.sql.exec(`UPDATE products SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, ...values, id);
  }

  createProduct(product: Omit<StoreProduct, "id" | "updatedAt" | "rating" | "reviews" | "active">): StoreProduct {
    return this.ctx.storage.sql.exec<StoreProduct>(
      "INSERT INTO products (name, description, category, price, mrp, rating, reviews, image, badge, stock) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?) RETURNING id, name, description, category, price, mrp, rating, reviews, image, badge, stock, active, updated_at AS updatedAt",
      product.name, product.description, product.category, product.price, product.mrp, product.image, product.badge, product.stock,
    ).one();
  }

  createOrder(input: { customerName: string; email: string; phone: string; address: string; ipAddress: string; items: { productId: number; quantity: number }[] }): CreateOrderResult {
    if (!input.items.length) throw new Error("Cart is empty");
    let created: StoreOrder | null = null;
    let lowStock: LowStockItem[] = [];
    this.ctx.storage.transactionSync(() => {
      const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const recent = this.ctx.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM order_rate_limits WHERE (phone = ? OR ip = ?) AND created_at >= ?", input.phone, input.ipAddress, cutoff).one().count;
      if (recent >= 2) throw new Error("Too many orders from this phone and network. Please try again in 10 minutes.");
      this.ctx.storage.sql.exec("DELETE FROM order_rate_limits WHERE created_at < ?", cutoff);
      const lines: { productId: number; name: string; category: string; quantity: number; price: number; stockAfter: number }[] = [];
      for (const requested of input.items) {
        if (!Number.isInteger(requested.productId) || !Number.isInteger(requested.quantity) || requested.quantity < 1 || requested.quantity > 100) throw new Error("Invalid cart quantity");
        const product = this.ctx.storage.sql.exec<StoreProduct>("SELECT id, name, category, price, stock, active FROM products WHERE id = ?", requested.productId).one();
        if (product.active !== 1) throw new Error(`${product.name} is no longer available`);
        if (requested.quantity > product.stock) throw new Error(`${product.name} has only ${product.stock} left`);
        lines.push({ productId: product.id, name: product.name, category: product.category, quantity: requested.quantity, price: product.price, stockAfter: product.stock - requested.quantity });
      }
      const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
      const shippingFee = subtotal >= 499 ? 0 : 49;
      const giftIncluded = lines.some((line) => line.category === "Printed T-Shirts") ? 1 : 0;
      const total = subtotal + shippingFee;
      const itemSummary = lines.map((line) => `${line.name} × ${line.quantity}`).join(", ");
      const itemData = JSON.stringify(lines.map(({ productId, name, category, quantity, price }) => ({ productId, name, category, quantity, price })));
      created = this.ctx.storage.sql.exec<StoreOrder>(
        "INSERT INTO orders (customer_name, email, phone, address, items, item_data, subtotal, shipping_fee, discount, total, gift_included, payment_status, order_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'COD', 'PENDING_ADMIN_APPROVAL') RETURNING id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, order_status AS orderStatus, created_at AS createdAt",
        input.customerName, input.email, input.phone, input.address, itemSummary, itemData, subtotal, shippingFee, total, giftIncluded,
      ).one();
      for (const line of lines) this.ctx.storage.sql.exec("UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", line.quantity, line.productId);
      this.ctx.storage.sql.exec("INSERT INTO order_rate_limits (phone, ip) VALUES (?, ?)", input.phone, input.ipAddress);
      const threshold = this.getSettings().lowStockThreshold;
      lowStock = lines.filter((line) => line.stockAfter <= threshold).map((line) => ({ productId: line.productId, name: line.name, stock: line.stockAfter, threshold }));
    });
    if (!created) throw new Error("Order could not be created");
    return { order: created, lowStock };
  }

  updateOrderStatus(id: number, orderStatus: OrderFulfilmentStatus): void {
    const existing = this.getOrderForUpdate(id);
    if (existing.orderStatus === "PENDING_ADMIN_APPROVAL") throw new Error(`Order ${id} must be approved or rejected before fulfilment updates`);
    if (existing.orderStatus === "REJECTED" || existing.orderStatus === "CANCELLED") throw new Error(`Order ${id} is closed`);
    this.ctx.storage.sql.exec("UPDATE orders SET order_status = ? WHERE id = ?", orderStatus, id);
  }

  approveOrder(id: number): StoreOrder {
    return this.transitionApproval(id, "APPROVED");
  }

  rejectOrder(id: number, reason = "Rejected by administrator"): StoreOrder {
    let order: StoreOrder | null = null;
    this.ctx.storage.transactionSync(() => {
      const existing = this.getOrderForUpdate(id);
      if (existing.orderStatus !== "PENDING_ADMIN_APPROVAL") throw new Error(`Order ${id} is not awaiting approval`);
      const lines = this.parseItemData(existing.itemData, id);
      for (const line of lines) this.ctx.storage.sql.exec("UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", line.quantity, line.productId);
      order = this.ctx.storage.sql.exec<StoreOrder>("UPDATE orders SET order_status = 'REJECTED' WHERE id = ? RETURNING id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, order_status AS orderStatus, created_at AS createdAt", id).one();
      this.logNotification("ORDER_REJECTED", reason, id, { reason });
    });
    if (!order) throw new Error(`Order ${id} could not be rejected`);
    return order;
  }

  bulkApproveOrders(ids: number[]): StoreOrder[] {
    if (!ids.length) return [];
    return ids.map((id) => this.approveOrder(id));
  }

  private getOrderForUpdate(id: number): StoreOrder {
    return this.ctx.storage.sql.exec<StoreOrder>("SELECT id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, order_status AS orderStatus, created_at AS createdAt FROM orders WHERE id = ?", id).one();
  }

  private parseItemData(itemData: string, orderId: number): { productId: number; quantity: number }[] {
    let parsed: unknown;
    try { parsed = JSON.parse(itemData); } catch { throw new Error(`Order ${orderId} has invalid item_data; inventory was not restored`); }
    if (!Array.isArray(parsed) || parsed.some((line) => !line || typeof line !== "object" || !Number.isInteger((line as { productId?: unknown }).productId) || !Number.isInteger((line as { quantity?: unknown }).quantity))) throw new Error(`Order ${orderId} has invalid item_data; inventory was not restored`);
    return parsed as { productId: number; quantity: number }[];
  }

  private transitionApproval(id: number, status: "APPROVED"): StoreOrder {
    const existing = this.getOrderForUpdate(id);
    if (existing.orderStatus !== "PENDING_ADMIN_APPROVAL") throw new Error(`Order ${id} is not awaiting approval`);
    const order = this.ctx.storage.sql.exec<StoreOrder>("UPDATE orders SET order_status = ? WHERE id = ? RETURNING id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, order_status AS orderStatus, created_at AS createdAt", status, id).one();
    this.logNotification("ORDER_APPROVED", "Order approved by administrator", id, {});
    return order;
  }

  logError(code: string, message: string, context: Record<string, unknown> = {}): void {
    this.ctx.storage.sql.exec("INSERT INTO error_logs (code, message, context) VALUES (?, ?, ?)", code, message, JSON.stringify(context));
  }

  logNotification(type: string, message: string, orderId: number | null = null, payload: Record<string, unknown> = {}): void {
    this.ctx.storage.sql.exec("INSERT INTO notification_logs (type, message, order_id, payload) VALUES (?, ?, ?, ?)", type, message, orderId, JSON.stringify(payload));
  }

  getHealthSummary(): StoreHealthSummary {
    const row = this.ctx.storage.sql.exec<StoreHealthSummary>("SELECT (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM orders WHERE order_status = 'PENDING_ADMIN_APPROVAL') AS pendingApproval, (SELECT COUNT(*) FROM orders WHERE order_status = 'REJECTED') AS rejected, (SELECT COUNT(*) FROM orders WHERE order_status = 'CANCELLED') AS cancelled, (SELECT COUNT(*) FROM products WHERE active = 1 AND stock <= ?) AS lowStock, (SELECT COUNT(*) FROM error_logs) AS errorLogs, (SELECT COUNT(*) FROM notification_logs) AS notificationLogs", this.getSettings().lowStockThreshold).one();
    return row;
  }

  getHealthMetrics(): StoreHealthMetrics {
    const started = performance.now();
    const summary = this.getHealthSummary();
    return { ...summary, dbLatencyMs: Math.round((performance.now() - started) * 100) / 100 };
  }

  updateSettings(fields: Partial<Pick<StoreSettings, "storeName" | "supportPhone" | "lowStockThreshold" | "announcement">>): void {
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) this.ctx.storage.sql.exec("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, String(value));
    }
  }
}
