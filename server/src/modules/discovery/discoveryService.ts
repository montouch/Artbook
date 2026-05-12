import { contentItems, users } from "../users/userStore.js";
import type { ContentItem, User } from "../../types/domain.js";

interface RankedContent {
  item: ContentItem;
  score: number;
}

const overlapScore = (a: string[], b: string[]): number => {
  const set = new Set(a.map((value) => value.toLowerCase()));
  return b.reduce((total, value) => total + (set.has(value.toLowerCase()) ? 1 : 0), 0);
};

export const getUserById = (userId: string): User | undefined =>
  users.find((user) => user.id === userId);

export const rankDiscoveryFeed = (viewer: User): ContentItem[] => {
  const ranked: RankedContent[] = contentItems.map((item) => {
    const owner = users.find((user) => user.id === item.ownerId);
    const localBoost = item.location === viewer.location ? 30 : 0;
    const genreBoost = viewer.genres.includes(item.genre) ? 25 : 0;
    const nicheBoost = overlapScore(viewer.niches, item.niches) * 20;
    const interestBoost = overlapScore(viewer.interests, item.niches) * 10;
    const freshnessBoost = owner?.accountType === "artist" ? 8 : 5;
    return {
      item,
      score: localBoost + genreBoost + nicheBoost + interestBoost + freshnessBoost
    };
  });

  return ranked
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
};
