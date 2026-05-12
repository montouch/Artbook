"use client";

import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, FileDown } from "lucide-react";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    description?: string | null;
    price: number;
    image?: string | null;
    type: string;
    seller: {
      id: string;
      name: string | null;
      image?: string | null;
      profileColor?: string | null;
      verified?: boolean;
    };
  };
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="overflow-hidden group">
      {/* Product Image */}
      <div className="relative aspect-square bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 200 200">
            <pattern id={`prod-${product.id}`} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M15 0 L30 15 L15 30 L0 15Z" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="200" height="200" fill={`url(#prod-${product.id})`} />
          </svg>
        </div>
        {product.type === "MERCH" ? (
          <Package className="w-12 h-12 text-white/15" />
        ) : (
          <FileDown className="w-12 h-12 text-white/15" />
        )}

        <div className="absolute top-3 left-3">
          <Badge variant={product.type === "DIGITAL" ? "genre" : "default"}>
            {product.type === "DIGITAL" ? "Digital" : "Merch"}
          </Badge>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-white font-medium text-sm truncate">{product.title}</h3>
        {product.description && (
          <p className="text-white/40 text-xs mt-1 line-clamp-2">{product.description}</p>
        )}

        <div className="flex items-center gap-2 mt-3">
          <Avatar
            name={product.seller.name}
            size="sm"
            color={product.seller.profileColor || undefined}
          />
          <span className="text-white/50 text-xs">{product.seller.name}</span>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
          <span className="text-white font-bold text-lg">${product.price.toFixed(2)}</span>
          <Button size="sm">
            <ShoppingCart className="w-3.5 h-3.5" />
            Buy
          </Button>
        </div>
      </div>
    </Card>
  );
}
