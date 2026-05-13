"use client";

import type { ChangeEvent, CSSProperties, FormEvent } from "react";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Bell,
  CalendarClock,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  Disc3,
  Headphones,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Mic2,
  Music2,
  Package,
  Palette,
  Pause,
  Play,
  Radio,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UploadCloud,
  Users,
  Video
} from "lucide-react";
import { conversations, discoverySignals, products, streams } from "@/lib/data";
import type { DiscoveryResult } from "@/lib/discovery";

type ArtbookExperienceProps = {
  initialFeed: DiscoveryResult[];
};

type UploadDetails = {
  title: string;
  kind: "audio" | "video";
  genre: string;
  location: string;
  premium: boolean;
  verifiedOwnership: boolean;
  fileName: string;
};

const accountTypes = [
  {
    title: "Artist",
    description:
      "Release audio and video, build albums, sell merch, verify ownership, and unlock paid fan content.",
    icon: Music2,
    features: ["Music uploads", "Albums and playlists", "Premium drops", "Profile design studio"]
  },
  {
    title: "Streamer",
    description:
      "Go live, schedule paid rooms, receive gifts in real time, and save stream archives for fans.",
    icon: Radio,
    features: ["Live chat", "Gift wallet", "Exclusive streams", "Fan communities"]
  },
  {
    title: "Fan",
    description:
      "Follow creators, discover local sounds, build playlists, post status updates, DM, and join groups.",
    icon: Headphones,
    features: ["Discovery feed", "Friends and DMs", "Groups", "Premium access"]
  }
];

const navItems = ["Feed", "Artists", "Accounts", "Streams", "Messages", "Groups", "Store", "Upload"];

const interestOptions = [
  "kora textures",
  "producer breakdowns",
  "rainy playlists",
  "live VJ sets",
  "fan cyphers"
];

const giftOptions = [
  { label: "Cowrie", amount: 50 },
  { label: "Drum", amount: 150 },
  { label: "Crown", amount: 500 }
];

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

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("");

const priceToNumber = (price: string) => Number(price.replace(/[^0-9.]/g, ""));

function CreatorCard({
  creator,
  featured = false,
  followed,
  onFollow
}: {
  creator: DiscoveryResult;
  featured?: boolean;
  followed: boolean;
  onFollow: (creatorId: string) => void;
}) {
  const displayedFollowers = creator.followers + (followed ? 1 : 0);

  return (
    <article
      className={`creator-card ${featured ? "creator-card-featured" : ""}`}
      style={creatorStyle(creator)}
    >
      <div className="creator-visual">
        <div className="pattern-band" />
        <div className="avatar-orb">{getInitials(creator.name)}</div>
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
          <strong>{formatFollowers(displayedFollowers)}</strong>
          <span>followers</span>
          <strong>{creator.matchScore}</strong>
          <span>match</span>
        </div>
        <div className="reason-row">
          {creator.reasons.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
        <button
          className={`follow-button ${followed ? "active" : ""}`}
          type="button"
          aria-pressed={followed}
          onClick={() => onFollow(creator.id)}
        >
          {followed ? "Following" : "Follow creator"}
        </button>
      </div>
    </article>
  );
}

export default function ArtbookExperience({ initialFeed }: ArtbookExperienceProps) {
  const [feed, setFeed] = useState(initialFeed);
  const [activeLocation, setActiveLocation] = useState("Accra");
  const [selectedGenres, setSelectedGenres] = useState(["Alté", "Afrosoul", "Amapiano"]);
  const [selectedInterest, setSelectedInterest] = useState("kora textures");
  const [discoveryStatus, setDiscoveryStatus] = useState("Feed tuned for Accra and niche music fans.");
  const [isTuning, setIsTuning] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState(initialFeed[0]?.id ?? "");
  const [betaForm, setBetaForm] = useState({ email: "", role: "Artist" });
  const [betaSubmitted, setBetaSubmitted] = useState(false);
  const [giftTotals, setGiftTotals] = useState<Record<string, number>>(
    streams.reduce<Record<string, number>>((totals, stream) => {
      totals[stream.id] = stream.gifts;
      return totals;
    }, {})
  );
  const [lastGift, setLastGift] = useState("Gift sent: 50 cowries");
  const [cartIds, setCartIds] = useState<Set<string>>(new Set());
  const [messageDraft, setMessageDraft] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const [uploadDetails, setUploadDetails] = useState<UploadDetails>({
    title: "",
    kind: "audio",
    genre: "",
    location: "",
    premium: false,
    verifiedOwnership: false,
    fileName: ""
  });

  const [leadCreator] = feed;
  const currentCreator = feed.find((creator) => creator.id === currentTrackId) ?? leadCreator;

  const allGenres = useMemo(
    () => Array.from(new Set(initialFeed.flatMap((creator) => creator.genres))).sort(),
    [initialFeed]
  );

  const cartProducts = products.filter((product) => cartIds.has(product.id));
  const cartTotal = cartProducts.reduce((total, product) => total + priceToNumber(product.price), 0);

  const uploadChecks = [
    { label: "Media file selected", complete: Boolean(uploadDetails.fileName) },
    { label: "Metadata fingerprint queued", complete: Boolean(uploadDetails.title && uploadDetails.genre) },
    { label: "Original ownership attested", complete: uploadDetails.verifiedOwnership },
    { label: "Location and audience route set", complete: Boolean(uploadDetails.location) }
  ];
  const completedUploadChecks = uploadChecks.filter((check) => check.complete).length;
  const uploadReady = completedUploadChecks === uploadChecks.length;

  const toggleFollow = (creatorId: string) => {
    setFollowedIds((current) => {
      const next = new Set(current);
      if (next.has(creatorId)) {
        next.delete(creatorId);
      } else {
        next.add(creatorId);
      }
      return next;
    });
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((current) => {
      if (current.includes(genre)) {
        return current.filter((item) => item !== genre);
      }

      return [...current, genre];
    });
  };

  const tuneDiscovery = async () => {
    setIsTuning(true);
    setDiscoveryStatus("Tuning feed through /api/discovery...");

    const params = new URLSearchParams();
    if (activeLocation.trim()) {
      params.set("location", activeLocation.trim());
    }
    selectedGenres.forEach((genre) => params.append("genre", genre));
    if (selectedInterest) {
      params.append("interest", selectedInterest);
    }

    try {
      const response = await fetch(`/api/discovery?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Discovery request failed");
      }

      const payload = (await response.json()) as { feed: DiscoveryResult[] };
      setFeed(payload.feed);
      setCurrentTrackId(payload.feed[0]?.id ?? "");
      setIsPlaying(false);
      setDiscoveryStatus(
        `Feed retuned for ${activeLocation || "all cities"} with ${selectedGenres.length || "no"} genre filters.`
      );
    } catch {
      setDiscoveryStatus("Could not tune the feed. Try another location or genre.");
    } finally {
      setIsTuning(false);
    }
  };

  const submitBeta = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBetaSubmitted(true);
  };

  const sendGift = (streamId: string, amount: number, label: string) => {
    setGiftTotals((current) => ({
      ...current,
      [streamId]: (current[streamId] ?? 0) + amount
    }));
    setLastGift(`Gift sent: ${amount} ${label.toLowerCase()} points`);
  };

  const toggleCart = (productId: string) => {
    setCartIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = messageDraft.trim();
    if (!trimmed) {
      return;
    }

    setSentMessages((current) => [trimmed, ...current].slice(0, 3));
    setMessageDraft("");
  };

  const updateUpload = <Key extends keyof UploadDetails>(key: Key, value: UploadDetails[Key]) => {
    setUploadDetails((current) => ({
      ...current,
      [key]: value
    }));
  };

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    updateUpload("fileName", event.target.files?.[0]?.name ?? "");
  };

  return (
    <main>
      <section className="hero-shell" id="feed">
        <nav className="top-nav" aria-label="Main navigation">
          <a className="brand" href="#feed" aria-label="Artbook home">
            <span className="brand-mark">A</span>
            <span>Artbook</span>
          </a>
          <div className="nav-links">
            {navItems.map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`}>
                {item}
              </a>
            ))}
          </div>
          <a className="ghost-button" href="#beta">
            Join beta
          </a>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker">
              <Sparkles size={18} />
              African-first discovery for music, video, streams, and culture.
            </div>
            <h1>Find the next sound before the world catches up.</h1>
            <p>
              Artbook is a social media, streaming, and marketplace platform shaped for local
              creators, niche fan communities, and adaptive artist expression.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#artists">
                Explore creators
                <Play size={18} fill="currentColor" />
              </a>
              <a className="secondary-button" href="#upload">
                Start uploading
                <UploadCloud size={18} />
              </a>
            </div>
            <div className="signal-strip" aria-label="Platform stats">
              <div>
                <strong>{followedIds.size}</strong>
                <span>creators followed</span>
              </div>
              <div>
                <strong>{cartIds.size}</strong>
                <span>cart items</span>
              </div>
              <div>
                <strong>{uploadReady ? "Ready" : `${completedUploadChecks}/4`}</strong>
                <span>upload checks</span>
              </div>
            </div>

            <form className="beta-card" id="beta" onSubmit={submitBeta}>
              <div>
                <span>Beta access</span>
                <strong>{betaSubmitted ? `Invite reserved for ${betaForm.role}` : "Reserve your account"}</strong>
              </div>
              <input
                aria-label="Email for beta invite"
                type="email"
                value={betaForm.email}
                onChange={(event) => setBetaForm({ ...betaForm, email: event.target.value })}
                placeholder="you@example.com"
                required
              />
              <select
                aria-label="Account role"
                value={betaForm.role}
                onChange={(event) => setBetaForm({ ...betaForm, role: event.target.value })}
              >
                {accountTypes.map((account) => (
                  <option key={account.title}>{account.title}</option>
                ))}
              </select>
              <button type="submit">{betaSubmitted ? "Reserved" : "Join waitlist"}</button>
            </form>
          </div>

          <div className="phone-frame" aria-label="Artbook discovery preview">
            <div className="phone-header">
              <span>For you in {activeLocation || "Africa"}</span>
              <Bell size={18} />
            </div>
            <CreatorCard
              creator={leadCreator}
              featured
              followed={followedIds.has(leadCreator.id)}
              onFollow={toggleFollow}
            />
            <div className="mini-player">
              <Disc3 className={isPlaying ? "spin" : ""} size={34} />
              <div>
                <strong>{currentCreator.latestWork}</strong>
                <span>
                  {isPlaying ? "Playing" : "Paused"} · Emotion UI: {currentCreator.mood} tones
                </span>
              </div>
              <button
                type="button"
                aria-label={isPlaying ? "Pause featured track" : "Play featured track"}
                onClick={() => setIsPlaying((playing) => !playing)}
              >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="artists">
        <div className="section-heading">
          <p className="eyebrow">Discovery system</p>
          <h2>Local first, niche aware, popularity second.</h2>
          <p>
            The feed demonstrates a scoring model that boosts nearby creators, exact genre
            affinity, niche interests, live moments, and verified original ownership.
          </p>
        </div>
        <div className="discovery-layout">
          <div className="creator-grid">
            {feed.map((creator) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                followed={followedIds.has(creator.id)}
                onFollow={toggleFollow}
              />
            ))}
          </div>
          <aside className="algorithm-panel">
            <div className="panel-icon">
              <Search />
            </div>
            <h3>Tune the live feed</h3>
            <label className="field-label">
              City or scene
              <input
                value={activeLocation}
                onChange={(event) => setActiveLocation(event.target.value)}
                placeholder="Accra, Lagos, Kampala..."
              />
            </label>
            <div className="filter-group" aria-label="Genre filters">
              {allGenres.map((genre) => (
                <button
                  className={selectedGenres.includes(genre) ? "active" : ""}
                  key={genre}
                  type="button"
                  aria-pressed={selectedGenres.includes(genre)}
                  onClick={() => toggleGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
            <label className="field-label">
              Niche interest
              <select
                value={selectedInterest}
                onChange={(event) => setSelectedInterest(event.target.value)}
              >
                {interestOptions.map((interest) => (
                  <option key={interest}>{interest}</option>
                ))}
              </select>
            </label>
            <button className="primary-button full-width" type="button" onClick={tuneDiscovery}>
              {isTuning ? "Tuning..." : "Tune feed"}
            </button>
            <p className="status-line" aria-live="polite">
              {discoveryStatus}
            </p>
            <ul>
              {discoverySignals.map((signal) => (
                <li key={signal}>
                  <CheckCircle2 size={18} />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
            <div className="api-card">
              <span>API preview</span>
              <code>
                /api/discovery?location={encodeURIComponent(activeLocation)}&amp;genre=
                {selectedGenres[0] ?? "Alté"}
              </code>
            </div>
          </aside>
        </div>
      </section>

      <section className="section account-section" id="accounts">
        <div className="section-heading">
          <p className="eyebrow">Three account system</p>
          <h2>Creator tools, live rooms, and fan identity in one product.</h2>
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

      <section className="section split-section" id="streams">
        <div>
          <p className="eyebrow">Streaming hub</p>
          <h2>Live now, scheduled next, archived forever.</h2>
          <p>
            Streamers can open free or paid rooms, receive real-time gifts, save replays, and keep
            fan groups active after the stream ends.
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
                  <strong>{giftTotals[stream.id] ? `${giftTotals[stream.id]} gifts` : "scheduled"}</strong>
                </div>
                {stream.isLive ? (
                  <button className="small-action" type="button" onClick={() => sendGift(stream.id, 50, "Cowrie")}>
                    Gift
                  </button>
                ) : null}
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
          <div className="chat-bubble right">{lastGift}</div>
          <div className="gift-row">
            {giftOptions.map((gift) => (
              <button
                key={gift.label}
                type="button"
                onClick={() => sendGift(streams[0].id, gift.amount, gift.label)}
              >
                {gift.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section social-grid" id="messages">
        <div className="social-card">
          <MessageCircle size={28} />
          <h2>Messages and groups</h2>
          <p>
            Fans can DM creators, add friends, and join community rooms attached to artists,
            playlists, and live shows.
          </p>
          <form className="message-composer" onSubmit={sendMessage}>
            <input
              aria-label="Message fan room"
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              placeholder="Message a creator or fan room..."
            />
            <button type="submit">
              <Send size={16} />
              Send
            </button>
          </form>
          <div className="conversation-list">
            {sentMessages.map((message, index) => (
              <div className="conversation sent" key={`${message}-${index}`}>
                <div className="conversation-avatar">Y</div>
                <div>
                  <strong>You</strong>
                  <span>{message}</span>
                </div>
              </div>
            ))}
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
        <div className="social-card" id="groups">
          <Users size={28} />
          <h2>Status and fan spaces</h2>
          <p>
            Lightweight stories, listening rooms, local crews, and premium fan circles keep social
            discovery fluid without burying users in heavy menus.
          </p>
          <div className="status-card">
            <Camera />
            <div>
              <strong>Ama Nile posted a studio story</strong>
              <span>Poll: soft keys or choir outro?</span>
            </div>
          </div>
          <div className="status-card">
            <Send />
            <div>
              <strong>Accra alté crew</strong>
              <span>{28 + followedIds.size} fans building a Friday night playlist.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section split-section" id="store">
        <div>
          <p className="eyebrow">Marketplace</p>
          <h2>Music, merch, and digital products tied to the creator graph.</h2>
          <p>
            Artists and streamers sell directly. Fans can unlock selling after upgrading to premium
            accounts, while the platform can take a configurable percentage from each sale.
          </p>
          <div className="store-grid">
            {products.map((product) => {
              const inCart = cartIds.has(product.id);
              return (
                <article className="product-card" key={product.id}>
                  <ShoppingBag />
                  <span>{product.kind}</span>
                  <h3>{product.title}</h3>
                  <p>
                    {product.seller} · {product.palette}
                  </p>
                  <strong>{product.price}</strong>
                  <button
                    className={`cart-button ${inCart ? "active" : ""}`}
                    type="button"
                    aria-pressed={inCart}
                    onClick={() => toggleCart(product.id)}
                  >
                    {inCart ? "Remove from cart" : "Add to cart"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
        <aside className="money-panel">
          <CircleDollarSign size={32} />
          <h3>Monetization rails</h3>
          <ul>
            <li>Subscriptions and premium drops for artists.</li>
            <li>Paid streams and real-time gifts for streamers.</li>
            <li>Stripe or PayPal checkout adapters for sales.</li>
            <li>Platform fee accounting for subscriptions, gifts, and store orders.</li>
          </ul>
          <div className="cart-summary">
            <span>{cartIds.size} items selected</span>
            <strong>${cartTotal.toFixed(2)}</strong>
            <button type="button" disabled={cartIds.size === 0}>
              {cartIds.size ? "Checkout preview" : "Cart empty"}
            </button>
          </div>
        </aside>
      </section>

      <section className="section upload-section" id="upload">
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
            <strong>{uploadDetails.fileName || "Choose audio or video"}</strong>
            <span>MP3, WAV, and MP4 up to your storage limit</span>
            <input aria-label="Upload media file" type="file" accept=".mp3,.wav,.mp4,audio/*,video/*" onChange={chooseFile} />
          </div>
          <form className="upload-form">
            <label className="field-label">
              Release title
              <input
                value={uploadDetails.title}
                onChange={(event) => updateUpload("title", event.target.value)}
                placeholder="Palmwine Echoes live cut"
              />
            </label>
            <label className="field-label">
              Genre
              <input
                value={uploadDetails.genre}
                onChange={(event) => updateUpload("genre", event.target.value)}
                placeholder="Afrosoul"
              />
            </label>
            <label className="field-label">
              City
              <input
                value={uploadDetails.location}
                onChange={(event) => updateUpload("location", event.target.value)}
                placeholder="Accra"
              />
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={uploadDetails.premium}
                onChange={(event) => updateUpload("premium", event.target.checked)}
              />
              Subscriber-only drop
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={uploadDetails.verifiedOwnership}
                onChange={(event) => updateUpload("verifiedOwnership", event.target.checked)}
              />
              I own or control this media
            </label>
          </form>
          <div className="checklist">
            <div className={`upload-status ${uploadReady ? "complete" : ""}`}>
              {uploadReady ? <BadgeCheck /> : <ShieldCheck />}
              <span>{uploadReady ? "Ready to publish" : `${completedUploadChecks}/4 checks complete`}</span>
            </div>
            {uploadChecks.map((check) => (
              <div className={check.complete ? "complete" : ""} key={check.label}>
                {check.complete ? <BadgeCheck /> : <ShieldCheck />}
                <span>{check.label}</span>
              </div>
            ))}
            <div className={uploadReady ? "complete" : ""}>
              <Palette />
              <span>
                {uploadReady
                  ? `${uploadDetails.kind} release ready for ${uploadDetails.premium ? "premium" : "public"} publishing`
                  : "Complete every checkpoint to publish"}
              </span>
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
