"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockContent } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";
import { Music, Plus, Play, Heart, MoreHorizontal } from "lucide-react";

const mockPlaylists = [
  {
    id: "pl-1",
    title: "Afrobeats Essentials",
    trackCount: 24,
    totalDuration: "1h 42m",
    mood: "hype",
  },
  {
    id: "pl-2",
    title: "Late Night Vibes",
    trackCount: 18,
    totalDuration: "1h 15m",
    mood: "chill",
  },
  {
    id: "pl-3",
    title: "Workout Energy",
    trackCount: 32,
    totalDuration: "2h 10m",
    mood: "hype",
  },
  {
    id: "pl-4",
    title: "Focus Mode",
    trackCount: 15,
    totalDuration: "58m",
    mood: "calm",
  },
];

export default function PlaylistPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Music className="w-7 h-7 text-indigo-400" />
            Your Playlists
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Organize and discover music your way
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          New Playlist
        </Button>
      </div>

      {/* Playlists grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockPlaylists.map((playlist) => (
          <Card key={playlist.id} className="overflow-hidden group cursor-pointer">
            <div className="aspect-square bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center relative">
              <Music className="w-12 h-12 text-white/10" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
              </div>
            </div>
            <div className="p-3">
              <h3 className="text-white font-medium text-sm truncate">{playlist.title}</h3>
              <p className="text-white/40 text-xs mt-1">
                {playlist.trackCount} tracks • {playlist.totalDuration}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Liked songs */}
      <div>
        <h2 className="text-white font-semibold text-lg mb-4">Recently Liked</h2>
        <Card className="divide-y divide-white/[0.04]">
          {mockContent.slice(0, 5).map((track, i) => (
            <div key={track.id} className="flex items-center gap-4 p-3 hover:bg-white/[0.03] transition-colors group">
              <span className="text-white/20 text-sm w-6 text-right font-mono">{i + 1}</span>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Music className="w-4 h-4 text-white/20" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white text-sm font-medium truncate">{track.title}</h4>
                <p className="text-white/40 text-xs">{track.artist.name}</p>
              </div>
              <Badge variant="genre" className="hidden sm:inline-flex">{track.genre}</Badge>
              <span className="text-white/30 text-xs font-mono hidden sm:block">
                {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, "0")}` : "--"}
              </span>
              <span className="text-white/30 text-xs">{formatNumber(track.plays)} plays</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 text-white/40 hover:text-red-400 rounded-lg hover:bg-white/5">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                </button>
                <button className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/5">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
