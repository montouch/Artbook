const navItems = [
  { label: "Home", href: "/" },
  { label: "Artists", href: "/artists" },
  { label: "Streams", href: "/streams" },
  { label: "Community", href: "/community" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Upload", href: "/upload" }
];

export function SiteNav() {
  return (
    <nav className="top-nav" aria-label="Main navigation">
      <a className="brand" href="/" aria-label="Artbook home">
        <span className="brand-mark">A</span>
        <span>Artbook</span>
      </a>
      <div className="nav-links">
        {navItems.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </div>
      <a className="ghost-button" href="/upload">
        Join beta
      </a>
    </nav>
  );
}
