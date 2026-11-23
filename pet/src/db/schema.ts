import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * Çok kiracılı (multi-tenant) veri modeli.
 * Mağazaya ait her tabloda tenant_id bulunur; tüm sorgular src/lib içindeki
 * yardımcılar üzerinden oturumdaki mağazaya göre filtrelenir.
 *
 * Para alanları numeric(12,2), miktar alanları numeric(12,3) — açık mama gibi
 * kilo ile satılan ürünler için ondalıklı stok tutulur.
 */

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });
const qty = (name: string) => numeric(name, { precision: 12, scale: 3, mode: "number" });

// ── Platform ────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  status: text("status", { enum: ["active", "suspended"] }).notNull().default("active"),
  tagline: text("tagline"),
  about: text("about"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  district: text("district"),
  logoPath: text("logo_path"),
  workingHours: text("working_hours"),
  // Satış / teslimat ayarları
  deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
  pickupEnabled: boolean("pickup_enabled").notNull().default(true),
  payCashOnDelivery: boolean("pay_cash_on_delivery").notNull().default(true),
  payCardOnDelivery: boolean("pay_card_on_delivery").notNull().default(true),
  payBankTransfer: boolean("pay_bank_transfer").notNull().default(false),
  iban: text("iban"),
  ibanHolder: text("iban_holder"),
  minOrderAmount: money("min_order_amount").notNull().default(0),
  orderNote: text("order_note"),
  acceptingOrders: boolean("accepting_orders").notNull().default(true),
  // Yasal bilgiler (mesafeli satış için satıcı bilgisi)
  companyTitle: text("company_title"),
  taxOffice: text("tax_office"),
  taxNumber: text("tax_number"),
  orderSeq: integer("order_seq").notNull().default(1000),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const ROLES = ["owner", "staff", "courier"] as const;
export type Role = (typeof ROLES)[number];

export const memberships = pgTable(
  "memberships",
  {
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ROLES }).notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.userId] }), index("memberships_user_idx").on(t.userId)],
);

export const sessions = pgTable(
  "sessions",
  {
    // Çerezdeki token'ın SHA-256 özeti; token'ın kendisi veritabanında tutulmaz.
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/**
 * Ortak barkod kataloğu: bir mağaza bir barkodu tanımladığında, diğer mağazalar
 * aynı barkodu okuttuğunda ürün adı/markası otomatik dolar. Fiyat ve stok
 * paylaşılmaz.
 */
export const catalogItems = pgTable("catalog_items", {
  barcode: text("barcode").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  variantName: text("variant_name"),
  petType: text("pet_type"),
  categoryName: text("category_name"),
  unit: text("unit"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// ── Katalog ─────────────────────────────────────────────────────────────────

export const PET_TYPES = ["kedi", "kopek", "kus", "balik", "kemirgen", "surungen", "genel"] as const;
export type PetType = (typeof PET_TYPES)[number];

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("categories_tenant_slug_uq").on(t.tenantId, t.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    brand: text("brand"),
    petType: text("pet_type", { enum: PET_TYPES }).notNull().default("genel"),
    description: text("description"),
    imagePath: text("image_path"),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("products_tenant_idx").on(t.tenantId, t.isPublished)],
);

export const UNITS = ["adet", "kg"] as const;
export type Unit = (typeof UNITS)[number];

/** Satılabilir birim (SKU). Tek boyutlu ürünlerde de bir varyant bulunur. */
export const variants = pgTable(
  "variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    sku: text("sku"),
    barcode: text("barcode"),
    unit: text("unit", { enum: UNITS }).notNull().default("adet"),
    price: money("price").notNull(),
    compareAtPrice: money("compare_at_price"),
    costPrice: money("cost_price"),
    stockQty: qty("stock_qty").notNull().default(0),
    lowStockThreshold: qty("low_stock_threshold").notNull().default(2),
    isActive: boolean("is_active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("variants_product_idx").on(t.productId),
    uniqueIndex("variants_tenant_barcode_uq")
      .on(t.tenantId, t.barcode)
      .where(sql`${t.barcode} is not null`),
  ],
);

// ── Stok ────────────────────────────────────────────────────────────────────

/** Son kullanma tarihli parti. SKT uyarıları ve FEFO (ilk biten ilk çıkar) için. */
export const stockBatches = pgTable(
  "stock_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => variants.id, { onDelete: "cascade" }),
    lotNo: text("lot_no"),
    expiryDate: date("expiry_date", { mode: "string" }),
    qtyRemaining: qty("qty_remaining").notNull(),
    receivedAt: ts("received_at").notNull().defaultNow(),
  },
  (t) => [index("stock_batches_variant_idx").on(t.variantId), index("stock_batches_expiry_idx").on(t.tenantId, t.expiryDate)],
);

export const MOVEMENT_TYPES = [
  "receive", // mal kabul
  "sale_pos", // mağaza satışı
  "sale_online", // online sipariş (stok sipariş anında düşer)
  "cancel", // sipariş iptali ile iade
  "return", // müşteri iadesi
  "waste", // fire / bozuk / SKT geçmiş
  "count", // sayım farkı
  "adjust", // elle düzeltme
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** Stok defteri: her değişiklik bir satır. variants.stock_qty bunun önbelleğidir. */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => variants.id, { onDelete: "cascade" }),
    type: text("type", { enum: MOVEMENT_TYPES }).notNull(),
    qtyDelta: qty("qty_delta").notNull(),
    balanceAfter: qty("balance_after").notNull(),
    unitCost: money("unit_cost"),
    orderId: uuid("order_id"),
    note: text("note"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("stock_movements_tenant_idx").on(t.tenantId, t.createdAt),
    index("stock_movements_variant_idx").on(t.variantId, t.createdAt),
  ],
);

// ── Teslimat ────────────────────────────────────────────────────────────────

export const deliveryZones = pgTable(
  "delivery_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    fee: money("fee").notNull().default(0),
    minOrder: money("min_order").notNull().default(0),
    freeOver: money("free_over"),
    etaText: text("eta_text"),
    isActive: boolean("is_active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("delivery_zones_tenant_idx").on(t.tenantId)],
);

// ── Müşteri & Sipariş ───────────────────────────────────────────────────────

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    zoneId: uuid("zone_id").references(() => deliveryZones.id, { onDelete: "set null" }),
    orderCount: integer("order_count").notNull().default(0),
    totalSpent: money("total_spent").notNull().default(0),
    lastOrderAt: ts("last_order_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customers_tenant_phone_uq").on(t.tenantId, t.phone)],
);

export const ORDER_STATUSES = ["new", "preparing", "on_the_way", "ready", "delivered", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["cash_on_delivery", "card_on_delivery", "bank_transfer", "cash", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    // Müşterinin takip linkindeki tahmin edilemez kod
    code: text("code").notNull().unique(),
    channel: text("channel", { enum: ["online", "pos"] }).notNull(),
    status: text("status", { enum: ORDER_STATUSES }).notNull(),
    fulfillment: text("fulfillment", { enum: ["delivery", "pickup", "instore"] }).notNull(),
    zoneId: uuid("zone_id").references(() => deliveryZones.id, { onDelete: "set null" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    address: text("address"),
    paymentMethod: text("payment_method", { enum: PAYMENT_METHODS }).notNull(),
    paymentStatus: text("payment_status", { enum: ["pending", "paid"] }).notNull().default("pending"),
    subtotal: money("subtotal").notNull(),
    deliveryFee: money("delivery_fee").notNull().default(0),
    discount: money("discount").notNull().default(0),
    total: money("total").notNull(),
    note: text("note"),
    courierId: uuid("courier_id").references(() => users.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_tenant_number_uq").on(t.tenantId, t.number),
    index("orders_tenant_status_idx").on(t.tenantId, t.status, t.createdAt),
    index("orders_courier_idx").on(t.courierId, t.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => variants.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    variantName: text("variant_name"),
    unit: text("unit", { enum: UNITS }).notNull(),
    qty: qty("qty").notNull(),
    unitPrice: money("unit_price").notNull(),
    lineTotal: money("line_total").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: text("status", { enum: ORDER_STATUSES }).notNull(),
    note: text("note"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

// ── Yasal metinler ──────────────────────────────────────────────────────────

export const LEGAL_KINDS = ["kvkk", "gizlilik", "mesafeli-satis", "on-bilgilendirme", "iade"] as const;
export type LegalKind = (typeof LEGAL_KINDS)[number];

export const legalPages = pgTable(
  "legal_pages",
  {
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: LEGAL_KINDS }).notNull(),
    body: text("body").notNull(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.kind] })],
);
