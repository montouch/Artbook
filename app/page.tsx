"use client";

import { type ChangeEvent, type CSSProperties, type DragEvent, useRef, useState } from "react";
import {
  BadgeCheck,
  Bell,
  CalendarClock,
  Camera,
  ChevronDown,
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
import {
  conversations,
  discoverySignals,
  products,
  streams,
} from "@/lib/data";
import { getDiscoveryFeed, type DiscoveryResult } from "@/lib/discovery";

const feed = getDiscoveryFeed();

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

const navItems = [
  { label: "Feed", href: "#feed" },
  { label: "Artists", href: "#artists" },
  { label: "Access", href: "#access" },
  { label: "Streams", href: "#streams" },
  { label: "Messages", href: "#messages" },
  { label: "Groups", href: "#groups" },
  { label: "Store", href: "#store" },
  { label: "Upload", href: "#upload" }
];

const giftOptions = [
  { name: "Cowrie", value: 50 },
  { name: "Drum", value: 120 },
  { name: "Crown", value: 250 }
];

const acceptedUploadTypes = ".mp3,.wav,.mp4,audio/mpeg,audio/wav,audio/wave,video/mp4";

const formatFollowers = (followers: number) => {
  if (followers >= 1000) {
    return `${(followers / 1000).toFixed(followers > 10000 ? 0 : 1)}k`;
  }

  return followers.toString();
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const creatorStyle = (creator: DiscoveryResult) =>
  ({
    "--accent": creator.accent,
    "--soft-accent": creator.softAccent
  }) as CSSProperties;

function CreatorCard({
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

export default function Home() {
  const [leadCreator, ...supportingCreators] = feed;
  const [accessOpen, setAccessOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(accountTypes[0].title);
  const [betaJoined, setBetaJoined] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [latestGift, setLatestGift] = useState("Choose a gift to support this room.");
  const [giftTotal, setGiftTotal] = useState(1430);
  const [uploadFiles, setUploadFiles] = useState<string[]>([]);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleGift = (gift: (typeof giftOptions)[number]) => {
    const nextTotal = giftTotal + gift.value;

    setGiftTotal(nextTotal);
    setLatestGift(
      `You sent ${gift.name}: +${gift.value} cowries. Room total: ${nextTotal.toLocaleString()} gifts.`
    );
  };

  const handleFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    const supportedFiles = files.filter((file) => /\.(mp3|wav|mp4)$/i.test(file.name));

    setUploadFiles(
      supportedFiles.map((file) => `${file.name} · ${formatFileSize(file.size)}`)
    );
  };

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  };

  const handleUploadDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingUpload(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <main>
      <section className="hero-shell" id="feed">
        <nav className="top-nav" aria-label="Main navigation">
          <a className="brand" href="#feed" aria-label="Artbook home">
            <span className="brand-mark">A</span>
            <span>Artbook</span>
          </a>
          <div className="access-menu">
            <button
              className="access-trigger"
              type="button"
              aria-expanded={accessOpen}
              aria-controls="access-dropdown"
              onClick={() => setAccessOpen((isOpen) => !isOpen)}
            >
              Access Artbook
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {accessOpen ? (
              <div className="access-dropdown" id="access-dropdown">
                <div className="access-links" aria-label="Page sections">
                  {navItems.map((item) => (
                    <a key={item.label} href={item.href} onClick={() => setAccessOpen(false)}>
                      {item.label}
                    </a>
                  ))}
                </div>
                <div className="access-panel">
                  <p className="eyebrow">Beta access</p>
                  <label htmlFor="account-mode">Account mode</label>
                  <select
                    id="account-mode"
                    value={selectedAccount}
                    onChange={(event) => {
                      setSelectedAccount(event.target.value);
                      setBetaJoined(false);
                    }}
                  >
                    {accountTypes.map((accountType) => (
                      <option key={accountType.title}>{accountType.title}</option>
                    ))}
                  </select>
                  <button
                    className="ghost-button access-submit"
                    type="button"
                    onClick={() => setBetaJoined(true)}
                  >
                    Join beta
                  </button>
                  <p className="access-feedback" aria-live="polite">
                    {betaJoined
                      ? `${selectedAccount} beta access is queued. Watch for the invite email.`
                      : "Choose an account type and request access from here."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
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
                <strong>3</strong>
                <span>account modes</span>
              </div>
              <div>
                <strong>160</strong>
                <span>discovery score cap</span>
              </div>
              <div>
                <strong>5%</strong>
                <span>sample platform fee</span>
              </div>
            </div>
          </div>

          <div className="phone-frame" aria-label="Artbook discovery preview">
            <div className="phone-header">
              <span>For you in Accra</span>
              <button
                className="notification-button"
                type="button"
                aria-label="Toggle discovery notifications"
                aria-pressed={notificationsOpen}
                onClick={() => setNotificationsOpen((isOpen) => !isOpen)}
              >
                <Bell size={18} />
              </button>
            </div>
            {notificationsOpen ? (
              <div className="phone-alert" role="status">
                3 new updates: Zuri dropped a preview, Musa is live, and the Accra crew posted.
              </div>
            ) : null}
            <CreatorCard creator={leadCreator} featured />
            <div className="mini-player">
              <Disc3 className="spin" size={34} />
              <div>
                <strong>{leadCreator.latestWork}</strong>
                <span>
                  {isPlaying
                    ? `Playing preview · ${leadCreator.mood} tones`
                    : `Paused · ${leadCreator.mood} tones`}
                </span>
              </div>
              <button
                type="button"
                aria-label={isPlaying ? "Pause featured track" : "Play featured track"}
                aria-pressed={isPlaying}
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
            {supportingCreators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
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
            <a className="api-card" href="/api/discovery?location=Accra&genre=Alt%C3%A9">
              <span>API preview</span>
              <code>/api/discovery?location=Accra&amp;genre=Alté</code>
            </a>
          </aside>
        </div>
      </section>

      <section className="section account-section" id="access">
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
          <div className="chat-bubble right" aria-live="polite">
            {latestGift}
          </div>
          <div className="gift-row">
            {giftOptions.map((gift) => (
              <button key={gift.name} type="button" onClick={() => handleGift(gift)}>
                {gift.name}
              </button>
            ))}
          </div>
          <p className="gift-total" aria-live="polite">
            {giftTotal.toLocaleString()} total gifts sent in this room
          </p>
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
              <span>28 fans building a Friday night playlist.</span>
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
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <ShoppingBag />
                <span>{product.kind}</span>
                <h3>{product.title}</h3>
                <p>
                  {product.seller} · {product.palette}
                </p>
                <strong>{product.price}</strong>
              </article>
            ))}
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
          <label
            className={`upload-dropzone ${isDraggingUpload ? "is-dragging" : ""} ${
              uploadFiles.length ? "has-files" : ""
            }`}
            htmlFor="media-upload"
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingUpload(true);
            }}
            onDragLeave={() => setIsDraggingUpload(false)}
            onDrop={handleUploadDrop}
          >
            <input
              ref={uploadInputRef}
              id="media-upload"
              type="file"
              accept={acceptedUploadTypes}
              multiple
              onChange={handleUploadChange}
            />
            <UploadCloud size={38} />
            <strong>{uploadFiles.length ? "Media ready for checks" : "Drop audio or video"}</strong>
            <span>
              {uploadFiles.length
                ? `${uploadFiles.length} supported file${uploadFiles.length === 1 ? "" : "s"} selected`
                : "MP3, WAV, and MP4 up to your storage limit"}
            </span>
            <span className="upload-cta">Choose files</span>
          </label>
          <div className="checklist">
            {uploadFiles.length ? (
              <section className="upload-summary" aria-live="polite">
                <strong>Ready for metadata review</strong>
                <ul>
                  {uploadFiles.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            <div>
              <ShieldCheck />
              <span>Metadata fingerprint queued</span>
            </div>
            <div>
              <BadgeCheck />
              <span>Original ownership attestation required</span>
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
