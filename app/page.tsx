import {
  BadgeCheck,
  CalendarClock,
  Camera,
  CircleDollarSign,
  Disc3,
  Headphones,
  HeartHandshake,
  Mic2,
  Music2,
  Package,
  Palette,
  Play,
  Radio,
  Search,
  Send,
  Sparkles,
  UploadCloud,
  Users,
  Video
} from "lucide-react";
import { CreatorCard } from "@/app/components/CreatorCard";
import { ProductCard } from "@/app/components/ProductCard";
import { SiteNav } from "@/app/components/SiteNav";
import { conversations, products, streams } from "@/lib/data";
import { getDiscoveryFeed } from "@/lib/discovery";

const feed = getDiscoveryFeed();

const accountTypes = [
  {
    title: "Artist",
    description:
      "Release audio and video, build albums, sell merch, verify ownership, and unlock paid creator content.",
    icon: Music2,
    features: ["Music uploads", "Albums and playlists", "Premium drops", "Profile design studio"]
  },
  {
    title: "Streamer",
    description:
      "Go live, schedule paid rooms, receive gifts in real time, and save stream archives for creators.",
    icon: Radio,
    features: ["Live chat", "Gift wallet", "Exclusive streams", "Creator communities"]
  },
  {
    title: "Creator",
    description:
      "Discover local sounds, build playlists, post status updates, DM, join groups, and sell curated goods.",
    icon: Headphones,
    features: ["Discovery feed", "Friends and DMs", "Groups", "Creator marketplace"]
  }
];

export default function Home() {
  const [leadCreator, ...supportingCreators] = feed;
  const previewProducts = products.slice(0, 3);

  return (
    <main>
      <section className="hero-shell">
        <SiteNav />

        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker">
              <Sparkles size={18} />
              African-first discovery for music, video, streams, and culture.
            </div>
            <h1>Find the next sound before the world catches up.</h1>
            <p>
              Artbook is a social media, streaming, and marketplace platform shaped for local
              creators, niche communities, and adaptive artist expression.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="/artists">
                Search artists by location
                <Search size={18} />
              </a>
              <a className="secondary-button" href="/marketplace">
                Open marketplace
                <Play size={18} fill="currentColor" />
              </a>
            </div>
            <div className="signal-strip" aria-label="Platform stats">
              <div>
                <strong>3</strong>
                <span>account modes</span>
              </div>
              <div>
                <strong>160</strong>
                <span>discovery score cap</span>
              </div>
              <div>
                <strong>3</strong>
                <span>marketplace lanes</span>
              </div>
            </div>
          </div>

          <div className="phone-frame" aria-label="Artbook discovery preview">
            <div className="phone-header">
              <span>For you in Accra</span>
              <BadgeCheck size={18} />
            </div>
            <CreatorCard creator={leadCreator} featured />
            <div className="mini-player">
              <Disc3 className="spin" size={34} />
              <div>
                <strong>{leadCreator.latestWork}</strong>
                <span>Emotion UI: {leadCreator.mood} tones</span>
              </div>
              <button type="button" aria-label="Play featured track">
                <Play size={16} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section account-section">
        <div className="section-heading">
          <p className="eyebrow">Three account system</p>
          <h2>Artists, streamers, and creators each get a clear lane.</h2>
        </div>
        <div className="account-grid">
          {accountTypes.map(({ title, description, icon: Icon, features }) => (
            <article className="account-card" key={title}>
              <Icon size={28} />
              <h3>{title}</h3>
              <p>{description}</p>
              <div className="feature-list">
                {features.map((feature) => (
                  <span key={feature}>{feature}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Location discovery</p>
          <h2>Artist search now starts with place.</h2>
          <p>
            Search by city or country, then rank artists using genre affinity, niche interests,
            live moments, and ownership signals.
          </p>
        </div>
        <div className="discovery-layout">
          <div className="creator-grid">
            {supportingCreators.slice(0, 4).map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
          <aside className="algorithm-panel">
            <div className="panel-icon">
              <Search />
            </div>
            <h3>Search routes</h3>
            <ul>
              <li>
                <Search size={18} />
                <span>Use `/artists?location=Accra` to search artist profiles by location.</span>
              </li>
              <li>
                <Video size={18} />
                <span>Streams, community, marketplace, and upload now live on separate pages.</span>
              </li>
            </ul>
            <a className="inline-link" href="/artists?location=Accra">
              Try Accra artist search
            </a>
          </aside>
        </div>
      </section>

      <section className="section split-section">
        <div>
          <p className="eyebrow">Streaming hub</p>
          <h2>Live now, scheduled next, archived forever.</h2>
          <p>
            Streamers can open free or paid rooms, receive real-time gifts, save replays, and keep
            creator groups active after the stream ends.
          </p>
          <div className="stream-stack">
            {streams.map((stream) => (
              <article className="stream-card" key={stream.id}>
                <div className={stream.isLive ? "stream-dot live" : "stream-dot"} />
                <div>
                  <h3>{stream.title}</h3>
                  <p>
                    {stream.creatorName} · {stream.city} · {stream.startsAt}
                  </p>
                </div>
                <div className="stream-price">
                  <span>{stream.price}</span>
                  <strong>{stream.gifts ? `${stream.gifts} gifts` : "scheduled"}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="live-console">
          <div className="console-video">
            <Video size={42} />
            <span>LiveKit/WebRTC ready zone</span>
          </div>
          <div className="chat-bubble left">Drop the chorus again!</div>
          <div className="chat-bubble right">Gift sent: 50 cowries</div>
          <div className="gift-row">
            <button type="button">Cowrie</button>
            <button type="button">Drum</button>
            <button type="button">Crown</button>
          </div>
        </div>
      </section>

      <section className="section social-grid">
        <div className="social-card">
          <Send size={28} />
          <h2>Messages and groups</h2>
          <p>
            Creators can DM, add friends, and join community rooms attached to artists, playlists,
            and live shows.
          </p>
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <div className="conversation" key={conversation.id}>
                <div className="conversation-avatar">{conversation.name[0]}</div>
                <div>
                  <strong>{conversation.name}</strong>
                  <span>{conversation.preview}</span>
                </div>
                {conversation.unread ? <em>{conversation.unread}</em> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="social-card">
          <Users size={28} />
          <h2>Status and creator spaces</h2>
          <p>
            Lightweight stories, listening rooms, local crews, and premium creator circles keep
            social discovery fluid.
          </p>
          <div className="status-card">
            <Camera />
            <div>
              <strong>Ama Nile posted a studio story</strong>
              <span>Poll: soft keys or choir outro?</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section split-section">
        <div>
          <p className="eyebrow">Marketplace</p>
          <h2>Distinct stores for artists, streamers, and creators.</h2>
          <p>
            Artists sell releases and merch, streamers sell room access and replays, and creators
            sell curated goods in a separate marketplace lane.
          </p>
          <div className="store-grid">
            {previewProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
        <aside className="money-panel">
          <CircleDollarSign size={32} />
          <h3>Monetization rails</h3>
          <ul>
            <li>Subscriptions and premium drops for artists.</li>
            <li>Paid streams and real-time gifts for streamers.</li>
            <li>Creator marketplace listings for zines, guides, presets, and community goods.</li>
            <li>Platform fee accounting for subscriptions, gifts, and store orders.</li>
          </ul>
        </aside>
      </section>

      <section className="section upload-section">
        <div className="upload-copy">
          <p className="eyebrow">Upload dashboard</p>
          <h2>Media intake with ownership protection built into the flow.</h2>
          <p>
            The MVP models upload readiness for MP3, WAV, and MP4 files with genre, niche, location,
            premium access, and verification checkpoints.
          </p>
        </div>
        <div className="upload-board">
          <div className="upload-dropzone">
            <UploadCloud size={38} />
            <strong>Drop audio or video</strong>
            <span>MP3, WAV, and MP4 up to your storage limit</span>
          </div>
          <div className="checklist">
            <div>
              <BadgeCheck />
              <span>Metadata fingerprint queued</span>
            </div>
            <div>
              <Palette />
              <span>Emotion UI palette generated from mood and genre</span>
            </div>
            <div>
              <Package />
              <span>Attach merch, stems, or subscriber-only extras</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section roadmap-section">
        <p className="eyebrow">MVP architecture</p>
        <h2>Built to grow into the full platform.</h2>
        <div className="roadmap-grid">
          <article>
            <Mic2 />
            <h3>Media services</h3>
            <p>Swap sample data for S3 uploads, transcoding, waveform previews, and rights checks.</p>
          </article>
          <article>
            <CalendarClock />
            <h3>Realtime layer</h3>
            <p>Connect WebRTC or LiveKit rooms, stream chat, DMs, gifts, and presence events.</p>
          </article>
          <article>
            <HeartHandshake />
            <h3>Community graph</h3>
            <p>Persist follows, subscriptions, groups, playlists, and recommendation feedback.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
