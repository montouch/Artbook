"use client";

import { ContentCard } from "@/components/feed/content-card";
import { StatusBar } from "@/components/feed/status-bar";
import { DiscoverySection } from "@/components/feed/discovery-section";
import { mockContent } from "@/lib/mock-data";
import { genres } from "@/lib/utils";
import { useState } from "react";
import { Flame, TrendingUp, Clock, Sparkles } from "lucide-react";

export default function FeedPage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("forYou");

  const filteredContent = selectedGenre
    ? mockContent.filter((c) => c.genre === selectedGenre)
    : mockContent;

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-8">
      {/* Stories / Status */}
      <StatusBar />

      {/* Feed tabs */}
      <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 w-fit">
        {[
          { id: "forYou", label: "For You", icon: Sparkles },
          { id: "trending", label: "Trending", icon: TrendingUp },
          { id: "latest", label: "Latest", icon: Clock },
          { id: "following", label: "Following", icon: Flame },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Genre filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setSelectedGenre(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !selectedGenre
              ? "bg-indigo-600 text-white"
              : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
          }`}
        >
          All
        </button>
        {genres.slice(0, 12).map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre === selectedGenre ? null : genre)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedGenre === genre
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredContent.map((content) => (
          <ContentCard key={content.id} content={content} />
        ))}
      </div>

      {filteredContent.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/30 text-lg">No content found for this genre</p>
          <button
            onClick={() => setSelectedGenre(null)}
            className="text-indigo-400 text-sm mt-2 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Discovery section */}
      <div className="pt-4">
        <DiscoverySection />
      </div>

      {/* Load more */}
      <div className="text-center py-8">
        <button className="text-white/30 hover:text-white/50 text-sm transition-colors">
          Scroll for more...
        </button>
      </div>
    </div>
  );
}
