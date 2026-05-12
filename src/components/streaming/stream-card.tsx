"use client";

import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import { Eye, Clock, Lock, Radio } from "lucide-react";
import Link from "next/link";

interface StreamCardProps {
  stream: {
    id: string;
    title: string;
    isLive: boolean;
    isPremium: boolean;
    viewerCount: number;
    thumbnailUrl?: string | null;
    scheduledAt?: Date;
    startedAt?: Date;
    streamer: {
      id: string;
      name: string | null;
      image?: string | null;
      profileColor?: string | null;
      verified?: boolean;
    };
  };
}

export function StreamCard({ stream }: StreamCardProps) {
  return (
    <Link href={`/stream/${stream.id}`}>
      <Card className="overflow-hidden group">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gradient-to-br from-purple-950/60 to-slate-950 flex items-center justify-center">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" viewBox="0 0 400 225">
              <pattern id={`stream-${stream.id}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1" fill="white" />
              </pattern>
              <rect width="400" height="225" fill={`url(#stream-${stream.id})`} />
            </svg>
          </div>

          <Radio className="w-12 h-12 text-white/20" />

          {/* Status badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {stream.isLive ? (
              <Badge variant="live">
                <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5" />
                LIVE
              </Badge>
            ) : (
              <Badge variant="default">
                <Clock className="w-3 h-3 mr-1" />
                Upcoming
              </Badge>
            )}
            {stream.isPremium && (
              <Badge variant="premium">
                <Lock className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>

          {/* Viewer count */}
          {stream.isLive && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-white/80">
              <Eye className="w-3 h-3" />
              {formatNumber(stream.viewerCount)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex gap-3">
          <Avatar
            name={stream.streamer.name}
            size="md"
            color={stream.streamer.profileColor || undefined}
            verified={stream.streamer.verified}
          />
          <div className="min-w-0">
            <h3 className="text-white font-medium text-sm truncate">{stream.title}</h3>
            <p className="text-white/50 text-xs mt-0.5">{stream.streamer.name}</p>
            {!stream.isLive && stream.scheduledAt && (
              <p className="text-indigo-400 text-xs mt-1">
                {stream.scheduledAt.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
