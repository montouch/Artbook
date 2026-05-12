import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artbook | Discover local artists and creators",
  description:
    "A modern African-first discovery platform for artists, streamers, creators, music, video, live content, and marketplace drops."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
