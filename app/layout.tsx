import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artbook | Discover local artists",
  description:
    "A modern African-first discovery platform for artists, streamers, fans, music, video, live content, and marketplace drops."
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
