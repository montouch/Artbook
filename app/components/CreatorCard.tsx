import type { CSSProperties } from "react";
import { BadgeCheck, MapPin, ShieldCheck } from "lucide-react";
import type { DiscoveryResult } from "@/lib/discovery";

const formatFollowers = (followers: number) => {
  if (followers >= 1000) {
    return `${(followers / 1000).toFixed(followers > 10000 ? 0 : 1)}k`;
  }

  return followers.toString();
};

const creatorStyle = (creator: DiscoveryResult) =>
  ({
    "--accent": creator.accent,
    "--soft-accent": creator.softAccent
  }) as CSSProperties;

export function CreatorCard({
  creator,
  featured = false
}: {
  creator: DiscoveryResult;
  featured?: boolean;
}) {
  return (
    <article
      className={`creator-card ${featured ? "creator-card-featured" : ""}`}
      style={creatorStyle(creator)}
    >
      <div className="creator-visual">
        <div className="pattern-band" />
        <div className="avatar-orb">
          {creator.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </div>
        {creator.live ? <span className="live-pill">Live</span> : null}
      </div>
      <div className="creator-body">
        <div className="creator-title-row">
          <div>
            <p className="eyebrow">{creator.accountType}</p>
            <h3>{creator.name}</h3>
          </div>
          {creator.verified ? (
            <BadgeCheck className="verified-icon" aria-label="Verified creator" />
          ) : (
            <ShieldCheck className="pending-icon" aria-label="Verification pending" />
          )}
        </div>
        <p className="handle">
          <MapPin size={14} /> {creator.city}, {creator.country} · {creator.handle}
        </p>
        <p className="creator-story">{creator.story}</p>
        <div className="tag-row">
          {creator.genres.map((genre) => (
            <span key={genre}>{genre}</span>
          ))}
        </div>
        <div className="creator-meta">
          <strong>{formatFollowers(creator.followers)}</strong>
          <span>followers</span>
          <strong>{creator.matchScore}</strong>
          <span>match</span>
        </div>
        <div className="reason-row">
          {creator.reasons.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
