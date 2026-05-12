import { Router } from "express";
import { z } from "zod";
import { createProduct, listProducts } from "../modules/marketplace/marketplaceService.js";

const productSchema = z.object({
  sellerId: z.string().min(2),
  name: z.string().min(2),
  category: z.enum(["merch", "digital"]),
  priceUsd: z.number().positive(),
  description: z.string().min(4)
});

export const marketplaceRoutes = Router();

marketplaceRoutes.get("/products", (_req, res) => res.json({ products: listProducts() }));

marketplaceRoutes.post("/products", (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const product = createProduct(parsed.data);
    return res.status(201).json({ product });
  } catch (error) {
    return res.status(403).json({
      error: error instanceof Error ? error.message : "Could not create product"
    });
  }
});
