import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(root, "supabase", "migrations", "20260605014500_artbook_launch_core.sql");
const supportMigrationPath = path.join(root, "supabase", "migrations", "20260605125200_artbook_support_backend_scaffold.sql");
const functionPath = path.join(root, "supabase", "functions", "provider-webhook", "index.ts");
const configPath = path.join(root, "supabase", "config.toml");
const docsPath = path.join(root, "docs", "SUPABASE_LAUNCH_BACKEND.md");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [migration, supportMigration, edgeFunction, config, docs] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(supportMigrationPath, "utf8"),
  readFile(functionPath, "utf8"),
  readFile(configPath, "utf8"),
  readFile(docsPath, "utf8")
]);

const allMigrations = `${migration}\n${supportMigration}`;

const requiredTables = [
  "artbook_accounts",
  "artbook_account_memberships",
  "artbook_profiles",
  "artbook_posts",
  "artbook_listings",
  "artbook_bookings",
  "artbook_booking_events",
  "artbook_orders",
  "artbook_messages",
  "artbook_provider_events",
  "artbook_wallet_replay_packets",
  "artbook_trust_evidence",
  "artbook_support_cases",
  "artbook_message_delivery_receipts",
  "artbook_support_sla_actions",
  "artbook_support_provider_callbacks",
  "artbook_care_notes",
  "artbook_ai_tasks",
  "artbook_outbox",
  "artbook_audit_events"
];

for (const table of requiredTables) {
  assert(allMigrations.includes(`public.${table}`), `migration missing ${table}`);
  assert(allMigrations.includes(`alter table public.${table} enable row level security;`), `${table} missing RLS enable`);
  assert(allMigrations.includes(`alter table public.${table} force row level security;`), `${table} missing forced RLS`);
}

assert(/create schema if not exists artbook_private/i.test(migration), "private schema missing");
assert(/security definer[\s\S]*set search_path = ''/i.test(migration), "private security definer helper must lock search_path");
assert(migration.includes("auth.uid() is not null"), "RLS should explicitly require authenticated users");
assert(migration.includes("android_creator_monetization boolean not null default false check (android_creator_monetization = false)"), "Android creator monetization must be blocked at schema level");
assert(migration.includes("artbook_provider_events_no_client_insert"), "provider events need a no-client-insert policy");
assert(migration.includes("artbook_provider_events_no_client_update"), "provider events need a no-client-update policy");
assert(migration.includes("artbook_wallet_replay_packets_no_client_insert"), "wallet replay packets need a no-client-insert policy");
assert(migration.includes("artbook_wallet_replay_packets_no_client_update"), "wallet replay packets need a no-client-update policy");
assert(migration.includes("wallet_credit_enabled boolean not null default false check (wallet_credit_enabled = false)"), "wallet replay packets must block wallet credit at schema level");
assert(migration.includes("money_movement_enabled boolean not null default false check (money_movement_enabled = false)"), "wallet replay packets must block money movement at schema level");
assert(migration.includes("spendable boolean not null default false check (spendable = false)"), "wallet replay packets must block spendable balances at schema level");
assert(!/service_role/i.test(allMigrations), "migrations should not refer to service_role grants");
assert(!/raw_payload|raw_body|payload_body/i.test(allMigrations), "migrations should not add raw provider payload storage");
assert(supportMigration.includes("artbook_delivery_receipts_no_client_insert"), "delivery receipts need no-client-insert policy");
assert(supportMigration.includes("artbook_support_sla_actions_no_client_insert"), "SLA actions need no-client-insert policy");
assert(supportMigration.includes("artbook_support_callbacks_no_client_insert"), "support callbacks need no-client-insert policy");
assert(supportMigration.includes("artbook_care_notes_no_client_update"), "care notes need no-client-update policy");
assert(supportMigration.includes("raw_note_material_stored boolean not null default false check (raw_note_material_stored = false)"), "care notes must block raw note material storage");
assert(supportMigration.includes("raw_provider_material_stored boolean not null default false check (raw_provider_material_stored = false)"), "support callback links must block raw provider material storage");
assert(supportMigration.includes("provider_called boolean not null default false check (provider_called = false)"), "support proof lanes must block provider calls");
assert(supportMigration.includes("money_movement_enabled boolean not null default false check (money_movement_enabled = false)"), "support proof lanes must block money movement");

assert(config.includes("[functions.provider-webhook]"), "provider-webhook function config missing");
assert(config.includes("verify_jwt = false"), "provider webhook must document disabled JWT verification for provider callbacks");

assert(edgeFunction.includes("await req.text()"), "edge function must read raw body for signature verification");
assert(edgeFunction.includes("ARTBOOK_PROVIDER_WEBHOOK_SECRET"), "edge function missing webhook secret");
assert(edgeFunction.includes("SUPABASE_SERVICE_ROLE_KEY"), "edge function missing server-only service role usage");
assert(edgeFunction.includes("payload_digest"), "edge function must store payload digest");
assert(edgeFunction.includes("rawPayloadStored: false"), "edge function must report no raw payload storage");
assert(edgeFunction.includes("moneyMovementEnabled: false"), "edge function must block money movement");
assert(!/raw_payload|raw_body|payload_body/i.test(edgeFunction), "edge function must not persist raw payload fields");

assert(docs.includes("Supabase: connected"), "docs should capture connector status");
assert(docs.includes("Convex: used for scaling guidance"), "docs should capture Convex guidance usage");
assert(docs.includes("Base44: connected"), "docs should capture Base44 status");
assert(docs.includes("must not claim Artbook directly holds escrow"), "docs must preserve provider-led money boundary");

const policyCount = (allMigrations.match(/create policy /g) || []).length;
assert(policyCount >= 30, `expected at least 30 RLS policies, found ${policyCount}`);

console.log(JSON.stringify({
  ok: true,
  migrations: [path.relative(root, migrationPath), path.relative(root, supportMigrationPath)],
  edgeFunction: path.relative(root, functionPath),
  tables: requiredTables.length,
  rlsPolicies: policyCount,
  boundaries: {
    rawProviderPayloadStored: false,
    moneyMovementEnabled: false,
    walletCreditEnabled: false,
    spendableBalanceEnabled: false,
    androidCreatorMonetizationEnabled: false,
    clientProviderEventWritesEnabled: false
  }
}, null, 2));
