"use client";

import { useState } from "react";
import {
  Home,
  Users,
  Plus,
  Mail,
  Menu,
  Search,
  Calendar,
  Package,
  TrendingUp,
  Briefcase,
  Clock,
  MapPin,
  Star,
  Heart,
  MessageCircle,
  Share2,
  AlertCircle,
  Send,
  CheckCircle2,
  Upload,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Sparkles,
  Phone,
  Shield,
  CreditCard,
  User,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  ChevronDown,
  Store,
  Circle
} from "lucide-react";
import { sellers, marketplaceListings, posts, messages, stats } from "@/lib/kenya-data";
import type { Seller } from "@/lib/kenya-data";

type Screen =
  | "home"
  | "circles"
  | "create"
  | "inbox"
  | "menu"
  | "marketplace"
  | "business"
  | "booking"
  | "wallet"
  | "profile"
  | "artguide";

export default function ArtbookKenya() {
  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  const [activeFilter, setActiveFilter] = useState("all");

  // Helper functions
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const Avatar = ({
    seller,
    size = "md"
  }: {
    seller: Seller;
    size?: "sm" | "md" | "lg" | "xl";
  }) => {
    const sizeClass = `avatar avatar-${size}`;
    return (
      <div className={sizeClass}>
        {getInitials(seller.name)}
        {seller.verified && (
          <div className="avatar-badge">
            <CheckCircle2 size={8} color="white" strokeWidth={3} />
          </div>
        )}
      </div>
    );
  };

  const Badge = ({
    variant,
    icon: Icon,
    children
  }: {
    variant: "trust" | "warning" | "premium" | "success";
    icon?: any;
    children: React.ReactNode;
  }) => {
    return (
      <span className={`badge badge-${variant}`}>
        {Icon && <Icon size={12} />}
        {children}
      </span>
    );
  };

  const StatCard = ({
    label,
    value,
    icon: Icon
  }: {
    label: string;
    value: string;
    icon: any;
  }) => {
    return (
      <div className="stat-card">
        <div className="flex justify-between items-start">
          <div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
          {Icon && <Icon size={20} className="text-primary" style={{ opacity: 0.8 }} />}
        </div>
      </div>
    );
  };

  const BottomNav = () => {
    const navItems = [
      { id: "home" as Screen, icon: Home, label: "Home" },
      { id: "circles" as Screen, icon: Users, label: "Circles" },
      { id: "create" as Screen, icon: Plus, label: "Create" },
      { id: "inbox" as Screen, icon: Mail, label: "Inbox" },
      { id: "menu" as Screen, icon: Menu, label: "Menu" }
    ];

    const getActiveTab = () => {
      const tabMap: Record<Screen, Screen> = {
        home: "home",
        circles: "circles",
        create: "create",
        inbox: "inbox",
        menu: "menu",
        marketplace: "menu",
        business: "menu",
        booking: "home",
        wallet: "menu",
        profile: "menu",
        artguide: "menu"
      };
      return tabMap[activeScreen] || "home";
    };

    const activeTab = getActiveTab();

    return (
      <nav className="bottom-nav">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isCreate = item.id === "create";

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`nav-item ${isActive ? "active" : ""} ${isCreate ? "create" : ""}`}
            >
              <div className="nav-icon">
                <item.icon size={20} />
              </div>
              {!isCreate && <span className="nav-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    );
  };

  const HomeScreen = () => {
    return (
      <div className="screen">
        <div className="screen-header">
          <div className="flex items-center justify-between gap-4" style={{ marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 600 }}>Good morning, Alex</h1>
              <div className="flex gap-2" style={{ marginTop: 4 }}>
                <Badge variant="trust" icon={CheckCircle2}>
                  Verified Seller
                </Badge>
                <Badge variant="premium" icon={Star}>
                  Premium
                </Badge>
              </div>
            </div>
            <Avatar seller={{ id: "user", name: "Alex Kimani", verified: true, trustScore: 4.9, location: "" }} size="lg" />
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Today</h2>
          <div className="grid gap-3">
            <StatCard label="Today's Bookings" value="3" icon={Calendar} />
            <StatCard label="Pending Reviews" value="2" icon={AlertCircle} />
            <StatCard label="Wallet Balance" value={stats.walletBalance} icon={TrendingUp} />
          </div>
        </div>

        <div className="section">
          <div
            className="card card-padding"
            onClick={() => setActiveScreen("marketplace")}
            style={{ cursor: "pointer" }}
          >
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(13, 148, 136, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Store size={24} className="text-primary" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontWeight: 600 }}>Explore Marketplace</h4>
                <p className="text-muted" style={{ fontSize: 14 }}>
                  Discover products, services & events
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="section" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Your Businesses</h2>
            <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 14 }}>
              View all
            </button>
          </div>
          <div className="grid gap-3">
            <div className="card card-padding">
              <div className="flex items-start justify-between gap-3">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                    <Briefcase size={16} className="text-primary" />
                    <h4 style={{ fontWeight: 600 }}>Artisan Prints Co.</h4>
                  </div>
                  <div className="flex items-center gap-3 text-muted" style={{ fontSize: 14 }}>
                    <span>8 orders</span>
                    <span>•</span>
                    <span className="text-primary" style={{ fontWeight: 500 }}>
                      KES 12,400
                    </span>
                  </div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CirclesScreen = () => {
    const filters = ["All", "Following", "Businesses", "Creators"];

    return (
      <div className="screen">
        <div className="screen-header">
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Circles</h1>
          <div className="flex gap-2 scrollbar-hide" style={{ overflowX: "auto", paddingBottom: 4 }}>
            {filters.map((filter) => (
              <button
                key={filter}
                className={`chip ${activeFilter === filter.toLowerCase() ? "active" : ""}`}
                onClick={() => setActiveFilter(filter.toLowerCase())}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)" }}>
          {posts.map((post) => (
            <div key={post.id} style={{ padding: "20px", borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-start gap-3" style={{ marginBottom: 16 }}>
                <Avatar seller={post.author} size="md" />
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 style={{ fontWeight: 600 }}>{post.author.name}</h4>
                    {post.author.isBusiness && (
                      <Badge variant="success">
                        <Briefcase size={12} />
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted" style={{ fontSize: 14 }}>
                    {post.timestamp}
                  </p>
                </div>
              </div>

              <p style={{ marginBottom: 12, lineHeight: 1.6 }}>{post.content}</p>

              <div className="flex items-center gap-6" style={{ paddingTop: 8 }}>
                <button className="flex items-center gap-2 text-muted" style={{ background: "none", border: "none", padding: 0 }}>
                  <Heart size={20} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 text-muted" style={{ background: "none", border: "none", padding: 0 }}>
                  <MessageCircle size={20} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{post.comments}</span>
                </button>
                <button className="flex items-center gap-2 text-muted" style={{ background: "none", border: "none", padding: 0, marginLeft: "auto" }}>
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const MarketplaceScreen = () => {
    const categories = ["All", "Products", "Services", "Events", "Jobs", "Delivery"];

    return (
      <div className="screen">
        <div className="screen-header">
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Marketplace</h1>

          <div style={{ marginBottom: 16 }}>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                placeholder="Search products, services, events..."
                style={{ paddingLeft: 40 }}
              />
              <Search
                size={20}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
                className="text-muted"
              />
            </div>
          </div>

          <div className="flex gap-2 scrollbar-hide" style={{ overflowX: "auto", paddingBottom: 4 }}>
            {categories.map((category) => (
              <button
                key={category}
                className={`chip ${activeFilter === category.toLowerCase() ? "active" : ""}`}
                onClick={() => setActiveFilter(category.toLowerCase())}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="grid grid-cols-2 gap-4">
            {marketplaceListings.map((listing) => (
              <div key={listing.id} className="product-card">
                <div className="product-image" style={{ background: "#f5f5f4" }}>
                  {/* Image placeholder */}
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12
                    }}
                  >
                    <Badge variant="success">{listing.category}</Badge>
                  </div>
                </div>
                <div className="product-content">
                  <h4 className="line-clamp-1" style={{ fontWeight: 600, marginBottom: 4 }}>
                    {listing.title}
                  </h4>
                  <p className="text-primary" style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
                    {listing.price}
                  </p>

                  <div
                    className="flex items-center justify-between gap-2"
                    style={{ paddingTop: 12, marginTop: 12, borderTop: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                      <Avatar seller={listing.seller} size="sm" />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>
                          {listing.seller.name}
                        </p>
                        <div className="flex items-center gap-1 text-muted" style={{ fontSize: 12 }}>
                          <MapPin size={12} />
                          <span className="truncate">{listing.seller.location}</span>
                        </div>
                      </div>
                    </div>
                    {listing.rating && (
                      <div className="flex items-center gap-1" style={{ fontSize: 14, fontWeight: 500 }}>
                        <Star size={16} fill="var(--warning)" color="var(--warning)" />
                        <span>{listing.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const WalletScreen = () => {
    return (
      <div className="screen">
        <div className="screen-header">
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Wallet</h1>
        </div>

        <div
          className="section"
          style={{
            background: "rgba(37, 99, 235, 0.05)",
            borderTop: "1px solid rgba(37, 99, 235, 0.2)",
            borderBottom: "1px solid rgba(37, 99, 235, 0.2)"
          }}
        >
          <div className="flex gap-3">
            <Info size={20} className="text-trust" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: 4 }}>Payment Partner Notice</h4>
              <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
                Artbook partners with licensed payment providers for all transactions. Funds are held and processed by our payment partners, not by Artbook directly.
              </p>
            </div>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Balance Overview</h2>
          <div className="grid gap-3">
            <div className="card card-padding">
              <div className="flex items-start justify-between gap-3">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                    <p className="text-muted" style={{ fontSize: 14 }}>
                      Available Balance
                    </p>
                  </div>
                  <p style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>KES 45,280</p>
                  <p className="text-muted" style={{ fontSize: 12 }}>
                    Ready to withdraw
                  </p>
                </div>
                <Wallet size={20} className="text-primary" style={{ opacity: 0.6 }} />
              </div>
            </div>

            <div className="card card-padding">
              <div className="flex items-start justify-between gap-3">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                    <p className="text-muted" style={{ fontSize: 14 }}>
                      Pending Review
                    </p>
                    <Badge variant="warning" icon={AlertCircle} />
                  </div>
                  <p style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>KES 12,700</p>
                  <p className="text-muted" style={{ fontSize: 12 }}>
                    Provider verification in progress
                  </p>
                </div>
                <Wallet size={20} className="text-primary" style={{ opacity: 0.6 }} />
              </div>
            </div>
          </div>
        </div>

        <div className="section" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn btn-primary">
              <ArrowUpRight size={20} />
              Withdraw
            </button>
            <button className="btn btn-secondary">
              <FileText size={20} />
              Receipts
            </button>
          </div>
        </div>
      </div>
    );
  };

  const InboxScreen = () => {
    const filters = ["All", "Orders", "Bookings", "Support", "Business"];

    return (
      <div className="screen">
        <div className="screen-header">
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Messages</h1>
          <div className="flex gap-2 scrollbar-hide" style={{ overflowX: "auto", paddingBottom: 4 }}>
            {filters.map((filter) => (
              <button
                key={filter}
                className={`chip ${activeFilter === filter.toLowerCase() ? "active" : ""}`}
                onClick={() => setActiveFilter(filter.toLowerCase())}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)" }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer"
              }}
            >
              <div className="flex gap-3">
                <div style={{ position: "relative" }}>
                  <Avatar seller={msg.participant} size="md" />
                  {msg.unread > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        width: 20,
                        height: 20,
                        background: "var(--primary)",
                        borderRadius: "var(--radius-full)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid var(--card)",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--primary-foreground)"
                      }}
                    >
                      {msg.unread}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-start justify-between gap-2" style={{ marginBottom: 4 }}>
                    <h4
                      className="truncate"
                      style={{ fontWeight: msg.unread > 0 ? 600 : 500 }}
                    >
                      {msg.participant.name}
                    </h4>
                    <span className="text-muted" style={{ fontSize: 12, flexShrink: 0 }}>
                      {msg.timestamp}
                    </span>
                  </div>

                  <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                    <Calendar size={14} className="text-primary" />
                    <span className="badge" style={{ fontSize: 12 }}>
                      {msg.badge}
                    </span>
                  </div>

                  <p
                    className="truncate text-muted"
                    style={{
                      fontSize: 14,
                      ...(msg.unread > 0 && { color: "var(--foreground)", fontWeight: 500 })
                    }}
                  >
                    {msg.lastMessage}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const MenuScreen = () => {
    return (
      <div className="screen">
        <div className="screen-header">
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Menu</h1>
        </div>

        <div className="section">
          <div className="card card-padding" onClick={() => setActiveScreen("profile")} style={{ cursor: "pointer" }}>
            <div className="flex items-center gap-4">
              <Avatar seller={{ id: "user", name: "Alex Kimani", verified: true, trustScore: 4.9, location: "" }} size="lg" />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 600 }}>Alex Kimani</h3>
                <p className="text-muted" style={{ fontSize: 14 }}>
                  alex@artbook.co.ke
                </p>
                <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                  <Badge variant="trust" icon={CheckCircle2}>
                    Verified
                  </Badge>
                  <Badge variant="premium" icon={Star}>
                    Premium
                  </Badge>
                </div>
              </div>
              <ChevronRight size={20} className="text-muted" />
            </div>
          </div>
        </div>

        <div className="section" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-muted" style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, paddingLeft: 4 }}>
            Quick Access
          </h3>
          <div className="grid gap-1">
            {[
              { label: "View Profile", icon: User, screen: "profile" as Screen },
              { label: "Wallet", icon: Wallet, screen: "wallet" as Screen },
              { label: "Business Desk", icon: Briefcase, screen: "business" as Screen },
              { label: "Artguide AI", icon: Sparkles, screen: "artguide" as Screen }
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveScreen(item.screen)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--muted)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <item.icon size={20} className="text-primary" />
                <span style={{ flex: 1, textAlign: "left", fontWeight: 500 }}>
                  {item.label}
                </span>
                <ChevronRight size={20} className="text-muted" />
              </button>
            ))}
          </div>
        </div>

        <div className="section">
          <div style={{ textAlign: "center" }}>
            <p className="text-muted" style={{ fontSize: 12 }}>
              Artbook v1.0.0
            </p>
            <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              Made in Kenya 🇰🇪
            </p>
          </div>
        </div>
      </div>
    );
  };

  const ArtguideScreen = () => {
    return (
      <div className="screen">
        <div className="screen-header">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-full)",
                background: "rgba(139, 92, 246, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Sparkles size={20} className="text-premium" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 style={{ fontSize: 20, fontWeight: 600 }}>Artguide</h1>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "var(--radius-full)",
                    background: "var(--premium)",
                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                  }}
                />
              </div>
              <p className="text-muted" style={{ fontSize: 14 }}>
                AI Assistant
              </p>
            </div>
          </div>
        </div>

        <div
          className="section"
          style={{
            background: "rgba(139, 92, 246, 0.03)",
            borderTop: "1px solid rgba(139, 92, 246, 0.1)",
            borderBottom: "1px solid rgba(139, 92, 246, 0.1)"
          }}
        >
          <div className="flex gap-2">
            <Shield size={16} className="text-muted" style={{ flexShrink: 0, marginTop: 2 }} />
            <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
              AI can guide and summarize. Owner approval required for payments and protected actions.
            </p>
          </div>
        </div>

        <div className="section">
          <p className="text-muted" style={{ textAlign: "center", padding: "40px 20px" }}>
            Start a conversation with Artguide to get help navigating Artbook, finding services, or checking your status.
          </p>
        </div>

        <div
          style={{
            position: "fixed",
            bottom: 70,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 390,
            padding: "0 20px",
            background: "var(--card)",
            borderTop: "1px solid var(--border)"
          }}
        >
          <div className="flex gap-2" style={{ padding: "20px 0" }}>
            <input className="input" placeholder="Ask Artguide anything..." style={{ flex: 1 }} />
            <button className="btn btn-primary" style={{ padding: "0 16px" }}>
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case "home":
        return <HomeScreen />;
      case "circles":
        return <CirclesScreen />;
      case "marketplace":
        return <MarketplaceScreen />;
      case "wallet":
        return <WalletScreen />;
      case "inbox":
        return <InboxScreen />;
      case "menu":
        return <MenuScreen />;
      case "artguide":
        return <ArtguideScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="mobile-container">
      {renderScreen()}
      <BottomNav />
    </div>
  );
}
