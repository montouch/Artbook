import { ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/data";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <ShoppingBag />
      <span>{product.kind.replace("-", " ")}</span>
      <h3>{product.title}</h3>
      <p>
        {product.seller} · {product.palette}
      </p>
      <p>{product.description}</p>
      <div className="product-footer">
        <strong>{product.price}</strong>
        <em>{product.sellerType}</em>
      </div>
    </article>
  );
}
