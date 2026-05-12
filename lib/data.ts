export type AccountType = "artist" | "streamer" | "creator";
export type Mood = "calm" | "hype" | "soulful" | "experimental";

export type Creator = {
  id: string;
  name: string;
  handle: string;
  accountType: AccountType;
  city: string;
  country: string;
  genres: string[];
  niches: string[];
  mood: Mood;
  followers: number;
  discoveryLift: number;
  verified: boolean;
  live?: boolean;
  premium?: boolean;
  accent: string;
  softAccent: string;
  latestWork: string;
  story: string;
};

export type Stream = {
  id: string;
  title: string;
  creatorName: string;
  city: string;
  startsAt: string;
  price: string;
  isLive: boolean;
  gifts: number;
};

export type Product = {
  id: string;
  title: string;
  seller: string;
  sellerType: AccountType;
  kind: "merch" | "digital" | "music" | "live" | "creator-good";
  price: string;
  palette: string;
  description: string;
};

export type Conversation = {
  id: string;
  name: string;
  preview: string;
  unread: number;
};

export const creators: Creator[] = [
  {
    id: "zuri-kora",
    name: "Zuri Kora",
    handle: "@zurikora",
    accountType: "artist",
    city: "Accra",
    country: "Ghana",
    genres: ["Alté", "Afrosoul"],
    niches: ["kora textures", "late-night vocals", "soft percussion"],
    mood: "calm",
    followers: 18400,
    discoveryLift: 94,
    verified: true,
    premium: true,
    accent: "#f5b66d",
    softAccent: "#fff0dc",
    latestWork: "Palmwine Echoes EP",
    story:
      "Blends live kora phrases with warm vocal stacks and field recordings from Osu."
  },
  {
    id: "musa-lagos",
    name: "Musa Lagos",
    handle: "@musalive",
    accountType: "streamer",
    city: "Lagos",
    country: "Nigeria",
    genres: ["Afrobeats", "Street Pop"],
    niches: ["dance battles", "producer breakdowns", "creator cyphers"],
    mood: "hype",
    followers: 52200,
    discoveryLift: 88,
    verified: true,
    live: true,
    premium: true,
    accent: "#ff5d3a",
    softAccent: "#ffe3dc",
    latestWork: "Mainland Midnight Live",
    story:
      "Hosts nightly beat-making streams and turns creator voice notes into hooks on air."
  },
  {
    id: "ama-nile",
    name: "Ama Nile",
    handle: "@amanile",
    accountType: "artist",
    city: "Kampala",
    country: "Uganda",
    genres: ["Neo-soul", "R&B"],
    niches: ["choir harmonies", "analog keys", "rainy playlists"],
    mood: "soulful",
    followers: 9300,
    discoveryLift: 91,
    verified: false,
    accent: "#7d5fff",
    softAccent: "#ece7ff",
    latestWork: "Blue Matoke Sessions",
    story:
      "Writes slow-burn love songs with church choir arrangements and Rhodes-led loops."
  },
  {
    id: "thabo-visuals",
    name: "Thabo Visuals",
    handle: "@thabostreams",
    accountType: "streamer",
    city: "Johannesburg",
    country: "South Africa",
    genres: ["Amapiano", "Visual Art"],
    niches: ["live VJ sets", "streetwear drops", "creator-directed posters"],
    mood: "experimental",
    followers: 27700,
    discoveryLift: 83,
    verified: true,
    live: true,
    accent: "#00a884",
    softAccent: "#d9fff5",
    latestWork: "Soweto Signal Room",
    story:
      "Pairs Amapiano sets with real-time 3D visuals and creator-directed poster remixes."
  },
  {
    id: "kojo-curates",
    name: "Kojo Curates",
    handle: "@kojocurates",
    accountType: "creator",
    city: "Accra",
    country: "Ghana",
    genres: ["Alté", "Highlife"],
    niches: ["playlist essays", "local guides", "cover art swaps"],
    mood: "calm",
    followers: 4100,
    discoveryLift: 72,
    verified: false,
    accent: "#2f8cff",
    softAccent: "#e3f0ff",
    latestWork: "Soft Trotros Vol. 4",
    story:
      "Builds city-by-city playlists, zines, and listening maps around emerging neighborhood scenes."
  }
];

export const streams: Stream[] = [
  {
    id: "mainland-midnight",
    title: "Mainland Midnight: creator hook challenge",
    creatorName: "Musa Lagos",
    city: "Lagos",
    startsAt: "Live now",
    price: "Free with gifts",
    isLive: true,
    gifts: 1430
  },
  {
    id: "signal-room",
    title: "Soweto Signal Room visual set",
    creatorName: "Thabo Visuals",
    city: "Johannesburg",
    startsAt: "Live now",
    price: "Premium",
    isLive: true,
    gifts: 870
  },
  {
    id: "palmwine-qna",
    title: "Palmwine Echoes listening room",
    creatorName: "Zuri Kora",
    city: "Accra",
    startsAt: "Tonight 20:00",
    price: "$4 subscriber pass",
    isLive: false,
    gifts: 0
  }
];

export const products: Product[] = [
  {
    id: "kente-tee",
    title: "Limited Kente waveform tee",
    seller: "Zuri Kora",
    sellerType: "artist",
    kind: "merch",
    price: "$38",
    palette: "Sunset gold",
    description: "Artist merch tied to an EP rollout and subscriber drops."
  },
  {
    id: "sample-pack",
    title: "Street Pop drum kit Vol. 1",
    seller: "Musa Lagos",
    sellerType: "streamer",
    kind: "digital",
    price: "$12",
    palette: "Lagos red",
    description: "Streamer-made production assets unlocked after live sessions."
  },
  {
    id: "blue-matoke",
    title: "Blue Matoke stems",
    seller: "Ama Nile",
    sellerType: "artist",
    kind: "music",
    price: "$9",
    palette: "Violet rain",
    description: "Artist stems, alternate mixes, and premium listening files."
  },
  {
    id: "soweto-room-pass",
    title: "Signal Room replay pass",
    seller: "Thabo Visuals",
    sellerType: "streamer",
    kind: "live",
    price: "$6",
    palette: "Neon green",
    description: "Streamer replay access, live room perks, and gift bundles."
  },
  {
    id: "soft-trotros-zine",
    title: "Soft Trotros city zine",
    seller: "Kojo Curates",
    sellerType: "creator",
    kind: "creator-good",
    price: "$7",
    palette: "Accra blue",
    description: "Creator marketplace goods: zines, playlist guides, presets, and community finds."
  }
];

export const conversations: Conversation[] = [
  {
    id: "zuri",
    name: "Zuri Kora creator room",
    preview: "New demo unlocked for Palmwine supporters.",
    unread: 3
  },
  {
    id: "lagos",
    name: "Musa Lagos",
    preview: "Send your voice note before the stream starts.",
    unread: 1
  },
  {
    id: "friends",
    name: "Accra alté friends",
    preview: "Kojo shared a playlist: Soft trotros.",
    unread: 0
  }
];

export const discoverySignals = [
  "Local creators receive a baseline boost before global popularity is considered.",
  "Niche tags like kora textures or producer breakdowns help small creators reach the right audience.",
  "Mood, genre, and recent creator behavior tune the feed color and content rhythm.",
  "Ownership verification and metadata checks are highlighted before monetized uploads go live."
];
