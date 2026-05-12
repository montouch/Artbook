import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import type { Product } from "../types";

export const MarketplacePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [checkoutResult, setCheckoutResult] = useState("");

  useEffect(() => {
    apiClient
      .getProducts()
      .then((payload) => setProducts(payload.products))
      .catch((error) => console.error(error));
  }, []);

  const checkout = async () => {
    const intent = await apiClient.createCheckoutIntent(20, "stripe");
    setCheckoutResult(intent.intent.clientSecret);
  };

  return (
    <section>
      <h2>Marketplace</h2>
      <p>Creators can sell merch and digital products. Premium fans can become sellers.</p>
      <button onClick={checkout} type="button">
        Simulate Stripe checkout
      </button>
      {checkoutResult && <p className="muted">Client secret: {checkoutResult}</p>}
      <div className="grid">
        {products.map((product) => (
          <article className="card" key={product.id}>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p>${product.priceUsd.toFixed(2)}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
