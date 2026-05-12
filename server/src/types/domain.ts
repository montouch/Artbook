export type AccountType = "artist" | "streamer" | "fan";
export type MediaType = "audio" | "video";

export interface ProfileCustomization {
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  layout: "classic" | "immersive" | "minimal";
}

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
  customization: ProfileCustomization;
}

export interface ContentItem {
  id: string;
  ownerId: string;
  title: string;
  mediaType: MediaType;
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
  chat: StreamChatMessage[];
  gifts: number;
}

export interface StreamChatMessage {
  id: string;
  userId: string;
  message: string;
  sentAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  message: string;
  sentAt: string;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
}

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  category: "merch" | "digital";
  priceUsd: number;
  description: string;
  premiumSellerOnly: boolean;
}

export interface OwnershipVerification {
  id: string;
  artistId: string;
  contentTitle: string;
  metadataFingerprint: string;
  status: "verified" | "review";
}
