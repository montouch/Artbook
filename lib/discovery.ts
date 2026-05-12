import { creators, type Creator, type Mood } from "./data";

export type DiscoveryPreferences = {
  location?: string;
  genres?: string[];
  interests?: string[];
  feelings?: string[];
};

export type DiscoveryResult = Creator & {
  matchScore: number;
  reasons: string[];
};

const normalize = (value: string) => value.trim().toLowerCase();

const feelingIntents: Array<{
  mood: Mood;
  labels: string[];
  keywords: string[];
}> = [
  {
    mood: "calm",
    labels: ["calm", "chill", "peaceful", "focus", "deep"],
    keywords: ["kora", "late-night", "soft", "rainy", "palmwine"]
  },
  {
    mood: "hype",
    labels: ["hype", "party", "energy", "dance", "excited"],
    keywords: ["dance", "battle", "fan", "cypher", "reaction"]
  },
  {
    mood: "soulful",
    labels: ["soulful", "healing", "romantic", "warm", "emotional"],
    keywords: ["choir", "harmonies", "love", "rhodes", "vocal"]
  },
  {
    mood: "experimental",
    labels: ["experimental", "weird", "visual", "future", "art"],
    keywords: ["visual", "vj", "motion", "poster", "remix"]
  }
];

const creatorSearchText = (creator: Creator) =>
  normalize(
    [
      creator.name,
      creator.handle,
      creator.city,
      creator.country,
      creator.mood,
      creator.latestWork,
      creator.story,
      ...creator.genres,
      ...creator.niches
    ].join(" ")
  );

const matchFeelingIntents = (creator: Creator, feelings: string[]) => {
  const searchText = creatorSearchText(creator);

  return feelingIntents.filter((intent) => {
    const labelMatch = feelings.some((feeling) =>
      intent.labels.some((label) => feeling.includes(label) || label.includes(feeling))
    );
    const keywordMatch = feelings.some((feeling) => searchText.includes(feeling));
    const intentTextMatch = intent.keywords.some((keyword) => searchText.includes(keyword));

    return (labelMatch && creator.mood === intent.mood) || (keywordMatch && intentTextMatch);
  });
};

export function scoreCreator(
  creator: Creator,
  preferences: DiscoveryPreferences = {}
): DiscoveryResult {
  const location = preferences.location ? normalize(preferences.location) : "";
  const genres = new Set((preferences.genres ?? []).map(normalize));
  const interests = new Set((preferences.interests ?? []).map(normalize));
  const feelings = (preferences.feelings ?? []).map(normalize).filter(Boolean);
  const reasons: string[] = [];

  let score = creator.discoveryLift;

  if (location && normalize(creator.city).includes(location)) {
    score += 28;
    reasons.push("local signal");
  }

  const matchedGenres = creator.genres.filter((genre) => genres.has(normalize(genre)));
  if (matchedGenres.length > 0) {
    score += matchedGenres.length * 16;
    reasons.push(`${matchedGenres.join(", ")} match`);
  }

  const matchedNiches = creator.niches.filter((niche) => interests.has(normalize(niche)));
  if (matchedNiches.length > 0) {
    score += matchedNiches.length * 20;
    reasons.push("niche interest match");
  }

  const matchedFeelings = matchFeelingIntents(creator, feelings);
  if (matchedFeelings.length > 0) {
    score += matchedFeelings.length * 18;
    reasons.push(`AI feeling: ${matchedFeelings.map((intent) => intent.mood).join(", ")}`);
  }

  if (creator.live) {
    score += 10;
    reasons.push("live now");
  }

  if (creator.verified) {
    score += 4;
    reasons.push("ownership verified");
  }

  return {
    ...creator,
    matchScore: Math.min(score, 160),
    reasons: reasons.length ? reasons : ["fresh discovery"]
  };
}

export function getDiscoveryFeed(
  preferences: DiscoveryPreferences = {
    location: "Accra",
    genres: ["Alté", "Afrosoul", "Amapiano"],
    interests: ["kora textures", "producer breakdowns"],
    feelings: ["calm focus"]
  }
) {
  return creators
    .map((creator) => scoreCreator(creator, preferences))
    .sort((a, b) => b.matchScore - a.matchScore);
}
