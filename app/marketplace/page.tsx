import { CircleDollarSign, Store } from "lucide-react";
import { ProductCard } from "@/app/components/ProductCard";
import { SiteNav } from "@/app/components/SiteNav";
import { products, type AccountType } from "@/lib/data";

const marketplaceLanes: Array<{
  type: AccountType;
  title: string;
  description: string;
}> = [
  {
    type: "artist",
    title: "Artist store",
    description: "Music, stems, merch, bundles, and premium release extras tied to artist profiles."
  },
  {
    type: "streamer",
    title: "Streamer store",
    description: "Live room tickets, replay passes, gift bundles, and stream-made digital goods."
  },
  {
    type: "creator",
    title: "Creator marketplace",
    description:
      "A separate lane for creator sellers: zines, playlists, guides, presets, and community finds."
  }
];

export default function MarketplacePage() {
  return (
    <main>
      <section className="page-shell">
        <SiteNav />
        <div className="page-hero">
          <p className="eyebrow">Marketplace</p>
          <h1>Creators can sell without becoming artists or streamers.</h1>
          <p>
            Marketplace inventory is split by seller type so artist releases, streamer access, and
            creator goods can carry different rules, fees, and storefront expectations.
          </p>
        </div>
      </section>

      <section className="section marketplace-lanes">
        {marketplaceLanes.map((lane) => {
          const laneProducts = products.filter((product) => product.sellerType === lane.type);

          return (
            <article className="lane-card" key={lane.type}>
              <div className="lane-heading">
                <Store />
                <div>
                  <p className="eyebrow">{lane.type}</p>
                  <h2>{lane.title}</h2>
                  <p>{lane.description}</p>
                </div>
              </div>
              <div className="store-grid">
                {laneProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="section split-section">
        <div>
          <p className="eyebrow">Seller rules</p>
          <h2>Different products, different checkout logic.</h2>
          <p>
            Artists focus on releases and merch, streamers monetize live events, and creators sell
            lightweight goods that can be reviewed and fulfilled separately.
          </p>
        </div>
        <aside className="money-panel">
          <CircleDollarSign size={32} />
          <h3>Marketplace rails</h3>
          <ul>
            <li>Artist listings can attach to albums, singles, and ownership verification.</li>
            <li>Streamer listings can attach to live rooms, replays, gifts, and schedules.</li>
            <li>Creator listings can use separate moderation, delivery, and seller limits.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
