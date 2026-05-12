import { creatorAnalytics, creators, type AccountType, type CreatorAnalytics } from "./data";

type CreatorAccountType = Exclude<AccountType, "fan">;

export type AiCoachSuggestion = {
  title: string;
  recommendation: string;
  confidence: string;
  dataUsed: string[];
};

export type CreatorIntelligence = CreatorAnalytics & {
  creatorName: string;
  handle: string;
  accountType: CreatorAccountType;
  city: string;
  country: string;
  accent: string;
  softAccent: string;
  aiSuggestion: AiCoachSuggestion;
};

export const aiLearningLoop = [
  "Collect internal saves, follows, gifts, replays, purchases, and skips.",
  "Compare each creator with similar cities, genres, niches, and account type.",
  "Turn the strongest pattern into a small coaching prompt, then learn from creator action."
];

function suggestForCreator(
  accountType: CreatorAccountType,
  analytics: CreatorAnalytics
): AiCoachSuggestion {
  if (accountType === "artist") {
    const storeMetric = analytics.metrics.find((metric) => metric.key === "store-conversion");
    const saveMetric =
      analytics.metrics.find((metric) => metric.key === "catalog-saves") ??
      analytics.metrics.find((metric) => metric.key === "repeat-listens");

    return {
      title: "Subtle artist lift",
      recommendation: storeMetric
        ? `Place a soft merch or stems reminder beside the track fans already save most; ${storeMetric.detail.toLowerCase()}`
        : `Invite repeat listeners into a short listening room while attention is warm; ${saveMetric?.detail.toLowerCase()}`,
      confidence: "High",
      dataUsed: analytics.learningSignals
    };
  }

  const giftMetric = analytics.metrics.find((metric) => metric.key === "gift-velocity");
  const watchMetric = analytics.metrics.find((metric) => metric.key === "watch-time");

  return {
    title: "Subtle stream lift",
    recommendation: giftMetric
      ? `Schedule the strongest prompt before the next gift peak; ${giftMetric.detail.toLowerCase()}`
      : `Move the highest-retention segment closer to the stream opening; ${watchMetric?.detail.toLowerCase()}`,
    confidence: "High",
    dataUsed: analytics.learningSignals
  };
}

export function getCreatorIntelligence(accountType?: CreatorAccountType): CreatorIntelligence[] {
  const analyticsByCreatorId = new Map(
    creatorAnalytics.map((analytics) => [analytics.creatorId, analytics])
  );

  return creators
    .filter((creator) => !accountType || creator.accountType === accountType)
    .map((creator) => {
      const analytics = analyticsByCreatorId.get(creator.id);

      if (!analytics) {
        throw new Error(`Missing analytics for creator: ${creator.id}`);
      }

      return {
        ...analytics,
        creatorName: creator.name,
        handle: creator.handle,
        accountType: creator.accountType,
        city: creator.city,
        country: creator.country,
        accent: creator.accent,
        softAccent: creator.softAccent,
        aiSuggestion: suggestForCreator(creator.accountType, analytics)
      };
    });
}
