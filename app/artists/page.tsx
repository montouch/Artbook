import { CheckCircle2, MapPin, Search } from "lucide-react";
import { CreatorCard } from "@/app/components/CreatorCard";
import { SiteNav } from "@/app/components/SiteNav";
import { discoverySignals } from "@/lib/data";
import { getDiscoveryFeed, matchesLocation } from "@/lib/discovery";

type ArtistsPageProps = {
  searchParams?: Promise<{
    location?: string | string[];
  }>;
};

const getParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export default async function ArtistsPage({ searchParams }: ArtistsPageProps) {
  const params = await searchParams;
  const location = getParam(params?.location)?.trim() ?? "";
  const defaultLocation = location || "Accra";
  const rankedArtists = getDiscoveryFeed({
    location: defaultLocation,
    genres: ["Alté", "Afrosoul", "Amapiano", "R&B"],
    interests: ["kora textures", "choir harmonies"],
    accountTypes: ["artist"]
  });
  const artistResults = location
    ? rankedArtists.filter((creator) => matchesLocation(creator, location))
    : rankedArtists;

  return (
    <main>
      <section className="page-shell">
        <SiteNav />
        <div className="page-hero two-column-hero">
          <div>
            <p className="eyebrow">Artist location search</p>
            <h1>Search artists by city or country.</h1>
            <p>
              Location is now a first-class discovery input. Search Accra, Ghana, Kampala, or any
              supported city to surface nearby artist profiles.
            </p>
          </div>
          <form className="search-card" action="/artists">
            <label htmlFor="location">Artist location</label>
            <div className="search-row">
              <MapPin size={18} />
              <input
                id="location"
                name="location"
                placeholder="Accra, Ghana, Kampala..."
                defaultValue={location}
              />
              <button type="submit">
                <Search size={18} />
                Search
              </button>
            </div>
            <span>Try Accra, Ghana, Kampala, Uganda, or South Africa.</span>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Results</p>
          <h2>
            {location
              ? `${artistResults.length} artist result${artistResults.length === 1 ? "" : "s"} for ${location}`
              : "Featured artists ranked for Accra"}
          </h2>
          <p>
            Results are filtered to artist accounts and then sorted by location, genre affinity,
            niche signals, and ownership verification.
          </p>
        </div>

        {artistResults.length ? (
          <div className="creator-grid three-up">
            {artistResults.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={32} />
            <h3>No artists found for that location yet.</h3>
            <p>Try searching by country or browse the featured artist set.</p>
            <a className="inline-link" href="/artists">
              Clear location search
            </a>
          </div>
        )}
      </section>

      <section className="section split-section">
        <aside className="algorithm-panel">
          <div className="panel-icon">
            <Search />
          </div>
          <h3>Discovery signals</h3>
          <ul>
            {discoverySignals.map((signal) => (
              <li key={signal}>
                <CheckCircle2 size={18} />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </aside>
        <div className="api-card large-api-card">
          <span>API preview</span>
          <code>/api/discovery?type=artist&amp;location={defaultLocation}</code>
        </div>
      </section>
    </main>
  );
}
