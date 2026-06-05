# Artbook Supabase Launch Backend Pack

This folder turns the existing backend handoff into concrete Supabase-ready artifacts. It is not live-applied yet because the connected Supabase account currently has no visible project, and the local Supabase CLI is not installed on this machine.

## What is included

- `supabase/migrations/20260605014500_artbook_launch_core.sql`
  - Core account, profile, post, listing, booking, order, message, support, AI task, trust evidence, outbox and audit tables.
  - Provider event replay table for M-Pesa/card/payout/call/delivery style callbacks.
  - RLS enabled and forced on every public table.
  - Private helper functions in `artbook_private`, not in the exposed public schema.
  - Account-scoped policies using `auth.uid()` and membership checks.
  - Server-only provider event, outbox and audit writes.
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
- Real settlement needs licensed/provider-owned payment rails, signed callbacks, provider fetch proof, support/fraud review and owner approval.
- Explicit creator monetization stays out of the Play Store Android app or behind a separate compliant web product.

## Connector status from this pass

- Supabase: connected, organization visible, but no project exists to apply migrations to.
- Convex: used for scaling guidance; its recommendation matches this migration: tenant/account IDs, server-side authorization and paginated lists.
- Base44: connected, but no Artbook app exists in the authenticated Base44 account, so no builder data model was edited.
