"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { MapPin, UserPlus, MessageCircle, Share2, Star } from "lucide-react";

interface ArtistHeaderProps {
  artist: {
    id: string;
    name: string | null;
    image?: string | null;
    bio?: string | null;
    location?: string | null;
    accountType: string;
    verified?: boolean;
    profileColor?: string | null;
    followers?: number;
    genre?: string;
  };
}

export function ArtistHeader({ artist }: ArtistHeaderProps) {
  const color = artist.profileColor || "#6366f1";

  return (
    <div className="relative">
      {/* Cover */}
      <div
        className="h-48 lg:h-64 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${color}30, ${color}10, transparent)`,
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 800 300">
            <pattern id="cover-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="20" fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
              <circle cx="30" cy="30" r="10" fill="none" stroke={color} strokeWidth="0.5" opacity="0.2" />
              <path d="M0 30 L60 30 M30 0 L30 60" stroke={color} strokeWidth="0.3" opacity="0.15" />
            </pattern>
            <rect width="800" height="300" fill="url(#cover-pattern)" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950" />
      </div>

      {/* Profile Info */}
      <div className="relative px-4 lg:px-8 -mt-16">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="relative">
            <div className="p-1 rounded-full" style={{ background: `linear-gradient(135deg, ${color}, ${color}80)` }}>
              <div className="p-1 rounded-full bg-slate-950">
                <Avatar name={artist.name} size="xl" color={color} verified={artist.verified} />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold text-white">{artist.name}</h1>
              {artist.verified && (
                <Badge variant="genre">
                  <Star className="w-3 h-3 mr-1" /> Verified
                </Badge>
              )}
              <Badge>{artist.accountType}</Badge>
            </div>

            {artist.bio && (
              <p className="text-white/60 text-sm mt-2 max-w-lg">{artist.bio}</p>
            )}

            <div className="flex items-center gap-4 mt-3 text-sm text-white/40">
              {artist.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {artist.location}
                </span>
              )}
              {artist.genre && (
                <Badge variant="genre">{artist.genre}</Badge>
              )}
              {artist.followers !== undefined && (
                <span>{formatNumber(artist.followers)} followers</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 pb-2">
            <Button>
              <UserPlus className="w-4 h-4" />
              Follow
            </Button>
            <Button variant="secondary">
              <MessageCircle className="w-4 h-4" />
              Message
            </Button>
            <Button variant="ghost" size="md">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
