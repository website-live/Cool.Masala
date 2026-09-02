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
  costPerItem: number;
  sku: string;
  barcode: string;
  trackQuantity: number;
  lowStockThreshold: number;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  variants: string;
}

export type OrderApprovalStatus = "PENDING_ADMIN_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED";
export type OrderFulfilmentStatus = "Pending" | "Packed" | "Dispatched" | "Delivered";
export type StoreOrderStatus = OrderApprovalStatus | OrderFulfilmentStatus | "UPI_PENDING_VERIFICATION" | "PAID_PROCESSING" | "COD_PENDING_WHATSAPP_VERIFICATION" | "COD_CONFIRMED_READY_TO_SHIP";

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
  paymentStatus: "Paid" | "COD" | "Pending" | "UPI_PENDING" | "UPI_REJECTED";
  paymentMethod: "COD" | "UPI";
  utr: string;
  screenshotUrl: string;
  orderStatus: StoreOrderStatus;
  createdAt: string;
  courier: string;
  trackingNumber: string;
  cancelledAt: string;
}

export interface LowStockItem { productId: number; name: string; stock: number; threshold: number; }
export interface CreateOrderResult { order: StoreOrder; lowStock: LowStockItem[] }
export interface StoreHealthSummary extends Record<string, SqlStorageValue> { orders: number; pendingApproval: number; rejected: number; cancelled: number; lowStock: number; errorLogs: number; notificationLogs: number; }
export interface StoreHealthMetrics extends StoreHealthSummary { dbLatencyMs: number; }
export interface StoreHealthMetrics extends StoreHealthSummary { dbLatencyMs: number; }

export interface CustomerUser extends Record<string, SqlStorageValue> { id: number; phone: string; createdAt: string; isVerified: number; savedAddresses: string }

export interface StoreCustomer extends Record<string, SqlStorageValue> {
  email: string;
  name: string;
  phone: string;
  address: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
}

export type DiscountType = "percentage" | "fixed";

export interface StoreDiscount extends Record<string, SqlStorageValue> {
  id: number;
  code: string;
  type: DiscountType;
  value: number;
  minimumPurchase: number;
  usageLimit: number | null;
  usageCount: number;
  startsAt: string;
  endsAt: string;
  active: number;
}

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

export interface StoreSettings {
  storeName: string;
  supportPhone: string;
  lowStockThreshold: number;
  announcement: string;
  storeEmail: string;
  currency: string;
  timezone: string;
  codEnabled: number;
  codMinOrder: number;
  codMaxOrder: number;
  upiVpa: string;
  googlePlacesApiKey: string;
  blockedPincodes: string[];
}

type ProductMetadata = "costPerItem" | "sku" | "barcode" | "trackQuantity" | "lowStockThreshold" | "seoTitle" | "seoDescription" | "slug" | "variants";
type ProductInput = Omit<StoreProduct, "id" | "updatedAt" | "active" | ProductMetadata> & Partial<Pick<StoreProduct, ProductMetadata>>;

const seedProducts: Omit<StoreProduct, "id" | "updatedAt" | "active" | ProductMetadata>[] = [
  { name: "Royal Garam Masala", description: "Aromatic house blend · 100 g", category: "Blended Masala", price: 149, mrp: 179, rating: 4.9, reviews: 128, image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=85", badge: "Bestseller", stock: 48 },
  { name: "Kashmiri Lal Mirch", description: "Vibrant colour, gentle heat · 100 g", category: "Chilli Powders", price: 129, mrp: 159, rating: 4.8, reviews: 94, image: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=900&q=85", badge: "New arrival", stock: 23 },
  { name: "Green Cardamom", description: "Handpicked whole pods · 50 g", category: "Whole Spices", price: 249, mrp: 299, rating: 5, reviews: 67, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85", badge: null, stock: 8 },
  { name: "Haldi Sunshine", description: "Single-origin turmeric · 100 g", category: "Turmeric", price: 99, mrp: 125, rating: 4.9, reviews: 156, image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=900&q=85", badge: "Daily essential", stock: 61 },
  { name: "The Tadka Gift Pack", description: "Six pantry masalas · 6 × 50 g", category: "Gift Packs", price: 599, mrp: 699, rating: 4.9, reviews: 42, image: "https://images.unsplash.com/photo-1599909533730-f9d3802a7f30?auto=format&fit=crop&w=900&q=85", badge: "Gift favourite", stock: 12 },
  { name: "Black Peppercorns", description: "Bold Malabar pepper · 100 g", category: "Whole Spices", price: 179, mrp: 219, rating: 4.8, reviews: 73, image: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=900&q=85", badge: null, stock: 34 },
  { name: "Chaat Masala Zing", description: "Tangy street-style blend · 100 g", category: "Blended Masala", price: 119, mrp: 145, rating: 4.7, reviews: 86, image: "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=900&q=85", badge: "Popular", stock: 27 },
  { name: "Cumin Seeds", description: "Earthy whole jeera · 100 g", category: "Whole Spices", price: 109, mrp: 135, rating: 4.8, reviews: 61, image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=85", badge: null, stock: 18 },
];

const seedApparel: Omit<StoreProduct, "id" | "updatedAt" | "active" | ProductMetadata>[] = [
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
    if (!orderColumns.has("courier")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN courier TEXT NOT NULL DEFAULT ''");
    if (!orderColumns.has("tracking_number")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN tracking_number TEXT NOT NULL DEFAULT ''");
    if (!orderColumns.has("cancelled_at")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN cancelled_at TEXT NOT NULL DEFAULT ''");
    if (!orderColumns.has("payment_method")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'COD'");
    if (!orderColumns.has("utr")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN utr TEXT NOT NULL DEFAULT ''");
    if (!orderColumns.has("screenshot_url")) this.ctx.storage.sql.exec("ALTER TABLE orders ADD COLUMN screenshot_url TEXT NOT NULL DEFAULT ''");
    const productColumns = new Set(this.ctx.storage.sql.exec<{ name: string }>("PRAGMA table_info(products)").toArray().map((column) => column.name));
    const productMigrations: [string, string][] = [
      ["cost_per_item", "ALTER TABLE products ADD COLUMN cost_per_item REAL NOT NULL DEFAULT 0"],
      ["sku", "ALTER TABLE products ADD COLUMN sku TEXT NOT NULL DEFAULT ''"],
      ["barcode", "ALTER TABLE products ADD COLUMN barcode TEXT NOT NULL DEFAULT ''"],
      ["track_quantity", "ALTER TABLE products ADD COLUMN track_quantity INTEGER NOT NULL DEFAULT 1"],
      ["low_stock_threshold", "ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 10"],
      ["seo_title", "ALTER TABLE products ADD COLUMN seo_title TEXT NOT NULL DEFAULT ''"],
      ["seo_description", "ALTER TABLE products ADD COLUMN seo_description TEXT NOT NULL DEFAULT ''"],
      ["slug", "ALTER TABLE products ADD COLUMN slug TEXT NOT NULL DEFAULT ''"],
      ["variants", "ALTER TABLE products ADD COLUMN variants TEXT NOT NULL DEFAULT '[]'"],
    ];
    for (const [column, statement] of productMigrations) if (!productColumns.has(column)) this.ctx.storage.sql.exec(statement);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS order_rate_limits (phone TEXT NOT NULL, ip TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS idx_order_rate_limits_lookup ON order_rate_limits(phone, ip, created_at);
      CREATE TABLE IF NOT EXISTS error_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, message TEXT NOT NULL, context TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS notification_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, message TEXT NOT NULL, order_id INTEGER, payload TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS discounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        value REAL NOT NULL,
        minimum_purchase REAL NOT NULL DEFAULT 0,
        usage_limit INTEGER,
        usage_count INTEGER NOT NULL DEFAULT 0,
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS customer_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_verified INTEGER NOT NULL DEFAULT 0,
        saved_addresses TEXT NOT NULL DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS customer_otp_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        used_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_customer_otp_phone_created ON customer_otp_requests(phone, created_at);
      CREATE TABLE IF NOT EXISTS customer_sessions (
        session_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_customer_sessions_expiry ON customer_sessions(expires_at);
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
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('storeEmail', '')");
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'INR')");
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('timezone', 'Asia/Kolkata')");
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('codEnabled', '1')");
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('codMinOrder', '0')");
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('codMaxOrder', '2000')");
    this.ctx.storage.sql.exec("UPDATE settings SET value = '2000' WHERE key = 'codMaxOrder' AND value = '100000'");
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('upiVpa', '')");
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('googlePlacesApiKey', '')");
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('blockedPincodes', '[]')");
  }

  private insertSeedProduct(product: Omit<StoreProduct, "id" | "updatedAt" | "active">): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO products (name, description, category, price, mrp, rating, reviews, image, badge, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      product.name, product.description, product.category, product.price, product.mrp, product.rating, product.reviews, product.image, product.badge, product.stock,
    );
  }

  listProducts(includeInactive = false): StoreProduct[] {
    const fields = "id, name, description, category, price, mrp, rating, reviews, image, badge, stock, active, updated_at AS updatedAt, cost_per_item AS costPerItem, sku, barcode, track_quantity AS trackQuantity, low_stock_threshold AS lowStockThreshold, seo_title AS seoTitle, seo_description AS seoDescription, slug, variants";
    const query = includeInactive
      ? `SELECT ${fields} FROM products ORDER BY id DESC`
      : `SELECT ${fields} FROM products WHERE active = 1 ORDER BY id DESC`;
    return this.ctx.storage.sql.exec<StoreProduct>(query).toArray();
  }

  getDashboard(): DashboardSummary {
    const products = this.ctx.storage.sql.exec<{ productCount: number; activeProducts: number; stockUnits: number }>("SELECT COUNT(*) AS productCount, SUM(active) AS activeProducts, COALESCE(SUM(stock), 0) AS stockUnits FROM products").one();
    const orders = this.ctx.storage.sql.exec<{ orderCount: number; pendingOrders: number; sales: number }>("SELECT COUNT(*) AS orderCount, SUM(CASE WHEN order_status IN ('PENDING_ADMIN_APPROVAL', 'UPI_PENDING_VERIFICATION', 'COD_PENDING_WHATSAPP_VERIFICATION', 'Pending', 'Packed') THEN 1 ELSE 0 END) AS pendingOrders, COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total ELSE 0 END), 0) AS sales FROM orders").one();
    const expenses = this.ctx.storage.sql.exec<{ expenses: number }>("SELECT COALESCE(SUM(amount), 0) AS expenses FROM expenses").one().expenses;
    const threshold = Number(this.getSettings().lowStockThreshold);
    const lowStockCount = this.ctx.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM products WHERE active = 1 AND stock <= ?", threshold).one().count;
    return { productCount: products.productCount, activeProducts: products.activeProducts ?? 0, stockUnits: products.stockUnits ?? 0, lowStockCount, orderCount: orders.orderCount, pendingOrders: orders.pendingOrders ?? 0, sales: orders.sales ?? 0, expenses };
  }

  listOrders(): StoreOrder[] {
    return this.ctx.storage.sql.exec<StoreOrder>("SELECT id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, payment_method AS paymentMethod, utr, screenshot_url AS screenshotUrl, order_status AS orderStatus, created_at AS createdAt, courier, tracking_number AS trackingNumber, cancelled_at AS cancelledAt FROM orders ORDER BY id DESC").toArray();
  }

  listCustomers(): StoreCustomer[] {
    return this.ctx.storage.sql.exec<StoreCustomer>("SELECT email, MAX(customer_name) AS name, MAX(phone) AS phone, MAX(address) AS address, COUNT(*) AS orderCount, COALESCE(SUM(total), 0) AS totalSpent, MAX(created_at) AS lastOrderAt FROM orders WHERE email <> '' GROUP BY email ORDER BY lastOrderAt DESC").toArray();
  }

  listDiscounts(): StoreDiscount[] {
    return this.ctx.storage.sql.exec<StoreDiscount>("SELECT id, code, type, value, minimum_purchase AS minimumPurchase, usage_limit AS usageLimit, usage_count AS usageCount, starts_at AS startsAt, ends_at AS endsAt, active FROM discounts ORDER BY id DESC").toArray();
  }

  listPendingApprovals(): StoreOrder[] {
    return this.ctx.storage.sql.exec<StoreOrder>("SELECT id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, payment_method AS paymentMethod, utr, screenshot_url AS screenshotUrl, order_status AS orderStatus, created_at AS createdAt, courier, tracking_number AS trackingNumber, cancelled_at AS cancelledAt FROM orders WHERE order_status IN ('PENDING_ADMIN_APPROVAL', 'UPI_PENDING_VERIFICATION', 'COD_PENDING_WHATSAPP_VERIFICATION') ORDER BY id ASC").toArray();
  }

  listExpenses(): StoreExpense[] {
    return this.ctx.storage.sql.exec<StoreExpense>("SELECT id, label, amount, category, created_at AS createdAt FROM expenses ORDER BY id DESC").toArray();
  }

  getSettings(): StoreSettings {
    const rows = this.ctx.storage.sql.exec<{ key: string; value: string }>("SELECT key, value FROM settings").toArray();
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    let blockedPincodes: string[] = [];
    try {
      const parsed = JSON.parse(values.blockedPincodes ?? "[]");
      if (Array.isArray(parsed)) blockedPincodes = parsed.filter((value): value is string => typeof value === "string" && /^[1-9][0-9]{5}$/.test(value));
    } catch {}
    return { storeName: values.storeName ?? "Cool Masala", supportPhone: values.supportPhone ?? "", lowStockThreshold: Number(values.lowStockThreshold ?? 10), announcement: values.announcement ?? "", storeEmail: values.storeEmail ?? "", currency: values.currency ?? "INR", timezone: values.timezone ?? "Asia/Kolkata", codEnabled: Number(values.codEnabled ?? 1), codMinOrder: Number(values.codMinOrder ?? 0), codMaxOrder: Number(values.codMaxOrder ?? 2000), upiVpa: values.upiVpa ?? "", googlePlacesApiKey: values.googlePlacesApiKey ?? "", blockedPincodes };
  }

  updateProduct(id: number, fields: Partial<StoreProduct>): void {
    const columnMap: Record<string, string> = { name: "name", description: "description", category: "category", price: "price", mrp: "mrp", image: "image", badge: "badge", stock: "stock", active: "active", costPerItem: "cost_per_item", sku: "sku", barcode: "barcode", trackQuantity: "track_quantity", lowStockThreshold: "low_stock_threshold", seoTitle: "seo_title", seoDescription: "seo_description", slug: "slug", variants: "variants" };
    const entries = Object.entries(fields).filter(([key, value]) => columnMap[key] && value !== undefined);
    if (!entries.length) return;
    const assignments = entries.map(([key]) => `${columnMap[key]} = ?`).join(", ");
    const values = entries.map(([, value]) => value === null ? null : value);
    this.ctx.storage.sql.exec(`UPDATE products SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, ...values, id);
  }

  createProduct(product: ProductInput): StoreProduct {
    return this.ctx.storage.sql.exec<StoreProduct>(
      "INSERT INTO products (name, description, category, price, mrp, rating, reviews, image, badge, stock, cost_per_item, sku, barcode, track_quantity, low_stock_threshold, seo_title, seo_description, slug, variants) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, name, description, category, price, mrp, rating, reviews, image, badge, stock, active, updated_at AS updatedAt, cost_per_item AS costPerItem, sku, barcode, track_quantity AS trackQuantity, low_stock_threshold AS lowStockThreshold, seo_title AS seoTitle, seo_description AS seoDescription, slug, variants",
      product.name, product.description, product.category, product.price, product.mrp, product.image, product.badge, product.stock, product.costPerItem ?? 0, product.sku ?? "", product.barcode ?? "", product.trackQuantity ?? 1, product.lowStockThreshold ?? 10, product.seoTitle ?? "", product.seoDescription ?? "", product.slug ?? "", product.variants ?? "[]",
    ).one();
  }

  createDiscount(discount: Omit<StoreDiscount, "id" | "usageCount">): StoreDiscount {
    return this.ctx.storage.sql.exec<StoreDiscount>("INSERT INTO discounts (code, type, value, minimum_purchase, usage_limit, starts_at, ends_at, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, code, type, value, minimum_purchase AS minimumPurchase, usage_limit AS usageLimit, usage_count AS usageCount, starts_at AS startsAt, ends_at AS endsAt, active", String(discount.code ?? "").toUpperCase(), discount.type, discount.value, discount.minimumPurchase, discount.usageLimit, discount.startsAt, discount.endsAt, discount.active).one();
  }

  updateDiscount(id: number, fields: Partial<Omit<StoreDiscount, "id" | "usageCount">>): void {
    const map: Record<string, string> = { code: "code", type: "type", value: "value", minimumPurchase: "minimum_purchase", usageLimit: "usage_limit", startsAt: "starts_at", endsAt: "ends_at", active: "active" };
    const entries = Object.entries(fields).filter(([key, value]) => map[key] && value !== undefined);
    if (!entries.length) return;

    this.ctx.storage.sql.exec(`UPDATE discounts SET ${entries.map(([key]) => `${map[key]} = ?`).join(", ")} WHERE id = ?`, ...entries.map(([, value]) => value), id);
  }

  deleteDiscount(id: number): void { this.ctx.storage.sql.exec("DELETE FROM discounts WHERE id = ?", id); }

  createOrder(input: { customerName: string; email: string; phone: string; address: string; ipAddress: string; items: { productId: number; quantity: number }[]; paymentMethod: "COD" | "UPI"; utr?: string; screenshotUrl?: string }): CreateOrderResult {
    if (!input.items.length) throw new Error("Cart is empty");
    let created: StoreOrder | null = null;
    let lowStock: LowStockItem[] = [];
    this.ctx.storage.transactionSync(() => {
      const settings = this.getSettings();
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
      const discount = input.paymentMethod === "UPI" ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      const baseShipping = subtotal >= 499 ? 0 : 49;
      const codFee = input.paymentMethod === "COD" ? 50 : 0;
      const shippingFee = baseShipping + codFee;
      const total = subtotal - discount + shippingFee;
      if (input.paymentMethod === "COD" && total > settings.codMaxOrder) throw new Error(`Cash on Delivery is unavailable above ₹${settings.codMaxOrder.toLocaleString("en-IN")}. Please choose UPI.`);
      const giftIncluded = lines.some((line) => line.category === "Printed T-Shirts") ? 1 : 0;
      const paymentStatus = input.paymentMethod === "UPI" ? "UPI_PENDING" : "COD";
      const orderStatus = input.paymentMethod === "UPI" ? "UPI_PENDING_VERIFICATION" : "COD_PENDING_WHATSAPP_VERIFICATION";
      const itemSummary = lines.map((line) => `${line.name} × ${line.quantity}`).join(", ");
      const itemData = JSON.stringify(lines.map(({ productId, name, category, quantity, price }) => ({ productId, name, category, quantity, price })));
      created = this.ctx.storage.sql.exec<StoreOrder>(
        "INSERT INTO orders (customer_name, email, phone, address, items, item_data, subtotal, shipping_fee, discount, total, gift_included, payment_status, payment_method, utr, screenshot_url, order_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, payment_method AS paymentMethod, utr, screenshot_url AS screenshotUrl, order_status AS orderStatus, created_at AS createdAt",
        input.customerName, input.email, input.phone, input.address, itemSummary, itemData, subtotal, shippingFee, discount, total, giftIncluded, paymentStatus, input.paymentMethod, input.utr ?? "", input.screenshotUrl ?? "", orderStatus,
      ).one();
      for (const line of lines) this.ctx.storage.sql.exec("UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", line.quantity, line.productId);
      this.ctx.storage.sql.exec("INSERT INTO order_rate_limits (phone, ip) VALUES (?, ?)", input.phone, input.ipAddress);
      const threshold = settings.lowStockThreshold;
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

  updateFulfillment(id: number, orderStatus: OrderFulfilmentStatus, courier = "", trackingNumber = ""): void {
    this.updateOrderStatus(id, orderStatus);
    this.ctx.storage.sql.exec("UPDATE orders SET courier = ?, tracking_number = ? WHERE id = ?", courier.slice(0, 100), trackingNumber.slice(0, 100), id);
  }

  cancelOrder(id: number): void {
    this.ctx.storage.transactionSync(() => {
      const existing = this.getOrderForUpdate(id);
      if (["CANCELLED", "REJECTED", "Delivered"].includes(existing.orderStatus)) throw new Error(`Order ${id} cannot be cancelled from ${existing.orderStatus}`);
      const lines = this.parseItemData(existing.itemData, id);
      for (const line of lines) this.ctx.storage.sql.exec("UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", line.quantity, line.productId);
      this.ctx.storage.sql.exec("UPDATE orders SET order_status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?", id);
      this.logNotification("ORDER_CANCELLED", "Order cancelled by administrator", id, {});
    });
  }

  approveOrder(id: number): StoreOrder {
    return this.transitionApproval(id, "APPROVED");
  }

  approveUpiPayment(id: number): StoreOrder {
    const existing = this.getOrderForUpdate(id);
    if (existing.paymentMethod !== "UPI" || existing.orderStatus !== "UPI_PENDING_VERIFICATION") throw new Error(`Order #${id} is not awaiting UPI verification`);
    const order = this.ctx.storage.sql.exec<StoreOrder>("UPDATE orders SET payment_status = 'Paid', order_status = 'PAID_PROCESSING' WHERE id = ? RETURNING id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, payment_method AS paymentMethod, utr, screenshot_url AS screenshotUrl, order_status AS orderStatus, created_at AS createdAt", id).one();
    this.logNotification("UPI_APPROVED", "UPI payment approved by administrator", id, {});
    return order;
  }

  rejectUpiPayment(id: number): StoreOrder {
    let order: StoreOrder | null = null;
    this.ctx.storage.transactionSync(() => {
      const existing = this.getOrderForUpdate(id);
      if (existing.paymentMethod !== "UPI" || existing.orderStatus !== "UPI_PENDING_VERIFICATION") throw new Error(`Order #${id} is not awaiting UPI verification`);
      const lines = this.parseItemData(existing.itemData, id);
      for (const line of lines) this.ctx.storage.sql.exec("UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", line.quantity, line.productId);
      order = this.ctx.storage.sql.exec<StoreOrder>("UPDATE orders SET payment_status = 'UPI_REJECTED', order_status = 'REJECTED' WHERE id = ? RETURNING id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, payment_method AS paymentMethod, utr, screenshot_url AS screenshotUrl, order_status AS orderStatus, created_at AS createdAt", id).one();
      this.logNotification("UPI_REJECTED", "UPI payment rejected by administrator", id, {});
    });
    if (!order) throw new Error(`Order #${id} could not be rejected`);
    return order;
  }

  confirmCodOrder(id: number): StoreOrder {
    const existing = this.getOrderForUpdate(id);
    if (existing.paymentMethod !== "COD" || !["COD_PENDING_WHATSAPP_VERIFICATION", "COD_PENDING_VERIFICATION", "PENDING_ADMIN_APPROVAL"].includes(existing.orderStatus)) throw new Error(`Order #${id} is not awaiting COD confirmation`);
    const order = this.ctx.storage.sql.exec<StoreOrder>("UPDATE orders SET order_status = 'COD_CONFIRMED_READY_TO_SHIP' WHERE id = ? RETURNING id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, payment_method AS paymentMethod, utr, screenshot_url AS screenshotUrl, order_status AS orderStatus, created_at AS createdAt", id).one();
    this.logNotification("COD_CONFIRMED", "COD order confirmed for shipping", id, {});
    return order;
  }

  rejectOrder(id: number, reason = "Rejected by administrator"): StoreOrder {
    let order: StoreOrder | null = null;
    this.ctx.storage.transactionSync(() => {
      const existing = this.getOrderForUpdate(id);
      if (existing.orderStatus !== "PENDING_ADMIN_APPROVAL") throw new Error(`Order ${id} is not awaiting approval`);
      const lines = this.parseItemData(existing.itemData, id);
      for (const line of lines) this.ctx.storage.sql.exec("UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", line.quantity, line.productId);
      order = this.ctx.storage.sql.exec<StoreOrder>("UPDATE orders SET order_status = 'REJECTED' WHERE id = ? RETURNING id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, payment_method AS paymentMethod, utr, screenshot_url AS screenshotUrl, order_status AS orderStatus, created_at AS createdAt", id).one();
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
    return this.ctx.storage.sql.exec<StoreOrder>("SELECT id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, payment_method AS paymentMethod, utr, screenshot_url AS screenshotUrl, order_status AS orderStatus, created_at AS createdAt, courier, tracking_number AS trackingNumber, cancelled_at AS cancelledAt FROM orders WHERE id = ?", id).one();
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
    const order = this.ctx.storage.sql.exec<StoreOrder>("UPDATE orders SET order_status = ? WHERE id = ? RETURNING id, customer_name AS customerName, email, phone, address, items, item_data AS itemData, subtotal, shipping_fee AS shippingFee, discount, total, gift_included AS giftIncluded, payment_status AS paymentStatus, payment_method AS paymentMethod, utr, screenshot_url AS screenshotUrl, order_status AS orderStatus, created_at AS createdAt", status, id).one();
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

  requestCustomerOtp(phone: string, codeHash: string, expiresAt: string): void {
    this.ctx.storage.transactionSync(() => {
      const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const recent = this.ctx.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM customer_otp_requests WHERE phone = ? AND julianday(created_at) >= julianday(?)", phone, cutoff).one().count;
      if (recent >= 3) throw new Error("Too many OTP requests. Please try again in 10 minutes.");
      const latest = this.ctx.storage.sql.exec<{ createdAt: string }>("SELECT created_at AS createdAt FROM customer_otp_requests WHERE phone = ? ORDER BY id DESC LIMIT 1", phone).toArray()[0];
      if (latest && Date.now() - new Date(latest.createdAt).getTime() < 30 * 1000) throw new Error("Please wait 30 seconds before requesting another OTP.");
      this.ctx.storage.sql.exec("DELETE FROM customer_otp_requests WHERE julianday(expires_at) < julianday(?) OR julianday(created_at) < julianday(?)", new Date().toISOString(), cutoff);
      this.ctx.storage.sql.exec("INSERT INTO customer_otp_requests (phone, code_hash, expires_at) VALUES (?, ?, ?)", phone, codeHash, expiresAt);
    });
  }

  verifyCustomerOtp(phone: string, codeHash: string): CustomerUser {
    let user: CustomerUser | null = null;
    let failure = "";
    this.ctx.storage.transactionSync(() => {
      const request = this.ctx.storage.sql.exec<{ id: number; codeHash: string; expiresAt: string; attempts: number }>("SELECT id, code_hash AS codeHash, expires_at AS expiresAt, attempts FROM customer_otp_requests WHERE phone = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1", phone).toArray()[0];
      if (!request || new Date(request.expiresAt).getTime() < Date.now()) { failure = "This OTP has expired. Request a new one."; return; }

      if (request.attempts >= 5) { failure = "Too many incorrect OTP attempts. Request a new code."; return; }
      if (request.codeHash !== codeHash) {
        this.ctx.storage.sql.exec("UPDATE customer_otp_requests SET attempts = attempts + 1 WHERE id = ?", request.id);
        failure = "The OTP is incorrect.";
        return;
      }
      this.ctx.storage.sql.exec("UPDATE customer_otp_requests SET used_at = CURRENT_TIMESTAMP WHERE id = ?", request.id);
      this.ctx.storage.sql.exec("INSERT INTO customer_users (phone, is_verified) VALUES (?, 1) ON CONFLICT(phone) DO UPDATE SET is_verified = 1", phone);
      user = this.ctx.storage.sql.exec<CustomerUser>("SELECT id, phone, created_at AS createdAt, is_verified AS isVerified, saved_addresses AS savedAddresses FROM customer_users WHERE phone = ?", phone).one();
    });
    if (failure) throw new Error(failure);
    if (!user) throw new Error("Customer verification could not be completed.");
    return user;
  }

  createCustomerSession(userId: number, sessionHash: string, expiresAt: string): void {
    this.ctx.storage.sql.exec("DELETE FROM customer_sessions WHERE expires_at < ?", new Date().toISOString());
    this.ctx.storage.sql.exec("INSERT INTO customer_sessions (session_hash, user_id, expires_at) VALUES (?, ?, ?)", sessionHash, userId, expiresAt);
  }

  getCustomerBySession(sessionHash: string): CustomerUser | null {
    const row = this.ctx.storage.sql.exec<CustomerUser>("SELECT customer_users.id, customer_users.phone, customer_users.created_at AS createdAt, customer_users.is_verified AS isVerified, customer_users.saved_addresses AS savedAddresses FROM customer_sessions JOIN customer_users ON customer_users.id = customer_sessions.user_id WHERE customer_sessions.session_hash = ? AND customer_sessions.expires_at > ? AND customer_users.is_verified = 1", sessionHash, new Date().toISOString()).toArray()[0];
    return row ?? null;
  }

  updateSettings(fields: Partial<Pick<StoreSettings, "storeName" | "supportPhone" | "lowStockThreshold" | "announcement" | "storeEmail" | "currency" | "timezone" | "codEnabled" | "codMinOrder" | "codMaxOrder" | "upiVpa" | "googlePlacesApiKey" | "blockedPincodes">>): void {
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) this.ctx.storage.sql.exec("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, Array.isArray(value) ? JSON.stringify(value) : String(value));
    }
  }
}
