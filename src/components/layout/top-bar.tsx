"use client";

import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useState } from "react";

export function TopBar() {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-black/40 backdrop-blur-2xl border-b border-white/[0.06] flex items-center justify-between px-4 lg:px-8">
      <div className="flex-1 max-w-xl">
        <Input
          placeholder="Search artists, music, streams..."
          icon={<Search className="w-4 h-4" />}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className={searchFocused ? "ring-2 ring-indigo-500/50" : ""}
        />
      </div>

      <div className="flex items-center gap-4 ml-4">
        <button className="relative text-white/50 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/5">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <Avatar name="You" size="sm" color="#6366f1" />
      </div>
    </header>
  );
}
