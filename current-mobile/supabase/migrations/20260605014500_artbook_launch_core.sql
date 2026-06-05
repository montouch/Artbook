-- Artbook Supabase launch core.
-- This migration is intentionally provider-led and fail-closed:
-- - every exposed table has RLS enabled and forced;
-- - user tables are account/tenant scoped through artbook_account_memberships;
-- - provider/payment event tables are server-only for authenticated clients;
-- - Android creator monetization is explicitly blocked in marketplace records;
-- - provider events store digests and metadata only, never raw provider payloads.

begin;

create extension if not exists pgcrypto;

create schema if not exists artbook_private;

revoke all on schema artbook_private from public;
grant usage on schema artbook_private to authenticated;

create or replace function artbook_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.artbook_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null default 'customer' check (account_type in ('customer', 'artist', 'business', 'fundi', 'courier', 'staff', 'review_ops', 'creator_web_only')),
  legal_country text not null default 'Kenya',
  operating_country text not null default 'Kenya',
  payout_country text not null default 'Kenya',
  city text not null default 'Nairobi',
  status text not null default 'active' check (status in ('active', 'paused', 'review', 'closed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artbook_account_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'staff', 'support', 'review_ops', 'member', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'paused', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, user_id)
);

create or replace function artbook_private.is_account_member(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.artbook_account_memberships m
    where m.account_id = target_account_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function artbook_private.is_account_operator(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.artbook_account_memberships m
    where m.account_id = target_account_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'staff', 'support', 'review_ops')
  );
$$;

grant execute on function artbook_private.is_account_member(uuid) to authenticated;
grant execute on function artbook_private.is_account_operator(uuid) to authenticated;

create table if not exists public.artbook_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.artbook_accounts(id) on delete cascade,
  display_name text not null,
  handle text not null unique,
  category text not null default 'marketplace',
  locality text not null default 'Nairobi',
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'private')),
  trust_state text not null default 'new' check (trust_state in ('new', 'verified', 'review', 'restricted')),
  profile_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artbook_posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'account')),
  status text not null default 'published' check (status in ('draft', 'published', 'held', 'removed')),
  body text not null,
  media_refs jsonb not null default '[]'::jsonb,
  ai_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artbook_listings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  kind text not null check (kind in ('product', 'service', 'event', 'ticket', 'class', 'digital', 'subscription')),
  title text not null,
  description text not null default '',
  currency text not null default 'KES',
  price_cents integer not null default 0 check (price_cents >= 0),
  status text not null default 'review' check (status in ('draft', 'review', 'active', 'paused', 'archived')),
  locality text not null default 'Nairobi',
  provider_payment_model text not null default 'provider_led_review',
  android_creator_monetization boolean not null default false check (android_creator_monetization = false),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artbook_bookings (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.artbook_accounts(id) on delete restrict,
  provider_account_id uuid not null references public.artbook_accounts(id) on delete restrict,
  listing_id uuid references public.artbook_listings(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'reschedule_requested', 'cancelled', 'completed', 'disputed')),
  scheduled_at timestamptz,
  currency text not null default 'KES',
  quoted_amount_cents integer not null default 0 check (quoted_amount_cents >= 0),
  provider_payment_status text not null default 'partner_review_required',
  proof_status text not null default 'proof_before_release_required',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artbook_booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.artbook_bookings(id) on delete cascade,
  actor_account_id uuid not null references public.artbook_accounts(id) on delete restrict,
  event_type text not null,
  note text not null default '',
  evidence_digest text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.artbook_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid not null references public.artbook_accounts(id) on delete restrict,
  seller_account_id uuid not null references public.artbook_accounts(id) on delete restrict,
  listing_id uuid references public.artbook_listings(id) on delete set null,
  status text not null default 'payment_partner_review' check (status in ('payment_partner_review', 'proof_pending', 'ready_for_owner_approval', 'fulfilled', 'cancelled', 'disputed')),
  currency text not null default 'KES',
  total_cents integer not null default 0 check (total_cents >= 0),
  payment_partner_status text not null default 'not_verified_by_provider',
  proof_status text not null default 'proof_before_release_required',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artbook_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  booking_id uuid references public.artbook_bookings(id) on delete set null,
  sender_account_id uuid not null references public.artbook_accounts(id) on delete restrict,
  recipient_account_id uuid not null references public.artbook_accounts(id) on delete restrict,
  message_type text not null default 'text' check (message_type in ('text', 'letter', 'proof', 'support', 'ai_note')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.artbook_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null default 'webhook',
  external_event_id text,
  idempotency_key text,
  payload_digest text not null,
  signature_status text not null default 'unchecked' check (signature_status in ('unchecked', 'valid', 'invalid', 'missing')),
  status text not null default 'replay_only_no_settlement',
  target_type text,
  target_id uuid,
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  currency text not null default 'KES',
  metadata jsonb not null default '{}'::jsonb,
  review_decision text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artbook_trust_evidence (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  target_account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  source_type text not null check (source_type in ('order', 'booking', 'delivery', 'support', 'provider_event')),
  source_id uuid not null,
  status text not null default 'review' check (status in ('review', 'accepted', 'rejected', 'revoked')),
  evidence_digest text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artbook_support_cases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'waiting_provider', 'waiting_customer', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  category text not null default 'general',
  subject text not null,
  latest_note_digest text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artbook_ai_tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  task_type text not null,
  status text not null default 'draft' check (status in ('draft', 'ready_for_owner_review', 'blocked', 'archived')),
  input_digest text not null,
  output_summary text not null default '',
  blocked_actions jsonb not null default '["money_movement","identity_approval","settlement","moderation_decision"]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artbook_outbox (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  destination text not null,
  event_type text not null,
  payload_digest text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artbook_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  account_id uuid references public.artbook_accounts(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists artbook_accounts_owner_idx on public.artbook_accounts(owner_user_id, status);
create index if not exists artbook_memberships_user_idx on public.artbook_account_memberships(user_id, status, account_id);
create index if not exists artbook_profiles_handle_idx on public.artbook_profiles(handle);
create index if not exists artbook_posts_account_created_idx on public.artbook_posts(account_id, created_at desc);
create index if not exists artbook_listings_account_status_idx on public.artbook_listings(account_id, status, kind);
create index if not exists artbook_listings_market_idx on public.artbook_listings(status, kind, locality, created_at desc);
create index if not exists artbook_bookings_client_idx on public.artbook_bookings(client_account_id, scheduled_at desc);
create index if not exists artbook_bookings_provider_idx on public.artbook_bookings(provider_account_id, scheduled_at desc);
create index if not exists artbook_booking_events_booking_idx on public.artbook_booking_events(booking_id, created_at desc);
create index if not exists artbook_orders_buyer_idx on public.artbook_orders(buyer_account_id, created_at desc);
create index if not exists artbook_orders_seller_idx on public.artbook_orders(seller_account_id, created_at desc);
create index if not exists artbook_messages_thread_idx on public.artbook_messages(thread_id, created_at desc);
create index if not exists artbook_messages_sender_idx on public.artbook_messages(sender_account_id, created_at desc);
create index if not exists artbook_provider_events_provider_idx on public.artbook_provider_events(provider, created_at desc);
create unique index if not exists artbook_provider_events_idempotency_uidx on public.artbook_provider_events(provider, idempotency_key) where idempotency_key is not null;
create index if not exists artbook_trust_evidence_accounts_idx on public.artbook_trust_evidence(account_id, target_account_id, status);
create index if not exists artbook_support_cases_account_idx on public.artbook_support_cases(account_id, status, priority);
create index if not exists artbook_ai_tasks_account_idx on public.artbook_ai_tasks(account_id, status, created_at desc);
create index if not exists artbook_outbox_status_idx on public.artbook_outbox(status, created_at);
create index if not exists artbook_audit_account_idx on public.artbook_audit_events(account_id, created_at desc);

create trigger artbook_accounts_touch_updated_at before update on public.artbook_accounts for each row execute function artbook_private.set_updated_at();
create trigger artbook_account_memberships_touch_updated_at before update on public.artbook_account_memberships for each row execute function artbook_private.set_updated_at();
create trigger artbook_profiles_touch_updated_at before update on public.artbook_profiles for each row execute function artbook_private.set_updated_at();
create trigger artbook_posts_touch_updated_at before update on public.artbook_posts for each row execute function artbook_private.set_updated_at();
create trigger artbook_listings_touch_updated_at before update on public.artbook_listings for each row execute function artbook_private.set_updated_at();
create trigger artbook_bookings_touch_updated_at before update on public.artbook_bookings for each row execute function artbook_private.set_updated_at();
create trigger artbook_orders_touch_updated_at before update on public.artbook_orders for each row execute function artbook_private.set_updated_at();
create trigger artbook_provider_events_touch_updated_at before update on public.artbook_provider_events for each row execute function artbook_private.set_updated_at();
create trigger artbook_trust_evidence_touch_updated_at before update on public.artbook_trust_evidence for each row execute function artbook_private.set_updated_at();
create trigger artbook_support_cases_touch_updated_at before update on public.artbook_support_cases for each row execute function artbook_private.set_updated_at();
create trigger artbook_ai_tasks_touch_updated_at before update on public.artbook_ai_tasks for each row execute function artbook_private.set_updated_at();
create trigger artbook_outbox_touch_updated_at before update on public.artbook_outbox for each row execute function artbook_private.set_updated_at();

alter table public.artbook_accounts enable row level security;
alter table public.artbook_account_memberships enable row level security;
alter table public.artbook_profiles enable row level security;
alter table public.artbook_posts enable row level security;
alter table public.artbook_listings enable row level security;
alter table public.artbook_bookings enable row level security;
alter table public.artbook_booking_events enable row level security;
alter table public.artbook_orders enable row level security;
alter table public.artbook_messages enable row level security;
alter table public.artbook_provider_events enable row level security;
alter table public.artbook_trust_evidence enable row level security;
alter table public.artbook_support_cases enable row level security;
alter table public.artbook_ai_tasks enable row level security;
alter table public.artbook_outbox enable row level security;
alter table public.artbook_audit_events enable row level security;

alter table public.artbook_accounts force row level security;
alter table public.artbook_account_memberships force row level security;
alter table public.artbook_profiles force row level security;
alter table public.artbook_posts force row level security;
alter table public.artbook_listings force row level security;
alter table public.artbook_bookings force row level security;
alter table public.artbook_booking_events force row level security;
alter table public.artbook_orders force row level security;
alter table public.artbook_messages force row level security;
alter table public.artbook_provider_events force row level security;
alter table public.artbook_trust_evidence force row level security;
alter table public.artbook_support_cases force row level security;
alter table public.artbook_ai_tasks force row level security;
alter table public.artbook_outbox force row level security;
alter table public.artbook_audit_events force row level security;

create policy artbook_accounts_select_member on public.artbook_accounts for select to authenticated using (
  auth.uid() is not null and (owner_user_id = auth.uid() or artbook_private.is_account_member(id))
);
create policy artbook_accounts_insert_owner on public.artbook_accounts for insert to authenticated with check (
  auth.uid() is not null and owner_user_id = auth.uid()
);
create policy artbook_accounts_update_operator on public.artbook_accounts for update to authenticated using (
  auth.uid() is not null and artbook_private.is_account_operator(id)
) with check (
  auth.uid() is not null and artbook_private.is_account_operator(id)
);

create policy artbook_memberships_select_self_or_account_operator on public.artbook_account_memberships for select to authenticated using (
  auth.uid() is not null and (user_id = auth.uid() or artbook_private.is_account_operator(account_id))
);
create policy artbook_memberships_insert_owner_self on public.artbook_account_memberships for insert to authenticated with check (
  auth.uid() is not null and user_id = auth.uid() and role = 'owner'
);
create policy artbook_memberships_update_account_operator on public.artbook_account_memberships for update to authenticated using (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
) with check (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
);

create policy artbook_profiles_select_visible_or_member on public.artbook_profiles for select to authenticated using (
  auth.uid() is not null and (visibility = 'public' or artbook_private.is_account_member(account_id))
);
create policy artbook_profiles_insert_operator on public.artbook_profiles for insert to authenticated with check (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
);
create policy artbook_profiles_update_operator on public.artbook_profiles for update to authenticated using (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
) with check (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
);

create policy artbook_posts_select_visible_or_member on public.artbook_posts for select to authenticated using (
  auth.uid() is not null and status = 'published' and (visibility = 'public' or artbook_private.is_account_member(account_id))
);
create policy artbook_posts_insert_member_author on public.artbook_posts for insert to authenticated with check (
  auth.uid() is not null and author_user_id = auth.uid() and artbook_private.is_account_member(account_id)
);
create policy artbook_posts_update_operator on public.artbook_posts for update to authenticated using (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
) with check (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
);

create policy artbook_listings_select_active_or_operator on public.artbook_listings for select to authenticated using (
  auth.uid() is not null and (status = 'active' or artbook_private.is_account_member(account_id))
);
create policy artbook_listings_insert_operator on public.artbook_listings for insert to authenticated with check (
  auth.uid() is not null and artbook_private.is_account_operator(account_id) and android_creator_monetization = false
);
create policy artbook_listings_update_operator on public.artbook_listings for update to authenticated using (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
) with check (
  auth.uid() is not null and artbook_private.is_account_operator(account_id) and android_creator_monetization = false
);

create policy artbook_bookings_select_participant on public.artbook_bookings for select to authenticated using (
  auth.uid() is not null and (artbook_private.is_account_member(client_account_id) or artbook_private.is_account_member(provider_account_id))
);
create policy artbook_bookings_insert_participant on public.artbook_bookings for insert to authenticated with check (
  auth.uid() is not null and (artbook_private.is_account_operator(client_account_id) or artbook_private.is_account_operator(provider_account_id))
);
create policy artbook_bookings_update_participant on public.artbook_bookings for update to authenticated using (
  auth.uid() is not null and (artbook_private.is_account_operator(client_account_id) or artbook_private.is_account_operator(provider_account_id))
) with check (
  auth.uid() is not null and (artbook_private.is_account_operator(client_account_id) or artbook_private.is_account_operator(provider_account_id))
);

create policy artbook_booking_events_select_participant on public.artbook_booking_events for select to authenticated using (
  auth.uid() is not null and exists (
    select 1 from public.artbook_bookings b
    where b.id = booking_id
      and (artbook_private.is_account_member(b.client_account_id) or artbook_private.is_account_member(b.provider_account_id))
  )
);
create policy artbook_booking_events_insert_actor on public.artbook_booking_events for insert to authenticated with check (
  auth.uid() is not null and artbook_private.is_account_operator(actor_account_id)
);

create policy artbook_orders_select_participant on public.artbook_orders for select to authenticated using (
  auth.uid() is not null and (artbook_private.is_account_member(buyer_account_id) or artbook_private.is_account_member(seller_account_id))
);
create policy artbook_orders_insert_participant on public.artbook_orders for insert to authenticated with check (
  auth.uid() is not null and (artbook_private.is_account_operator(buyer_account_id) or artbook_private.is_account_operator(seller_account_id))
);
create policy artbook_orders_update_participant on public.artbook_orders for update to authenticated using (
  auth.uid() is not null and (artbook_private.is_account_operator(buyer_account_id) or artbook_private.is_account_operator(seller_account_id))
) with check (
  auth.uid() is not null and (artbook_private.is_account_operator(buyer_account_id) or artbook_private.is_account_operator(seller_account_id))
);

create policy artbook_messages_select_participant on public.artbook_messages for select to authenticated using (
  auth.uid() is not null and (artbook_private.is_account_member(sender_account_id) or artbook_private.is_account_member(recipient_account_id))
);
create policy artbook_messages_insert_sender on public.artbook_messages for insert to authenticated with check (
  auth.uid() is not null and artbook_private.is_account_operator(sender_account_id)
);

create policy artbook_provider_events_no_client_select on public.artbook_provider_events for select to authenticated using (false);
create policy artbook_provider_events_no_client_insert on public.artbook_provider_events for insert to authenticated with check (false);
create policy artbook_provider_events_no_client_update on public.artbook_provider_events for update to authenticated using (false) with check (false);

create policy artbook_trust_evidence_select_participant on public.artbook_trust_evidence for select to authenticated using (
  auth.uid() is not null and (artbook_private.is_account_member(account_id) or artbook_private.is_account_member(target_account_id))
);
create policy artbook_trust_evidence_insert_participant on public.artbook_trust_evidence for insert to authenticated with check (
  auth.uid() is not null and (artbook_private.is_account_operator(account_id) or artbook_private.is_account_operator(target_account_id))
);
create policy artbook_trust_evidence_update_participant on public.artbook_trust_evidence for update to authenticated using (
  auth.uid() is not null and (artbook_private.is_account_operator(account_id) or artbook_private.is_account_operator(target_account_id))
) with check (
  auth.uid() is not null and (artbook_private.is_account_operator(account_id) or artbook_private.is_account_operator(target_account_id))
);

create policy artbook_support_cases_select_account on public.artbook_support_cases for select to authenticated using (
  auth.uid() is not null and artbook_private.is_account_member(account_id)
);
create policy artbook_support_cases_insert_account on public.artbook_support_cases for insert to authenticated with check (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
);
create policy artbook_support_cases_update_account on public.artbook_support_cases for update to authenticated using (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
) with check (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
);

create policy artbook_ai_tasks_select_account on public.artbook_ai_tasks for select to authenticated using (
  auth.uid() is not null and artbook_private.is_account_member(account_id)
);
create policy artbook_ai_tasks_insert_account on public.artbook_ai_tasks for insert to authenticated with check (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
);
create policy artbook_ai_tasks_update_account on public.artbook_ai_tasks for update to authenticated using (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
) with check (
  auth.uid() is not null and artbook_private.is_account_operator(account_id)
);

create policy artbook_outbox_select_account on public.artbook_outbox for select to authenticated using (
  auth.uid() is not null and artbook_private.is_account_member(account_id)
);
create policy artbook_outbox_no_client_insert on public.artbook_outbox for insert to authenticated with check (false);
create policy artbook_outbox_no_client_update on public.artbook_outbox for update to authenticated using (false) with check (false);

create policy artbook_audit_events_select_account on public.artbook_audit_events for select to authenticated using (
  auth.uid() is not null and account_id is not null and artbook_private.is_account_member(account_id)
);
create policy artbook_audit_events_no_client_insert on public.artbook_audit_events for insert to authenticated with check (false);

grant select, insert, update on
  public.artbook_accounts,
  public.artbook_account_memberships,
  public.artbook_profiles,
  public.artbook_posts,
  public.artbook_listings,
  public.artbook_bookings,
  public.artbook_booking_events,
  public.artbook_orders,
  public.artbook_messages,
  public.artbook_trust_evidence,
  public.artbook_support_cases,
  public.artbook_ai_tasks
to authenticated;

grant select on
  public.artbook_outbox,
  public.artbook_audit_events
to authenticated;

revoke insert, update, delete on
  public.artbook_provider_events,
  public.artbook_outbox,
  public.artbook_audit_events
from authenticated;

commit;
