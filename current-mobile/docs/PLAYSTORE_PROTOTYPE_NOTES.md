# Play Store Prototype Notes

This project is not yet Play Store ready, but it is now organized so a backend/mobile developer can move it toward release.

## Must Happen Before Public Launch

- Build a proper Android project with release signing, versioning and target SDK compliance.
- Replace fake local wallet with server ledger and compliant payment/KYC providers.
- Add Google Play Billing for digital goods/subscriptions where required.
- Add privacy policy, terms, creator policy, marketplace policy, refund policy and content rules.
- Add data deletion/export flows connected to backend.
- Add moderation/reporting/admin tools.
- Add seller fraud controls: Provenance Seals, seller verification, report queues, delivery proof, payout holds and dispute handling.
- Add location privacy controls, GPS permission rationale, geocoding provider and distance-ranking abuse checks.
- Add age/content controls for streamer vaults.
- Treat the new 18+ vault flow as a compliance scaffold only. The demo uses non-explicit placeholder media; any real explicit creator service needs legal/policy review, verified adult creators/viewers, UGC moderation, consent records for every person shown, per-viewer watermarking, leak response and store-policy decisions before public launch.
- Keep Freelancer/job relationships separate from creator/fan content. Public profile names can be artist or business names; work accountability needs a verified legal-name layer from ID/KYC. A work job must not unlock adult vaults, subscriber media, social posts, private galleries, direct contact or exact address.
- Freelancer jobs must support more than physical visits: remote software/admin/design services, hardware-shop pickup, boda/cab/messenger errands and intercity transporter work need mode-specific proof, route notes, masked contacts, escrow holds and customer approval before payout.
- Artguide AI should be treated as an assistive layer, not an authority. It can explain screens, route users through the large app, suggest next actions and draft/support workflow text, but production must enforce opt-out, role-scoped context, prompt redaction, abuse monitoring, source/audit logs and human confirmation before sensitive actions. Live model calls must stay server-side through `POST /api/ai/live-assist`; the Android APK must never contain the OpenAI API key, and provider quota/billing errors must fail closed to the local guarded brief.
- Moto World is a prototype audit/simulation layer only. It may run indefinitely during QA at the owner's direction, but all Moto bots, posts, messages, media and live activity must stay clearly AI-labeled, removable from real user space, and separate from production accounts. Its archive can be retained for product fixes, but synthetic actors must not ship as real users.
- The checkout, receipts/settings, wallet request, booking setup/detail, Freelancer agreement/change-order, support review and refund AI coach panels are prototype guidance only. They should remain available as manual checklists when AI is off, and production must require explicit user confirmation plus server/provider evidence before any money, identity, agreement, Seal, support or refund state changes.
- AI stock intake is a prototype workflow only until production adds explicit consent, camera/photo permission handling, prompt redaction, no-cross-use rules, retention limits, audit logs and human approval before stock changes. The app must remain fully usable when AI is turned off.
- Add real media storage and malware/abuse scanning.
- Add production database, backups, monitoring and incident process.
- Add QA pass on physical Android devices and network failure states.

## Provider Readiness

Review Ops can call `GET /api/providers/readiness` from the backend sync desk to see missing payment/mobile-money/payout/delivery/call/Play Billing secret names, raw-body webhook signature readiness, settlement and delivery replay-store readiness, Play Store blockers and an owner-grouped release checklist. The checklist groups work under backend, Android, compliance and payments, and the phone UI lets Review Ops tick items as local planning notes only. The endpoint reports names and statuses only, never secret values, and remains `provider_readiness_check_only_no_settlement`. Use `GET /api/providers/readiness/export` or the Backend sync copy button for a redacted plain-text snapshot suitable for backend or Play Store release checklists.

Review Ops can also call `GET /api/compliance/risk-runbook` from Backend sync. The `KYC and money limits` card shows wallet tier proposals, source-of-funds triggers, operator review steps, blocked actions and counts for identity packets, AI verification drafts, wallet rows and settlement holds. It is review-only evidence for KYC/AML/payment planning; it never approves identity, country rules, source-of-funds, refunds, payout release, wallet limit raises or spendable balances.

`GET /api/providers/readiness/evidence-packet` and the Backend sync evidence packet copy button combine the readiness snapshot, owner checklist progress, local APK hash/build metadata and latest logged audit results into one Review Ops handoff. The packet card shows APK, checklist, phone-install and money-gate state before the long copy textarea. It is evidence for planning only, not proof of Play Store approval, release signing readiness or live payment settlement.

Courier shift, payout review and delivery provider callback replay are also backend-owned review-only scaffolds. `PATCH /api/couriers/me/shift` records online/offline state without storing exact GPS coordinates, `GET /api/couriers/me/payouts` shows held courier earnings without disbursement, and `POST /api/delivery/webhooks/:provider` stores unverified replay metadata for Review Ops while raw-body signatures/provider credentials are missing. Provider readiness now surfaces these delivery gates, replay counts, missing delivery secret names and blocked dispatch/payout transitions. None of these routes can assign real paid dispatch, expose raw contacts or release seller/courier money.

The Backend sync provider readiness area shows a `Handoff export preview` card above the long copy fields. It confirms whether the redacted readiness snapshot and release evidence packet are both copy-ready, shows APK/checklist/money-gate context, and keeps the same review-only boundary.

When Review Ops copies the readiness snapshot or release evidence packet, the phone records a local Backend audit-trail row naming the artifact. The visible row carries compact snapshot/packet, review-only and no-money-move tags, and repeats that no release approval or money movement occurred.

The Backend audit trail can be filtered to all, handoff, settlement, trust or other events. These filters are display-only; they help Review Ops separate release handoff sharing from payout/refund holds, trust moderation and general provider/wallet/work-evidence rows without mutating backend state. The filter chips show all five lane totals before filtering, while the compact legend explains current-account scope, Handoff snapshots/packets, Settlement examples, Trust examples, Other examples and display-only safety without repeating those totals. Handoff rows carry compact snapshot/packet, review-only and no-money-move tags. Settlement rows carry compact guardrail tags such as audit only, provider-unverified, non-spendable and no settlement. Trust rows carry compact tags such as seal verified, evidence-backed, moderation review, intake only and non-scoring. Other-lane rows carry compact tags such as provider check, wallet replay or work evidence. Each filtered view also shows a filtered/total count and explains empty lanes so Review Ops can switch back to All without mistaking a quiet lane for a missing audit trail.

The Backend sync top-level grid also shows an `Evidence export` row. It summarizes whether a packet is ready, the current APK hash, local checklist count, history count, diff count and phone-install status before Review Ops opens the full packet or history drawer.

The Backend sync evidence history drawer keeps the latest local packets so Review Ops can compare the current APK hash, audit section, checklist count and phone-install status against the previous packet after each build. It opens with compact latest/checklist/diff/phone status, shows packet copy rows before older comparison detail, and keeps the field-by-field diff reasons collapsed until Review Ops needs them. History rows are local handoff context only; they should not be treated as release approval or payment-provider verification.

## Prototype Packaging

`artbook-phone-install.apk` is useful for showing the concept on a phone. It should not be submitted to Play Store as-is because it is a compact WebView prototype with local state and fake providers.

The APK now requests Android secure-content mode for the protected adult-media viewer through `FLAG_SECURE` when running inside the native wrapper. This is only one defensive layer; production still needs backend authorization, expiring signed media URLs, watermark rendering outside the client trust boundary, abuse investigation tools and clear Play Store policy treatment.

## Keystore-Aware Local Builds

`tools/build-native-artbook-apk.mjs` can now sign with an explicit keystore when the original phone-compatible key is available:

- `ARTBOOK_KEYSTORE_PATH`: path to the keystore, preferably the old computer's `C:\Users\brown\.android\debug.keystore`.
- `ARTBOOK_KEYSTORE_ALIAS`: key alias, default `androiddebugkey`.
- `ARTBOOK_KEYSTORE_PASS`: store password, default Android debug password.
- `ARTBOOK_KEY_PASS`: key password, defaults to `ARTBOOK_KEYSTORE_PASS`.

Run `tools/phone-install-readiness.mjs` before attempting a USB install. It reports the connected ADB device, installed app version/signature marker, APK package/version, APK signing certificate and whether the update path still needs the original keystore or an intentional app reset. When an app is already installed, it pulls the installed APK from the phone and compares signing certificates so post-reset local-debug updates are not mislabelled as blocked.
