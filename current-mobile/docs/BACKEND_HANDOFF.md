# Artbook Backend Handoff

Artbook is currently a polished mobile prototype in `src/artbook-mobile.html`. The app is intentionally fake-local: it stores state in phone/browser storage so every button can be tapped without a server.

The backend engineer should treat the prototype as the product behavior reference, not as production architecture.

## What The Prototype Already Demonstrates

- Social feed, posts, comments, likes, forwarding rules and co-creator tags.
- Profiles for the four supported account types: artists, streamers, creators and businesses.
- Status, privacy settings, role-aware profile layouts and studio analytics.
- Role-native home, More, calendar and market layouts with different default workflows per account type.
- Dual-home behavior per account: a main role-native landing page plus a separate following/social home.
- Local discovery and Tour Mode by country/city/locality/lens, with GPS scene matching in the Android wrapper.
- In-app translation language, auto-translate behavior and Mexico/Spanish seeded tour content.
- Audio hub, albums, creator playlists, integrated queue controls, listen-together rooms, mini player and bundled demo audio assets.
- Artist music release desk with free checklist, paid Artist Pro/Label Desk release-packet preparation, artist final approval, ownership/split/sample/artwork/master-quality/metadata/code/takedown/royalty checks, country-aware copyright/CMO/distributor handoff and a clear boundary that Artbook prepares packets but does not legally file or distribute without real provider/authority review.
- Streamer Podcast Studio with shows, episodes, transcripts, chapters, clips, RSS/platform publishing checklists, subscriber feeds, sponsor labels and analytics.
- Marketplace for products, services, tickets, digital assets, classes and subscriptions.
- 18+ subscription-vault scaffold with explicit warnings, separate adult identity scope, viewer consent receipt, per-viewer watermark, leak report queue and Android secure-content bridge. Demo content remains non-explicit.
- Freelancer job safety now separates public profile/stage/business names from verified legal names. Work accountability uses the ID/KYC real-name layer, while adult/subscriber/private profile content, direct contact and exact address stay isolated from the job relationship.
- The Freelancer marketplace now covers remote services, software/admin/design work, hardware-shop pickup, boda/cab/messenger errands and intercity transporter jobs such as Kisii to Nairobi, with mode-specific proof, pickup/drop-off notes, route updates and payout holds.
- QR sale links and pickup prompts so sellers can activate sale QR codes, buyers can ask ahead, and counter-only release codes can be verified before handoff.
- POS-grade register operations: staff permissions, split tenders, gift-card redemption, loyalty points, cash drawer closeout and tender/staff reports.
- AI stock intake assistant inside Sales Desk: seller-selected camera/photo input, demo count suggestions, mismatch notes, manual intake that still works when AI is off, and an account-scoped stock audit trail.
- Business-model aware walk-ins: anonymous retail buyers, guest tickets, service intake, mobile/home-service address prompts, public meet points, delivery and remote service places.
- Reviews, ratings, listing upload metadata and delivery route checks.
- Delivery add-on behavior from the 2026 Zuru handoff: delivery stays behind Market/More, applies only to physical products, uses a customer delivery sheet for basket/region/checkout/tracking, and keeps courier controls separate.
- Courier portal test account with rider onboarding checklist, online/offline shift, ranked job offers, active route, proof capture, incident reporting and M-Pesa-style payout.
- Provenance Seals: categorized account vouching for sellers, businesses, creators, events, rights and collaborators.
- Wallet PIN lock, fake transfers, checkout, ticket purchase and subscription flows.
- Booking, cancellation, rescheduling and protocol notes.
- Dedicated communications page with chat, call log, email follow-ups, notifications and timed reminders.
- Chat with text, voice/image/video/GIF placeholders, emoji, audio/video call simulation.
- Collaboration rooms with rights, split, phase, deliverables, tasks and notes.
- Parent/child monitoring with guarded teen-account spending, upload review and approval requests.
- Assisted purchase flows where one user pays and another user handles delivery, pickup and seller messages.
- Bundled AI-generated profile/storefront imagery so the APK demonstrates richer, device-local media.
- Moto World synthetic audit world: 700 generated AI-labeled lives plus seed bots across customers, artists, entertainers/streamers, businesses, freelancers, couriers/transporters and creators. It creates generated safe media, bot-to-bot interactions, messages, live activity, issue logs, experience notes, change requests and an archive that persists until the owner removes the synthetic actors. It is audit evidence only and must be removable without touching production data.
- App-wide Artguide AI copilot scaffold: role-aware help for businesses, artists, creators, streamers, couriers and ordinary customers; it explains screens, opens workflows from plain language, suggests next actions, routes to receipts/bookings/messages/jobs/wallet/privacy and falls back to a manual workflow map when AI is turned off.
- Country Passport and AI verification copilot: separates legal ID country, phone GPS/residence evidence, operating country, payout country, tax country, proof expiry and work permission. Verification follows serious money-app patterns such as original document capture, selfie/liveness, proof of address/residence, source-of-funds/wealth for money risk, purpose/country intent, deadlines/restrictions and manual review fallback. The local API now stores review-only country-passport packets and AI verification drafts; AI flags risk and missing proof, while provider/human review approves protected access.
- In-context AI workflow coach panels now sit inside the densest business and work rooms: Sales Desk checkout, Receipts, Sales settings, Wallet, money requests, Booking setup, Booking detail, Freelancer agreement/change orders, Support review and Refund Ops. They keep AI useful as a step checklist, record router and safety explainer, while turning into manual checklists when AI is off.
- Stateful back navigation that restores the previous page/thread context instead of dropping back to home.

## Production Boundary

Supabase launch backend pack:

- `supabase/migrations/20260605014500_artbook_launch_core.sql` creates 15 core launch tables for accounts, memberships, profiles, posts, listings, bookings, booking events, orders, messages, provider events, trust evidence, support cases, AI tasks, outbox and audit events.
- RLS is enabled and forced on every public table. Policies are account-scoped with `auth.uid()` and `artbook_account_memberships`; helper functions live in the private `artbook_private` schema, not the exposed public schema.
- Provider/payment event writes are blocked for authenticated clients. Service/backend code must write replay rows, and those rows are digest/metadata only.
- `supabase/functions/provider-webhook/index.ts` reads the raw provider callback body, verifies `ARTBOOK_PROVIDER_WEBHOOK_SECRET`, stores safe replay metadata only, and returns non-settling statuses.
- `tools/supabase-launch-backend-audit.mjs` verifies the launch pack before shipping: 15 tables, 42 policies, forced RLS, no raw payload persistence, no client provider-event writes, no money movement and no Android creator monetization.
- Live application is still blocked until a Supabase project exists, the Supabase CLI or CI can apply migrations, provider secrets are stored server-side and sandbox callbacks prove signed raw-body verification.

Do not trust app-side state for:

- identity/KYC
- AI verification drafts, ID/residence/work-permission conclusions, source-of-funds decisions, country passport approval and legal/tax/payout eligibility
- money balances
- payouts
- subscription entitlements
- adult/explicit content age verification, upload moderation, per-viewer watermarking, download/screen-record policy and leak-report enforcement
- media ownership
- music copyright registration, CMO/publisher administration, distributor ISRC/UPC assignment, music legal review, release takedown handling and royalty/payout admin
- podcast media hosting, RSS feed integrity, transcripts, platform sync, sponsor disclosure and subscriber-only episode entitlements
- seller trust scores and Provenance Seals
- GPS coordinates, location privacy and geocoding
- operating-country and residence evidence; do not trust VPN/IP or client-side country selections for legal, payout, tax, seller, job or music-release rules
- suspicious seller reports
- ticket validity
- POS staff permission checks, split tender settlement, gift-card liability and cash drawer counts
- AI stock intake, receipt/photo analysis, prompt boundaries, redaction, retention, consent logs and inventory adjustment auditability
- app-wide AI copilot output, prompt routing, role-scoped context selection, source citations, opt-out enforcement and audit logs for AI-suggested actions
- Moto World demo actors, synthetic activity, generated media and QA logs; production must keep this as a seeded test/audit layer that can be purged from real user space while preserving a separate audit archive
- in-context AI workflow coach actions inside checkout, receipts/settings, wallet requests, booking setup/detail, freelancer agreements/change orders, support review and refunds; production must keep these as human-confirmed suggestions and never let them move money, approve terms, grant Seals, resolve providers/support cases or expose unrelated private records
- guest intake, consent notes, private address handling and check-in/out for mobile or high-touch services
- freelancer/mobile-service work identity, verified legal-name handling, content-isolation rules, remote-work proof, pickup/route handoff consent and anti-stalking boundaries between job relationships and creator/fan content
- delivery route availability
- courier account approval, vehicle/licence/bag proof and live shift state
- dispatch ranking, fast-lane priority, anti-starvation rules, route reassignment and low-bandwidth delivery sync
- QR sale token validity, in-shop release code verification and duplicate-pickup prevention
- private messages
- call permissions
- translation provider output and locale policy
- email delivery, reminder jobs and notification fan-out
- content moderation
- collaborator consent

Those must become server-side decisions.

## Server Scaffold

The prototype API scaffold lives in `server/src`.

It has:

- JSON dev storage
- token auth
- profile/user registration
- posts
- messages
- communication follow-ups / notifications
- marketplace listings
- bookings/reschedule/cancel
- delivery quote adapter
- payment intent adapter
- media upload adapter
- podcast hosting/RSS/transcript/analytics adapter
- call room adapter
- notification / job adapter
- translation adapter
- KYC adapter
- Provenance Seal and trust report endpoints with server-owned order/booking evidence checks
- seller risk score policy helpers
- GPS/location resolve endpoint shape and locality-aware discovery
- moderation adapter
- data export and deletion request endpoints
- audit logging

Provider integrations intentionally fail closed unless credentials are configured in `server/.env`.

The app now also includes a `Backend sync` desk under Menu and inside Backend handoff. It keeps the prototype offline-first while proving the first safe server slice:

- test `/api/health` and `/api/schema`
- log in or register the active demo account with token auth
- sync profile, status and privacy to `PATCH /api/profiles/me`
- send one unsynced Stroke to `POST /api/posts`
- send one follow-up to `POST /api/followups`
- send one seller listing to `POST /api/listings` in review state
- sync Freelancer escrow/release/refund claims to `POST /api/settlements/escrow-audits` as provider-unverified, non-spendable audit rows only
- fetch `GET /api/settlements/exceptions` so provider-unverified releases, refunds and support-held rows stay visible as payout/refund holds
- show those settlement exceptions in the mobile Backend sync desk with work evidence, provider-receipt placeholder, support status, support timeline and a dry-run operator plan that explains the hold without changing balances
- let Review Ops/support append a backend review note through `POST /api/settlements/exceptions/:id/review-notes`; the note is audited into the support timeline but cannot settle payout, finish refunds, mark provider success or create spendable balance
- let Review Ops/support record provider receipt candidates through `POST /api/settlements/exceptions/:id/receipt-candidates`; this captures receipt id, signature status and idempotency status, ignores duplicate provider/idempotency keys, and still refuses settlement success
- let Review Ops/support preview reconciliation through `GET /api/settlements/exceptions/:id/reconciliation-preview`; this compares candidate amount, currency and parties against the audit row and returns mismatch reasons without mutating settlement state
- parse provider webhook payloads through `POST /api/settlements/webhooks/:provider` as a dry run only; the parser maps receipt/idempotency/status/amount/currency/party fields, including M-Pesa callback metadata, into a preview candidate, audits a summary, returns `provider_not_configured`, and never stores the candidate or changes settlement state
- store provider callback replay metadata separately from settlement audits in `GET /api/settlements/webhook-events`; rows include payload digest/shape, provider event id, receipt id, signature state, idempotency decision, duplicate link and target link as `webhook_event_replay_only_no_settlement`
- let Review Ops/support classify callback replay rows through `POST /api/settlements/webhook-events/:id/review-decisions` as duplicate, signature-invalid, needs-provider-fetch or ready-for-receipt-candidate; this is review metadata only, and the ready state returns a suggestion without creating a candidate, settling money or changing spendable funds
- expose provider webhook fixture templates through `GET /api/settlements/webhooks/:provider/fixture-templates` for Review Ops/support; the templates cover M-Pesa/Daraja STK callbacks, card checkout settlement callbacks and payout/disbursement callbacks with signature-verification and replay-protection handoff notes, and every template stays `fixture_templates_only_no_settlement`
- expose provider status-fetch proof stubs through `GET /api/settlements/provider-fetch/:provider/proof-stub`; the stub lists required server-side secrets, request contracts, response proof fields, replay keys, reconciliation checks and blocked transitions for M-Pesa/Daraja, card checkout and payout rails, without making provider calls, storing proof or changing settlement state
- expose `POST /api/pay-lens/extract-draft` for Pay Lens invoice, screenshot, photo and QR handoff; it accepts file metadata, QR text and redacted OCR summaries only, rejects raw files/base64/data URLs and unsupported file types, prepares placeholder review draft fields, calls the dry-run draft validator, audits only digests/metadata, and stays `pay_lens_extraction_handoff_only_no_settlement` with no raw file storage, no provider OCR/QR call, no wallet credit, no escrow release and no founder revenue recognition
- expose `POST /api/pay-lens/validate-draft` for the Pay Lens / Pay in Seconds UI; it accepts review-screen draft details from pasted codes, invoices, screenshots or QR scans, detects likely payment rails, returns masked details and a digest only, lists user-review/provider/KYC/webhook checks, audits redacted metadata, and stays `pay_lens_draft_validation_only_no_settlement` with no provider call, no stored raw bank/mobile-money detail, no wallet credit, no escrow release and no founder revenue recognition
- expose provider readiness health through `GET /api/providers/readiness` for Review Ops/support; it reports payment, payout, delivery, call relay and Play Billing secret names with present/missing status only, raw-body webhook signature readiness, settlement/delivery replay-store scaffold readiness, Play Store release blockers, a backend/Android/compliance/payments release checklist and blocked money/dispatch transitions, without exposing secret values, assigning real courier dispatch or enabling settlement
- expose `GET /api/compliance/risk-runbook` for Review Ops/support; it joins country-passport readiness, AI verification draft status, wallet tier proposals, source-of-funds triggers, settlement/refund/payout holds, required evidence, redaction fields and blocked protected actions in one review-only response. It is `compliance_runbook_review_only_no_money_movement` and cannot approve KYC, country rules, wallet limits, source-of-funds, refund completion, payout release or spendable balances.
- expose `GET /api/providers/readiness/export` and the Backend sync copy button as a redacted release-prep snapshot; it is plain text for backend/Play Store checklists and still omits secret values, provider calls, receipt candidates and settlement transitions
- keep the Backend sync release checklist checkboxes local-only; ticking backend, Android, compliance or payments tasks records Review Ops planning notes but does not configure providers, clear store blockers, mark receipts reconciled or enable money movement
- expose `GET /api/providers/readiness/evidence-packet` and the Backend sync copy button as a single release evidence handoff; it bundles the readiness snapshot, owner checklist progress, current local APK hash/build metadata and latest logged audit results, while staying `release_evidence_packet_review_only_no_settlement`
- show a `Handoff export preview` card above the long export textareas so Review Ops can confirm the redacted readiness snapshot and release evidence packet are both copy-ready before scrolling, with money transitions still blocked
- show a compact first-screen summary inside the Release evidence packet card with APK hash, local checklist count, phone-install status and money-gate state before the long packet textarea
- record local Backend audit trail rows when Review Ops copies the redacted readiness snapshot or release evidence packet; these rows show compact snapshot/packet, review-only and no-money-move tags while still stating no release approval or money movement occurred
- provide compact Backend audit trail filters for all, handoff, settlement, trust and other events so Review Ops can isolate release handoff copies, payout/refund holds, moderation activity or general provider/wallet/work-evidence rows without changing any backend state
- include all/handoff/settlement/trust/other lane counts inside the audit filter chips themselves, so each tap target previews how many rows will appear before Review Ops switches lanes
- show a compact audit filter legend only when rows exist; it explains current-account scope, Handoff examples, Settlement examples, Trust examples, Other examples and display-only filtering instead of duplicating the chip counts
- show compact guardrail tags on Settlement-lane rows, including audit-only, provider-unverified, non-spendable and no-settlement states, so Review Ops can scan payout/refund holds without mistaking review evidence for money movement
- show compact Trust-lane tags for Seal verification, evidence-backed active reports, non-scoring moderation review and intake-only reports so Review Ops can see which trust rows affect scoring and which only collect evidence
- show compact tags on Other-lane rows such as provider check/fail closed/no-money-move, wallet replay/client replay/not-settled, and work evidence/server proof/trace-only so Review Ops can distinguish general backend rows without opening every detail
- expose `POST /api/ai/context-preview` and `POST /api/ai/business-brief` so the Backend sync desk can fetch a server-owned AI contract: only visible records, redacted emails/phones/location/secrets/KYC/private media, prompt-injection detection that treats instruction-like text as untrusted data, allowed actions limited to summary/routing/drafts/checklists/support notes, and blocked actions for money movement, identity approval, Provenance Seals, moderation decisions, settlement, restricted media publishing and private-content exposure
- show the Backend sync `AI context safety` card with blocked actions, allowed actions, redaction fields, prompt shield, model-gateway preview, risk flags and owner next actions; the card records an audit row tagged as redacted/no protected action and never enables money, identity, trust, external model calls or settlement state
- show a filtered audit count and empty-state explanation when a selected audit lane has no rows, making clear that the full trail still exists under All and that filtering does not mutate backend or payment state
- show a compact `Evidence export` row in the Backend sync top-level grid so Review Ops can see packet readiness, APK hash, checklist count, history count, diff count and phone-install status before opening the full packet/history drawers
- keep a local Backend sync evidence history drawer so Review Ops can compare the latest packet with the previous APK hash, audit section, checklist progress and phone-install note between builds; the drawer now starts with compact latest/checklist/diff/phone status, puts packet copy rows before older comparison detail, keeps the field-by-field diff reasons collapsed until needed, and remains handoff context only that does not clear any release or money gate
- probe `POST /api/payments/intent` and confirm provider fail-closed behavior
- expose backend-owned delivery dispatch scaffold routes for courier onboarding, online/offline shift state, payout review, job creation, available-job ranking, courier accept, status, proof, incident reporting and delivery-provider webhook replay; these routes store address/location/contact tokens only, require buyer/seller/courier/moderator boundaries, create support rows for incidents and keep seller/courier payouts held as `provider_not_configured`
- keep trust handoff honest by requiring buyer/booker-confirmed server-owned order/booking evidence before a Seal or active report can affect public trust
- sync buyer/booker-confirmed local order and booking completions into server-owned evidence rows so backend trust checks can verify them
- submit Seals and evidence-backed trust reports with the mapped backend evidence ids when a local API connection is active
- keep Provenance Seal scoring resistant to spam by rejecting repeated reports from the same reporter/evidence and routing Seal/report contradictions into non-scoring moderation review
- expose a first moderator-only trust report queue and resolution endpoint so unsupported conflicts can be dismissed, upheld conflicts can revoke the contradictory Seal, and unresolved reports can request more evidence or escalate

On a physical Android phone, `127.0.0.1` points to the phone, not the laptop. Use the laptop's LAN IP when the local server is running on this computer.

## Recommended Production Stack

- Mobile: native Android or Capacitor/TWA, not a raw debug WebView wrapper for launch.
- API: Node/NestJS, Django, Rails, or Laravel. The scaffold is plain Node for readability.
- DB: PostgreSQL with row-level ownership checks.
- Cache/queues: Redis plus background workers.
- Media: S3-compatible object storage with signed URLs.
- Podcasts: server-generated RSS feeds, audio/video hosting, transcript/chapter storage, platform publishing status and download/stream analytics.
- Auth: email/phone OAuth provider or custom auth with MFA.
- Realtime: WebSocket service for chat/collab rooms/live rooms.
- Calls: Daily/Agora/LiveKit for app calls plus a Twilio/telephony-style masked relay for last-resort PSTN calls. Phone fallback must be active-context-only, temporary, provider-created, abuse-limited and must never expose either party's real number to the other client.
- Payments: Google Play Billing for in-app digital goods where required, plus local payment rails for physical goods/services where allowed.
- KYC: Persona, Stripe Identity, Sumsub, Onfido or regional KYC provider.
- Delivery: courier aggregator or custom delivery app with quotes, tracking, proof of delivery, incident webhooks, masked contacts and route optimization.
- Mobile money: Safaricom Daraja/M-Pesa or an approved payment aggregator for STK Push, till/paybill receipts, courier payouts and reconciliation in Kenya.
- Trust/risk: admin review queues, device/IP/account clustering, dispute history, delivery proof, payout holds and report triage.

## First Backend Milestones

1. Replace local app state with production auth/profile/feed/listings/messages. The scaffold now hashes demo passwords and expires bearer sessions, but production still needs MFA/recovery/device-risk controls.
2. Add real object storage for profile photos, posts, media vaults and chat attachments.
3. Implement marketplace with server-owned listings, reviews and orders.
4. Promote the local wallet replay, escrow audit and settlement exception endpoints into an immutable server ledger: server-computed balances, idempotent transfer IDs, payer-approved requests, escrow holds/releases/refunds, support review notes, support timelines, provider receipt candidates, reconciliation previews, provider webhook dry-run parsing, provider webhook event replay ledger, fixture templates, provider receipt reconciliation, provider webhooks with raw-body signature verification, replay protection, reconciliation exception queues, no client-side balance edits, and no payout release before reconciliation.
5. Add booking protocol state machine.
6. Add KYC, role verification, country-passport review and provider-backed AI verification workflow: document capture, selfie/liveness, residence/address proof, source-of-funds/wealth where required, sanctions/fraud screening, proof expiry reminders, manual review queues and appeal paths. The scaffold now includes `GET/POST /api/identity/jurisdiction-profiles`, `POST /api/identity/ai-verification-drafts`, `GET /api/identity/provider-gateway`, `POST /api/identity/provider-sessions` and `POST /api/identity/provider-webhooks/:provider` as review-only contracts. Use Smile ID as the Kenya/Africa primary IDV route and Entrust Identity Verification as global/fallback, with hosted capture and signed webhooks; Artbook should store only provider status/reference metadata, never raw ID/selfie/liveness media. Production still needs real IDV contracts, provider secrets, sanctions/fraud screening, reviewer queues and appeal paths.
7. Add Provenance Seals, seller risk scoring, reports and payout/listing holds. The scaffold now verifies buyer/booker-confirmed order/booking evidence against server-owned rows, requires both parties to match, keeps evidence-free reports as non-scoring intake, rejects repeated same-reporter evidence reports, queues Seal/report contradictions for non-scoring moderation review, gives moderators a first resolution path for dismiss/uphold/request-more-evidence/escalate decisions, accepts party evidence responses after a moderator asks for more proof, lets moderators accept/reject/request another round from that response trail, and labels any final report decision made after accepted proof so accepted proof cannot be mistaken for an automatic score change; production still needs payment-provider reconciliation, dispute outcome checks and full admin tooling.
8. Add GPS/geocoding, user location precision settings and distance-aware discovery ranking.
9. Add translation provider, language preference storage and locale-aware copy fallback.
10. Add communications jobs: email follow-ups, reminder scheduling and notification read state.
11. Add Google Play Billing entitlement checks for digital subscriptions/classes/vaults as needed.
12. Add adult-content compliance gates before any explicit service can launch: verified adults only, UGC moderation, consent records for every person shown, unique watermarking, download controls, leak investigation, abuse escalation and store-policy review. Do not rely on the phone UI for these controls.
13. Add reporting/moderation queues and admin dashboard.
14. Add privacy/export/delete flows.
15. Convert APK to release-grade Android project and Play Console submission assets.
16. Add courier portal backend: courier KYC, shift state, dispatch offers, proof files, incidents, low-bandwidth sync and payout reconciliation.
17. Add podcast backend: show/episode CRUD, RSS generation, transcripts, chapters, clips, subscriber feeds, platform sync, sponsor labels, rights review and analytics.
18. Add music release admin backend: release-packet CRUD, collaborator split sheets, ownership proofs, sample/beat clearance records, artwork/source proof, master-quality checklists, ISRC/UPC/distributor handoff, country-specific copyright/CMO admin notes, artist final approval and immutable release trail. The scaffold now has review-only release-packet create/list/artist-approval endpoints; production still needs legal/provider integrations, royalty accounting and immutable audit storage.

## Delivery And Courier Flow

The 2026 product shape should keep the customer app simple:

1. Customer buys a physical product in Market.
2. Checkout opens a delivery sheet for pickup/courier, region, fee, fulfillment window, proof rule, fast-lane option and delivery note.
3. Payment authorization is allowed only after delivery or pickup is possible.
4. The order creates a dispatch job with pickup/drop-off address tokens, masked contacts and payout hold.
5. Courier portal offers the job to approved riders by score: pickup readiness, route efficiency, rider distance, reliability, vehicle/bag fit, promised ETA and fast-lane priority.
6. Fast-lane can rank higher, but standard jobs gain priority over time so they are not starved.
7. Courier accepts, confirms pickup with seller PIN/photo, travels, then completes drop-off with customer PIN/photo/signature/ID as required.
8. Webhooks update buyer, seller and courier. Seller payout releases only after proof and risk checks.
9. Incidents such as unclear landmark, late merchant, unreachable customer, package damage, cash mismatch or safety concern go to support/admin review.

Courier account requirements for Kenya-first launch:

- phone OTP, legal name, ID/passport, selfie/liveness and emergency contact
- operating city/zone, vehicle type, plate/licence where relevant and insurance/proof of cover where required
- M-Pesa/mobile-money payout, cash-handling permission and food-safe insulated bag for food jobs
- language preference, low-bandwidth mode, device quality tier and offline contact fallback

## QR Pickup Queue Logic

The secure pickup flow should be a small state machine:

1. Customer asks ahead. This creates a queue request only.
2. Seller accepts or declines the hold. Acceptance may reserve stock/capacity until a clear expiry window.
3. Customer arrives at the shop/counter and marks themselves present, or the seller confirms they are present.
4. Seller releases a short-lived counter code. No code exists before this point.
5. Seller verifies that code, which releases the queued item into checkout.
6. Seller completes payment/receipt/delivery handoff and marks the queue item complete.

The backend should expire holds, prevent duplicate release codes, log who released/verified the code, and avoid taking money for items that were never accepted or cannot be delivered.

## Location And Discovery

The prototype now avoids plain native dropdowns for main discovery filters. Users choose country, city and locality through themed pickers, or tap GPS in Discover/Tour Mode. The Android wrapper requests coarse/fine location permission and the web app maps the GPS fix to the nearest seeded Artbook scene.

Production recommendations:

- Never expose exact GPS by default. Store exact coordinates only when needed and show public location according to privacy settings: exact, locality, city or hidden.
- Resolve GPS on the server or through a geocoding provider, then rank discovery by distance plus relevance/trust.
- Keep manual city/locality override because users may tour another city or protect their precise location.
- Tie local marketplace results to delivery/pickup availability so location improves safety, not only convenience.
- Add abuse controls for fake local presence, suspicious rapid city switching and location spoofing when money or seller trust is involved.

## Communication And Translation

The prototype now treats communications as its own workspace:

- message threads stay on a dedicated page
- call history is visible beside messaging tools
- follow-up reminders and email drafts are grouped with notifications
- users can switch app translation language and auto-translate seeded foreign-language content

Production recommendations:

- persist communication read state, thread history, attachments and follow-up tasks server-side
- use background jobs for reminder scheduling, notification fan-out and email sending
- keep translation provider use auditable and reversible; store original text and translated text separately
- let users opt out of auto-translation per thread or per account
- protect message/call/contact permissions with privacy policy stored on the server

## Role-Native Shell

The prototype no longer treats account types as cosmetic labels. Switching accounts changes default navigation order and the structure of key pages:

- artist accounts lead with releases, playlists, tour signal and collabs
- business accounts lead with bookings, fulfillment, follow-ups and storefront trust
- streamer accounts lead with live rooms, queues, vaults and community threads
- creator accounts lead with discovery, playlists, touring scenes and collaborative curation

Production recommendations:

- store role-to-navigation/layout preferences on the server so mobile/web stay in sync
- keep role defaults opinionated, but allow users to pin or reorder some modules later
- gate role-specific surfaces with permissions, verification state and entitlements rather than only a profile label

## Fraud And Seller Trust Model

The app now uses the artsy name **Provenance Seals** for vouching. A Seal is not a casual like. It should be counted only when the backend can attach it to a real relationship:

- completed order
- completed service booking
- accepted collaboration room
- verified delivery or pickup proof
- venue/event proof
- institutional or identity review
- verified local scene relationship

The prototype now also models category/method metadata per Seal so the backend can reason about:

- commerce
- services
- fulfilment
- collaboration
- events
- identity
- creative rights
- local scene

Recommended production behavior:

- Do not allow self-vouching.
- Do not let Seals replace identity, payout, tax/contact, delivery or moderation checks.
- Weight Seals by evidence quality, not popularity.
- Reduce score for open reports, delivery disputes, suspicious reviews, payout mismatches and repeated cancellations.
- Keep new or low-score sellers in review-pending listing state and hold payouts until fulfillment evidence is strong.
- Give buyers a clear report path on listings and seller profiles.
