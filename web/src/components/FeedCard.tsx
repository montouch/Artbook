import type { ContentItem } from "../types";

export const FeedCard = ({ item }: { item: ContentItem }) => (
  <article className="card">
    <div className="chip-row">
      <span className="chip">{item.mediaType.toUpperCase()}</span>
      <span className="chip">{item.genre}</span>
      <span className="chip">{item.location}</span>
      {item.isPremium && <span className="chip premium">Premium</span>}
    </div>
    <h3>{item.title}</h3>
    <p>{item.niches.join(" • ")}</p>
    <small>Mood: {item.mood}</small>
  </article>
);
