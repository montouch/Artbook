# Artbook

Artbook is a modern creator-discovery MVP for local and niche artists, streamers, and fans. This
first build focuses on the product surface and modular architecture needed to grow into the full
platform: discovery scoring, creator profiles, streaming hub concepts, social messaging, upload
readiness, and marketplace monetization.

## What is included

- Next.js app router project with TypeScript.
- African-first, iOS-inspired responsive interface.
- Three account system: Artist, Streamer, and Fan.
- Discovery feed scored by location, genre, niche interests, live status, and ownership verification.
- `/api/discovery` endpoint for experimenting with recommendation inputs.
- Streaming hub, DM/group previews, marketplace, and upload dashboard sections.

## Current mobile app

The latest Kenya-first Artbook mobile prototype is tracked in `current-mobile/`.
It includes the single-file mobile UI, bundled app assets, backend handoff server,
review documents, and audit/build tools from the active Codex workspace.

Generated APKs, signing sidecars, local `.env` files, and workspace backups are
intentionally excluded from GitHub. Use `current-mobile/tools/build-native-artbook-apk.mjs`
from the active workspace when a fresh Android install package is needed.

QA and founder/product-owner progress notes are tracked under `qa/`.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful commands

```bash
npm run lint
npm run build
```

## Next implementation layers

- Replace sample data with PostgreSQL or MongoDB models.
- Add S3-backed media uploads and transcoding.
- Integrate LiveKit or another WebRTC provider for live rooms.
- Add Stripe or PayPal checkout adapters for subscriptions, gifts, and marketplace orders.
- Persist follows, playlists, DMs, groups, and recommendation feedback.
