import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import type { User } from "../types";

export const ArtistProfilePage = () => {
  const { userId = "u-artist-1" } = useParams();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    apiClient
      .getUser(userId)
      .then((payload) => setUser(payload.user))
      .catch((error) => console.error(error));
  }, [userId]);

  if (!user) {
    return <p>Loading artist profile...</p>;
  }

  return (
    <section>
      <h2>{user.displayName}</h2>
      <p>@{user.handle}</p>
      <p>
        {user.location} • {user.followers.toLocaleString()} followers
      </p>
      <p>Genres: {user.genres.join(", ")}</p>
      <p>Niche focus: {user.niches.join(", ")}</p>
      <div className="card">
        <h3>Artist monetization stack</h3>
        <ul>
          <li>Fan subscriptions + exclusive drops</li>
          <li>Music and merch storefront</li>
          <li>Ownership verification check queue</li>
        </ul>
      </div>
    </section>
  );
};
