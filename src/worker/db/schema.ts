import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

// -----------------------------
// Users Table
// -----------------------------
export const users = sqliteTable('users', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(), // Added for Auth
  role: text('role', { enum: ['admin', 'user'] }).default('user').notNull(),
  balanceUsd: real('balance_usd').default(0).notNull(),
  affiliateCode: text('affiliate_code').unique(),
  referredById: integer('referred_by_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
}, (table) => {
  return {
    emailIdx: uniqueIndex('user_email_idx').on(table.email)
  };
});

export const usersRelations = relations(users, ({ one, many }) => ({
  orders: many(orders),
  downloads: many(downloads),
  tickets: many(tickets),
  ticketMessages: many(ticketMessages),
  reviews: many(reviews),
  abandonedCart: one(abandonedCarts),
  creditTransactions: many(storeCreditTransactions),
}));

// -----------------------------
// Categories Table
// -----------------------------
export const categories = sqliteTable('categories', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  productCategories: many(productCategories),
}));

// -----------------------------
// Product Categories (Many-to-Many)
// -----------------------------
export const productCategories = sqliteTable('product_categories', {
  productId: integer('product_id').references(() => products.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
}, (t) => ({
  pk: index('product_category_pk').on(t.productId, t.categoryId)
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

// -----------------------------
// Products Table
// -----------------------------
export const products = sqliteTable('products', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  priceUsd: real('price_usd').notNull(), // Normal price or max price for pay-what-you-want
  type: text('type', { enum: ['file', 'serial', 'subscription', 'service', 'product'] }).default('file').notNull(),
  pricingModel: text('pricing_model', { enum: ['one-time', 'free', 'pay-what-you-want'] }).default('one-time').notNull(),
  minPriceUsd: real('min_price_usd'), // For pay-what-you-want
  billingInterval: text('billing_interval', { enum: ['monthly', 'yearly'] }), // For subscriptions
  imageUrl: text('image_url'),
  downloadUrl: text('download_url'), // Protected digital product link
  serialKey: text('serial_key'), // Payload for serial products
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
});

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
  volumeDiscounts: many(volumeDiscounts),
  orderItems: many(orderItems),
  downloads: many(downloads),
  productCategories: many(productCategories),
  reviews: many(reviews),
}));

// -----------------------------
// Product Variants Table
// -----------------------------
export const productVariants = sqliteTable('product_variants', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  title: text('title').notNull(), // e.g. "1 Month", "1 Year"
  priceUsd: real('price_usd').notNull(),
  billingInterval: text('billing_interval', { enum: ['monthly', 'yearly'] }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
});

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  orderItems: many(orderItems),
}));

// -----------------------------
// Volume Discounts Table
// -----------------------------
export const volumeDiscounts = sqliteTable('volume_discounts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  minQuantity: integer('min_quantity').notNull(),
  discountPercentage: real('discount_percentage').notNull(),
});

export const volumeDiscountsRelations = relations(volumeDiscounts, ({ one }) => ({
  product: one(products, {
    fields: [volumeDiscounts.productId],
    references: [products.id],
  }),
}));

// -----------------------------
// Coupons Table
// -----------------------------
export const coupons = sqliteTable('coupons', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  discountType: text('discount_type', { enum: ['percentage', 'fixed'] }).notNull(),
  discountValue: real('discount_value').notNull(),
  usageLimit: integer('usage_limit'), // null means unlimited
  usageCount: integer('usage_count').default(0).notNull(),
  expiryDate: integer('expiry_date', { mode: 'timestamp_ms' }), // null means no expiry
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
});

export const couponsRelations = relations(coupons, ({ many }) => ({
  orders: many(orders),
}));

// -----------------------------
// Orders Table (ApiRone Checkout)
// -----------------------------
export const orders = sqliteTable('orders', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  totalUsd: real('total_usd').notNull(),
  discountUsd: real('discount_usd').default(0).notNull(),
  couponId: integer('coupon_id').references(() => coupons.id),
  cryptoCurrency: text('crypto_currency'),
  cryptoAmount: text('crypto_amount'),
  depositAddress: text('deposit_address'),
  cryptoTxHash: text('crypto_tx_hash'),
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).default('pending').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
}, (table) => {
  return {
    userIdIdx: index('order_user_idx').on(table.userId),
    depositAddrIdx: uniqueIndex('order_deposit_addr_idx').on(table.depositAddress)
  };
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  coupon: one(coupons, {
    fields: [orders.couponId],
    references: [coupons.id],
  }),
  items: many(orderItems),
}));

// -----------------------------
// Order Items Table
// -----------------------------
export const orderItems = sqliteTable('order_items', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  variantId: integer('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').default(1).notNull(),
  priceUsd: real('price_usd').notNull(), // Price per unit after variant selection
  totalDiscountUsd: real('total_discount_usd').default(0).notNull(), // e.g. volume discount applied to this item
}, (table) => {
  return {
    orderIdIdx: index('order_item_order_idx').on(table.orderId),
    productIdIdx: index('order_item_product_idx').on(table.productId)
  };
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

// -----------------------------
// Downloads Table (Access Control)
// -----------------------------
export const downloads = sqliteTable('downloads', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  grantedAt: integer('granted_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
}, (table) => {
  return {
    userProductUnique: uniqueIndex('download_user_product_idx').on(table.userId, table.productId),
    userIdIdx: index('download_user_idx').on(table.userId),
    productIdIdx: index('download_product_idx').on(table.productId),
    orderIdIdx: index('download_order_idx').on(table.orderId)
  };
});

export const downloadsRelations = relations(downloads, ({ one }) => ({
  user: one(users, {
    fields: [downloads.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [downloads.productId],
    references: [products.id],
  }),
  order: one(orders, {
    fields: [downloads.orderId],
    references: [orders.id],
  }),
}));

// -----------------------------
// Tickets Table (Support)
// -----------------------------
export const tickets = sqliteTable('tickets', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  subject: text('subject').notNull(),
  status: text('status', { enum: ['open', 'resolved', 'closed'] }).default('open').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
});

export const ticketMessages = sqliteTable('ticket_messages', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id').references(() => tickets.id).notNull(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
});

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketMessages.ticketId],
    references: [tickets.id],
  }),
  sender: one(users, {
    fields: [ticketMessages.senderId],
    references: [users.id],
  }),
}));

// -----------------------------
// Reviews / Vouches Table
// -----------------------------
export const reviews = sqliteTable('reviews', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  approved: integer('approved', { mode: 'boolean' }).default(false).notNull(), // Needs admin approval to show publicly
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
}, (table) => {
  return {
    productIdx: index('review_product_idx').on(table.productId),
    userProductUnique: uniqueIndex('review_user_product_idx').on(table.userId, table.productId)
  };
});

export const vouchRequests = sqliteTable('vouch_requests', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  token: text('token').notNull().unique(), // for secure email links
  rewarded: integer('rewarded', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
});

export const vouchRequestsRelations = relations(vouchRequests, ({ one }) => ({
  user: one(users, {
    fields: [vouchRequests.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [vouchRequests.orderId],
    references: [orders.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

// -----------------------------
// Abandoned Carts Table
// -----------------------------
export const abandonedCarts = sqliteTable('abandoned_carts', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull().unique(), // One active cart per user
  cartDataJson: text('cart_data_json').notNull(), // JSON string of cart items
  recovered: integer('recovered', { mode: 'boolean' }).default(false).notNull(),
  emailSentAt: integer('email_sent_at', { mode: 'timestamp_ms' }), // Track if reminder was sent
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
});

export const abandonedCartsRelations = relations(abandonedCarts, ({ one }) => ({
  user: one(users, {
    fields: [abandonedCarts.userId],
    references: [users.id],
  }),
}));

// -----------------------------
// Store Credit Transactions Table
// -----------------------------
export const storeCreditTransactions = sqliteTable('store_credit_transactions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  amountUsd: real('amount_usd').notNull(), // positive for additions, negative for deductions
  reason: text('reason').notNull(), // e.g. "Affiliate Payout", "Admin Top-up", "Order Payment"
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
});

export const storeCreditTransactionsRelations = relations(storeCreditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [storeCreditTransactions.userId],
    references: [users.id],
  }),
}));

// -----------------------------
// Blacklist Table (Fraud Prevention)
// -----------------------------
export const blacklist = sqliteTable('blacklist', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['ip', 'email'] }).notNull(),
  value: text('value').notNull(), // The IP address or Email address
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(strftime('%s', 'now') * 1000)`).notNull(),
}, (table) => {
  return {
    valueUniqueIdx: uniqueIndex('blacklist_value_idx').on(table.value)
  };
});
