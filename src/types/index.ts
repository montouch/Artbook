export type AccountType = "ARTIST" | "STREAMER" | "FAN";
export type ContentType = "AUDIO" | "VIDEO";
export type Mood = "calm" | "hype" | "chill" | "dark" | "uplifting" | "afrobeat";
export type ProductType = "MERCH" | "DIGITAL";

export interface User {
  id: string;
  name: string | null;
  email?: string;
  image: string | null;
  bio: string | null;
  location: string | null;
  accountType: AccountType;
  verified: boolean;
  isPremium: boolean;
  profileColor: string | null;
  profileFont: string | null;
  profileLayout: string | null;
  coverImage: string | null;
  followers?: number;
  following?: number;
  genre?: string;
}

export interface Content {
  id: string;
  title: string;
  description: string | null;
  type: ContentType;
  url?: string;
  thumbnailUrl: string | null;
  duration: number | null;
  genre: string | null;
  mood: string | null;
  isPremium: boolean;
  plays: number;
  likes?: number;
  comments?: number;
  createdAt: Date;
  artist: User;
}

export interface Stream {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isLive: boolean;
  isPremium: boolean;
  viewerCount: number;
  scheduledAt?: Date;
  startedAt?: Date;
  streamer: User;
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image: string | null;
  type: ProductType;
  seller: User;
}

export interface MessageThread {
  id: string;
  sender: User;
  lastMessage: string;
  time: Date;
  unread: number;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  memberCount: number;
}

export interface StatusPost {
  id: string;
  user: User;
  text: string | null;
  imageUrl?: string | null;
  createdAt: Date;
}
