import Link from "next/link";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Artists", href: "/artists" },
  { label: "Streams", href: "/streams" },
  { label: "Community", href: "/community" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Upload", href: "/upload" }
] as const;

export function SiteNav() {
  return (
    <nav className="top-nav" aria-label="Main navigation">
      <Link className="brand" href="/" aria-label="Artbook home">
        <span className="brand-mark">A</span>
        <span>Artbook</span>
      </Link>
      <div className="nav-links">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
      <Link className="ghost-button" href="/upload">
        Join beta
      </Link>
    </nav>
  );
}
