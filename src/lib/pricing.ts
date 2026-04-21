/**
 * Centralized pricing config for all subscription plans.
 * Single source of truth — imported by membership page, API routes, and paypal.ts.
 */

export type PlanCategory = "PREMIUM" | "LEAK_PROTECTION";
export type PlanInterval = "MONTHLY" | "YEARLY" | "LIFETIME";

export type PlanPricing = {
  price: number;
};

export const PLAN_PRICES: Record<PlanCategory, Record<PlanInterval, PlanPricing>> = {
  PREMIUM: {
    MONTHLY: { price: 3 },
    YEARLY: { price: 28.80 },
    LIFETIME: { price: 75 },
  },
  LEAK_PROTECTION: {
    MONTHLY: { price: 10 },
    YEARLY: { price: 96 },
    LIFETIME: { price: 180 },
  },
};

export function getPlanPrice(category: PlanCategory, interval: PlanInterval): number {
  return PLAN_PRICES[category][interval].price;
}

export function getLifetimePrice(category: PlanCategory): string {
  return PLAN_PRICES[category].LIFETIME.price.toFixed(2);
}
