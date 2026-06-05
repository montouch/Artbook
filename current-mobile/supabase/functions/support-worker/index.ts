type JsonObject = Record<string, unknown>;

type SupportCase = {
  id: string;
  account_id: string;
  status: string;
  priority: string;
  category?: string;
  subject?: string;
  latest_note_digest?: string | null;
  metadata?: JsonObject;
  created_at?: string;
  updated_at?: string;
};

type DeliveryReceipt = {
  id: string;
  account_id: string;
  support_case_id?: string | null;
  status?: string;
  provider_called?: boolean;
  message_delivered_by_provider?: boolean;
  retry_count?: number;
  created_at?: string;
};

type SlaAction = {
  id: string;
  support_case_id: string;
  action_type?: string;
  status?: string;
  due_at?: string | null;
  closeout_approved?: boolean;
  provider_called?: boolean;
  money_movement_enabled?: boolean;
  created_at?: string;
};

type ProviderCallback = {
  id: string;
  support_case_id?: string | null;
  rail?: string;
  signature_status?: string;
  provider_called?: boolean;
  provider_verified?: boolean;
  money_movement_enabled?: boolean;
  created_at?: string;
};

type CareNote = {
  id: string;
  support_case_id: string;
  previous_note_hash?: string | null;
  note_hash?: string;
  append_only?: boolean;
  raw_note_material_stored?: boolean;
  provider_called?: boolean;
  money_movement_enabled?: boolean;
  created_at?: string;
};

type WorkerAction = {
  id: string;
  supportCaseId: string;
  accountId: string;
  lane: string;
  action: string;
  severity: "low" | "medium" | "high";
  reason: string;
  status: string;
  providerCalled: false;
  moneyMovementEnabled: false;
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const SUPPORT_WORKER_LANES = [
  "delivery_retry",
  "sla_clock",
  "provider_callback_review",
  "care_audit_gap",
  "failure_alert_owner"
];

function json(status: number, body: JsonObject): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: jsonHeaders });
}

function supabaseSecretKey(): string {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const keys = JSON.parse(modern);
      if (typeof keys?.default === "string" && keys.default) return keys.default;
    } catch {
      // Fall back to the legacy env var below.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
}

function bearerToken(req: Request): string {
  const authorization = req.headers.get("authorization") || "";
  return authorization.replace(/^bearer\s+/i, "").trim();
}

function suppliedServiceKey(req: Request): string {
  return req.headers.get("apikey") || bearerToken(req) || req.headers.get("x-artbook-worker-secret") || "";
}

function safeDate(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dueAtForCase(row: SupportCase): number | null {
  const metadata = row.metadata || {};
  return safeDate(metadata.slaDueAt) || safeDate(metadata.dueAt) || safeDate(metadata.supportDueAt);
}

function byCase<T extends { support_case_id?: string | null }>(rows: T[], supportCaseId: string): T[] {
  return rows.filter(row => row.support_case_id === supportCaseId);
}

function careChainOk(notes: CareNote[]): boolean {
  if (!notes.length) return false;
  const ordered = [...notes].sort((a, b) => (safeDate(a.created_at) || 0) - (safeDate(b.created_at) || 0));
  let previousHash = "";
  for (const note of ordered) {
    if (!note.append_only || note.raw_note_material_stored || note.provider_called || note.money_movement_enabled || !note.note_hash) return false;
    if ((note.previous_note_hash || "") !== previousHash) return false;
    previousHash = note.note_hash;
  }
  return true;
}

function classifyCase(
  supportCase: SupportCase,
  generatedAt: string,
  receipts: DeliveryReceipt[],
  slaActions: SlaAction[],
  callbacks: ProviderCallback[],
  careNotes: CareNote[]
): WorkerAction[] {
  const actions: WorkerAction[] = [];
  const closed = ["closed", "resolved"].includes(String(supportCase.status || "").toLowerCase());
  const dueAt = dueAtForCase(supportCase);
  const generatedAtMs = Date.parse(generatedAt);
  const caseReceipts = byCase(receipts, supportCase.id);
  const caseSlaActions = byCase(slaActions, supportCase.id);
  const caseCallbacks = byCase(callbacks, supportCase.id);
  const caseCareNotes = byCase(careNotes, supportCase.id);
  const providerDeliveryConfirmed = caseReceipts.some(row => row.provider_called === true && row.message_delivered_by_provider === true);
  const providerCallbackVerified = caseCallbacks.some(row => row.provider_verified === true && /^verified|valid/i.test(row.signature_status || ""));

  if (!caseReceipts.length || !providerDeliveryConfirmed) {
    actions.push({
      id: `edge_worker_action_${supportCase.id}_delivery_retry`,
      supportCaseId: supportCase.id,
      accountId: supportCase.account_id,
      lane: "delivery_retry",
      action: caseReceipts.length ? "delivery_provider_send_required" : "delivery_receipt_probe_required",
      severity: caseReceipts.length ? "medium" : "high",
      reason: caseReceipts.length ? "Only sandbox receipt metadata exists; provider delivery is not confirmed." : "No delivery receipt exists for this support case.",
      status: "queued_for_review_only",
      providerCalled: false,
      moneyMovementEnabled: false
    });
  }

  if (!dueAt) {
    actions.push({
      id: `edge_worker_action_${supportCase.id}_sla_due_at_required`,
      supportCaseId: supportCase.id,
      accountId: supportCase.account_id,
      lane: "sla_clock",
      action: "sla_due_at_required",
      severity: "medium",
      reason: "Support case metadata has no server-owned SLA due time.",
      status: "queued_for_review_only",
      providerCalled: false,
      moneyMovementEnabled: false
    });
  } else if (!closed && dueAt < generatedAtMs) {
    actions.push({
      id: `edge_worker_action_${supportCase.id}_sla_overdue`,
      supportCaseId: supportCase.id,
      accountId: supportCase.account_id,
      lane: "sla_clock",
      action: "sla_overdue_escalation_candidate",
      severity: "high",
      reason: "SLA due time has passed and closeout remains blocked.",
      status: "queued_for_review_only",
      providerCalled: false,
      moneyMovementEnabled: false
    });
  } else if (!caseSlaActions.length) {
    actions.push({
      id: `edge_worker_action_${supportCase.id}_sla_tick`,
      supportCaseId: supportCase.id,
      accountId: supportCase.account_id,
      lane: "sla_clock",
      action: "sla_tick_not_yet_recorded",
      severity: "low",
      reason: "SLA due time exists but no worker/action tick has been recorded.",
      status: "queued_for_review_only",
      providerCalled: false,
      moneyMovementEnabled: false
    });
  }

  if (!caseCallbacks.length || !providerCallbackVerified) {
    actions.push({
      id: `edge_worker_action_${supportCase.id}_provider_callback_review`,
      supportCaseId: supportCase.id,
      accountId: supportCase.account_id,
      lane: "provider_callback_review",
      action: caseCallbacks.length ? "callback_secret_required_no_money" : "provider_callback_replay_required",
      severity: "medium",
      reason: "Provider callback proof is not verified; proof-before-release remains required.",
      status: "queued_for_review_only",
      providerCalled: false,
      moneyMovementEnabled: false
    });
  }

  if (!careChainOk(caseCareNotes)) {
    actions.push({
      id: `edge_worker_action_${supportCase.id}_care_audit_gap`,
      supportCaseId: supportCase.id,
      accountId: supportCase.account_id,
      lane: "care_audit_gap",
      action: caseCareNotes.length ? "care_note_chain_review_required" : "care_note_required_before_closeout",
      severity: caseCareNotes.length ? "medium" : "high",
      reason: caseCareNotes.length ? "Care-note chain exists but needs append-only/hash review." : "No care note is attached to this support case.",
      status: "queued_for_review_only",
      providerCalled: false,
      moneyMovementEnabled: false
    });
  }

  return actions;
}

async function rest<T>(supabaseUrl: string, serviceKey: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json");
  headers.set("apikey", serviceKey);
  headers.set("authorization", `Bearer ${serviceKey}`);
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(JSON.stringify({ path, status: response.status, body }));
  return body as T;
}

function supportCaseIdFilter(cases: SupportCase[]): string {
  const ids = cases.map(row => row.id).filter(Boolean).join(",");
  return ids ? `support_case_id=in.(${ids})` : "support_case_id=is.null";
}

function ownerAlerts(actions: WorkerAction[]): JsonObject[] {
  const grouped = new Map<string, WorkerAction[]>();
  for (const action of actions) grouped.set(action.supportCaseId, [...(grouped.get(action.supportCaseId) || []), action]);
  return [...grouped.entries()].map(([supportCaseId, rows]) => {
    const high = rows.filter(row => row.severity === "high").length;
    return {
      id: `edge_support_alert_${supportCaseId}`,
      supportCaseId,
      accountId: rows[0]?.accountId,
      severity: high ? "high" : "medium",
      actionCount: rows.length,
      highActionCount: high,
      status: "owner_alert_review_only",
      providerCalled: false,
      moneyMovementEnabled: false
    };
  }).filter(row => row.severity === "high" || row.actionCount > 1).slice(0, 60);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "authorization, apikey, content-type, x-artbook-worker-secret"
      }
    });
  }

  if (!["GET", "POST"].includes(req.method)) {
    return json(405, { error: "method_not_allowed", acceptedMethods: ["GET", "POST", "OPTIONS"] });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = supabaseSecretKey();

  if (!supabaseUrl || !serviceKey) {
    return json(503, {
      error: "support_worker_not_configured",
      status: "fail_closed",
      requiredSecrets: ["SUPABASE_URL", "SUPABASE_SECRET_KEYS.default or SUPABASE_SERVICE_ROLE_KEY"],
      providerCalled: false,
      deliveryProviderCalled: false,
      alertProviderCalled: false,
      moneyMovementEnabled: false
    });
  }

  if (suppliedServiceKey(req) !== serviceKey) {
    return json(401, {
      error: "worker_secret_required",
      status: "blocked_no_worker_run",
      acceptedHeaders: ["apikey", "authorization: Bearer <secret>", "x-artbook-worker-secret"],
      providerCalled: false,
      deliveryProviderCalled: false,
      alertProviderCalled: false,
      moneyMovementEnabled: false
    });
  }

  const generatedAt = new Date().toISOString();
  const mode = req.method === "GET" ? "plan" : "dry_run";

  try {
    const supportCases = await rest<SupportCase[]>(
      supabaseUrl,
      serviceKey,
      "artbook_support_cases?select=id,account_id,status,priority,category,subject,latest_note_digest,metadata,created_at,updated_at&status=not.in.(closed,resolved)&order=updated_at.desc&limit=100"
    );
    const filter = supportCaseIdFilter(supportCases);
    const [receipts, slaActions, callbacks, careNotes] = supportCases.length
      ? await Promise.all([
          rest<DeliveryReceipt[]>(supabaseUrl, serviceKey, `artbook_message_delivery_receipts?select=id,account_id,support_case_id,status,provider_called,message_delivered_by_provider,retry_count,created_at&${filter}`),
          rest<SlaAction[]>(supabaseUrl, serviceKey, `artbook_support_sla_actions?select=id,support_case_id,action_type,status,due_at,closeout_approved,provider_called,money_movement_enabled,created_at&${filter}`),
          rest<ProviderCallback[]>(supabaseUrl, serviceKey, `artbook_support_provider_callbacks?select=id,support_case_id,rail,signature_status,provider_called,provider_verified,money_movement_enabled,created_at&${filter}`),
          rest<CareNote[]>(supabaseUrl, serviceKey, `artbook_care_notes?select=id,support_case_id,previous_note_hash,note_hash,append_only,raw_note_material_stored,provider_called,money_movement_enabled,created_at&${filter}`)
        ])
      : [[], [], [], []] as [DeliveryReceipt[], SlaAction[], ProviderCallback[], CareNote[]];

    const actions = supportCases.flatMap(row => classifyCase(row, generatedAt, receipts, slaActions, callbacks, careNotes)).slice(0, 120);
    const alerts = ownerAlerts(actions);
    const laneCounts = Object.fromEntries(SUPPORT_WORKER_LANES.map(lane => [lane, actions.filter(row => row.lane === lane).length]));
    const run = {
      id: crypto.randomUUID(),
      status: "support_worker_edge_dry_run_review_only",
      mode,
      generatedAt,
      lanes: laneCounts,
      counts: {
        supportCases: supportCases.length,
        deliveryReceipts: receipts.length,
        slaActions: slaActions.length,
        providerCallbacks: callbacks.length,
        careNotes: careNotes.length,
        workerActions: actions.length,
        ownerAlerts: alerts.length
      },
      actions,
      ownerAlerts: alerts,
      serviceRoleRequiredInProduction: true,
      providerCalled: false,
      deliveryProviderCalled: false,
      alertProviderCalled: false,
      closeoutApproved: false,
      walletCreditEnabled: false,
      refundReleaseEnabled: false,
      payoutEnabled: false,
      founderRevenueRecognized: false,
      moneyMovementEnabled: false,
      rawProviderPayloadStored: false
    };

    if (req.method === "POST") {
      const auditRows = [...new Set(supportCases.map(row => row.account_id))].map(accountId => ({
        account_id: accountId,
        action: "support.worker.edge_dry_run",
        resource_type: "support_worker_run",
        metadata: {
          runId: run.id,
          generatedAt,
          mode,
          lanes: laneCounts,
          counts: run.counts,
          actionSample: actions.filter(row => row.accountId === accountId).slice(0, 25),
          ownerAlertSample: alerts.filter(row => row.accountId === accountId).slice(0, 10),
          providerCalled: false,
          deliveryProviderCalled: false,
          alertProviderCalled: false,
          closeoutApproved: false,
          moneyMovementEnabled: false
        }
      }));
      if (auditRows.length) {
        await rest<JsonObject[]>(supabaseUrl, serviceKey, "artbook_audit_events", {
          method: "POST",
          headers: { prefer: "return=representation" },
          body: JSON.stringify(auditRows)
        });
      }
      return json(202, { workerRun: run, auditEventsInserted: auditRows.length, ...run });
    }

    return json(200, { workerPlan: run, auditEventsInserted: 0, ...run });
  } catch (error) {
    return json(502, {
      error: "support_worker_query_failed",
      status: "fail_closed",
      details: String(error instanceof Error ? error.message : error),
      providerCalled: false,
      deliveryProviderCalled: false,
      alertProviderCalled: false,
      closeoutApproved: false,
      moneyMovementEnabled: false
    });
  }
});
