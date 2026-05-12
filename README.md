# Artbook

Artbook is a full-stack MVP for an African-first artist discovery platform that blends social media,
music/video publishing, and live streaming.

## What is implemented

- **3 account roles**: artist, streamer, fan
- **Discovery engine** that prioritizes local + niche + genre alignment
- **Content system** for audio/video metadata uploads with mood tags
- **Streaming hub** with featured streams and Socket.IO live chat/gift events
- **Social layer** with DMs and group communities
- **Marketplace** with fan premium restrictions and simulated Stripe/PayPal checkout intents
- **Ownership verification workflow** for original music checks
- **Adaptive UI** where feed mood changes the UI palette
- **Core pages**:
  - Home Feed
  - Artist Profile
  - Streamer Hub
  - Live Stream
  - Messages
  - Groups
  - Marketplace
  - Upload Dashboard
  - Playlist

## Stack

- Frontend: React + Vite + React Router
- Backend: Node.js + Express + Socket.IO + Zod
- Storage: In-memory seed store (MVP placeholder for PostgreSQL/MongoDB)
- Payments: mock Stripe/PayPal checkout intent endpoint

## Run locally

```bash
npm install
npm run dev
```

- Web app: `http://localhost:5173`
- API: `http://localhost:8080/api`

## Production extension path

1. Replace in-memory store with PostgreSQL + Prisma.
2. Replace mock upload URLs with S3 object storage.
3. Plug in LiveKit/WebRTC ingestion for production streaming.
4. Implement real auth/session and verification (ID + metadata fingerprinting).
5. Deploy:
   - Easy: Vercel (web) + Render/Fly/railway for API
   - Advanced: AWS (ECS/Lambda + RDS + S3 + CloudFront)
