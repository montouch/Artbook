export type AccountType = "artist" | "streamer" | "fan";
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
  kind: "merch" | "digital" | "music";
  price: string;
  palette: string;
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
    niches: ["dance battles", "producer breakdowns", "fan cyphers"],
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
      "Hosts nightly beat-making streams and turns fan voice notes into hooks on air."
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
    niches: ["live VJ sets", "streetwear drops", "motion posters"],
    mood: "experimental",
    followers: 27700,
    discoveryLift: 83,
    verified: true,
    live: true,
    accent: "#00a884",
    softAccent: "#d9fff5",
    latestWork: "Soweto Signal Room",
    story:
      "Pairs Amapiano sets with real-time 3D visuals and fan-directed poster remixes."
  },
  {
    id: "nia-fanlab",
    name: "Nia Fanlab",
    handle: "@niafanlab",
    accountType: "fan",
    city: "Accra",
    country: "Ghana",
    genres: ["Curated Audio", "Fan Video"],
    niches: ["reaction rooms", "voice-note reviews", "group watch parties"],
    mood: "hype",
    followers: 6100,
    discoveryLift: 76,
    verified: false,
    live: true,
    premium: false,
    accent: "#0086c9",
    softAccent: "#d8f3ff",
    latestWork: "Friday Fan Finds Live",
    story:
      "Runs fan-hosted listening rooms, posts video reactions, and shares audio notes without ownership verification."
  }
];

export const streams: Stream[] = [
  {
    id: "mainland-midnight",
    title: "Mainland Midnight: fan hook challenge",
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
    kind: "merch",
    price: "$38",
    palette: "Sunset gold"
  },
  {
    id: "sample-pack",
    title: "Street Pop drum kit Vol. 1",
    seller: "Musa Lagos",
    kind: "digital",
    price: "$12",
    palette: "Lagos red"
  },
  {
    id: "blue-matoke",
    title: "Blue Matoke stems",
    seller: "Ama Nile",
    kind: "music",
    price: "$9",
    palette: "Violet rain"
  }
];

export const conversations: Conversation[] = [
  {
    id: "zuri",
    name: "Zuri Kora fan room",
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
  "Niche tags like kora textures or producer breakdowns help small creators reach the right fans.",
  "AI feeling search translates moods like calm, hype, soulful, or experimental into matching creators.",
  "Ownership verification and metadata checks are highlighted before monetized uploads go live."
];

export const mediaVerificationRules = [
  "Audio posts can go live without verification for fans, artists, and streamers.",
  "Video posts, paid drops, and monetized live rooms keep ownership checks available before earnings unlock.",
  "Fan profiles can host livestreams, publish audio or video, start groups, and build their own followers."
];

export const feelingSearchPrompts = [
  "calm focus",
  "hype party",
  "soulful healing",
  "experimental visuals"
];
