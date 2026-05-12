import { Link, Outlet, useLocation } from "react-router-dom";
import { useVibe } from "../context/VibeContext";

const navItems = [
  { to: "/", label: "Home Feed" },
  { to: "/artist/u-artist-1", label: "Artist Profile" },
  { to: "/streamer", label: "Streamer Hub" },
  { to: "/live/s-1", label: "Live Stream" },
  { to: "/messages", label: "Messages" },
  { to: "/groups", label: "Groups" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/upload", label: "Upload Dashboard" },
  { to: "/playlist", label: "Playlist" }
];

export const Layout = () => {
  const { palette } = useVibe();
  const location = useLocation();

  return (
    <div className="app-shell" style={{ backgroundColor: palette.bg, color: palette.text }}>
      <aside className="sidebar">
        <h1>Artbook</h1>
        <p className="subtitle">African-first creator discovery</p>
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.to}
              className={`nav-link ${location.pathname === item.to ? "active" : ""}`}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
