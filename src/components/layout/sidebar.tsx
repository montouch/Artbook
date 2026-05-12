"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  Radio,
  MessageCircle,
  Users,
  ShoppingBag,
  Upload,
  Music,
  Settings,
  User,
  Flame,
} from "lucide-react";

const navItems = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/feed?tab=discover", label: "Discover", icon: Compass },
  { href: "/stream", label: "Live", icon: Radio },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/groups", label: "Communities", icon: Users },
  { href: "/marketplace", label: "Market", icon: ShoppingBag },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/playlist", label: "Playlists", icon: Music },
];

const bottomItems = [
  { href: "/artist/artist-1", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[72px] lg:w-[240px] bg-black/40 backdrop-blur-2xl border-r border-white/[0.06] z-40 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-white hidden lg:block tracking-tight">
          Artbook
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href.split("?")[0] + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "text-white/50 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-indigo-400" : "text-white/50 group-hover:text-white"
                )}
              />
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
              {item.label === "Messages" && (
                <span className="hidden lg:flex ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  3
                </span>
              )}
              {item.label === "Live" && (
                <span className="hidden lg:flex ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="py-4 px-2 border-t border-white/[0.06] space-y-1">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "text-white/50 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
