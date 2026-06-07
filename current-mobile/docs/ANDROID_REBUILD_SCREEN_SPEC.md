# Artbook Android Rebuild Screen Specification

This is the implementation-facing screen spec for a fresh Android UI/UX rebuild. The old Artbook mobile prototype remains the behavior reference, but the new Android app should be modular and role-native.

## Product Principles

- Build the actual working app experience first, not a marketing landing page.
- Start each role on the next useful work surface.
- Keep navigation simple: Home, Discover, Create, Inbox, Menu.
- Keep advanced workflows searchable instead of crowding the first screen.
- Every money, identity, trust, provider, payout, release, restricted-media, and backend state must clearly show whether it is review-only, backend-owned, provider-owned, or approved.
- Never let local phone state look like real settlement, payout, KYC, legal filing, provider success, or automatic Provenance Seal approval.

## Global Navigation

### Bottom Navigation

1. Home
2. Discover
3. Create
4. Inbox
5. Menu

### Global Top Bar

- Current account avatar and role.
- City/locality pill.
- Notification bell.
- Backend/provider status chip.
- Optional mini player when audio is active.

### Global Sheets

- Account switcher.
- Role mode switcher.
- Artguide assistant.
- Notification center.
- Workflow search.
- Safety/backend details.

## Design System Components

### Foundations

- Android phone baseline: 390x844.
- Light and dark modes, with light mode suitable for marketplace/booking and dark mode suitable for media/live/music.
- Avoid one-hue dominance. Use a balanced palette:
  - Ink: near black.
  - Surface: warm white / graphite depending mode.
  - Accent violet for creator actions.
  - Teal/green for verified/safe progress.
  - Amber for review/pending.
  - Red for blocked/risk.
  - Blue for navigation/backend.
- Rounded cards should be practical: 8-16px depending density. Avoid huge bubbly UI in dense operational screens.

### Components

- Role dashboard tile.
- Status chip: `Review required`, `Provider not configured`, `Backend-owned`, `Proof pending`, `No money movement`, `Visible to account`, `Owner approval`.
- Creator/profile card.
- Listing card.
- Booking row.
- Order proof panel.
- Courier route card.
- Trust/Provenance card.
- Chat row.
- Customer-care quick reply.
- Media card.
- Mini player.
- Bottom sheet form.
- Searchable command row.
- Readiness checklist.
- Evidence timeline.

## Screen Set

### 1. Role Onboarding

Purpose: choose what the demo account is trying to do.

Sections:

- Artbook logo and short role prompt.
- Role cards:
  - Fan / customer
  - Artist
  - Streamer / podcaster
  - Creator / freelancer
  - Business seller
  - Courier
  - Review Ops / support
- Country/city/locality selector.
- Interest/work-mode chips.
- Backend honesty strip:
  - Identity approval is provider/backend-owned.
  - Money movement is provider/backend-owned.
  - Trust decisions require evidence.
  - Phone demo data is not production approval.

Primary action: `Enter Artbook`.

### 2. Business Home

Purpose: give a seller/operator the day's work.

Top content:

- Business identity: name, locality, open/closed state.
- Three action buttons: `Sell`, `Book`, `Care`.
- Status row: `Backend review`, `Provider not configured`, `No money movement`.

Sections:

- Today queue: orders, bookings, leads, messages.
- Pinned work: Sales desk, Inventory, Customer letters, Receipts, Delivery, Backend sync.
- Open-door leads: WhatsApp/SMS/QR/walk-in cards.
- Proof and holds: payout/refund/delivery proof cards.
- Sales snapshot: revenue shown as demo/accounting readout, never settled provider money.

### 3. Artist Home

Purpose: help an artist release, manage audience, and sell safely.

Sections:

- Artist identity and current project.
- Next actions: `Release packet`, `Upload`, `Fan message`.
- Music release desk preview:
  - ownership
  - splits
  - sample/beat clearance
  - artwork/master metadata
  - artist final approval
  - provider/legal filing required
- Audio/player preview.
- Fan/audience cards.
- Marketplace/premium drop cards with Android monetization boundary.
- Provenance/rights evidence.

### 4. Streamer / Podcaster Home

Purpose: operate live rooms and podcast publishing.

Sections:

- Live status card.
- Actions: `Go live`, `Episode desk`, `Fan care`.
- Host control preview: chat health, guest queue, held messages, room rules.
- Podcast release desk: transcript, chapters, sponsor label, subscriber access, RSS/platform sync.
- Replay-to-podcast handoff.
- Analytics cards.

### 5. Discover

Purpose: find local creators, businesses, artists, events, streams, services.

Top controls:

- Search field.
- Country/city/locality picker.
- GPS/manual toggle.
- Lens chips: music, live, market, services, events, podcast, nearby, trusted.

Content:

- Creator/business cards with role, locality, tags, trust signal, live/audio/listing indicator.
- Map/list toggle optional.
- Safety note: exact location hidden by default.

Actions:

- Follow.
- Message.
- Buy.
- Book.
- Listen.
- Watch.

### 6. Profile

Purpose: one profile surface for creator/business/person.

Header:

- Cover/media area.
- Avatar/name/role/locality.
- Trust/provenance chips.
- Follow/message/action buttons.

Tabs:

- Posts
- Media
- Market
- Book
- Trust
- About

Trust tab:

- Provenance Seals.
- Evidence-backed reports.
- Non-scoring intake.
- Moderation review state.

### 7. Circle / Social Feed

Purpose: social updates and discovery.

Sections:

- Composer entry.
- Feed cards with creator identity, media, co-creator tags, forward policy.
- Comments/likes/share.
- Translation badge if translated.
- Link to profile/listing/booking when relevant.

### 8. Create Hub

Purpose: one place to create safe content/work records.

Tiles:

- Post.
- Music release.
- Podcast episode.
- Product/listing.
- Service/booking.
- Live room.
- Collaboration room.
- Support note.

Each tile should show one-line readiness state.

### 9. Music / Now Playing

Purpose: audio playback and music identity.

Content:

- Cover art.
- Track title/artist.
- Playback controls.
- Queue.
- Lyrics or notes.
- Listen-together room.
- Rights/provenance chip.
- Link to release packet when owner.

### 10. Live Host Control Room

Purpose: live control, not just chat.

Panels:

- Live preview.
- Host controls.
- Chat stream.
- Held messages.
- Guest hand-raise queue.
- Moderators/rules/blocked words.
- Pinned merch/subscriber offer.
- Replay-to-podcast handoff.

Guardrails:

- Gift/payment indicators remain provider-review if not configured.
- Moderation decisions are logged.

### 11. Podcast Release Desk

Purpose: prepare a podcast episode for platform/backend review.

Checklist:

- Media attached.
- Title/description.
- Transcript.
- Chapters.
- Sponsor label.
- Explicit label if needed.
- Rights/consent.
- Subscriber availability.
- RSS/platform sync.

States:

- Draft.
- Review ready.
- Provider/platform required.
- Published only after backend/provider state.

### 12. Product Detail

Purpose: inspect a product/service/event listing.

Sections:

- Product images.
- Title, seller, locality.
- Price and provider-review label.
- Pickup/delivery/digital options.
- Stock/capacity.
- Trust/proof requirements.
- Actions: Add to basket, Ask ahead, Message seller, Share QR.

### 13. Basket / Checkout

Purpose: choose fulfillment and create a review-safe order.

Steps:

1. Basket items.
2. Fulfillment: pickup, courier, digital.
3. Contact/guest or account details.
4. Payment path: provider-review, cash record, M-Pesa reference, card link.
5. Proof rule.
6. Review.

Labels:

- `Payment partner review`
- `No wallet credit`
- `No spendable balance`
- `Receipt/proof before release`

### 14. Open-Door Lead Review

Purpose: convert outside-channel interest safely.

Lead sources:

- WhatsApp.
- SMS.
- QR poster.
- Phone.
- Walk-in.
- External link.

Lead card:

- Customer name/contact if present.
- Channel.
- Source item/service.
- Message/note.
- Suggested route.

Actions:

- Guest checkout.
- Guest booking.
- Follow-up.
- Source item/service.
- Artguide.

Guardrails visible:

- No auto-send.
- No provider call.
- No money movement.
- No wallet credit.
- No custody claim.
- Human owner approval required.

### 15. Guest Checkout From Lead

Purpose: create an order record from an external buyer without pretending payment is approved.

Prefilled fields:

- Guest name.
- Contact.
- Payment path derived from source channel.
- Fulfillment.
- Note with lead review context.
- Source lead id/reference.

Required UI:

- Lead context prefilled guard card.
- Payment-review status.
- Receipt/proof state.
- Create guest order button.

Saved result:

- Order appears in Today, Sales Desk, Delivery/Proof, and Customer care.
- Ledger shows conversion evidence only.
- No provider success, settlement, or spendable money.

### 16. Guest Booking From Lead

Purpose: create a requested booking from an external lead.

Prefilled fields:

- Guest name.
- Contact.
- Booking source.
- Payment partner review.
- Worker.
- Time.
- Place.
- Note with lead review context.
- Source lead id/reference.

Required UI:

- Policy/proof strip.
- Duration/cancellation/no-show policy.
- Owner confirmation state.
- Provider/payment review state.

Saved result:

- Booking appears in calendar, Today, Customer care, and evidence trail.
- Does not claim provider payment or final booking approval without backend/provider proof.

### 17. Booking Flow

Screens:

- Service selection.
- Staff/time selection.
- Login/create/guest path.
- Review and confirm.
- Success/requested state.
- Booking detail.

Booking detail actions:

- Reschedule.
- Cancel.
- Message.
- Support.
- Proof.
- Follow-up.

### 18. Order Detail

Role-specific views:

- Buyer: track, review proof, message seller, support.
- Seller: prep, seller proof, buyer thread, receipt, payout hold.
- Courier: accept/route/proof/incident.
- Support: case, timeline, provider/reconciliation review.

Panels:

- Timeline.
- Proof cockpit.
- Party visibility.
- Provider/payment boundary.
- Trust/report links.

### 19. Courier Job Detail

Purpose: rider-grade job sheet.

Content:

- Offer score.
- Pickup and drop-off locality tokens.
- Masked contact controls.
- Proof checklist.
- Route stage.
- Incident report.
- Safety/support.
- Payout hold ledger.

Actions:

- Accept.
- Picked up.
- Delivered.
- Report incident.
- Contact support.

### 20. Inbox / Customer Care

Purpose: chat plus business follow-up operations.

Sections:

- Thread list.
- Labels.
- Quick replies.
- Follow-ups.
- Customer records.
- Support cases.
- Order/booking-linked messages.

Thread detail:

- Text/media placeholders.
- Voice/image/video/GIF placeholders.
- Call metadata.
- Order/booking context strip.
- Email/follow-up draft.

### 21. Trust Desk

Purpose: explain and manage trust evidence.

Sections:

- Public trust summary.
- Provenance Seals.
- Evidence-backed reports.
- Contradictions.
- Non-scoring intake.
- Moderation review.
- Requested evidence responses.

Actions:

- Add Seal only with eligible backend evidence.
- Report seller/account/content.
- Respond to evidence request.
- Moderator resolution.

### 22. Identity / Country Passport

Purpose: separate country/legal/payout/work evidence.

Fields:

- Legal ID country.
- Residence country.
- Operating country.
- Payout country.
- Tax country.
- GPS/device country proof.
- Work permission.
- Proof expiry.
- Source-of-funds trigger.

States:

- Saved for review.
- Provider required.
- Missing proof.
- Manual review.
- Approved only by backend/provider.

### 23. Wallet / Finance Review

Purpose: wallet and finance without fake approval.

Sections:

- Ledger replay.
- Money requests.
- Settlement exceptions.
- Provider readiness.
- Receipt candidate preview.
- Reconciliation preview.
- Payout/refund holds.

Labels:

- `Client replay only`
- `Provider unverified`
- `Non-spendable`
- `No money movement`
- `Settlement blocked`

### 24. Backend Sync / Release Readiness

Purpose: owner/review-ops handoff to real backend/release.

Sections:

- API base URL.
- Health/schema.
- Login/register sync.
- Profile/post/follow-up/listing sync.
- Wallet replay and settlement exception sync.
- Provider readiness.
- Release evidence packet.
- APK hash/device install status.
- Local checklist.
- Audit trail filters.

Important:

- This screen is review-only.
- Copying export/evidence packet does not approve release.
- Provider status checks do not expose secrets.

### 25. Menu / Workflow Search

Purpose: compress the app map.

Top:

- Account identity.
- Three role-native daily actions.
- Status cues: Seal, Finance, Backend.

Search:

- Type terms like receipt, delivery, privacy, podcast, cart, backend, booking, release, trust.

Sections:

- Pinned work.
- Start here.
- Advanced tools.
- Settings/privacy/export/delete.
- Demo/Moto World controls if enabled.

## Data Shapes For UI Fixtures

Use these fixture-level models for the first Android rebuild:

```text
Account(id, name, role, city, locality, trustState, backendState)
Profile(id, accountId, displayName, handle, role, locality, media, trustSummary)
Lead(id, sourceChannel, customerName, contact, itemId, serviceId, note, status)
Listing(id, sellerId, kind, title, price, currency, locality, fulfillmentOptions, proofRule)
Booking(id, providerId, bookerId, serviceId, slot, status, paymentReviewState, proofState)
Order(id, buyerId, sellerId, listingIds, fulfillment, status, paymentReviewState, proofState)
DeliveryJob(id, orderId, courierId, stage, proofChecklist, incidentState, payoutHoldState)
Thread(id, participants, linkedRecordType, linkedRecordId, messages, followUps)
TrustEvidence(id, type, fromAccountId, toAccountId, evidenceRecordId, status)
BackendReadiness(provider, secretsPresent, configured, blockedTransitions)
SettlementException(id, recordId, amount, currency, providerVerified, spendable, status)
```

## First Implementation Slice

Build these first in Android Studio:

1. Navigation shell with role session.
2. Business Home.
3. Discover and Profile.
4. Lead Review.
5. Guest Checkout.
6. Guest Booking.
7. Order Detail.
8. Inbox.
9. Backend Sync.

Use local fixtures only. Add API wiring after the UX is stable.

## Acceptance Criteria

- A first-time tester can identify their role and next action in under 30 seconds.
- Business, Artist, Streamer, Courier, and Review Ops feel like different working modes, not just different labels.
- Lead-to-guest-checkout and lead-to-guest-booking are clear and review-safe.
- Payment/provider/trust/identity/backend states are never misleading.
- Menu search makes every major workflow reachable without a huge command wall.
- Screens are modular enough for Android Studio implementation.
