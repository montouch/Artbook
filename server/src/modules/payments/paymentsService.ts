import { idFactory } from "../users/userStore.js";

interface CheckoutIntent {
  id: string;
  amountUsd: number;
  currency: "USD";
  provider: "stripe" | "paypal";
  clientSecret: string;
}

export const createCheckoutIntent = (
  amountUsd: number,
  provider: "stripe" | "paypal"
): CheckoutIntent => ({
  id: idFactory(),
  amountUsd,
  currency: "USD",
  provider,
  clientSecret: `artbook_secret_${Math.random().toString(36).slice(2)}`
});
