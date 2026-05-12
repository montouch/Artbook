import { contentItems, idFactory } from "../users/userStore.js";
import type { ContentItem, MediaType } from "../../types/domain.js";

interface UploadContentInput {
  ownerId: string;
  title: string;
  mediaType: MediaType;
  genre: string;
  niches: string[];
  location: string;
  isPremium: boolean;
  mood: "calm" | "hype" | "soulful" | "experimental";
  url: string;
}

export const uploadContent = (input: UploadContentInput): ContentItem => {
  const item: ContentItem = {
    id: idFactory(),
    createdAt: new Date().toISOString(),
    ...input
  };

  contentItems.unshift(item);
  return item;
};

export const listContent = (): ContentItem[] => contentItems;
