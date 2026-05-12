# Artbook

**Discover. Create. Connect.**

A modern web platform for artist discovery, music, and live streaming. African-first, culture-forward.

Artbook combines elements of YouTube (video & content hosting), Instagram (profiles & feeds), and Snapchat (stories & messaging), with a focus on discovery—especially for local and niche creators.

## Features

- **Discovery Feed** — Algorithm-prioritized feed with genre, mood, and location-based filtering
- **Artist Profiles** — Customizable profiles with music, videos, store, and live streaming tabs
- **Streaming Hub** — Live streaming with real-time chat and gift system
- **Marketplace** — Sell merch, digital products, and exclusive content
- **Messages** — Direct messaging between artists and fans
- **Communities** — Group spaces for fans and artists to connect
- **Upload Dashboard** — Upload audio (MP3, WAV) and video (MP4) with genre/mood tagging
- **Playlists** — Create and manage personal playlists
- **Emotion-Based UI** — Colors adapt to artist vibe, genre, and mood
- **3 Account Types** — Artist, Streamer, and Fan accounts

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, custom design system
- **Database**: SQLite via Prisma ORM v7 with Better-SQLite3 adapter
- **Icons**: Lucide React
- **UI**: Custom component library (Avatar, Button, Badge, Card, Input, Modal, Tabs)

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
npm install
```

### Database Setup

```bash
npx prisma generate
npx prisma db push
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── (main)/           # Authenticated layout with sidebar
│   │   ├── feed/         # Discovery feed
│   │   ├── artist/[id]/  # Artist profile
│   │   ├── stream/       # Streaming hub
│   │   ├── messages/     # Direct messages
│   │   ├── groups/       # Communities
│   │   ├── marketplace/  # Product marketplace
│   │   ├── upload/       # Content upload
│   │   ├── playlist/     # Playlists
│   │   └── settings/     # User settings
│   ├── api/              # REST API routes
│   │   ├── users/
│   │   ├── content/
│   │   ├── streams/
│   │   ├── messages/
│   │   ├── marketplace/
│   │   └── discovery/
│   └── page.tsx          # Landing page
├── components/
│   ├── ui/               # Base UI components
│   ├── layout/           # Sidebar, TopBar, MobileNav
│   ├── feed/             # Feed components
│   ├── profile/          # Artist profile components
│   ├── streaming/        # Stream cards, live chat
│   ├── messages/         # Message list, chat view
│   ├── marketplace/      # Product cards
│   └── upload/           # Upload form
├── lib/                  # Utilities, Prisma client, mock data
├── types/                # TypeScript type definitions
└── prisma/
    └── schema.prisma     # Database schema
```

## API Routes

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/users` | GET, POST | User management |
| `/api/content` | GET, POST | Music & video content |
| `/api/streams` | GET, POST | Live streams |
| `/api/messages` | GET, POST | Direct messages |
| `/api/marketplace` | GET, POST | Products & merch |
| `/api/discovery` | GET | Discovery algorithm |

## Design System

The UI features an African-inspired design with:
- Dark theme with glass-morphism effects
- Emotion-based color palettes (calm, hype, chill, dark, uplifting, afrobeat)
- iOS-inspired minimal interface
- Adaptive profile customization
- African geometric patterns in thumbnails and covers

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

### Netlify

```bash
npm run build
# Deploy .next folder
```

## License

MIT
