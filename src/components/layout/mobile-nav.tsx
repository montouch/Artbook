"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radio, Upload, MessageCircle, User } from "lucide-react";

const items = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/stream", label: "Live", icon: Radio },
  { href: "/upload", label: "Create", icon: Upload },
  { href: "/messages", label: "DMs", icon: MessageCircle },
  { href: "/artist/artist-1", label: "Me", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-black/80 backdrop-blur-2xl border-t border-white/[0.06] safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-4">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const isCreate = item.label === "Create";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all",
                isCreate && "relative",
                isActive ? "text-indigo-400" : "text-white/40"
              )}
            >
              {isCreate ? (
                <div className="w-10 h-10 -mt-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/40">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
              ) : (
                <item.icon className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
