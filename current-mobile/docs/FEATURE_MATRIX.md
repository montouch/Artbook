# Artbook Feature Matrix

| Feature | Prototype State | Backend Needed |
|---|---|---|
| Account switching | Fake local demo accounts | Auth, sessions, profile ownership |
| Role-native shell | Different home/more/market/calendar defaults per account type | Server-stored role preferences, permissions, layout config |
| Dual-home flow | Separate role-native home and following/social home | Feed orchestration, follow graph, ranking |
| Profile/status/privacy | Local state | Profile table, privacy enforcement |
| Discovery by locality | Local seeded accounts, themed pickers and GPS scene matching | Search index, geolocation/privacy rules, distance ranking |
| Tour Mode | Local filters with country/city/locality override | Location feeds, ranking, city content index |
| Translation | Local app language + seeded translation memory | Translation provider, locale preferences, audit + fallback rules |
| Posts/comments/likes | Local state | Feed service, moderation, notifications |
| Forwarding/tag consent | Local policy | Consent records, content license records |
| Chat/media/emoji/GIF | Local message list | Realtime messaging, storage, abuse controls |
| Audio/video calls | Simulated app-to-app modal plus context-bound Artbook Relay rules for masked phone fallback | Realtime call provider, masked telephony relay, context expiry, permissions, abuse limits, consent/recording policy and consultation/work gates |
| Communication follow-ups | Local notifications, reminders and email drafts | Job queue, notification delivery, email provider, read state |
| Music uploads | Fake rights review with role-specific restrictions (artist original-only, others licensed/permissioned) | Media ingest, rights declarations, moderation |
| Streamer podcasts | Local Podcast Studio with shows, episodes, clips, transcripts, chapters, RSS/platform checklist, subscriber feeds and analytics | Podcast media hosting, RSS generation, transcript/chapter storage, platform sync, analytics, sponsor disclosure, rights/consent review |
| Listen together | Simulated live room | Realtime room, queue, chat, presence |
| Playlist control | Local playlists and integrated player queue | Playlist storage, playback service, library permissions |
| Bundled audio previews | Local WAV assets in APK | Real catalog, storage, stream URLs, entitlements |
| Products/services/classes | Local listings | Listings, inventory, reviews, categories |
| QR sale links and pickup prompts | Local QR-style tokens, customer ask-ahead queue, counter-only release code and Sales Desk handoff | Server-owned QR tokens, expiry/revocation, scan logging, in-shop release code verification, customer identity binding, duplicate-pickup prevention, order/payment handoff |
| Provenance Seals | Local vouching and seller score | Relationship-backed categorized vouching, report queue, risk scoring, payout/listing holds |
| Tickets/resale | Local tickets | Event verification, ticket ledger, QR validation |
| Streamer subscriptions | Local purchase | Entitlements, Google Play Billing, age/content controls |
| Wallet/money | Fake balance and PIN | Ledger, KYC, payout provider, fraud review |
| POS staff, split tender, drawer and loyalty | Local staff switching, permissions, split payment, gift-card redemption, loyalty points, drawer closeout and tender reports | Staff PIN auth, PCI payment provider, cash drawer sessions, gift-card liability ledger, loyalty program engine, hardware/printer integration |
| Business-model walk-ins and service places | Local business type setup for retail, salon, massage/wellness, mobile service, venue, food, studio and digital sellers; anonymous walk-ins, guest intake and customer-provided service locations | Business profile policy, intake/consent forms, private address access rules, mobile-worker safety, check-in/out, delivery/remote location validation |
| Parent / child controls | Local spend guardrails and approval queue | Guardian relationships, policy enforcement, audit trail |
| Assisted purchases | Local payer/recipient handoff flow | Shared order state, notification visibility, fulfillment permissions |
| Delivery / Route Canvas | Zuru 2021 customer app upgraded into a local delivery add-on: customer delivery sheet inside checkout/tracking, physical-product-only delivery, operational regions, route quotes, fast-lane fee, proof desk, ETA/tracking, notifications and payout holds | Provider adapters for route optimization, courier dispatch, live webhooks, proof files, masked contacts, return/dispute handling, settlement release and delivery analytics |
| Courier portal | Separate local courier account for rider registration, online/offline shift, ranked job offers, active route, pickup/drop-off proof, incidents and M-Pesa-style payout | Courier KYC, vehicle/licence/plate/bag checks, dispatch scoring, low-bandwidth sync, incident/support queue, payout ledger, cash reconciliation, suspension/fraud controls |
| Bookings | Local calendar | Booking state machine, reminders, deposits/refunds |
| Collab rooms | Local notes/plans | Shared workspace, permissions, rights ledger |
| Studio analytics | Derived from local state | Aggregation jobs and privacy-aware metrics |
| Appearance themes | Local Jungian/archetype palettes | User settings, accessibility contrast checks, persisted preferences |
| Location settings | GPS/manual scene matching | Geocoder, privacy precision, spoofing controls |
| Admin/moderation | Not present | Admin dashboard, queues, reports, audit logs |

## Better Product Shape

The app should feel like five connected workspaces, not one huge menu:

1. **Home**: social signal and urgent work.
2. **Profile**: public identity, trust, status and media.
3. **Studio**: analytics, tasks, monetization and privacy.
4. **Market**: commerce, bookings, tickets and subscriptions.
5. **Rooms**: chats, calls, live audio, collabs, follow-ups and email handoff.

The prototype now reflects this shape through More, Studio, Profile, Market and Collabs, and it reorders key workflows differently for artists, businesses, streamers and creators so each role lands in its natural workspace first.

## Trust Interdependence

The backend should treat trust as a cross-app service, not a marketplace-only feature:

- Profiles display Provenance Seals and active risk flags.
- Market checkout checks seller score, delivery route and open reports before taking money.
- Bookings can create Booking Seals after completion.
- Collab rooms can create Co-creator Seals only after acceptance.
- Events can create Venue Seals after organizer/venue proof.
- Wallet/payout logic should hold money when seller trust is low or reports are open.
- Search/ranking should prefer verified, well-reviewed, well-sealed sellers without hiding new legitimate sellers unfairly.
- Location should feed discovery, tour mode, delivery availability and marketplace safety without exposing exact GPS when the user chose city/locality privacy.
