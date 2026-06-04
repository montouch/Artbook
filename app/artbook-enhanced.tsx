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
  Circle,
  Ticket,
  Video,
  Mic,
  Image,
  BarChart3,
  UserPlus,
  Receipt
} from "lucide-react";

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
  | "artguide"
  | "calendar"
  | "events";

export default function ArtbookEnhanced() {
  const [activeScreen, setActiveScreen] = useState<Screen>("home");

  // Tile-based Home Screen with Weather App inspiration
  const HomeScreen = () => {
    const actionTiles = [
      { icon: Store, label: "Marketplace", subtitle: "Browse products & services", color: "primary", screen: "marketplace" as Screen },
      { icon: Calendar, label: "Calendar", subtitle: "3 bookings today", color: "trust", screen: "calendar" as Screen },
      { icon: Wallet, label: "Wallet", subtitle: "KES 45,280", color: "warning", screen: "wallet" as Screen },
      { icon: Briefcase, label: "Business", subtitle: "8 active orders", color: "premium", screen: "business" as Screen },
    ];

    const quickActions = [
      { icon: Plus, label: "New Listing", color: "primary" },
      { icon: Ticket, label: "Create Event", color: "trust" },
      { icon: BarChart3, label: "Analytics", color: "premium" },
      { icon: UserPlus, label: "Invite", color: "warning" },
    ];

    return (
      <div className="screen">
        {/* Premium Header */}
        <div className="screen-header" style={{ paddingBottom: 24 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>
                Good morning
              </h1>
              <p className="text-muted" style={{ fontSize: 16 }}>Alex Kimani</p>
            </div>
            <div style={{ position: "relative" }}>
              <div className="avatar avatar-lg">AK</div>
              <div className="avatar-badge">
                <CheckCircle2 size={10} color="white" strokeWidth={3} />
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2">
            <span className="badge badge-trust">
              <Shield size={12} />
              Verified
            </span>
            <span className="badge badge-premium">
              <Star size={12} />
              Premium
            </span>
          </div>
        </div>

        {/* Today's Overview - Premium fintech style */}
        <div className="section">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Today</h2>

          {/* Main stat card - large and prominent */}
          <div className="card" style={{
            padding: 24,
            background: "linear-gradient(135deg, rgba(13, 148, 136, 0.08), rgba(13, 148, 136, 0.02))",
            borderColor: "rgba(13, 148, 136, 0.2)",
            marginBottom: 12
          }}>
            <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
              <div>
                <p className="text-muted" style={{ fontSize: 14, marginBottom: 4 }}>Total Balance</p>
                <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--primary)" }}>
                  KES 45,280
                </h2>
              </div>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <TrendingUp size={24} color="white" />
              </div>
            </div>
            <div className="flex gap-4" style={{ fontSize: 14 }}>
              <div>
                <span className="text-muted">+12%</span>
                <span style={{ marginLeft: 4 }}>this week</span>
              </div>
            </div>
          </div>

          {/* Mini stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="card card-padding" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>3</div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Bookings</div>
            </div>
            <div className="card card-padding" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>2</div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Reviews</div>
            </div>
            <div className="card card-padding" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>8</div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Orders</div>
            </div>
          </div>
        </div>

        {/* Action Tiles - Weather App style */}
        <div className="section">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Quick Access</h2>
          <div className="grid grid-cols-2 gap-3">
            {actionTiles.map((tile, index) => (
              <div
                key={index}
                className="card"
                onClick={() => setActiveScreen(tile.screen)}
                style={{
                  padding: 20,
                  cursor: "pointer",
                  background: `linear-gradient(135deg, rgba(${
                    tile.color === "primary" ? "13, 148, 136" :
                    tile.color === "trust" ? "37, 99, 235" :
                    tile.color === "warning" ? "245, 158, 11" :
                    "139, 92, 246"
                  }, 0.08), rgba(${
                    tile.color === "primary" ? "13, 148, 136" :
                    tile.color === "trust" ? "37, 99, 235" :
                    tile.color === "warning" ? "245, 158, 11" :
                    "139, 92, 246"
                  }, 0.02))`,
                  borderColor: `rgba(${
                    tile.color === "primary" ? "13, 148, 136" :
                    tile.color === "trust" ? "37, 99, 235" :
                    tile.color === "warning" ? "245, 158, 11" :
                    "139, 92, 246"
                  }, 0.2)`,
                  minHeight: 110,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `var(--${tile.color})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12
                }}>
                  <tile.icon size={22} color="white" />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{tile.label}</h4>
                  <p className="text-muted" style={{ fontSize: 12 }}>{tile.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions - Touch-friendly tiles */}
        <div className="section" style={{ paddingBottom: 100 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="card"
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  border: "none",
                  cursor: "pointer",
                  background: "var(--card)",
                  minHeight: 88
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `rgba(${
                    action.color === "primary" ? "13, 148, 136" :
                    action.color === "trust" ? "37, 99, 235" :
                    action.color === "warning" ? "245, 158, 11" :
                    "139, 92, 246"
                  }, 0.1)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <action.icon size={20} className={`text-${action.color}`} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, textAlign: "center", lineHeight: 1.3 }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Wallet with E-Wallet premium polish
  const WalletScreen = () => {
    const transactions = [
      { type: "credit", title: "Payment Received", subtitle: "Jane Wanjiku · Studio Session", amount: "+3,500", time: "2h ago", status: "completed" },
      { type: "debit", title: "Withdrawal", subtitle: "M-Pesa · Txn MPX7429834", amount: "-10,000", time: "Yesterday", status: "completed" },
      { type: "credit", title: "Payment Received", subtitle: "David Omondi · Art Print", amount: "+5,200", time: "2d ago", status: "pending" },
    ];

    return (
      <div className="screen">
        {/* Premium wallet header */}
        <div className="screen-header">
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Wallet</h1>
        </div>

        {/* Balance Card - Premium fintech style */}
        <div style={{ padding: "0 20px 20px" }}>
          <div className="card" style={{
            padding: 28,
            background: "linear-gradient(135deg, #0D9488 0%, #0F766E 100%)",
            borderColor: "rgba(13, 148, 136, 0.3)",
            color: "white"
          }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Available Balance</p>
            <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 16 }}>
              KES 45,280
            </h1>
            <div className="flex gap-3">
              <button className="btn" style={{
                flex: 1,
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "white",
                padding: "10px 16px"
              }}>
                <ArrowUpRight size={18} />
                <span style={{ marginLeft: 6 }}>Send</span>
              </button>
              <button className="btn" style={{
                flex: 1,
                background: "white",
                border: "none",
                color: "var(--primary)",
                padding: "10px 16px"
              }}>
                <ArrowDownLeft size={18} />
                <span style={{ marginLeft: 6 }}>Receive</span>
              </button>
            </div>
          </div>
        </div>

        {/* Payment Partner Notice */}
        <div style={{
          background: "rgba(37, 99, 235, 0.05)",
          borderTop: "1px solid rgba(37, 99, 235, 0.15)",
          borderBottom: "1px solid rgba(37, 99, 235, 0.15)",
          padding: "16px 20px"
        }}>
          <div className="flex gap-3">
            <Info size={18} className="text-trust" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Provider-led payments</h4>
              <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                Licensed payment partners process all transactions. Artbook does not directly hold or settle funds.
              </p>
            </div>
          </div>
        </div>

        {/* Pending Review Card */}
        <div style={{ padding: "20px" }}>
          <div className="card" style={{
            padding: 16,
            background: "rgba(245, 158, 11, 0.05)",
            borderColor: "rgba(245, 158, 11, 0.2)"
          }}>
            <div className="flex items-start gap-3">
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(245, 158, 11, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Clock size={20} style={{ color: "var(--warning)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Pending Review</h4>
                <p className="text-muted" style={{ fontSize: 13, marginBottom: 8 }}>
                  Provider verification in progress
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--warning)" }}>KES 12,700</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div style={{ padding: "0 20px 100px" }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Recent Transactions</h2>
            <button style={{ fontSize: 14, color: "var(--primary)", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
              View All
            </button>
          </div>

          <div className="grid gap-2">
            {transactions.map((txn, index) => (
              <div key={index} className="card card-padding">
                <div className="flex gap-3">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: txn.type === "credit" ? "rgba(13, 148, 136, 0.1)" : "rgba(107, 107, 107, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {txn.type === "credit" ? (
                      <ArrowDownLeft size={20} className="text-primary" />
                    ) : (
                      <ArrowUpRight size={20} className="text-muted" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex justify-between items-start gap-2" style={{ marginBottom: 2 }}>
                      <h4 style={{ fontWeight: 600, fontSize: 14 }}>{txn.title}</h4>
                      <p style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: txn.type === "credit" ? "var(--primary)" : "var(--foreground)",
                        whiteSpace: "nowrap"
                      }}>
                        {txn.amount}
                      </p>
                    </div>
                    <p className="text-muted truncate" style={{ fontSize: 13, marginBottom: 4 }}>
                      {txn.subtitle}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-muted" style={{ fontSize: 12 }}>{txn.time}</span>
                      {txn.status === "pending" && (
                        <span className="badge badge-warning" style={{ fontSize: 11 }}>Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Bottom Navigation
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
        artguide: "menu",
        calendar: "home",
        events: "circles"
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

  const renderScreen = () => {
    switch (activeScreen) {
      case "home":
        return <HomeScreen />;
      case "wallet":
        return <WalletScreen />;
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
