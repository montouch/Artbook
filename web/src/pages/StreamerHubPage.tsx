import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import type { Stream } from "../types";

export const StreamerHubPage = () => {
  const [streams, setStreams] = useState<Stream[]>([]);

  useEffect(() => {
    apiClient
      .getFeaturedStreams()
      .then((payload) => setStreams(payload.streams))
      .catch((error) => console.error(error));
  }, []);

  return (
    <section>
      <h2>Streaming Hub</h2>
      <p>Featured live sessions, upcoming schedule, and replay archive.</p>
      <div className="grid">
        {streams.map((stream) => (
          <article className="card" key={stream.id}>
            <h3>{stream.title}</h3>
            <p>Status: {stream.status}</p>
            <p>Premium-only: {stream.isPremium ? "Yes" : "No"}</p>
            <p>Gift balance: ${stream.gifts.toFixed(2)}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
