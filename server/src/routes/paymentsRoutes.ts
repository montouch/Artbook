import { Router } from "express";
import { z } from "zod";
import { createCheckoutIntent } from "../modules/payments/paymentsService.js";

const checkoutSchema = z.object({
  amountUsd: z.number().positive(),
  provider: z.enum(["stripe", "paypal"])
});

export const paymentsRoutes = Router();

paymentsRoutes.post("/checkout-intent", (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  return res.json({ intent: createCheckoutIntent(parsed.data.amountUsd, parsed.data.provider) });
});
