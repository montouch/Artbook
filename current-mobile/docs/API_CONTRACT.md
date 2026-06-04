# Artbook Prototype API Contract

Base URL for local prototype: `http://127.0.0.1:8787`

Most `/api/*` endpoints require `Authorization: Bearer <token>` except public discovery/listing/feed/schema endpoints. Demo passwords are stored as PBKDF2-SHA256 hashes in the local scaffold, login requires a password, and issued sessions include an expiry timestamp.

Local scaffold: `server/src/server.mjs` implements the first backend slice with JSON dev storage, token auth, profiles, feed, messages, listings, order/booking evidence records, wallet ledger replay, escrow settlement audit replay, country-passport review packets, AI verification drafts, KYC/money-limit review runbooks, artist music release packets, trust reports/Seals, privacy export/deletion requests, audit logging and provider fail-closed placeholders.

The mobile prototype now includes a `Backend sync` desk in Menu and Backend handoff. It can store a local API base URL, test `/api/health` and `/api/schema`, log in or register the active demo account, sync profile/privacy/status, post the latest unsynced Stroke, create a follow-up job, submit one seller listing into review, replay wallet ledger/request rows as client-reported audit data, sync Fundi escrow/refund states as provider-unverified non-spendable settlement audit rows, fetch settlement reconciliation exceptions that keep payout/refund holds visible, fetch a Review Ops KYC/money-limit runbook, sync buyer/booker-confirmed completed orders and bookings as server-owned evidence records, use the mapped backend evidence for Provenance Seals and active trust reports, and verify that payment providers still fail closed.

Phone note: `127.0.0.1` points at the phone when running inside the APK. Use the laptop/server LAN IP for a physical-device test over Wi-Fi.

## Auth And Profile

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Create user, profile and wallet; password is required and stored only as a PBKDF2-SHA256 hash. |
| `POST` | `/api/auth/login` | Verify password and return bearer token plus session expiry. |
| `GET` | `/api/me` | Return current user/profile. |
| `PATCH` | `/api/profiles/me` | Update profile, role, status, privacy and socials. |
| `POST` | `/api/identity/checks` | Start fake/provider KYC check. |
| `GET` | `/api/identity/jurisdiction-profiles/me` | Return the current account's saved country passport packet plus review-only readiness checks. |
| `POST` | `/api/identity/jurisdiction-profiles` | Save legal-ID country, residence country, operating country, payout/tax country, device GPS country proof, residence/work proof and source-of-funds intent as `saved_for_review_only_no_country_rule_approval`. It never approves country rules, KYC, protected content, payouts or money movement. |
| `POST` | `/api/identity/ai-verification-drafts` | Create an AI verification draft from redacted evidence labels and the saved country passport. It can flag missing proof and route to review, but it returns `canApprove:false`, `providerRequired:true`, `moneyMovementEnabled:false` and blocked actions for identity, country rules, money, restricted media and legal filing. |
| `GET` | `/api/identity/provider-gateway` | Return the provider-routed IDV gateway decision: Smile ID primary for Kenya/Africa, Entrust Identity Verification fallback/global route, hosted capture required, raw ID/selfie/liveness media not stored by Artbook, and approval/money/country rules still blocked. |
| `POST` | `/api/identity/provider-sessions` | Store a metadata-only provider session request for a scope/country route. It rejects raw identity media fields, does not call Smile ID or Entrust, returns `provider_not_configured`, and keeps `identityApproved:false`, `rawMediaStoredByArtbook:false`, `moneyMovementEnabled:false`. |
| `POST` | `/api/identity/provider-webhooks/:provider` | Placeholder for signed provider webhook intake. The scaffold stores only a payload digest and safe event metadata, then fails closed until provider secrets, raw-body signature verification and replay controls are implemented. |

## Compliance And Money Limits

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/compliance/risk-runbook?profileId=` | Moderator/support/admin-only KYC and money-limit runbook. It joins country-passport readiness, AI verification draft status, wallet tier proposals, source-of-funds triggers, settlement/refund/payout hold counts, required evidence, redaction fields and blocked actions. It stays `compliance_runbook_review_only_no_money_movement`, never approves KYC/country rules, never raises limits, never returns raw ID/address/coordinate/provider-secret values and never makes balances spendable. |

## Artist Music Release Admin

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/music/release-packets` | List the caller's music release packets, each still `music_packets_review_only_no_legal_filing_no_distribution`. |
| `POST` | `/api/music/release-packets` | Create a release packet with ownership, credits, split sheet, sample/beat clearance, artwork proof, master-quality, metadata, ISRC/UPC or Artbook temporary code, copyright/CMO/publishing admin, takedown contact and royalty admin. Paid Artist Pro/Label Desk packets are marked as Artbook-prepared, but still cannot file legal registrations or distribute music. |
| `PATCH` | `/api/music/release-packets/:id/artist-approval` | Record the artist's final approval or change request. A complete approved packet can become `ready_for_provider_review`, but remains `not_filed_provider_or_authority_required` with `distributionEnabled:false`. |

## Social And Discovery

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/discover?country=&city=&locality=&role=&lat=&lng=` | Search accounts by manual location or GPS-resolved scene. |
| `GET` | `/api/locations/resolve?lat=&lng=` | Resolve GPS to country/city/locality and return available privacy precision levels. |
| `POST` | `/api/translate` | Translate text into the user's app language while preserving original text and locale metadata. |
| `GET` | `/api/feed` | Fetch recent posts. |
| `POST` | `/api/posts` | Create moderated post with forwarding policy and co-creators. |
| `POST` | `/api/messages` | Send text/media/call metadata message. |
| `GET` | `/api/messages/:threadId/followups` | Return follow-up tasks, email drafts and reminder state for a thread. |
| `POST` | `/api/followups` | Create scheduled follow-up or email reminder job. |
| `POST` | `/api/media/upload-url` | Request signed upload URL. |
| `POST` | `/api/calls` | Create a context-bound masked call relay or fail closed. The backend validates that the caller and peer are parties on an active booking/order/ride/delivery/freelancer/sale/invoice/pickup/support context, rejects missing/foreign/inactive contexts before provider handoff, rate-limits repeated relay attempts, never echoes raw caller/callee phone numbers, and returns `provider_not_configured` until a masking provider, expiry jobs, abuse limits and consent/recording policy are configured. |

## AI Assistant Boundary

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/ai/context-preview` | Authenticated redacted preview of only the caller's visible records. Returns allowed assistant actions such as summarize, route, draft, checklist and support-note preparation, plus blocked actions for money movement, identity approval, Provenance Seals, settlement, moderation decisions, restricted media publishing and private-content exposure. It includes a prompt shield that detects instruction-like user/record text and treats it as untrusted data, plus model-gateway readiness. Without `ARTBOOK_AI_LIVE=1` it stays `model_gateway_preview_only_no_external_call`; with live AI enabled it only marks server-side model availability and still does not move money or mutate protected state. |
| `POST` | `/api/ai/business-brief` | Authenticated owner brief built from the same redacted context preview. It ranks visible work such as settlement holds, wallet requests, trust evidence, messages, bookings, orders and listings while preserving `ai_context_preview_only_no_sensitive_actions`, `moneyMovementEnabled:false`, `sensitiveActionsEnabled:false`, prompt-injection detection metadata and a no-external-call model gateway. |
| `POST` | `/api/ai/live-assist` | Authenticated server-side Artguide response. The APK sends a question plus the current account token; the backend builds a redacted visible-context packet, calls OpenAI only when `OPENAI_API_KEY` and `ARTBOOK_AI_LIVE=1` are present, and returns a guarded answer as `ai_live_assist_server_side_guarded_no_sensitive_actions`. The API key never goes into the APK or response. Provider errors, billing/quota failures or disabled live mode fail closed to a deterministic local brief with money, identity, Seals, restricted media, moderation and settlement still blocked. |

## Streamer Podcasts

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/podcasts` | Discover public podcast shows by host, city, category, language, role and locality. |
| `POST` | `/api/podcasts` | Create a streamer-owned show in draft/review state with category, language, format, rights notes and monetization rules. |
| `POST` | `/api/podcasts/:showId/episodes` | Upload or attach an episode with audio/video file, transcript, chapters, sponsor label and consent metadata. |
| `POST` | `/api/podcasts/:showId/rss` | Generate or refresh the server-owned RSS feed and platform-ready metadata. |
| `GET` | `/api/podcasts/:showId/analytics` | Return plays, downloads, retention, listener cities, clip shares and subscriber conversion. |
| `POST` | `/api/podcasts/:showId/clips` | Create rights-checked 15/30/60 second clips for Circle/status sharing. |

## Trust And Seller Safety

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/trust/:profileId` | Return public trust score, Provenance Seals, active evidence-backed reports, non-scoring moderation review reports and non-scoring intake reports. |
| `POST` | `/api/trust/seals` | Add a Provenance Seal from a real relationship such as a completed order or booking. Requires server-owned buyer/booker-confirmed evidence, checks both parties, and blocks duplicate vouches for the same evidence. |
| `POST` | `/api/trust/reports` | Report suspicious seller/account/content behavior. Reports with buyer/booker-confirmed server-owned evidence open active review unless they duplicate an existing report or conflict with an existing Seal; those become non-scoring moderation review. Reports without evidence are saved as non-scoring intake. Claimed but unverified evidence is rejected. |
| `POST` | `/api/trust/reports/:id/evidence-responses` | Involved reporter or target adds a note and optional verified order/booking evidence after a moderator requests more evidence. The response is appended to the report audit trail, keeps scoring disabled and returns the report to moderator review. Non-parties, closed reports and unrequested responses are refused. |
| `GET` | `/api/moderation/trust-reports?status=` | Moderator-only queue for open, intake and review-state trust reports, including reporter/target summaries and linked conflicting Seals. |
| `PATCH` | `/api/moderation/trust-reports/:id` | Moderator-only trust report resolution. Decisions: `dismiss`, `uphold`, `request_more_evidence`, `escalate`. Involved parties cannot resolve their own report; upheld conflict reports revoke the conflicting Seal and make the report active-scoring. When a prior evidence response was accepted, final decisions are marked with `finalResolutionSource=accepted_evidence_response` so accepted proof is not confused with the separate scoring/no-scoring resolution. |
| `PATCH` | `/api/moderation/trust-reports/:id/evidence-responses/:responseId` | Moderator-only review of a submitted proof response. Decisions: `accept`, `reject`, `request_more_evidence`. Accepted responses stay non-scoring until final report resolution, rejected responses remain audit-visible, and another proof request reopens the involved-party response path. |

## Commerce

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/listings` | Fetch active marketplace listings. |
| `POST` | `/api/listings` | Create listing in review state. |
| `POST` | `/api/delivery/quote` | Quote delivery route with region, courier mode, ETA, fee, item restrictions, proof requirements and payout-hold rule. |
| `POST` | `/api/delivery/jobs` | Create dispatch job after payment authorization but before seller payout. Store pickup/drop-off address tokens, masked contacts, courier assignment and route state. |
| `GET` | `/api/delivery/jobs/available?zone=&vehicle=` | Return ranked courier offers using pickup readiness, distance, priority, rider reliability, vehicle/bag fit and anti-starvation rules. |
| `POST` | `/api/delivery/jobs/:id/accept` | Courier accepts a job offer; lock assignment, countdown, masked contacts and pickup proof requirements. |
| `PATCH` | `/api/delivery/jobs/:id/status` | Advance delivery state: quote, packed, assigned, picked_up, delivered, returned, disputed or cancelled. |
| `POST` | `/api/delivery/jobs/:id/proof` | Attach pickup/drop-off proof such as photo, customer PIN, signature, barcode, ID check or pickup-point scan. |
| `POST` | `/api/delivery/jobs/:id/incidents` | Courier, seller or buyer reports address issues, late merchant, customer unreachable, damage, cash mismatch or safety concern. |
| `POST` | `/api/delivery/webhooks/:provider` | Receive courier webhooks for live tracking, ETA updates, failures, proof files and return events. |
| `POST` | `/api/couriers/register` | Start courier onboarding with phone OTP, ID, selfie/liveness, vehicle, licence/plate, zone, bag proof and payout method. |
| `PATCH` | `/api/couriers/me/shift` | Courier goes online/offline and updates operating zone, vehicle, bag/cash flags and low-bandwidth preference. |
| `GET` | `/api/couriers/me/payouts` | Courier earnings, M-Pesa/mobile-money payout state, cash collection reconciliation and holds. |

Implemented scaffold note: `/api/delivery/jobs`, `/available`, `/:id/accept`, `/:id/status`, `/:id/proof`, `/:id/incidents`, `/api/couriers/register`, `/api/couriers/me/shift`, `/api/couriers/me/payouts` and `/api/delivery/webhooks/:provider` are now backend-owned review-only routes. They store address/location/contact tokens instead of exact addresses, keep phone contacts masked, require work-party/courier/moderator boundaries, create support review rows for incidents, summarize provider webhook payloads as unverified replay metadata, and keep seller/courier payout states `provider_not_configured` with `moneyMovementEnabled:false`.

| `POST` | `/api/qr-sales` | Create or rotate a server-owned QR sale token for a listing, service, ticket, class, digital asset or subscription. |
| `GET` | `/api/qr-sales/:token` | Resolve a QR token into the safe public sale page, trust flags, delivery options and allowed checkout actions. |
| `POST` | `/api/sale-prompts` | Customer asks a seller to hold an item/service in the queue before arrival. No customer code is generated yet. |
| `PATCH` | `/api/sale-prompts/:id/release-code` | Seller confirms the customer is at the shop and creates a short-lived counter release code. |
| `PATCH` | `/api/sale-prompts/:id/verify` | Seller verifies the counter release code, prepares the order, and binds the prompt to a QR sale or Sales Desk cart. |
| `POST` | `/api/pos/sessions` | Open a register/cash drawer session with staff, starting cash, device and location metadata. |
| `PATCH` | `/api/pos/sessions/:id/close` | Close drawer, compare counted vs expected cash, and write audit events. |
| `POST` | `/api/pos/tenders/split` | Record one sale paid by multiple tenders such as cash, card, wallet and gift card. |
| `POST` | `/api/pos/gift-cards/redeem` | Validate and redeem gift-card balance against a sale. |
| `POST` | `/api/pos/loyalty/accrue` | Add loyalty points/rewards to a customer after eligible checkout. |
| `POST` | `/api/business-profiles/:id/operating-model` | Save business type, service places, public service area, intake level and safety policy. |
| `POST` | `/api/service-intakes` | Save guest/service intake for anonymous or unsaved walk-ins without converting them into marketing customers. |
| `POST` | `/api/service-locations/verify` | Validate customer-provided addresses, public meet points, delivery routes or remote service links before checkout/booking. |
| `POST` | `/api/payments/intent` | Create external or Google Play Billing payment intent. |
| `POST` | `/api/pay-lens/extract-draft` | Authenticated handoff-only extractor for Pay Lens invoice, screenshot, photo and QR flows. It accepts file metadata, QR text and redacted OCR summaries only, rejects raw files/base64/data URLs and unsupported file types, returns placeholder extracted draft fields plus server validation evidence, and remains `pay_lens_extraction_handoff_only_no_settlement` with no raw file storage, no provider OCR/QR call, no wallet credit, no escrow release and no founder revenue recognition. |
| `POST` | `/api/pay-lens/validate-draft` | Authenticated dry-run validation for the Pay Lens / Pay in Seconds review screen. It accepts pasted-code, invoice, screenshot or QR-derived draft details, classifies the likely payment rail, returns masked details plus a fingerprint, required provider/KYC/webhook checks and `pay_lens_draft_validation_only_no_settlement`. It never stores or returns full payment details, never calls a provider, never credits wallet funds, never releases escrow and never recognizes founder revenue. |
| `GET` | `/api/providers/readiness` | Moderator/support-only provider readiness health check. Reports payment/mobile-money/payout/delivery/call/Play Billing secret names and present/missing status only, raw-body webhook signature readiness, settlement/delivery replay-store scaffold readiness, Play Store release blockers, an owner-grouped release checklist and blocked money/dispatch transitions as `provider_readiness_check_only_no_settlement`. It never returns secret values, calls providers, creates receipt candidates, assigns real dispatch or enables settlement. |
| `GET` | `/api/providers/readiness/export` | Moderator/support-only copy-ready readiness snapshot. Returns redacted plain text for backend or Play Store release prep, including secret names/status only, delivery-provider readiness, raw-body and replay-store status, owner-grouped release checklist, Play Store blockers and blocked money/dispatch transitions as `provider_readiness_export_only_no_settlement`. |
| `GET` | `/api/providers/readiness/evidence-packet` | Moderator/support-only release evidence packet. Bundles the redacted readiness snapshot, owner checklist summary, current local APK hash/build metadata and latest logged audit results as `release_evidence_packet_review_only_no_settlement`; it is a handoff artifact only and does not approve release or enable settlement. |
| `POST` | `/api/orders/checkout` | Create order in payment-pending state. Physical products must include a valid pickup/delivery quote, proof rule and fulfillment window or remain blocked before capture. Services/classes/digital goods do not enter delivery dispatch. |
| `PATCH` | `/api/orders/:id/status` | Party-scoped order status update. Seller delivery proof waits for buyer confirmation; buyer-completed proof becomes eligible evidence for Provenance Seals or active trust reports. |

## Wallet And Finance

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/wallet/ledger` | Return the current account's replayed wallet balance, ledger rows and money requests. |
| `POST` | `/api/wallet/ledger/replay` | Accept local prototype wallet sends, requests, top-ups and withdrawals as `client_replayed_not_settled` audit rows only when the authenticated profile is explicitly present in the row parties. This does not settle provider money. |
| `GET` | `/api/settlements/escrow-audits` | Return provider-unverified escrow/refund settlement audit rows visible to the authenticated party. Rows are not balances, payout approvals or spendable funds. |
| `POST` | `/api/settlements/escrow-audits` | Accept local Fundi/order escrow, release and refund claims as `client_replayed_audit_only_not_settled` rows only when the authenticated profile is one of the parties and the row has a record id plus positive amount. Foreign or malformed rows are rejected per row. |
| `GET` | `/api/settlements/exceptions` | Return the authenticated party's settlement audit rows that still need provider reconciliation, payout-hold review, refund confirmation or support review. Rows include work-evidence summary, provider-receipt placeholder, support status and non-settling support timeline. This is read-only and cannot settle money. |
| `GET` | `/api/settlements/webhook-events` | Moderator/support-only replay ledger for provider callback metadata. Returns stored provider event summaries filtered by `exceptionId`, `auditId`, `sourceId` and optional `provider`; rows include payload digest/shape, provider event id, receipt id, signature state, idempotency decision and target link as `webhook_event_replay_only_no_settlement`. This ledger is separate from settlement audits and cannot settle money. |
| `POST` | `/api/settlements/webhook-events/:id/review-decisions` | Moderator/support-only classifier for replay ledger rows. Accepts `duplicate`, `signature_invalid`, `needs_provider_fetch` and `ready_for_receipt_candidate`, stores a review decision on the webhook event, and returns `webhook_event_decision_only_no_settlement`. `ready_for_receipt_candidate` returns a suggestion-only payload; it does not create a receipt candidate, mark provider success, release payout/refund money or make funds spendable. |
| `GET` | `/api/settlements/exceptions/:id/reconciliation-preview` | Moderator/support-only preview that compares receipt candidates against audit amount, currency and parties, then returns mismatch reasons such as signature, idempotency, amount, currency or party issues. This is preview-only and never marks provider success. |
| `POST` | `/api/settlements/exceptions/:id/review-notes` | Moderator/support-only endpoint that appends an operator note to a settlement exception and support timeline. Allowed decisions are `hold_payout`, `hold_refund`, `await_provider`, `send_to_support` and `mark_duplicate_note`; the route preserves `client_replayed_audit_only_not_settled`, `providerVerified:false` and `spendable:false`. |
| `POST` | `/api/settlements/exceptions/:id/receipt-candidates` | Moderator/support-only receipt intake scaffold. Records provider, receipt id, idempotency key, signature status and duplicate/idempotency outcome as a non-settling candidate; duplicate provider/idempotency keys are ignored and the route still refuses provider success, payout release, refund completion or spendable balance. |
| `GET` | `/api/settlements/webhooks/:provider/fixture-templates` | Moderator/support-only fixture handoff for M-Pesa/Daraja STK callbacks, card checkout settlement callbacks and payout/disbursement callbacks. Returns sample payloads, raw-body signature notes, replay protection notes and dry-run previews as `fixture_templates_only_no_settlement`; it does not audit, store candidates or change settlement state. Pass `exceptionId`, `auditId` or `sourceId` to bind templates to a settlement exception. |
| `GET` | `/api/settlements/provider-fetch/:provider/proof-stub` | Moderator/support-only provider status-fetch contract. Returns M-Pesa/Daraja, card checkout and payout rail plans with required server secrets, request fields, response proof fields, replay keys, reconciliation checks and blocked transitions as `provider_fetch_stub_only_no_settlement`. This does not call providers, store proof, create receipt candidates, mark provider success, release payout/refund money or make funds spendable. |
| `POST` | `/api/settlements/webhooks/:provider` | Placeholder for payment/mobile-money reconciliation webhooks. The scaffold parses common provider fields such as receipt id, idempotency/request id, amount, currency, parties and M-Pesa callback metadata into a sanitized dry-run receipt candidate and reconciliation preview for Review Ops. It also stores a separate replay-ledger event summary with payload digest/shape, signature state and idempotency decision, then still fails closed with `provider_not_configured`; it cannot persist a receipt candidate, mark provider success or release money until real credentials, signatures and idempotent reconciliation are implemented. |

## Bookings And Tickets

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/bookings` | Create confirmed booking. |
| `PATCH` | `/api/bookings/:id/complete` | Party-scoped booking completion. Provider proof waits for booker confirmation; booker-completed proof becomes eligible evidence for Provenance Seals or active trust reports. |
| `PATCH` | `/api/bookings/:id/reschedule` | Update slot and mark rescheduled. |
| `PATCH` | `/api/bookings/:id/cancel` | Cancel with refund policy metadata. |

## Collaboration

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/collabs` | Create pro-only collaboration request. |
| `PATCH` | `/api/collabs/:id` | Accept/decline/update room data. |
| `GET` | `/api/playlists` | Return user and public playlists with co-creator tags. |
| `POST` | `/api/playlists` | Create playlist and save queue metadata. |

## Privacy

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/data-export` | Export current profile data. |
| `POST` | `/api/deletion-requests` | Start deletion request workflow. |

## Provider Behavior

The scaffold returns `provider_not_configured` for real KYC/payment/delivery/media/call/settlement providers unless environment variables are set. This is intentional so fake money, identity or payout reconciliation cannot accidentally look real.
