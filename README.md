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

The production backend launch pack is tracked in `current-mobile/supabase/`.
It includes the Supabase migration, fail-closed provider webhook Edge Function,
and backend audit script needed to start the real provider-led backend without
turning Android into a wallet or settlement system.

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

Backend launch pack checks:

```bash
cd current-mobile
node tools/supabase-launch-backend-audit.mjs
node tools/backend-smoke-test.mjs
```

## Next implementation layers

- Apply the Supabase launch migration in a real Supabase project.
- Add S3-backed media uploads and transcoding.
- Integrate LiveKit or another WebRTC provider for live rooms.
- Add Stripe or PayPal checkout adapters for subscriptions, gifts, and marketplace orders.
- Persist follows, playlists, DMs, groups, and recommendation feedback.
