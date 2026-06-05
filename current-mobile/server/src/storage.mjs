import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const defaultStorePath = path.resolve("server", "data", "dev-store.json");
const PASSWORD_ITERATIONS = 120000;

export function nowISO() {
  return new Date().toISOString();
}

function seedStore() {
  const createdAt = nowISO();
  return {
    version: 1,
    users: [
      { id: "u_riley_artist", email: "riley.artist@artbook.local", passwordHash: hashPassword("demo"), profileId: "riley_artist", createdAt },
      { id: "u_riley_biz", email: "riley.biz@artbook.local", passwordHash: hashPassword("demo"), profileId: "riley_biz", createdAt }
    ],
    sessions: [],
    profiles: [
      { id: "riley_artist", userId: "u_riley_artist", name: "Riley", handle: "@riley", role: "artist", city: "Nairobi", country: "Kenya", privacy: { profile: "public", status: "followers", messages: "followers", calls: "pro", location: "city", activity: "followers", accountType: "visible" }, status: { text: "In the studio shaping a gentler chorus.", visibility: "followers" }, createdAt, updatedAt: createdAt },
      { id: "riley_biz", userId: "u_riley_biz", name: "Business Studio", handle: "@rileybiz", role: "business", city: "Nairobi", country: "Kenya", privacy: { profile: "public", status: "followers", messages: "followers", calls: "pro", location: "city", activity: "followers", accountType: "visible" }, status: { text: "Consultation hours open this week.", visibility: "public" }, createdAt, updatedAt: createdAt }
    ],
    posts: [
      { id: "post_seed_1", authorId: "riley_artist", text: "Palmwine drops at midnight. Credits, rights and listening room are ready.", forwardingPolicy: "public", coCreators: [], status: "published", createdAt }
    ],
    listings: [
      { id: "listing_seed_1", ownerId: "riley_biz", title: "Shea Butter Conditioner", kind: "product", price: 2400, currency: "KES", status: "active", fulfillment: ["pickup", "delivery"], createdAt, updatedAt: createdAt }
    ],
    orders: [],
    bookings: [],
    supportIncidents: [],
    supportCases: [],
    messageDeliveryReceipts: [],
    supportSlaActions: [],
    careNotes: [],
    supportProviderCallbacks: [],
    supportWorkerRuns: [],
    deliveryJobs: [],
    courierProfiles: [],
    deliveryIncidents: [],
    deliveryProviderEvents: [],
    restrictedMediaReports: [],
    messages: [],
    followUps: [],
    notifications: [],
    walletBalances: {},
    walletLedger: [],
    walletRequests: [],
    walletReplayPackets: [],
    settlementAudits: [],
    identityChecks: [],
    jurisdictionProfiles: [],
    verificationAiDrafts: [],
    musicReleasePackets: [],
    playBillingProducts: [
      { id: "pb_artist_pro_monthly", productId: "artbook.artist_pro.monthly", title: "Artist Pro monthly", kind: "subscription", basePlans: ["monthly"], entitlementKey: "artist_pro", accessScope: "artist_release_tools", androidEligible: true, restrictedMedia: false, playConsoleStatus: "product_required" },
      { id: "pb_business_os_monthly", productId: "artbook.business_os.monthly", title: "Business OS monthly", kind: "subscription", basePlans: ["monthly"], entitlementKey: "business_os", accessScope: "business_operations", androidEligible: true, restrictedMedia: false, playConsoleStatus: "product_required" },
      { id: "pb_standard_vault_monthly", productId: "artbook.vault.standard.monthly", title: "Standard creator vault monthly", kind: "subscription", basePlans: ["monthly"], entitlementKey: "standard_creator_vault", accessScope: "standard_creator_vaults", androidEligible: true, restrictedMedia: false, playConsoleStatus: "product_required" },
      { id: "pb_restricted_creator_web", productId: "web.artbook.restricted_creator.monthly", title: "Restricted creator web product", kind: "web_subscription", basePlans: ["monthly"], entitlementKey: "restricted_creator_web_only", accessScope: "restricted_creator_web", androidEligible: false, restrictedMedia: true, playConsoleStatus: "web_only_not_play_billing" }
    ],
    playBillingEntitlementReviews: [],
    playBillingRtdnEvents: [],
    providerPaymentRails: [
      { id: "mpesa_customer_payments", label: "M-Pesa customer payments", scope: "physical_goods_services_wallet", provider: "mpesa_daraja", playBillingScope: false, status: "provider_required" },
      { id: "card_checkout_physical", label: "Card checkout for physical goods and services", scope: "physical_goods_services", provider: "card_checkout", playBillingScope: false, status: "provider_required" },
      { id: "escrow_jobs_bookings", label: "Jobs and booking escrow", scope: "jobs_bookings_escrow", provider: "escrow_provider", playBillingScope: false, status: "provider_required" },
      { id: "wallet_internal_transfers", label: "Internal wallet transfer ledger", scope: "wallet_transfers", provider: "wallet_provider", playBillingScope: false, status: "provider_required" },
      { id: "delivery_courier_payouts", label: "Courier, transporter and seller delivery payouts", scope: "delivery_courier_seller_payouts", provider: "payout_rail", playBillingScope: false, status: "provider_required" },
      { id: "founder_fee_reporting", label: "Founder fee and commission reporting", scope: "platform_revenue_reporting", provider: "finance_reporting", playBillingScope: false, status: "review_required" }
    ],
    providerPaymentBoundaryEvents: [],
    providerSandboxCallbackEvents: [],
    dataExports: [],
    deletionRequests: [],
    publicDeletionRequests: [],
    trustSeals: [],
    trustReports: [],
    auditLog: []
  };
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(18).toString("base64url");
  const hash = crypto.pbkdf2Sync(String(password || ""), salt, PASSWORD_ITERATIONS, 32, "sha256").toString("base64url");
  return { algorithm: "pbkdf2_sha256", iterations: PASSWORD_ITERATIONS, salt, hash };
}

export function verifyPassword(password, user) {
  const record = user?.passwordHash;
  if (record?.algorithm === "pbkdf2_sha256" && record.salt && record.hash) {
    const iterations = Number(record.iterations || PASSWORD_ITERATIONS);
    const actual = Buffer.from(crypto.pbkdf2Sync(String(password || ""), record.salt, iterations, 32, "sha256").toString("base64url"));
    const expected = Buffer.from(String(record.hash));
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }
  return typeof user?.password === "string" && String(password || "") === user.password;
}

export function migrateAuthStore(store) {
  let changed = false;
  for (const user of store.users || []) {
    if (typeof user.password === "string" && !user.passwordHash) {
      user.passwordHash = hashPassword(user.password);
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(user, "password")) {
      delete user.password;
      changed = true;
    }
  }
  return changed;
}

export async function loadStore(file = defaultStorePath) {
  try {
    const store = JSON.parse(await readFile(file, "utf8"));
    if (migrateAuthStore(store)) await saveStore(store, file);
    return store;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const fresh = seedStore();
    migrateAuthStore(fresh);
    await saveStore(fresh, file);
    return fresh;
  }
}

export async function saveStore(store, file = defaultStorePath) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(store, null, 2) + "\n", "utf8");
}

export function audit(store, actorId, action, resourceType, resourceId, detail = {}) {
  const row = {
    id: `audit_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    actorId: actorId || "system",
    action,
    resourceType,
    resourceId,
    detail,
    createdAt: nowISO()
  };
  store.auditLog.unshift(row);
  store.auditLog = store.auditLog.slice(0, 1000);
  return row;
}
