import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export const moodColors: Record<string, { primary: string; secondary: string; bg: string }> = {
  calm: { primary: "#6366f1", secondary: "#a5b4fc", bg: "from-indigo-950/40 to-slate-950" },
  hype: { primary: "#ef4444", secondary: "#fca5a5", bg: "from-red-950/40 to-orange-950/40" },
  chill: { primary: "#06b6d4", secondary: "#67e8f9", bg: "from-cyan-950/40 to-teal-950/40" },
  dark: { primary: "#6b21a8", secondary: "#c084fc", bg: "from-purple-950/40 to-slate-950" },
  uplifting: { primary: "#f59e0b", secondary: "#fcd34d", bg: "from-amber-950/40 to-yellow-950/40" },
  afrobeat: { primary: "#16a34a", secondary: "#86efac", bg: "from-green-950/40 to-emerald-950/40" },
  default: { primary: "#6366f1", secondary: "#a5b4fc", bg: "from-slate-950 to-slate-900" },
};

export const genres = [
  "Afrobeats", "Amapiano", "Hip Hop", "R&B", "Gospel",
  "Reggae", "Dancehall", "Highlife", "Jùjú", "Fuji",
  "Gqom", "Kwaito", "Bongo Flava", "Gengetone", "Afro-Soul",
  "Afro-Pop", "Electronic", "Jazz", "Blues", "Rock",
  "Indie", "Classical", "Spoken Word", "Podcast",
];

export const moods = ["calm", "hype", "chill", "dark", "uplifting", "afrobeat"];
