-- Artbook support backend scaffold.
-- Adds the server-owned support proof lanes requested by the Android support readiness board:
-- delivery receipts, SLA actions, provider callback links and immutable care notes.
-- These tables are intentionally review-only. Clients can read account-visible rows through RLS,
-- but direct client writes are blocked; production writes should come from backend routes or Edge Functions.

begin;

create table if not exists public.artbook_message_delivery_receipts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  support_case_id uuid references public.artbook_support_cases(id) on delete set null,
  message_id uuid references public.artbook_messages(id) on delete set null,
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'push', 'sms', 'whatsapp', 'call_note')),
  provider text not null default 'provider_not_configured',
  recipient_account_id uuid references public.artbook_accounts(id) on delete set null,
  consent_scope text not null default 'support_contact',
  status text not null default 'sandbox_receipt_recorded_provider_not_called',
  body_digest text,
  provider_receipt_digest text,
  retry_count integer not null default 0 check (retry_count >= 0),
  provider_called boolean not null default false check (provider_called = false),
  message_delivered_by_provider boolean not null default false check (message_delivered_by_provider = false),
  money_movement_enabled boolean not null default false check (money_movement_enabled = false),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.artbook_support_sla_actions (
  id uuid primary key default gen_random_uuid(),
  support_case_id uuid not null references public.artbook_support_cases(id) on delete cascade,
  account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  actor_account_id uuid references public.artbook_accounts(id) on delete set null,
  action_type text not null check (action_type in ('assign', 'escalate', 'overdue', 'customer_update_required', 'provider_update_required', 'request_closeout', 'hold_closeout')),
  owner_queue text not null default 'review_ops',
  due_at timestamptz,
  status text not null default 'sla_action_recorded_review_only',
  note_digest text,
  provider_called boolean not null default false check (provider_called = false),
  closeout_approved boolean not null default false check (closeout_approved = false),
  money_movement_enabled boolean not null default false check (money_movement_enabled = false),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.artbook_support_provider_callbacks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  support_case_id uuid references public.artbook_support_cases(id) on delete set null,
  provider_event_id uuid references public.artbook_provider_events(id) on delete set null,
  rail text not null,
  event_type text not null default 'callback_replay',
  event_id_digest text,
  idempotency_digest text,
  payload_digest text not null,
  signature_status text not null default 'unverified_provider_secret_not_configured',
  status text not null default 'callback_replay_recorded_no_provider_success',
  target_type text,
  target_id uuid,
  raw_provider_material_stored boolean not null default false check (raw_provider_material_stored = false),
  provider_called boolean not null default false check (provider_called = false),
  provider_verified boolean not null default false check (provider_verified = false),
  proof_before_release_required boolean not null default true check (proof_before_release_required = true),
  wallet_credit_enabled boolean not null default false check (wallet_credit_enabled = false),
  refund_release_enabled boolean not null default false check (refund_release_enabled = false),
  payout_enabled boolean not null default false check (payout_enabled = false),
  founder_revenue_recognized boolean not null default false check (founder_revenue_recognized = false),
  money_movement_enabled boolean not null default false check (money_movement_enabled = false),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.artbook_care_notes (
  id uuid primary key default gen_random_uuid(),
  support_case_id uuid not null references public.artbook_support_cases(id) on delete cascade,
  account_id uuid not null references public.artbook_accounts(id) on delete cascade,
  actor_account_id uuid references public.artbook_accounts(id) on delete set null,
  visibility text not null default 'account' check (visibility in ('account', 'customer', 'provider', 'review_ops')),
  body_digest text not null,
  redacted_preview text not null default '',
  previous_note_hash text,
  note_hash text not null unique,
  append_only boolean not null default true check (append_only = true),
  raw_note_material_stored boolean not null default false check (raw_note_material_stored = false),
  provider_called boolean not null default false check (provider_called = false),
  money_movement_enabled boolean not null default false check (money_movement_enabled = false),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists artbook_delivery_receipts_account_idx on public.artbook_message_delivery_receipts(account_id, created_at desc);
create index if not exists artbook_delivery_receipts_case_idx on public.artbook_message_delivery_receipts(support_case_id, created_at desc);
create index if not exists artbook_support_sla_actions_case_idx on public.artbook_support_sla_actions(support_case_id, created_at desc);
create index if not exists artbook_support_callbacks_case_idx on public.artbook_support_provider_callbacks(support_case_id, created_at desc);
create index if not exists artbook_support_callbacks_rail_idx on public.artbook_support_provider_callbacks(rail, created_at desc);
create index if not exists artbook_care_notes_case_idx on public.artbook_care_notes(support_case_id, created_at desc);
create index if not exists artbook_care_notes_account_idx on public.artbook_care_notes(account_id, created_at desc);

alter table public.artbook_message_delivery_receipts enable row level security;
alter table public.artbook_support_sla_actions enable row level security;
alter table public.artbook_support_provider_callbacks enable row level security;
alter table public.artbook_care_notes enable row level security;

alter table public.artbook_message_delivery_receipts force row level security;
alter table public.artbook_support_sla_actions force row level security;
alter table public.artbook_support_provider_callbacks force row level security;
alter table public.artbook_care_notes force row level security;

create policy artbook_delivery_receipts_select_account on public.artbook_message_delivery_receipts for select to authenticated using (
  auth.uid() is not null and artbook_private.is_account_member(account_id)
);
create policy artbook_delivery_receipts_no_client_insert on public.artbook_message_delivery_receipts for insert to authenticated with check (false);
create policy artbook_delivery_receipts_no_client_update on public.artbook_message_delivery_receipts for update to authenticated using (false) with check (false);
create policy artbook_delivery_receipts_no_client_delete on public.artbook_message_delivery_receipts for delete to authenticated using (false);

create policy artbook_support_sla_actions_select_account on public.artbook_support_sla_actions for select to authenticated using (
  auth.uid() is not null and artbook_private.is_account_member(account_id)
);
create policy artbook_support_sla_actions_no_client_insert on public.artbook_support_sla_actions for insert to authenticated with check (false);
create policy artbook_support_sla_actions_no_client_update on public.artbook_support_sla_actions for update to authenticated using (false) with check (false);
create policy artbook_support_sla_actions_no_client_delete on public.artbook_support_sla_actions for delete to authenticated using (false);

create policy artbook_support_callbacks_select_account on public.artbook_support_provider_callbacks for select to authenticated using (
  auth.uid() is not null and artbook_private.is_account_member(account_id)
);
create policy artbook_support_callbacks_no_client_insert on public.artbook_support_provider_callbacks for insert to authenticated with check (false);
create policy artbook_support_callbacks_no_client_update on public.artbook_support_provider_callbacks for update to authenticated using (false) with check (false);
create policy artbook_support_callbacks_no_client_delete on public.artbook_support_provider_callbacks for delete to authenticated using (false);

create policy artbook_care_notes_select_account on public.artbook_care_notes for select to authenticated using (
  auth.uid() is not null and artbook_private.is_account_member(account_id)
);
create policy artbook_care_notes_no_client_insert on public.artbook_care_notes for insert to authenticated with check (false);
create policy artbook_care_notes_no_client_update on public.artbook_care_notes for update to authenticated using (false) with check (false);
create policy artbook_care_notes_no_client_delete on public.artbook_care_notes for delete to authenticated using (false);

grant select on
  public.artbook_message_delivery_receipts,
  public.artbook_support_sla_actions,
  public.artbook_support_provider_callbacks,
  public.artbook_care_notes
to authenticated;

revoke insert, update, delete on
  public.artbook_message_delivery_receipts,
  public.artbook_support_sla_actions,
  public.artbook_support_provider_callbacks,
  public.artbook_care_notes
from authenticated;

commit;
