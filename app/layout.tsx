import type { Metadata } from "next";
import "./artbook-premium.css";

export const metadata: Metadata = {
  title: "Artbook | Kenya-first social marketplace",
  description:
    "Premium Kenya-first social marketplace and business operating app. Discover products, services, events, and connect with local businesses."
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
