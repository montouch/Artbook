type JsonObject = Record<string, unknown>;

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(status: number, body: JsonObject): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: jsonHeaders });
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return `sha256:${hex(digest)}`;
}

async function hmacSha256(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return hex(signature);
}

function safeProvider(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const provider = parts[parts.length - 1] || "unknown";
  return provider.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "unknown";
}

function safeJsonShape(rawBody: string): JsonObject {
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { kind: Array.isArray(parsed) ? "array" : typeof parsed };
    }
    const keys = Object.keys(parsed).sort().slice(0, 32);
    return { kind: "object", keys };
  } catch {
    return { kind: "non_json", byteLength: rawBody.length };
  }
}

function firstString(body: unknown, keys: string[]): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as JsonObject;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 160);
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function parseBody(rawBody: string): JsonObject {
  try {
    const parsed = JSON.parse(rawBody);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonObject : {};
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type, x-artbook-signature, x-provider-event-id, x-idempotency-key"
      }
    });
  }

  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed", acceptedMethods: ["POST"] });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const webhookSecret = Deno.env.get("ARTBOOK_PROVIDER_WEBHOOK_SECRET") || "";
  const rawBody = await req.text();
  const provider = safeProvider(new URL(req.url).pathname);
  const payloadDigest = await sha256(rawBody);

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    return json(503, {
      error: "provider_not_configured",
      provider,
      status: "fail_closed",
      payloadDigest,
      rawPayloadStored: false,
      moneyMovementEnabled: false,
      requiredSecrets: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ARTBOOK_PROVIDER_WEBHOOK_SECRET"]
    });
  }

  const suppliedSignature = (req.headers.get("x-artbook-signature") || "").replace(/^sha256=/, "").trim().toLowerCase();
  const expectedSignature = await hmacSha256(webhookSecret, rawBody);
  const signatureValid = suppliedSignature.length > 0 && suppliedSignature === expectedSignature;
  const body = parseBody(rawBody);
  const idempotencyKey = req.headers.get("x-idempotency-key") || firstString(body, ["idempotencyKey", "eventId", "CheckoutRequestID", "MerchantRequestID", "transactionId"]);
  const externalEventId = req.headers.get("x-provider-event-id") || firstString(body, ["eventId", "transactionId", "receiptId", "MpesaReceiptNumber", "TransID"]);

  const eventRow = {
    provider,
    event_type: firstString(body, ["eventType", "type", "status"]) || "webhook",
    external_event_id: externalEventId,
    idempotency_key: idempotencyKey,
    payload_digest: payloadDigest,
    signature_status: signatureValid ? "valid" : (suppliedSignature ? "invalid" : "missing"),
    status: "replay_only_no_settlement",
    currency: firstString(body, ["currency", "Currency"]) || "KES",
    metadata: {
      source: "supabase_edge_function",
      payloadShape: safeJsonShape(rawBody),
      rawPayloadStored: false,
      moneyMovementEnabled: false,
      ownerApprovalRequired: true,
      providerFetchRequired: true,
      proofBeforeReleaseRequired: true
    }
  };

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/artbook_provider_events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      prefer: "return=representation"
    },
    body: JSON.stringify(eventRow)
  });

  const inserted = await insertResponse.json().catch(() => null);
  if (!insertResponse.ok) {
    return json(502, {
      error: "provider_event_record_failed",
      provider,
      status: "fail_closed",
      payloadDigest,
      rawPayloadStored: false,
      moneyMovementEnabled: false,
      details: inserted
    });
  }

  if (!signatureValid) {
    return json(401, {
      error: "invalid_or_missing_signature",
      provider,
      status: "replay_recorded_no_settlement",
      payloadDigest,
      rawPayloadStored: false,
      moneyMovementEnabled: false,
      event: inserted
    });
  }

  return json(202, {
    ok: true,
    provider,
    status: "replay_recorded_no_settlement",
    payloadDigest,
    rawPayloadStored: false,
    moneyMovementEnabled: false,
    ownerApprovalRequired: true,
    providerFetchRequired: true,
    proofBeforeReleaseRequired: true,
    event: inserted
  });
});
