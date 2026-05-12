export type AccountType = "artist" | "streamer" | "fan";
export type Mood = "calm" | "hype" | "soulful" | "experimental";

export type Creator = {
  id: string;
  name: string;
  handle: string;
  accountType: Exclude<AccountType, "fan">;
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

export type CreatorMetric = {
  key: string;
  label: string;
  value: string;
  trend: string;
  detail: string;
};

export type CreatorAnalytics = {
  creatorId: string;
  window: string;
  metrics: CreatorMetric[];
  learningSignals: string[];
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
  }
];

export const creatorAnalytics: CreatorAnalytics[] = [
  {
    creatorId: "zuri-kora",
    window: "Last 30 days",
    metrics: [
      {
        key: "catalog-saves",
        label: "Catalog saves",
        value: "12.8%",
        trend: "+3.2%",
        detail: "Listeners are saving acoustic tracks faster than the cohort average."
      },
      {
        key: "store-conversion",
        label: "Store conversion",
        value: "3.4%",
        trend: "+0.8%",
        detail: "Kente waveform tee views are turning into purchases after listening rooms."
      },
      {
        key: "premium-unlocks",
        label: "Premium unlocks",
        value: "420",
        trend: "+64",
        detail: "Supporters are unlocking stems and subscriber-only room replays."
      }
    ],
    learningSignals: ["save velocity", "store path", "premium unlock"]
  },
  {
    creatorId: "musa-lagos",
    window: "Last 7 streams",
    metrics: [
      {
        key: "watch-time",
        label: "Avg watch time",
        value: "42m",
        trend: "+6m",
        detail: "Producer breakdowns hold viewers longer than open freestyle segments."
      },
      {
        key: "gift-velocity",
        label: "Gift velocity",
        value: "286/hr",
        trend: "+18%",
        detail: "Gift spikes cluster around fan hook challenges and chorus replays."
      },
      {
        key: "chat-participation",
        label: "Chat participation",
        value: "68%",
        trend: "+9%",
        detail: "Viewers respond most when voice-note prompts appear before the beat switch."
      }
    ],
    learningSignals: ["watch time", "gift timing", "chat prompts"]
  },
  {
    creatorId: "ama-nile",
    window: "Last 30 days",
    metrics: [
      {
        key: "repeat-listens",
        label: "Repeat listens",
        value: "61%",
        trend: "+7%",
        detail: "Rainy playlist placements are bringing fans back to the same tracks."
      },
      {
        key: "profile-to-follow",
        label: "Profile to follow",
        value: "18.2%",
        trend: "+2.1%",
        detail: "Choir harmony clips are converting discovery visits into follows."
      },
      {
        key: "store-conversion",
        label: "Store conversion",
        value: "2.7%",
        trend: "+0.4%",
        detail: "Stem previews are viewed often, but checkout needs clearer placement."
      }
    ],
    learningSignals: ["repeat listens", "profile visits", "checkout path"]
  },
  {
    creatorId: "thabo-visuals",
    window: "Last 7 streams",
    metrics: [
      {
        key: "watch-time",
        label: "Avg watch time",
        value: "36m",
        trend: "+4m",
        detail: "Live VJ sets retain viewers when poster remixes start in the first ten minutes."
      },
      {
        key: "replay-saves",
        label: "Replay saves",
        value: "1.9k",
        trend: "+22%",
        detail: "Motion poster drops are being saved after the live room ends."
      },
      {
        key: "gift-velocity",
        label: "Gift velocity",
        value: "174/hr",
        trend: "+11%",
        detail: "Gift momentum rises when fans vote on the next visual palette."
      }
    ],
    learningSignals: ["replay saves", "poll timing", "gift momentum"]
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
  "Mood, genre, and recent fan behavior tune the feed color and content rhythm.",
  "Ownership verification and metadata checks are highlighted before monetized uploads go live.",
  "Creator insight weights learn from saves, follows, gifts, store paths, and replay behavior."
];
