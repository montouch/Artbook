# Artbook Scribble Screen Prompts

Use these prompts in Google Scribble/Stitch in chunks. The goal is a fresh UI that follows the old app's flow, not the old app's visual style.

When you can attach the local reference images, attach the relevant images named in each section and ask Scribble to match their layout language for that associated page type.

## Prompt 1: Design System And Navigation

```text
Create an Android mobile design system for Artbook, an Africa-first creator, business, booking, marketplace, music, streaming, courier, trust, and support app.

Use these references if attached: DesignCode buttons/cards/icons/menus/typography/palettes, iOS liquid glass, SaaS organizational dashboards, Omnichart flow components.

Design a fresh app shell, not the old Artbook UI.

Requirements:
- 390x844 Android mobile frames.
- Bottom nav: Home, Discover, Create, Inbox, Menu.
- Top bar with current account, role, locality, notifications, backend/provider status.
- Component library: role dashboard tiles, profile cards, listing cards, booking rows, chat rows, trust/provenance cards, proof panels, status chips, bottom sheets, search rows, mini player.
- Light and dark variants.
- Status chip colors for: approved, review, blocked, backend-owned, provider-not-configured, no-money-movement.
- UI should be practical, premium, readable, and calm.
- Avoid making any phone-only money, identity, payout, trust, or provider state look approved.
```

## Prompt 2: Role Onboarding

```text
Design the Artbook role onboarding flow.

Screens:
1. Welcome and role chooser
2. Country/city/locality selector
3. Interest/work-mode selector
4. Backend honesty review
5. Home handoff

Roles:
- Fan / customer
- Artist
- Streamer / podcaster
- Creator / freelancer
- Business seller
- Courier
- Review Ops / support

The flow should feel friendly and fast. Each role card should show what the user can do today. Include a clear guardrail that identity, money, payouts, provider success, trust approvals, and restricted content approval are backend/provider-owned, not phone-owned.
```

## Prompt 3: Business Home Dashboard

```text
Design the Business seller Home dashboard for Artbook.

Use marketplace, POS, booking dashboard, money-management, and SaaS dashboard references if attached.

The first screen should show:
- Business name, role, locality, open/closed state
- Three primary actions: Sell, Book, Care
- Status chips: Backend review, Provider not configured, No money movement
- Today queue with orders, bookings, leads, support, proof holds
- Pinned work strip: Sales desk, Inventory, Customer letters, Receipts, Delivery, Backend sync
- Open-door leads from WhatsApp, SMS, QR, phone, walk-in
- Proof and payout/refund hold cards

Make it an operating dashboard, not a social feed.
```

## Prompt 4: Artist Home Dashboard

```text
Design the Artist Home dashboard for Artbook.

Use music player, audio social, social profile, provenance cards, and podcast/SaaS references if attached.

The first screen should show:
- Artist identity, city/locality, current release project
- Primary actions: Release packet, Upload, Fan message
- Music release desk preview with ownership, splits, sample clearance, artwork/master metadata, artist final approval, provider/legal filing required
- Audio/player preview
- Fan/audience cards
- Premium drop/market cards with Android monetization boundary
- Rights/Provenance evidence cards

Keep the design creator-focused but operational.
```

## Prompt 5: Streamer / Podcast Home

```text
Design the Streamer / Podcaster Home dashboard for Artbook.

Use live-streaming, podcasting SaaS, music/audio, and chat references if attached.

The screen should show:
- Live status
- Primary actions: Go live, Episode desk, Fan care
- Host control preview: chat health, guest queue, held messages, room rules
- Podcast release desk: transcript, chapters, sponsor label, subscriber access, RSS/platform sync
- Replay-to-podcast handoff
- Audience analytics
- Provider/payment status for gifts/subscribers as review-only if not configured
```

## Prompt 6: Discover And Profile

```text
Design Artbook Discover and Profile screens.

Use social network feed/profile, short video, audio social, marketplace, and booking references if attached.

Discover requirements:
- Search field
- Country/city/locality picker
- GPS/manual toggle
- Lens chips: music, live, market, services, events, podcast, nearby, trusted
- Creator/business cards with role, locality, tags, trust signal, live/audio/listing indicator

Profile requirements:
- Cover/media header
- Avatar, name, role, locality
- Trust/provenance chips
- Follow, Message, Buy, Book, Listen, Watch actions
- Tabs: Posts, Media, Market, Book, Trust, About
- Trust tab shows Provenance Seals, evidence-backed reports, non-scoring intake, moderation review
```

## Prompt 7: Marketplace And Checkout

```text
Design Artbook marketplace product detail, basket, checkout, and order detail.

Use the furniture marketplace product/order/payment reference and money-management references if attached.

Product detail:
- Product images
- Title, seller, locality
- Price with payment partner review label
- Pickup/delivery/digital access options
- Stock/capacity
- Trust/proof requirements
- Actions: Add to basket, Ask ahead, Message seller, Share QR

Checkout:
- Basket items
- Fulfillment choice
- Contact/guest details
- Payment path: provider-review, cash record, M-Pesa reference, card link
- Proof rule
- Review and create order

Order detail:
- Buyer view
- Seller proof view
- Courier view
- Support view
- Timeline, proof cockpit, payment/provider boundary, trust/report links

Important: never show phone-only payment as approved. Use labels like Provider review, Proof pending, No wallet credit, No spendable balance.
```

## Prompt 8: Open-Door Lead To Guest Checkout

```text
Design the Artbook Open-door Lead Review and Guest Checkout screens.

This flow converts outside-channel interest from WhatsApp, SMS, QR poster, phone, walk-in, or external link into a review-safe guest order.

Lead review screen:
- Lead source, customer name/contact, source item, message/note, suggested route
- Action buttons: Guest checkout, Guest booking, Follow-up, Source item/service, Artguide
- Guardrails: No auto-send, no provider call, no money movement, no wallet credit, no custody claim, human owner approval required

Guest checkout screen:
- Prefill guest name, contact, payment path, fulfillment, note, source lead reference
- Show a visible Lead context prefilled guard card
- Show payment-review and receipt/proof state
- Primary action: Create guest order

Saved result should be described visually as: order appears in Today, Sales Desk, Delivery/Proof, and Customer Care; ledger stores conversion evidence only; no provider success, no settlement, no spendable money.
```

## Prompt 9: Open-Door Lead To Guest Booking

```text
Design the Artbook Guest Booking from external lead flow.

Use booking flow references and event booking references if attached.

Lead source can be WhatsApp, SMS, QR, phone, walk-in, or external link.

Guest booking screen should prefill:
- Guest name
- Contact
- Booking source
- Payment partner review
- Worker
- Time
- Place
- Note with lead context
- Source lead reference

Include:
- Policy/proof strip
- Duration/cancellation/no-show policy
- Owner confirmation state
- Provider/payment review state
- Primary action: Create guest booking

The saved booking appears in Calendar, Today, Customer Care, and Evidence Trail. It must not claim provider payment or final booking approval without backend/provider proof.
```

## Prompt 10: Booking Flow

```text
Design the standard Artbook Booking flow.

Use Scheddo booking and event booking references if attached.

Screens:
1. Service selection
2. Staff/time selection
3. Login/create/guest path
4. Review and confirm
5. Success/requested state
6. Booking detail

Booking detail actions:
- Reschedule
- Cancel
- Message
- Support
- Proof
- Follow-up

Show policy, payment-review, proof-before-release, and provider/backend ownership clearly.
```

## Prompt 11: Inbox And Customer Care

```text
Design Artbook Inbox and Customer Care.

Use chat app and AI chatbot references if attached.

Screens:
- Inbox thread list
- Thread detail
- Business customer care desk
- Follow-up sheet
- Support case sheet

Features:
- Chats
- Customer labels
- Quick replies
- Catalog/service links
- Email/follow-up trails
- Order/booking-linked context strip
- Support case timeline
- Artguide assistant entry

The interface should keep regular chat calm, while business/support accounts get operational customer-care tools.
```

## Prompt 12: Courier Job Detail

```text
Design the Artbook Courier job detail screen.

Use delivery/driver dashboard, money-management, and marketplace order references if attached.

Show:
- Job offer score
- Pickup and drop-off locality tokens
- Masked contact controls
- Proof checklist
- Route stage
- Safety/support
- Incident report
- Payout hold ledger

Actions:
- Accept route
- Mark picked up
- Mark delivered
- Report incident
- Contact support

Do not show payout as released. Show provider/backend proof and payout hold status.
```

## Prompt 13: Trust, Identity, Wallet, Backend Sync

```text
Design Artbook operational review screens for Trust, Identity, Wallet/Finance, and Backend Sync.

Use NFT/provenance cards, money-management, SaaS dashboards, and data-viz references if attached.

Trust Desk:
- Provenance Seals
- Evidence-backed reports
- Contradictions
- Non-scoring intake
- Moderation review
- Requested evidence responses

Identity / Country Passport:
- Legal ID country
- Residence country
- Operating country
- Payout country
- Tax country
- GPS/device country proof
- Work permission
- Proof expiry
- Source-of-funds trigger
- Provider required / manual review states

Wallet / Finance Review:
- Ledger replay
- Money requests
- Settlement exceptions
- Provider readiness
- Receipt candidate preview
- Reconciliation preview
- Payout/refund holds
- Labels: Client replay only, Provider unverified, Non-spendable, No money movement, Settlement blocked

Backend Sync / Release Readiness:
- API base URL
- Health/schema
- Login/register sync
- Safe first-slice sync
- Settlement exceptions
- Provider readiness
- Release evidence packet
- APK hash/device install status
- Local checklist
- Audit filters

All of these screens are review-first and must not imply phone-side approval.
```

## Prompt 14: Menu And Workflow Search

```text
Design the Artbook Menu and Workflow Search screen.

Use SaaS dashboard, DesignCode menus, and Android settings/search patterns if attached.

Top:
- Account identity
- Role
- Three role-native daily actions
- Status cues: Seal, Finance, Backend

Search:
- User can type words like receipt, delivery, privacy, podcast, cart, backend, booking, release, trust
- Results route to exact working screens

Sections:
- Pinned work
- Start here
- Advanced tools
- Settings/privacy/export/delete
- Demo/audit tools if enabled

The goal is to avoid a giant command wall while preserving every advanced workflow.
```
