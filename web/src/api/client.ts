import type { ContentItem, Product, Stream, User } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const apiClient = {
  async getDiscoveryFeed(userId: string) {
    return getJson<{ feed: ContentItem[] }>(`/discovery?userId=${encodeURIComponent(userId)}`);
  },
  async getUser(userId: string) {
    return getJson<{ user: User }>(`/users/${userId}`);
  },
  async getFeaturedStreams() {
    return getJson<{ streams: Stream[] }>("/streams/featured");
  },
  async getProducts() {
    return getJson<{ products: Product[] }>("/marketplace/products");
  },
  async getInbox(userId: string) {
    return getJson<{ messages: Array<{ id: string; senderId: string; message: string; sentAt: string }> }>(
      `/messages/${userId}/inbox`
    );
  },
  async getGroups() {
    return getJson<{ groups: Array<{ id: string; name: string; memberIds: string[] }> }>("/messages/groups/all");
  },
  async sendDm(payload: { senderId: string; recipientId: string; message: string }) {
    return postJson<{ dm: { id: string } }>("/messages/dm", payload);
  },
  async createCheckoutIntent(amountUsd: number, provider: "stripe" | "paypal") {
    return postJson<{ intent: { clientSecret: string } }>("/payments/checkout-intent", {
      amountUsd,
      provider
    });
  }
};
