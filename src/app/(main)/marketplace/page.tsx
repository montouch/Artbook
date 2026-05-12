"use client";

import { ProductCard } from "@/components/marketplace/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { mockProducts } from "@/lib/mock-data";
import { Search, ShoppingBag, Plus } from "lucide-react";
import { useState } from "react";

export default function MarketplacePage() {
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const filteredProducts = typeFilter
    ? mockProducts.filter((p) => p.type === typeFilter)
    : mockProducts;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-amber-400" />
            Marketplace
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Discover merch, beats, and digital products from your favorite artists
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Sell Something
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input placeholder="Search products..." icon={<Search className="w-4 h-4" />} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTypeFilter(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              !typeFilter ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === "MERCH" ? null : "MERCH")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              typeFilter === "MERCH" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            Merch
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === "DIGITAL" ? null : "DIGITAL")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              typeFilter === "DIGITAL" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            Digital
          </button>
        </div>
      </div>

      {/* Product grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20">
          <ShoppingBag className="w-12 h-12 text-white/10 mx-auto" />
          <p className="text-white/30 mt-4">No products found</p>
        </div>
      )}
    </div>
  );
}
