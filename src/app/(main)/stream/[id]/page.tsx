"use client";

import { LiveChat } from "@/components/streaming/live-chat";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockStreams } from "@/lib/mock-data";
import { Radio, Eye, Heart, Share2, UserPlus, Gift } from "lucide-react";
import { use } from "react";

export default function StreamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const stream = mockStreams.find((s) => s.id === id) || mockStreams[0];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main stream area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video player area */}
          <div className="relative aspect-video bg-gradient-to-br from-purple-950/40 to-slate-950 rounded-2xl overflow-hidden border border-white/[0.06] flex items-center justify-center">
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" viewBox="0 0 800 450">
                <pattern id="stream-bg" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                  <circle cx="15" cy="15" r="1.5" fill="white" />
                </pattern>
                <rect width="800" height="450" fill="url(#stream-bg)" />
              </svg>
            </div>
            <div className="text-center">
              <Radio className="w-16 h-16 text-white/10 mx-auto" />
              <p className="text-white/20 mt-4 text-sm">Stream Preview</p>
            </div>

            {/* Status overlay */}
            <div className="absolute top-4 left-4 flex gap-2">
              {stream.isLive ? (
                <Badge variant="live">
                  <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5" />
                  LIVE
                </Badge>
              ) : (
                <Badge>Offline</Badge>
              )}
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm text-white/80">
              <Eye className="w-4 h-4" />
              {stream.viewerCount.toLocaleString()}
            </div>
          </div>

          {/* Stream info */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <Avatar
                name={stream.streamer.name}
                size="lg"
                color={stream.streamer.profileColor || undefined}
                verified={stream.streamer.verified}
              />
              <div>
                <h1 className="text-xl font-bold text-white">{stream.title}</h1>
                <p className="text-white/50 text-sm">{stream.streamer.name}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="secondary">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="secondary">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="secondary">
                <Gift className="w-4 h-4" />
                Send Gift
              </Button>
              <Button>
                <UserPlus className="w-4 h-4" />
                Follow
              </Button>
            </div>
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="lg:col-span-1 h-[calc(100vh-10rem)]">
          <LiveChat />
        </div>
      </div>
    </div>
  );
}
