# Artbook Supabase Launch Backend Pack

This folder turns the existing backend handoff into concrete Supabase-ready artifacts. It is not live-applied yet because the connected Supabase account currently has no visible project, and the local Supabase CLI is not installed on this machine.

## What is included

- `supabase/migrations/20260605014500_artbook_launch_core.sql`
  - Core account, profile, post, listing, booking, order, message, support, AI task, trust evidence, outbox and audit tables.
  - Provider event replay table for M-Pesa/card/payout/call/delivery style callbacks.
  - Wallet replay packet table for client ledger/request evidence, with hard `false` checks for provider calls, wallet credit, escrow release, payouts, spendable balances and money movement.
  - RLS enabled and forced on every public table.
  - Private helper functions in `artbook_private`, not in the exposed public schema.
  - Account-scoped policies using `auth.uid()` and membership checks.
  - Server-only provider event, wallet replay packet, outbox and audit writes; authenticated users can only read their own wallet replay packet summaries.
  - Android creator monetization blocked with `android_creator_monetization = false`.

- `supabase/functions/provider-webhook/index.ts`
  - Supabase Edge Function for provider webhook replay.
  - Reads the raw request body with `req.text()` for signature verification.
  - Requires `ARTBOOK_PROVIDER_WEBHOOK_SECRET`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
  - Stores only payload digest, idempotency/event ids and safe payload shape metadata.
  - Never stores raw provider payloads and never moves money, releases payouts, grants entitlements or marks settlement success.

- `supabase/config.toml`
  - Disables Supabase JWT verification only for `provider-webhook`, because external payment/delivery providers cannot send a user JWT.
  - The function still fails closed unless the Artbook webhook secret validates the raw body.

## Apply when a Supabase project exists

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase secrets set ARTBOOK_PROVIDER_WEBHOOK_SECRET=<strong-random-secret>
supabase functions deploy provider-webhook --no-verify-jwt
```

Then register provider sandbox callback URLs such as:

```text
https://<project-ref>.functions.supabase.co/provider-webhook/mpesa
https://<project-ref>.functions.supabase.co/provider-webhook/card_checkout
https://<project-ref>.functions.supabase.co/provider-webhook/payout_rail
```

## Launch boundaries

- Artbook Android can show booking, wallet, proof, provider review and owner approval status.
- Artbook Android must not claim Artbook directly holds escrow, settles money or pays out providers.
- Wallet replay packets are evidence packets only: they record counts, digests and fail-closed provider flags so Review Ops can compare client ledger state against backend/provider proof.
- Real settlement needs licensed/provider-owned payment rails, signed callbacks, provider fetch proof, support/fraud review and owner approval.
- Explicit creator monetization stays out of the Play Store Android app or behind a separate compliant web product.

## Supabase API/RLS notes

- Public-schema tables are treated as potentially Data API reachable, so every Artbook public table has RLS enabled and forced.
- Grants are deliberately narrow: app-owned marketplace tables get authenticated access subject to RLS; provider events, wallet replay packet writes, outbox writes and audit writes stay server-owned.
- The April/May 2026 Supabase Data API change means new projects may not expose public tables automatically; after project creation, check Data API settings and grant only the exact table privileges needed.
- Policies use `auth.uid()` plus `artbook_account_memberships`; do not use user-editable `user_metadata` for authorization.

## Connector status from this pass

- Supabase: connected, organization visible, but no project exists to apply migrations to.
- Convex: used for scaling guidance; its recommendation matches this migration: tenant/account IDs, server-side authorization and paginated lists.
- Base44: connected, but no Artbook app exists in the authenticated Base44 account, so no builder data model was edited.
