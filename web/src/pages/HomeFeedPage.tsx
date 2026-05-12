import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { FeedCard } from "../components/FeedCard";
import { useVibe } from "../context/VibeContext";
import type { ContentItem } from "../types";

export const HomeFeedPage = () => {
  const [feed, setFeed] = useState<ContentItem[]>([]);
  const { setMood } = useVibe();

  useEffect(() => {
    apiClient
      .getDiscoveryFeed("u-fan-1")
      .then((payload) => {
        setFeed(payload.feed);
        if (payload.feed[0]) {
          setMood(payload.feed[0].mood);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }, [setMood]);

  return (
    <section>
      <h2>Discovery Feed</h2>
      <p>
        Ranked for local creators and niche interests. Infinite-scroll style is represented as a
        stacked card stream in this MVP.
      </p>
      <div className="grid">
        {feed.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
};
