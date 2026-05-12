import { v4 as uuid } from "uuid";
import type {
  ContentItem,
  DirectMessage,
  Group,
  OwnershipVerification,
  Product,
  Stream,
  User
} from "../../types/domain.js";

const now = new Date().toISOString();

export const users: User[] = [
  {
    id: "u-artist-1",
    handle: "lagosbeats",
    displayName: "Lagos Beats",
    accountType: "artist",
    location: "Lagos, NG",
    genres: ["afrobeats", "alt-pop"],
    niches: ["street-session", "live-band"],
    interests: ["new talent", "community"],
    isPremium: true,
    followers: 12340,
    customization: {
      fontFamily: "Inter",
      primaryColor: "#141B41",
      secondaryColor: "#F6AA1C",
      layout: "immersive"
    }
  },
  {
    id: "u-stream-1",
    handle: "accra_live",
    displayName: "Accra Live Studio",
    accountType: "streamer",
    location: "Accra, GH",
    genres: ["afro-house", "hip-hop"],
    niches: ["producer-breakdown", "night-set"],
    interests: ["mixing", "creative process"],
    isPremium: false,
    followers: 8620,
    customization: {
      fontFamily: "SF Pro Display",
      primaryColor: "#0C0F0A",
      secondaryColor: "#FF595E",
      layout: "minimal"
    }
  },
  {
    id: "u-fan-1",
    handle: "zuri_fan",
    displayName: "Zuri",
    accountType: "fan",
    location: "Nairobi, KE",
    genres: ["rnb", "afrobeats"],
    niches: ["women-producers", "acoustic-room"],
    interests: ["discover weekly", "local gigs"],
    isPremium: true,
    followers: 120,
    customization: {
      fontFamily: "Inter",
      primaryColor: "#2B2D42",
      secondaryColor: "#8D99AE",
      layout: "classic"
    }
  }
];

export const contentItems: ContentItem[] = [
  {
    id: "c-1",
    ownerId: "u-artist-1",
    title: "Sunrise on Third Mainland",
    mediaType: "audio",
    genre: "afrobeats",
    niches: ["street-session", "sunrise-vibes"],
    location: "Lagos, NG",
    isPremium: false,
    mood: "calm",
    url: "https://cdn.example/artbook/audio/sunrise.mp3",
    createdAt: now
  },
  {
    id: "c-2",
    ownerId: "u-stream-1",
    title: "Warehouse Cypher Reel",
    mediaType: "video",
    genre: "hip-hop",
    niches: ["cypher", "freestyle"],
    location: "Accra, GH",
    isPremium: true,
    mood: "hype",
    url: "https://cdn.example/artbook/video/cypher.mp4",
    createdAt: now
  }
];

export const streams: Stream[] = [
  {
    id: "s-1",
    streamerId: "u-stream-1",
    title: "Midnight Producer Session",
    status: "live",
    startTime: now,
    isPremium: false,
    chat: [],
    gifts: 0
  }
];

export const dms: DirectMessage[] = [];
export const groups: Group[] = [];
export const products: Product[] = [];
export const ownershipChecks: OwnershipVerification[] = [];

export const idFactory = () => uuid();
