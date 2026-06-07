# Artbook UI/UX Rebuild Prompt

This document is the working brief for rebuilding Artbook's Android UI/UX from the old prototype flow without loading the giant single-file prototype as the primary source. Treat the installed Motorola app and `src/artbook-mobile.html` as behavior references only. The new design should be cleaner, more modular, Android-native, and easier to implement in Android Studio.

Do not store user passwords, Google credentials, laptop passwords, or phone PINs in this document or in source code. Device/account credentials are only for live owner-driven prompts.

## Core Direction

Design a new Android mobile app called **Artbook**.

Artbook is an Africa-first operating app for creators, artists, streamers, small businesses, local services, fans, couriers, and support/review operators. It combines creator discovery, social posting, chat, music, live rooms, podcasts, marketplace, bookings, guest checkout, delivery, trust evidence, backend sync, and provider-readiness review.

Do not copy the old Artbook UI. Preserve the flow and product logic, but make the interface calmer, clearer, and easier to scan.

The design should feel like:

- a role-native operating dashboard first;
- a social and discovery app second;
- a marketplace/booking/support console where needed;
- a trustworthy review-first product where money, identity, provider success, payouts, restricted content, and trust decisions are never shown as approved by phone-only state.

## Visual Reference Mapping

The local reference pack could not be read from this Codex thread, so the mapping below is based on the file names supplied by the owner. Use the images directly in Scribble/Stitch or Figma when available.

Use these references structurally, not as copied brands. Duplicate exact layouts only for references the owner has rights to reuse.

- Design system language: `06-designcode-*`, `06-designcode-full-page-designcode-ui.png`
- Enterprise/SaaS information density: `07-saas-*`, `09-omnichart-*`
- Liquid/glass mobile styling: `10-ios-liquid-glass-full-page.png`
- Chat and customer care: `11-chat-app-*`, `18-ai-chatbot-*`
- Marketplace/product/payment: `12-furniture-marketplace-product-order-payment-screens.png`, `12-furniture-shopping-full-page-thumbnail.png`
- Provenance/trust cards: `13-dark-nft-components-provenance-cards.png`, `13-dark-nft-full-page-components.png`
- Booking flows and dashboards: `14-event-booking-*`, `15-scheddo-*`
- Music player/audio profile: `17-musing-*`, `23-audio-social-network-*`
- Social feed/profile: `19-social-network-*`
- Live streaming: `20-live-streaming-app-1-published-site.*`
- Short video creator flow: `21-zuzu-short-video-*`
- Finance/wallet/review-only money flows: `24-money-management-*`
- Podcasting creator/admin flow: `25-saas-podcasting-*`
- Journey map and multi-screen flow references: `01-community-interactive-journey-map-thumbnail.png`, `05-community-eventhub-120-screens-thumbnail.png`

## Scribble / Stitch Master Prompt

Paste this into the design generator:

```text
Design a modern Android mobile app called Artbook.

Artbook is an Africa-first creator, business, marketplace, booking, music, streaming, delivery, trust, and support platform. The old app is only a flow reference; do not copy its UI. Create a new Android-native UI/UX with clean dashboards, focused workflows, and modular screens.

Use the supplied reference images as visual guidance:
- DesignCode references for buttons, cards, icons, typography, menus, light/dark palettes, blur/glass patterns.
- Chat app references for Inbox, customer care, quick replies, and AI assistant layouts.
- Furniture marketplace references for product detail, basket, checkout, order, and payment-review flows.
- Event booking and Scheddo references for service selection, time selection, review/confirm, success, and provider booking dashboard.
- Musing and audio social references for music player, albums, now playing, lyrics, listen-together rooms.
- Social network references for feed and profile composition.
- Live streaming references for host control room, live chat, guest queue, and pinned merch/subscriber offers.
- Money management references for wallet, provider-readiness, payout hold, and review-only finance screens.
- Podcasting references for streamer podcast studio, episode release desk, analytics, and RSS/platform sync.
- NFT/provenance references for trust evidence, Provenance Seals, report states, and audit cards.

Create a fresh Artbook design system:
- Android-first mobile frames, 390x844 baseline.
- Bottom navigation: Home, Discover, Create, Inbox, Menu.
- Searchable Menu with pinned work and workflow search.
- Rich but calm visual style. Avoid overloading the first screen.
- Use role-specific dashboards instead of one giant command wall.
- Use clear status chips for backend, provider, money, trust, identity, and release-readiness states.
- Make review-only states visually distinct from approved states.
- Never make phone-only data look like real payment, payout, KYC, identity approval, provider success, settlement, legal filing, restricted-media approval, or Provenance Seal approval.

Primary account modes:
1. Fan / customer
2. Artist
3. Streamer / podcaster
4. Creator / freelancer
5. Business seller
6. Courier / delivery worker
7. Review Ops / support

Generate the following mobile screens:
1. Role onboarding
2. Role-native Home dashboard for Business seller
3. Role-native Home dashboard for Artist
4. Role-native Home dashboard for Streamer / podcaster
5. Discover with country, city, locality, GPS/manual toggle, genre/category/lens filters
6. Creator/business profile with posts, media, listings, bookings, trust evidence, message button
7. Social feed / Circle
8. Create hub with post, music release, podcast episode, listing, service, live room
9. Music/audio now-playing screen with mini player and queue
10. Live host control room with chat, guest queue, rules, merch/subscriber pin, replay-to-podcast handoff
11. Podcast release desk with transcript, chapters, sponsor label, rights checks, RSS/platform sync checklist
12. Marketplace product detail
13. Basket / checkout with pickup, delivery, digital access, guest checkout
14. Open-door lead review from WhatsApp/SMS/QR/phone/walk-in
15. Guest checkout prefilled from external lead
16. Guest booking prefilled from external lead
17. Booking service selection, time selection, review confirm, success
18. Order detail with buyer view, seller proof view, courier view, support view
19. Courier job detail with accept route, pickup/drop-off proof, incident, payout hold
20. Inbox/customer care with chats, quick replies, labels, follow-ups, support cases
21. Trust desk with Provenance Seals, evidence-backed reports, moderation review, non-scoring intake
22. Identity/country-passport review desk
23. Wallet/finance review desk with provider-not-configured, payout hold, no-spendable-balance labels
24. Backend sync / release readiness with API health, provider readiness, release evidence packet, APK/device status
25. Menu/workflow search with pinned work and role-specific shortcuts

Screen behavior requirements:
- Home opens to the current role's next useful actions.
- Discover leads to profile, follow, message, buy, book, listen, watch.
- Create leads to upload/release/listing/service/live workflows.
- Open-door lead review can route to Guest checkout, Guest booking, Follow-up, Source item/service, or Artguide.
- Guest forms should prefill name, contact, source channel, note, payment-review/default policy, and proof context.
- Guest forms must show guardrails: no auto-send, no provider call, no wallet credit, no money movement, no custody claim, no payment/booking approval.
- Checkout creates order proof and receipt trail, but money remains provider-review until backend reconciliation.
- Booking creates requested/confirmed states with policy, proof, and follow-up trails.
- Courier route shows proof and incident workflow, not real payout release.
- Backend sync screens show review-only evidence and release readiness, not live provider approval.

Tone and copy:
- Short labels, clear actions, low anxiety.
- Use `Review required`, `Provider not configured`, `Proof pending`, `Backend-owned`, `No money movement`, `Visible to account`, and `Owner approval` where needed.
- Avoid long educational paragraphs inside core screens. Put detail in expandable sheets.

Deliverables:
- A complete mobile screen set.
- Component library: buttons, status chips, cards, profile cards, listing cards, booking rows, order proof panels, trust/provenance cards, chat rows, media cards, mini player, role dashboard tiles, bottom nav, modal sheets.
- Flow map showing the main paths: onboarding, home, discover, create, marketplace checkout, guest checkout, booking, inbox/customer care, courier job, trust, backend sync.
```

## Main Product Flow

```text
Onboarding
  -> Select role
  -> Select country/city/locality
  -> Select interests and work modes
  -> Explain backend-owned decisions
  -> Home

Home
  -> Role dashboard
  -> Pinned work
  -> Today actions
  -> Notifications
  -> Backend/provider/trust status

Discover
  -> Filter by country/city/locality/lens
  -> Profile
  -> Follow / Message / Buy / Book / Listen / Watch

Create
  -> Post
  -> Music release packet
  -> Podcast episode
  -> Product/listing
  -> Service/booking setup
  -> Live room

Marketplace
  -> Product/service detail
  -> Basket
  -> Fulfillment choice
  -> Provider-review payment path
  -> Order detail
  -> Delivery/proof/support

Booking
  -> Service selection
  -> Staff/time/place
  -> Policy/payment review
  -> Confirmation
  -> Booking detail
  -> Reschedule/cancel/support

Open-door lead
  -> Lead review
  -> Guest checkout OR Guest booking OR Follow-up OR Source page OR Artguide
  -> Prefilled form
  -> Review-only order/booking record
  -> Evidence trail

Inbox
  -> Chat/customer care
  -> Quick replies
  -> Follow-up
  -> Support case
  -> Order/booking thread

Courier
  -> Available jobs
  -> Job detail
  -> Accept route
  -> Pickup proof
  -> Drop-off proof
  -> Incident
  -> Payout hold review

Trust
  -> Provenance Seals
  -> Evidence-backed report
  -> Moderation queue
  -> Resolution or more evidence

Backend sync
  -> API health/schema
  -> Auth/profile sync
  -> Safe first-slice sync
  -> Settlement exceptions
  -> Provider readiness
  -> Release evidence packet
  -> APK/device status
```

## Android Studio Build Shape

Prefer rebuilding the interface as a modular Android project rather than continuing the old giant HTML file.

Recommended app modules/screens:

- `MainActivity` with bottom navigation and route host.
- `RoleSession` model for current account mode.
- `HomeDashboardScreen` with role-specific sections.
- `DiscoverScreen` and `ProfileScreen`.
- `CreateHubScreen` plus release/listing/service/live child screens.
- `MarketplaceScreen`, `CheckoutScreen`, `OrderDetailScreen`.
- `BookingFlowScreen`, `BookingDetailScreen`.
- `LeadReviewScreen`, `GuestCheckoutScreen`, `GuestBookingScreen`.
- `InboxScreen`, `ThreadScreen`, `SupportCaseScreen`.
- `CourierJobsScreen`, `CourierJobDetailScreen`.
- `TrustDeskScreen`.
- `WalletReviewScreen`.
- `BackendSyncScreen`.
- `MenuSearchScreen`.

Keep the first build demo-friendly with local fixture data, but model all sensitive states honestly:

- money movement: false
- provider called: false unless real provider is configured
- wallet credit enabled: false
- spendable balance enabled: false
- identity approved by phone: false
- payout released by phone: false
- Provenance Seal auto-grant: false
- restricted media approval by phone: false

## Motorola / ADB Flow Capture Plan

When ADB is available from the working environment, use the installed Motorola app only to capture flow structure:

1. Confirm device connection.
2. Unlock phone only if a real prompt requires it.
3. Launch installed Artbook app.
4. Capture screenshots or screen recordings of these paths:
   - Home for each major role
   - Discover -> Profile
   - Marketplace -> Checkout -> Order detail
   - Lead review -> Guest checkout
   - Lead review -> Guest booking
   - Booking flow
   - Inbox/customer care
   - Courier route
   - Trust desk
   - Backend sync
5. Do not try to preserve the old styling unless a screen has a flow detail missing from docs.
6. Use screenshots to verify the new design covers every path, not to copy the old UI.

## Non-Negotiable Guardrails

- No raw secrets in source or docs.
- No phone-side claims of real payment success.
- No phone-side payout, wallet credit, spendable balance, provider settlement, or founder revenue recognition.
- No phone-side KYC/identity approval.
- No phone-side legal filing, distributor filing, copyright registration, or rights approval.
- No automatic Provenance Seal grant without backend-owned evidence and review rules.
- No exact GPS exposure by default.
- No restricted-media launch without adult verification, consent, moderation, watermarking, leak reporting, and store-policy review.

## Immediate Next Design Pass

Start with these 12 screens before expanding:

1. Role onboarding
2. Business Home
3. Artist Home
4. Discover
5. Profile
6. Marketplace product detail
7. Open-door lead review
8. Guest checkout from lead
9. Guest booking from lead
10. Order detail
11. Inbox/customer care
12. Backend sync / release readiness

Then extend into live streaming, podcasting, courier, trust, wallet, and identity review.
