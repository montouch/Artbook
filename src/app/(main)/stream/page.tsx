"use client";

import { StreamCard } from "@/components/streaming/stream-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockStreams } from "@/lib/mock-data";
import { Radio, Calendar, Archive, Crown, Plus } from "lucide-react";
import { useState } from "react";

export default function StreamPage() {
  const [tab, setTab] = useState("live");

  const liveStreams = mockStreams.filter((s) => s.isLive);
  const upcomingStreams = mockStreams.filter((s) => !s.isLive);

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Radio className="w-7 h-7 text-red-400" />
            Streaming Hub
          </h1>
          <p className="text-white/40 text-sm mt-1">Watch live streams and discover creators</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Go Live
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 w-fit">
        {[
          { id: "live", label: "Live Now", icon: Radio, count: liveStreams.length },
          { id: "upcoming", label: "Upcoming", icon: Calendar, count: upcomingStreams.length },
          { id: "past", label: "Past Streams", icon: Archive },
          { id: "premium", label: "Premium", icon: Crown },
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
            {t.count !== undefined && (
              <Badge variant={t.id === "live" ? "live" : "default"} className="ml-1">
                {t.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Featured stream */}
      {tab === "live" && liveStreams.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950/50 to-purple-950/50 border border-white/[0.06] p-8">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" viewBox="0 0 800 400">
              <pattern id="featured-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="3" fill="white" />
                <circle cx="20" cy="20" r="15" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
              <rect width="800" height="400" fill="url(#featured-pattern)" />
            </svg>
          </div>
          <div className="relative flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1">
              <Badge variant="live" className="mb-4">
                <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5" />
                LIVE NOW
              </Badge>
              <h2 className="text-2xl font-bold text-white">{liveStreams[0].title}</h2>
              <p className="text-white/50 mt-2">{liveStreams[0].streamer.name}</p>
              <p className="text-white/30 text-sm mt-1">
                {liveStreams[0].viewerCount.toLocaleString()} watching
              </p>
              <Button className="mt-6" size="lg">
                <Radio className="w-5 h-5" />
                Watch Now
              </Button>
            </div>
            <div className="w-64 h-40 rounded-xl bg-black/30 flex items-center justify-center border border-white/10">
              <Radio className="w-12 h-12 text-white/10" />
            </div>
          </div>
        </div>
      )}

      {/* Stream grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(tab === "live" ? liveStreams : tab === "upcoming" ? upcomingStreams : mockStreams).map(
          (stream) => (
            <StreamCard key={stream.id} stream={stream} />
          )
        )}
      </div>

      {tab === "past" && (
        <div className="text-center py-20">
          <Archive className="w-12 h-12 text-white/10 mx-auto" />
          <p className="text-white/30 mt-4">Past streams will appear here</p>
        </div>
      )}

      {tab === "premium" && (
        <div className="text-center py-20">
          <Crown className="w-12 h-12 text-amber-500/30 mx-auto" />
          <p className="text-white/30 mt-4">Premium streams are available to subscribers</p>
          <Button variant="outline" className="mt-4">
            <Crown className="w-4 h-4" />
            Upgrade to Premium
          </Button>
        </div>
      )}
    </div>
  );
}
