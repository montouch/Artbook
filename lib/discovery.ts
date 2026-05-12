import { creators, type Creator } from "./data";

export type DiscoveryPreferences = {
  location?: string;
  genres?: string[];
  interests?: string[];
};

export type DiscoveryResult = Creator & {
  matchScore: number;
  reasons: string[];
};

const normalize = (value: string) => value.trim().toLowerCase();

export function scoreCreator(
  creator: Creator,
  preferences: DiscoveryPreferences = {}
): DiscoveryResult {
  const location = preferences.location ? normalize(preferences.location) : "";
  const genres = new Set((preferences.genres ?? []).map(normalize));
  const interests = new Set((preferences.interests ?? []).map(normalize));
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
    interests: ["kora textures", "producer breakdowns"]
  }
) {
  return creators
    .map((creator) => scoreCreator(creator, preferences))
    .sort((a, b) => {
      const scoreDelta = b.matchScore - a.matchScore;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      // Keep tied scores deterministic across runtimes and test environments.
      return a.id.localeCompare(b.id);
    });
}
