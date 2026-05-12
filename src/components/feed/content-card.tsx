"use client";

import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatNumber, timeAgo, moodColors } from "@/lib/utils";
import { Play, Heart, MessageCircle, Share2, Lock, Music, Video } from "lucide-react";
import Link from "next/link";

interface ContentCardProps {
  content: {
    id: string;
    title: string;
    description?: string | null;
    type: string;
    genre?: string | null;
    mood?: string | null;
    plays: number;
    likes?: number;
    comments?: number;
    duration?: number | null;
    isPremium: boolean;
    createdAt: Date;
    artist: {
      id: string;
      name: string | null;
      image?: string | null;
      profileColor?: string | null;
      verified?: boolean;
    };
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ContentCard({ content }: ContentCardProps) {
  const mood = content.mood || "default";
  const colors = moodColors[mood] || moodColors.default;

  return (
    <Card className="overflow-hidden group">
      {/* Thumbnail / Visual */}
      <div
        className={`relative aspect-[16/9] bg-gradient-to-br ${colors.bg} flex items-center justify-center overflow-hidden`}
      >
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 225">
            <pattern id={`pattern-${content.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="2" fill="white" />
              <path d="M0 20 L40 20 M20 0 L20 40" stroke="white" strokeWidth="0.5" opacity="0.3" />
            </pattern>
            <rect width="400" height="225" fill={`url(#pattern-${content.id})`} />
          </svg>
        </div>

        {/* Center icon */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 group-hover:scale-110 transition-transform duration-300"
            style={{ boxShadow: `0 0 40px ${colors.primary}40` }}
          >
            {content.type === "AUDIO" ? (
              <Music className="w-7 h-7 text-white" />
            ) : (
              <Video className="w-7 h-7 text-white" />
            )}
          </div>
        </div>

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {content.isPremium && (
            <Badge variant="premium">
              <Lock className="w-3 h-3 mr-1" /> Premium
            </Badge>
          )}
          {content.genre && <Badge variant="genre">{content.genre}</Badge>}
        </div>

        {/* Duration */}
        {content.duration && (
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs text-white/80 font-mono">
            {formatDuration(content.duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex gap-3">
          <Link href={`/artist/${content.artist.id}`}>
            <Avatar
              name={content.artist.name}
              size="md"
              color={content.artist.profileColor || undefined}
              verified={content.artist.verified}
            />
          </Link>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">{content.title}</h3>
            <Link href={`/artist/${content.artist.id}`} className="text-white/50 text-xs hover:text-white/70 transition-colors">
              {content.artist.name}
            </Link>
            <div className="flex items-center gap-3 mt-2 text-white/40 text-xs">
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3" />
                {formatNumber(content.plays)}
              </span>
              <span>•</span>
              <span>{timeAgo(content.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/[0.06]">
          <button className="flex items-center gap-1.5 text-white/40 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 text-xs">
            <Heart className="w-3.5 h-3.5" />
            {content.likes ? formatNumber(content.likes) : "Like"}
          </button>
          <button className="flex items-center gap-1.5 text-white/40 hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 text-xs">
            <MessageCircle className="w-3.5 h-3.5" />
            {content.comments ? formatNumber(content.comments) : "Comment"}
          </button>
          <button className="flex items-center gap-1.5 text-white/40 hover:text-green-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 text-xs ml-auto">
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>
    </Card>
  );
}
