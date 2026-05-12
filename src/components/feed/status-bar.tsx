"use client";

import { Avatar } from "@/components/ui/avatar";
import { mockStatusPosts, mockArtists } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export function StatusBar() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-1">
      {/* Add Status */}
      <button className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center hover:border-indigo-400 transition-colors">
          <Plus className="w-5 h-5 text-white/40" />
        </div>
        <span className="text-[10px] text-white/40">Your status</span>
      </button>

      {/* Status items */}
      {mockStatusPosts.map((status) => (
        <button key={status.id} className="flex flex-col items-center gap-2 flex-shrink-0 group">
          <div className="p-[2px] rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
            <div className="p-[2px] rounded-full bg-slate-950">
              <Avatar
                name={status.user.name}
                size="lg"
                color={status.user.profileColor || undefined}
              />
            </div>
          </div>
          <span className="text-[10px] text-white/50 group-hover:text-white/70 transition-colors max-w-[64px] truncate">
            {status.user.name?.split(" ")[0]}
          </span>
        </button>
      ))}

      {/* Extra artists */}
      {mockArtists.slice(4).map((artist) => (
        <button key={artist.id} className="flex flex-col items-center gap-2 flex-shrink-0 group">
          <div className="p-[2px] rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500">
            <div className="p-[2px] rounded-full bg-slate-950">
              <Avatar
                name={artist.name}
                size="lg"
                color={artist.profileColor || undefined}
              />
            </div>
          </div>
          <span className="text-[10px] text-white/50 group-hover:text-white/70 transition-colors max-w-[64px] truncate">
            {artist.name?.split(" ")[0]}
          </span>
        </button>
      ))}
    </div>
  );
}
