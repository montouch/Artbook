"use client";

import { ArtistHeader } from "@/components/profile/artist-header";
import { ContentCard } from "@/components/feed/content-card";
import { ProductCard } from "@/components/marketplace/product-card";
import { Card } from "@/components/ui/card";
import { mockArtists, mockContent, mockProducts } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";
import { Music, Video, ShoppingBag, Radio, Users, Play } from "lucide-react";
import { use, useState } from "react";

export default function ArtistProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const artist = mockArtists.find((a) => a.id === id) || mockArtists[0];
  const artistContent = mockContent.filter((c) => c.artist.id === artist.id);
  const artistProducts = mockProducts.filter((p) => p.seller.id === artist.id);
  const [tab, setTab] = useState("music");

  return (
    <div className="space-y-6">
      <ArtistHeader artist={artist} />

      {/* Stats */}
      <div className="max-w-5xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Tracks", value: artistContent.length, icon: Music },
            { label: "Plays", value: artistContent.reduce((sum, c) => sum + c.plays, 0), icon: Play },
            { label: "Products", value: artistProducts.length, icon: ShoppingBag },
            { label: "Followers", value: artist.followers, icon: Users },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 text-center">
              <stat.icon className="w-5 h-5 text-white/30 mx-auto" />
              <p className="text-white font-bold text-lg mt-2">{formatNumber(stat.value)}</p>
              <p className="text-white/40 text-xs mt-0.5">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 lg:px-8">
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 w-fit">
          {[
            { id: "music", label: "Music", icon: Music },
            { id: "videos", label: "Videos", icon: Video },
            { id: "store", label: "Store", icon: ShoppingBag },
            { id: "live", label: "Live", icon: Radio },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === t.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 lg:px-8 pb-8">
        {(tab === "music" || tab === "videos") && (
          <div className="grid md:grid-cols-2 gap-4">
            {artistContent
              .filter((c) => tab === "music" ? c.type === "AUDIO" : c.type === "VIDEO")
              .map((content) => (
                <ContentCard key={content.id} content={content} />
              ))}
            {artistContent.filter((c) => tab === "music" ? c.type === "AUDIO" : c.type === "VIDEO").length === 0 && (
              <div className="col-span-2 text-center py-20">
                <p className="text-white/30">No {tab === "music" ? "music" : "videos"} yet</p>
              </div>
            )}
          </div>
        )}

        {tab === "store" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {artistProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {artistProducts.length === 0 && (
              <div className="col-span-3 text-center py-20">
                <p className="text-white/30">No products listed yet</p>
              </div>
            )}
          </div>
        )}

        {tab === "live" && (
          <div className="text-center py-20">
            <Radio className="w-12 h-12 text-white/10 mx-auto" />
            <p className="text-white/30 mt-4">No upcoming streams</p>
            <p className="text-white/20 text-sm mt-1">Check back later for live content</p>
          </div>
        )}
      </div>
    </div>
  );
}
