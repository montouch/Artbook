import { idFactory, products, users } from "../users/userStore.js";
import type { Product } from "../../types/domain.js";

interface CreateProductInput {
  sellerId: string;
  name: string;
  category: "merch" | "digital";
  priceUsd: number;
  description: string;
}

export const createProduct = (input: CreateProductInput): Product => {
  const seller = users.find((user) => user.id === input.sellerId);
  const premiumSellerOnly = seller?.accountType === "fan";

  if (premiumSellerOnly && !seller?.isPremium) {
    throw new Error("Fan sellers must have premium to list products.");
  }

  const product: Product = {
    id: idFactory(),
    premiumSellerOnly,
    ...input
  };
  products.unshift(product);
  return product;
};

export const listProducts = (): Product[] => products;
