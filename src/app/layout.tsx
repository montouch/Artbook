import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artbook — Discover. Create. Connect.",
  description: "A modern platform for artist discovery, music, and live streaming. African-first, culture-forward.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#050507] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
