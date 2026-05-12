"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "live" | "premium" | "genre" | "mood";
  className?: string;
}

const variants = {
  default: "bg-white/10 text-white/80",
  live: "bg-red-500/90 text-white animate-pulse",
  premium: "bg-amber-500/90 text-white",
  genre: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  mood: "bg-white/5 text-white/60 border border-white/10",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
