export type AccountType = "artist" | "streamer" | "fan";

export interface User {
  id: string;
  handle: string;
  displayName: string;
  accountType: AccountType;
  location: string;
  genres: string[];
  niches: string[];
  interests: string[];
  isPremium: boolean;
  followers: number;
}

export interface ContentItem {
  id: string;
  ownerId: string;
  title: string;
  mediaType: "audio" | "video";
  genre: string;
  niches: string[];
  location: string;
  isPremium: boolean;
  mood: "calm" | "hype" | "soulful" | "experimental";
  url: string;
  createdAt: string;
}

export interface Stream {
  id: string;
  streamerId: string;
  title: string;
  status: "live" | "scheduled" | "ended";
  startTime: string;
  isPremium: boolean;
  gifts: number;
}

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  category: "merch" | "digital";
  priceUsd: number;
  description: string;
}
