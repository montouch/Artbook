import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artbook | Deep ocean discovery",
  description:
    "An ocean-blue African-first discovery platform for artists, streamers, fans, music, video, live content, AI feeling search, and marketplace drops."
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
