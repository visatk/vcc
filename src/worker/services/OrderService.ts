import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { orders, orderItems, downloads, products, users, coupons, storeCreditTransactions } from '../db/schema';
import { Env } from '../types';
import { AuthUser } from '../middleware/auth';

type CheckoutItem = { productId: number; priceUsd: number; variantId?: number; quantity?: number; totalDiscountUsd?: number };

export class OrderService {
  constructor(private db: ReturnType<typeof getDb>, private _env: Env) {}

  async checkFraud(ip: string | undefined, email: string): Promise<string | null> {
    if (ip) {
      const isBlacklistedIp = await this.db.query.blacklist.findFirst({
        where: (bl, { eq, and }) => and(eq(bl.type, 'ip'), eq(bl.value, ip))
      });
      if (isBlacklistedIp) return 'Checkout blocked by security policy (IP)';
    }
    const isBlacklistedEmail = await this.db.query.blacklist.findFirst({
      where: (bl, { eq, and }) => and(eq(bl.type, 'email'), eq(bl.value, email))
    });
    if (isBlacklistedEmail) return 'Checkout blocked by security policy (Email)';
    return null;
  }

  async calculateCart(items: CheckoutItem[], couponCode?: string, useBalance?: boolean, userBalance: number = 0) {
    let calculatedSubtotal = 0;
    
    for (const item of items) {
      const product = await this.db.query.products.findFirst({ 
        where: eq(products.id, item.productId),
        with: { variants: true, volumeDiscounts: true }
      });
      if (!product) throw new Error(`Product ${item.productId} not found`);

      let expectedPricePerUnit = product.priceUsd;
      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) throw new Error(`Variant ${item.variantId} not found`);
        expectedPricePerUnit = variant.priceUsd;
      }

      if (product.pricingModel === 'free' && item.priceUsd > 0) {
        throw new Error(`Product ${product.title} is free`);
      } else if (product.pricingModel === 'pay-what-you-want') {
        const min = product.minPriceUsd || 0;
        if (item.priceUsd < min) throw new Error(`${product.title} minimum price is $${min}`);
        expectedPricePerUnit = item.priceUsd;
      } else if (product.pricingModel === 'one-time' || product.type === 'subscription') {
        if (item.priceUsd !== expectedPricePerUnit) throw new Error(`Invalid amount for ${product.title}`);
      }

      const qty = item.quantity || 1;
      item.quantity = qty;
      
      let itemTotal = expectedPricePerUnit * qty;
      let itemDiscount = 0;

      if (product.volumeDiscounts && product.volumeDiscounts.length > 0) {
        const applicableDiscounts = product.volumeDiscounts.filter(vd => vd.minQuantity <= qty);
        if (applicableDiscounts.length > 0) {
          applicableDiscounts.sort((a, b) => b.minQuantity - a.minQuantity);
          const bestDiscount = applicableDiscounts[0];
          itemDiscount = itemTotal * (bestDiscount.discountPercentage / 100);
        }
      }

      item.totalDiscountUsd = itemDiscount;
      calculatedSubtotal += (itemTotal - itemDiscount);
    }

    let discountUsd = 0;
    let validCouponId: number | null = null;
    
    if (couponCode) {
      const coupon = await this.db.query.coupons.findFirst({ where: eq(coupons.code, couponCode) });
      if (!coupon || !coupon.isActive || (coupon.expiryDate && Date.now() > coupon.expiryDate.getTime()) || (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)) {
        throw new Error('Invalid, expired, or fully used coupon');
      }
      validCouponId = coupon.id;
      discountUsd = coupon.discountType === 'percentage' ? calculatedSubtotal * (coupon.discountValue / 100) : coupon.discountValue;
    }

    let expectedFinalTotal = Math.max(0, calculatedSubtotal - discountUsd);
    let balanceDeducted = 0;

    if (useBalance && userBalance > 0) {
      balanceDeducted = Math.min(expectedFinalTotal, userBalance);
      expectedFinalTotal = Math.max(0, expectedFinalTotal - balanceDeducted);
    }

    return { calculatedSubtotal, discountUsd, validCouponId, expectedFinalTotal, balanceDeducted };
  }

  async processFreeOrder(user: AuthUser, items: CheckoutItem[], calculatedSubtotal: number, discountUsd: number, validCouponId: number | null, balanceDeducted: number) {
    return this.db.transaction(async (tx) => {
      const insertedOrder = await tx.insert(orders).values({
        userId: user.id,
        totalUsd: calculatedSubtotal,
        discountUsd: discountUsd,
        couponId: validCouponId,
        status: 'completed',
      }).returning().get();
      
      for (const item of items) {
        await tx.insert(orderItems).values({ 
          orderId: insertedOrder.id, 
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity || 1,
          priceUsd: item.priceUsd,
          totalDiscountUsd: item.totalDiscountUsd || 0
        });
        await tx.insert(downloads).values({ userId: user.id, productId: item.productId, orderId: insertedOrder.id });
      }
      
      if (validCouponId) {
        await tx.run(sql`UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ${validCouponId}`);
      }

      if (balanceDeducted > 0) {
        await tx.update(users).set({ balanceUsd: sql`balance_usd - ${balanceDeducted}` }).where(eq(users.id, user.id));
        await tx.insert(storeCreditTransactions).values({ userId: user.id, amountUsd: -balanceDeducted, reason: `Paid for Order #${insertedOrder.id}` });
      }
      
      let isTopup = false;
      if (calculatedSubtotal > 100) {
        isTopup = true;
      } else {
        for (const item of items) {
          const product = await tx.query.products.findFirst({ where: eq(products.id, item.productId) });
          if (product && (product.title.toLowerCase().includes('store credit') || product.title.toLowerCase().includes('top up') || product.title.toLowerCase().includes('top-up'))) {
            isTopup = true;
            break;
          }
        }
      }

      if (isTopup) {
        const bonusAmount = calculatedSubtotal * 0.10;
        await tx.update(users).set({ balanceUsd: sql`balance_usd + ${bonusAmount}` }).where(eq(users.id, user.id));
        await tx.insert(storeCreditTransactions).values({ userId: user.id, amountUsd: bonusAmount, reason: `Top-up Bonus for Order #${insertedOrder.id}` });
      }
      
      return insertedOrder.id;
    });
  }

  async createCryptoOrder(user: AuthUser, items: CheckoutItem[], currency: string, cryptoAmount: string, depositAddress: string, calculatedSubtotal: number, discountUsd: number, validCouponId: number | null, balanceDeducted: number) {
    return this.db.transaction(async (tx) => {
      const insertedOrder = await tx.insert(orders).values({
        userId: user.id,
        totalUsd: calculatedSubtotal,
        discountUsd: discountUsd,
        couponId: validCouponId,
        cryptoCurrency: currency,
        cryptoAmount: cryptoAmount,
        depositAddress: depositAddress,
        status: 'pending' as const,
      }).returning().get();
      
      for (const item of items) {
        await tx.insert(orderItems).values({ 
          orderId: insertedOrder.id, 
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity || 1,
          priceUsd: item.priceUsd,
          totalDiscountUsd: item.totalDiscountUsd || 0
        });
      }
      
      if (validCouponId) {
        await tx.run(sql`UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ${validCouponId}`);
      }

      if (balanceDeducted > 0) {
        await tx.update(users).set({ balanceUsd: sql`balance_usd - ${balanceDeducted}` }).where(eq(users.id, user.id));
        await tx.insert(storeCreditTransactions).values({ userId: user.id, amountUsd: -balanceDeducted, reason: `Partial payment for Order #${insertedOrder.id}` });
      }
      
      let isTopup = false;
      if (calculatedSubtotal > 100) {
        isTopup = true;
      } else {
        for (const item of items) {
          const product = await tx.query.products.findFirst({ where: eq(products.id, item.productId) });
          if (product && (product.title.toLowerCase().includes('store credit') || product.title.toLowerCase().includes('top up') || product.title.toLowerCase().includes('top-up'))) {
            isTopup = true;
            break;
          }
        }
      }

      if (isTopup) {
        const bonusAmount = calculatedSubtotal * 0.10;
        await tx.update(users).set({ balanceUsd: sql`balance_usd + ${bonusAmount}` }).where(eq(users.id, user.id));
        await tx.insert(storeCreditTransactions).values({ userId: user.id, amountUsd: bonusAmount, reason: `Top-up Bonus for Order #${insertedOrder.id}` });
      }
      
      return insertedOrder;
    });
  }
}
