# Artbook Handoff Prompt Memory

Working prompt from the screenshots:

- Continue working on the Artbook app prototype.
- Project folder, if present, is `C:\Users\brown\Documents\Codex\Artbook`.
- On this laptop that folder is absent, so use the extracted folder from `Artbook-transfer-v181.zip`.
- Latest installed APK version: `1.181`.
- Important context:
  - This is the Artbook Android prototype.
  - Preserve all existing functionality unless replacing it with a clearer, better flow.
  - Recover from messy fixtures, wrong paths, missing labels, and purchase labels that accidentally cross accounts.
  - Purchase flows now work for buyer and seller sides, including basket, Today, customer letters, notifications, follow-ups, emails, accounting readout, digital/class/subscription flows.
  - Continue auditing end-to-end flows: home, circles, create, inbox, menu, Sales Desk, booking, invoices/receipts, QR/guest orders, delivery/job board, messages, customer letters, media/player, themes, role boundaries, business following, accounting exports, boosts/Finder revenue.
  - Fundi marketplace logic should stay contract-like: bids are quotes, both client and fundi agree price/scope/timing/proof, escrow funds before work starts, the work deadline clock starts only when the fundi starts, and deadline extensions require one side to request plus the other side to approve.
  - Booking protocol should stay party-scoped: only the booker/provider can reschedule or cancel, booker reschedules respect the included limit, and provider-recorded no-shows make future bookings full-pay until the owner removes the rule.
  - Event/ticket operations should stay role-scoped: ticket purchase is allowed only after door-ready checks and within capacity, ticket owners manage resale/transfer/support before check-in, organizers manage check-in and event ops, attendees get read-only event ops, and exact ticket/event notifications should remain routable.
  - Provenance/Trust must stay evidence-aware: completed jobs remain traceable even without Seals, customers/fundis keep final say on Seals, loose reports stay intake-only, and only evidence-backed reports should affect active trust review.
  - Wallet/money movement should stay account-scoped and ledgered: internal sends debit the sender and credit the recipient, money requests remain pending until the payer accepts, provider top-up/withdraw rows carry fee/provider state, and production must move balances, webhooks, KYC/AML limits, fraud review and founder finance exports to the backend.
  - Keep using the enabled plugin/app ecosystem where it genuinely helps the project: Chrome, Gmail, Canva, Vercel, GitHub, Google Drive, Build Web Data Visualization, Test Android Apps, Expo, Remotion, Common Room, YepCode, HyperFrames, HeyGen, Supabase, Codex Security, and OpenAI Developers. Do not use them as decoration; use the relevant capability for research, QA, backend, Android, deployment, security, AI, media, or product material work.
  - Keep the app feeling real and populated: add realistic demo materials, customer/provider records, media, support trails, ledgers, receipts, messages, provenance evidence, and operational examples when they make a flow easier to judge.
  - Moto World is the named synthetic audit world. It should keep running until the user explicitly says Moto World should die or be removed. Its bots must remain clearly AI-labeled, activity/change requests/issues should be stored as audit evidence, and removal should purge synthetic actors/posts/threads while preserving the Moto World archive for mending the app.
  - Moto World now represents a 710-account synthetic society: 700 generated AI-labeled lives plus seed bots across customers, artists, streamers/entertainers, businesses, freelancers, couriers/transporters and creators. It should create bot-to-bot audit interactions, not just owner-facing messages.
  - Explicit-content testing must use explicit-marked safety workflows, age/ID gates, warnings, watermark/leak-report controls, and non-explicit placeholder media only.
  - Artist/music release tools should be useful enough that artists prefer Artbook: free artists get guided checklists; paid Artist Pro/Label Desk accounts can have Artbook prepare release packets, registration/distributor handoff notes, metadata, quality prompts and royalty/admin checklists, while the artist keeps final approval before filing handoff or release.
  - Country rules must be based on legal ID country, real phone location, residence/operating country, payout/tax country and proof expiry, not VPN/IP. A Kenyan ID holder living in Adelaide can operate under Australia after residence/work proof and provider/human review.
  - Verification should benchmark serious money apps: original document capture, selfie/liveness, address/residence proof where needed, source-of-funds/wealth for money risk, purpose/country intent, deadlines/restrictions and manual review fallback. AI may draft and flag; provider/human approval must decide protected access.
  - AI, backend readiness, Play Store readiness, and in-app money movement are core goals. Money transfer and founder revenue flows should preserve trust, account separation, auditability, provider/payment boundaries, and the larger aim of keeping value circulating inside Artbook.
  - Use product-quality judgment, not only tests: simplify crowded text, remove or repair dead tiles, keep UI pleasant, theme-consistent, touch-friendly, and ready for realistic pilot users.
  - After source changes, run available audits, rebuild the APK if possible, install it on the connected Android phone if possible, and verify launch.
- APK file from handoff: `C:\Users\brown\OneDrive\Desktop\artbook-phone-install.apk`.
- Connected phone is available through ADB when plugged in.
- This laptop can now build local-debug APKs, but phone-compatible in-place updates require the old computer's `C:\Users\brown\.android\debug.keystore` unless the phone app is fully uninstalled/reset once.
- Post-work reminder: use `ARTBOOK_POST_WORK_CHECKLIST.md` before calling any Artbook task finished.
