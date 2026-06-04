import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { chromiumExecutablePath } from "./runtime-browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.env.ARTBOOK_NODE || process.execPath;
const playwrightPath = "C:\\Users\\brown\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.60.0\\node_modules\\playwright\\index.mjs";
const { chromium } = await import(pathToFileURL(playwrightPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function request(base, target) {
  const res = await fetch(base + target);
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const KEY = "artbook.mobile.demo.v5";
const html = path.join(root, "src", "artbook-mobile.html");
const port = await freePort();
const store = path.join(os.tmpdir(), `artbook-ui-sync-${Date.now()}.json`);
const server = spawn(node, ["server/src/server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), ARTBOOK_STORE: store, OPENAI_API_KEY: "", ARTBOOK_AI_LIVE: "0" },
  stdio: ["ignore", "pipe", "pipe"]
});

let stderr = "";
server.stderr.on("data", chunk => { stderr += chunk.toString(); });
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumExecutablePath(),
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", error => pageErrors.push(error.message));
page.on("console", msg => {
  const text = msg.text();
  if (msg.type() === "error" && !/Failed to load resource|ERR_TUNNEL|ERR_PROXY|ERR_INTERNET|404/.test(text)) {
    consoleErrors.push(text);
  }
});

try {
  for (let i = 0; i < 40; i++) {
    try {
      const health = await request(base, "/api/health");
      if (health.status === 200 && health.json.ok) break;
    } catch {}
    await wait(100);
  }

  await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
  await page.evaluate(key => localStorage.removeItem(key), KEY);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });

  await page.evaluate(() => {
    App.setAccount("riley_biz", { silent: true });
    App.compose();
  });
  await page.fill("#composeText", "Backend sync UI test: service slots and receipts are ready.");
  await page.evaluate(() => App.postStroke());
  await page.evaluate(() => App.remind("Backend sync UI follow-up"));
  await page.evaluate(() => {
    App.completeVerification("money", "riley_biz");
    App.closeModal();
    App.go("wallet");
  });
  await page.waitForSelector("#financePin", { state: "visible", timeout: 5000 });
  await page.fill("#financePin", "0000");
  await page.evaluate(() => {
    App.unlockFinance();
    App.confirmMoney("send", { amount: 650, person: "zuri", note: "Backend sync wallet replay" });
    App.confirmMoney("request", { amount: 325, person: "zuri", note: "Backend sync request replay" });
  });
  await page.waitForTimeout(200);

  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    state.orders = state.orders || [];
    state.bookings = state.bookings || [];
    state.fundiJobs = state.fundiJobs || [];
    state.orders.unshift({
      id: "sync_order_done",
      items: ["Backend proof conditioner"],
      buyer: "riley_biz",
      seller: "riley_artist",
      fulfillment: "Pickup",
      window: "Today 16:00-18:00",
      status: "Delivered with proof",
      stage: "delivered",
      total: 1250,
      proof: { dropoff: true, photo: true, pin: true },
      payoutHold: "Released after proof review",
      tracking: "SYNC-ORDER"
    });
    state.bookings.push({
      id: "sync_booking_done",
      service: "sv1",
      name: "Backend proof consultation",
      booker: "riley_biz",
      provider: "riley_artist",
      slot: "Today 15:30",
      price: 900,
      status: "completed",
      sequence: ["policy shown", "provider notified", "booker confirmed complete"]
    });
    state.fundiJobs.unshift({
      id: "sync_fundi_complete",
      client: "riley_biz",
      assigned: "riley_artist",
      title: "Backend escrow proof wardrobe",
      category: "Repair",
      locality: "Westlands",
      budget: 2600,
      status: "completed",
      agreement: { amount: 2600, durationDays: 4, status: "agreed", clientAgreed: true, fundiAgreed: true },
      escrow: { state: "released", amount: 2600, fundedAmount: 2600, releasedAmount: 2600, release: "Released after backend sync proof review." },
      proofRequired: ["before photo", "after photo", "customer approval"],
      proof: ["before photo", "after photo", "customer approval"],
      audience: ["riley_biz", "riley_artist"],
      events: [{ label: "Customer approved", at: "Now", actor: "riley_biz" }]
    });
    localStorage.setItem(key, JSON.stringify(state));
  }, KEY);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });
  await page.evaluate(() => App.setAccount("riley_biz", { silent: true }));

  await page.evaluate(() => App.backendSyncDesk());
  await page.waitForSelector("#backendBaseUrl", { state: "visible", timeout: 5000 });
  await page.fill("#backendBaseUrl", base);
  await page.selectOption("#backendMode", "local");
  await page.evaluate(() => App.runBackendSync());
  await page.waitForTimeout(1400);

  await page.evaluate(() => App.giveSeal("riley_artist"));
  await page.waitForSelector("#sealEvidence", { state: "visible", timeout: 5000 });
  await page.selectOption("#sealEvidence", "order:sync_order_done");
  await page.fill("#sealText", "Backend mapped order proof was completed and confirmed by the buyer.");
  await page.evaluate(() => App.saveSeal("riley_artist"));
  await page.waitForTimeout(700);

  await page.evaluate(() => App.reportSeller("riley_artist"));
  await page.waitForSelector("#reportEvidence", { state: "visible", timeout: 5000 });
  await page.selectOption("#reportEvidence", "booking:sync_booking_done");
  await page.fill("#reportText", "Backend mapped booking proof needs active trust review.");
  await page.evaluate(() => App.submitReport("riley_artist"));
  await page.waitForTimeout(700);

  await page.evaluate(() => App.reportSeller("riley_artist"));
  await page.waitForSelector("#reportEvidence", { state: "visible", timeout: 5000 });
  await page.selectOption("#reportEvidence", "order:sync_order_done");
  await page.fill("#reportText", "Backend mapped order proof now contradicts the existing Seal and should wait for moderation.");
  await page.evaluate(() => App.submitReport("riley_artist"));
  await page.waitForTimeout(700);

  await page.evaluate(() => App.reportSeller("opal_room"));
  await page.waitForSelector("#reportText", { state: "visible", timeout: 5000 });
  await page.fill("#reportText", "No shared transaction yet, so this should stay intake-only until evidence is linked.");
  await page.evaluate(() => App.submitReport("opal_room"));
  await page.waitForTimeout(700);

  await page.evaluate(() => App.trustDesk("riley_artist"));
  await page.waitForTimeout(150);
  const trustDeskText = await page.evaluate(() => document.querySelector("#modal .modal-body")?.innerText || "");

  await page.evaluate(() => App.backendSyncDesk("trust verified"));
  await page.waitForSelector("#backendBaseUrl", { state: "visible", timeout: 5000 });

  const uiState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const seal = (state.trustSeals || []).find(row => row.from === "riley_biz" && row.to === "riley_artist" && row.evidenceId === "order:sync_order_done");
    const report = (state.trustReports || []).find(row => row.from === "riley_biz" && row.to === "riley_artist" && row.evidenceId === "booking:sync_booking_done");
    const conflict = (state.trustReports || []).find(row => row.from === "riley_biz" && row.to === "riley_artist" && row.evidenceId === "order:sync_order_done" && /contradicts/.test(row.text || ""));
    const intake = (state.trustReports || []).find(row => row.from === "riley_biz" && row.to === "opal_room" && /intake-only/.test(row.text || ""));
    return {
      mode: state.backendConfig?.mode,
      healthOk: state.backendConfig?.lastHealth?.ok,
      lastSync: state.backendConfig?.lastSync || "",
      lastError: state.backendConfig?.lastError || "",
      hasAuth: Boolean(state.backendAuthByAccount?.riley_biz?.token),
      events: (state.backendEvents || []).map(row => row.label),
      syncedPostCount: Object.keys(state.backendSynced?.posts || {}).length,
      syncedFollowCount: Object.keys(state.backendSynced?.followUps || {}).length,
      syncedListingCount: Object.keys(state.backendSynced?.listings || {}).length,
      syncedWalletLedgerCount: Object.keys(state.backendSynced?.walletLedger || {}).length,
      syncedWalletRequestCount: Object.keys(state.backendSynced?.walletRequests || {}).length,
      syncedSettlementCount: Object.keys(state.backendSynced?.settlementAudits || {}).length,
      settlementExceptionCount: (state.backendSettlementExceptions?.queue || []).length,
      settlementExceptionStatus: state.backendSettlementExceptions?.status || "",
      syncedOrderCount: Object.keys(state.backendSynced?.orders || {}).length,
      syncedBookingCount: Object.keys(state.backendSynced?.bookings || {}).length,
      syncedEvidence: state.backendSynced?.evidence || {},
      sealBackendStatus: seal?.backendStatus || "",
      sealBackendEvidenceId: seal?.backendEvidenceId || "",
      reportBackendStatus: report?.backendStatus || "",
      reportBackendEvidenceId: report?.backendEvidenceId || "",
      conflictStatus: conflict?.status || "",
      conflictBackendStatus: conflict?.backendStatus || "",
      conflictBackendEvidenceId: conflict?.backendEvidenceId || "",
      intakeStatus: intake?.status || "",
      intakeBackendStatus: intake?.backendStatus || "",
      text: document.body.innerText || "",
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      modalOpacity: getComputedStyle(document.querySelector("#modal.on .sheet")).opacity,
    };
  }, KEY);

  assert(uiState.mode === "local", "backend mode did not persist as local");
  assert(uiState.healthOk === true, "backend health was not saved in UI state");
  assert(uiState.hasAuth, "backend auth token was not saved for the current account");
  assert(uiState.lastSync && !uiState.lastError, `backend sync ended with error: ${uiState.lastError}`);
  assert(uiState.syncedPostCount >= 1, "latest post was not marked synced");
  assert(uiState.syncedFollowCount >= 1, "follow-up was not marked synced");
  assert(uiState.syncedListingCount >= 1, "business listing was not marked synced");
  assert(uiState.syncedWalletLedgerCount >= 2, "wallet ledger rows were not marked synced");
  assert(uiState.syncedWalletRequestCount >= 1, "wallet request row was not marked synced");
  assert(uiState.syncedSettlementCount >= 1, "settlement audit rows were not marked synced");
  assert(uiState.settlementExceptionCount >= 1 && uiState.settlementExceptionStatus === "review", "settlement reconciliation exceptions were not fetched into UI state");
  assert(uiState.syncedOrderCount >= 1, "completed order evidence was not marked synced");
  assert(uiState.syncedBookingCount >= 1, "completed booking evidence was not marked synced");
  assert(/^order:order_/.test(uiState.syncedEvidence["order:sync_order_done"] || ""), "order evidence id was not mapped to backend evidence");
  assert(/^booking:booking_/.test(uiState.syncedEvidence["booking:sync_booking_done"] || ""), "booking evidence id was not mapped to backend evidence");
  assert(uiState.sealBackendStatus === "verified" && /^order:order_/.test(uiState.sealBackendEvidenceId), "local Seal did not use mapped backend evidence");
  assert(uiState.reportBackendStatus === "active_verified" && /^booking:booking_/.test(uiState.reportBackendEvidenceId), "local trust report did not use mapped backend evidence");
  assert(uiState.conflictStatus === "conflict_review" && uiState.conflictBackendStatus === "moderation_conflict_review" && /^order:order_/.test(uiState.conflictBackendEvidenceId), "local conflict report did not preserve backend moderation status");
  assert(uiState.intakeStatus === "intake" && uiState.intakeBackendStatus === "intake_synced", "intake-only trust report was not synced as non-scoring backend intake");
  assert(trustDeskText.includes("Moderation review") && trustDeskText.includes("Seal conflict review") && /not scoring yet/i.test(trustDeskText), `Trust desk did not surface non-scoring moderation review: ${trustDeskText.slice(0, 2000)}`);
  assert(uiState.events.includes("Wallet ledger replayed"), "wallet replay event missing");
  assert(uiState.events.includes("Settlement audit replayed"), "settlement audit event missing");
  assert(uiState.events.includes("Settlement exceptions fetched"), "settlement exception fetch event missing");
  assert(uiState.events.includes("Work evidence synced"), "work evidence sync event missing");
  assert(uiState.events.includes("Seal verified by backend"), "backend Seal verification event missing");
  assert(uiState.events.includes("Trust report verified by backend"), "backend trust report verification event missing");
  assert(uiState.events.includes("Trust report sent to moderation"), "backend trust moderation event missing");
  assert(uiState.events.includes("Report intake synced"), "backend trust intake event missing");
  assert(uiState.events.includes("Provider boundary checked"), "provider fail-closed event missing");
  assert(uiState.text.includes("Backend audit trail") && uiState.text.includes("Settlement audit") && uiState.text.includes("Settlement exception review") && uiState.text.includes("Release pending") && uiState.text.includes("provider reconciliation") && uiState.text.includes("Work evidence") && uiState.text.includes("Trust moderation") && uiState.text.includes("Restricted media safety") && uiState.text.includes("Connected"), "backend sync modal did not show connected audit state");
  assert(uiState.overflow <= 2, "backend sync modal introduced horizontal overflow");
  assert(uiState.modalOpacity === "1", "backend sync modal is not opaque");

  await page.evaluate(() => {
    App.setAccount("riley_artist", { silent: true });
    App.reportAdultLeak("mv13");
  });
  await page.waitForTimeout(900);
  const restrictedReportSynced = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const leak = (state.adultLeakReports || []).find(row => row.vault === "mv13" && row.viewer === "riley_artist");
    const queue = state.backendRestrictedMedia?.queue || [];
    return {
      leakStatus: leak?.backendStatus || "",
      backendReportId: leak?.backendReportId || "",
      rawMediaStored: leak?.rawMediaStored,
      contentAction: leak?.contentAction || "",
      queueCount: queue.length,
      queueRawStored: queue.some(row => row.rawMediaStored === true),
      events: (state.backendEvents || []).map(event => event.label),
      text: document.body.innerText || ""
    };
  }, KEY);
  assert(restrictedReportSynced.leakStatus === "synced" && /^restricted_media_report_/.test(restrictedReportSynced.backendReportId), "adult leak report did not sync to backend restricted-media queue");
  assert(restrictedReportSynced.rawMediaStored === false && restrictedReportSynced.contentAction === "review_hold_recommended", "synced restricted-media report did not preserve metadata-only review hold");
  assert(restrictedReportSynced.queueCount >= 1 && restrictedReportSynced.queueRawStored === false, "restricted-media queue did not cache metadata-only backend row");
  assert(restrictedReportSynced.events.includes("Restricted media report synced"), "restricted-media sync did not write backend audit event");

  await page.evaluate(() => App.fetchBackendRestrictedMediaQueue());
  await page.waitForTimeout(160);
  const blockedRestrictedQueue = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      status: state.backendRestrictedMedia?.status || "",
      lastError: state.backendRestrictedMedia?.lastError || "",
      events: (state.backendEvents || []).map(event => event.label),
      text: document.body.innerText || ""
    };
  }, KEY);
  assert(blockedRestrictedQueue.status === "blocked" && blockedRestrictedQueue.lastError === "moderator_role_required", "normal account was not blocked from restricted-media safety queue");
  assert(blockedRestrictedQueue.events.includes("Restricted media queue fetch blocked") && blockedRestrictedQueue.text.includes("Safety queue locked"), "blocked restricted-media queue did not show role-gated state");

  await page.evaluate(() => App.setAccount("artbook_ops", { silent: true }));
  await page.waitForTimeout(120);
  await page.evaluate(() => App.pilotModerationDesk());
  await page.waitForTimeout(120);
  await page.evaluate(() => App.fetchBackendRestrictedMediaQueue());
  await page.waitForTimeout(700);
  const fetchedRestrictedQueue = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const queue = state.backendRestrictedMedia?.queue || [];
    return {
      status: state.backendRestrictedMedia?.status || "",
      lastError: state.backendRestrictedMedia?.lastError || "",
      queueCount: queue.length,
      reportId: queue[0]?.id || "",
      rawMediaStored: queue[0]?.rawMediaStored,
      contentAction: queue[0]?.contentAction || "",
      events: (state.backendEvents || []).map(event => event.label),
      text: document.body.innerText || ""
    };
  }, KEY);
  assert(fetchedRestrictedQueue.status === "fetched" && !fetchedRestrictedQueue.lastError, `restricted-media queue fetch failed: ${fetchedRestrictedQueue.lastError}`);
  assert(fetchedRestrictedQueue.queueCount >= 1 && /^restricted_media_report_/.test(fetchedRestrictedQueue.reportId), "restricted-media queue did not include backend report");
  assert(fetchedRestrictedQueue.rawMediaStored === false && fetchedRestrictedQueue.contentAction === "review_hold_recommended", "restricted-media queue row did not keep metadata-only review hold");
  assert(fetchedRestrictedQueue.events.includes("Restricted media queue fetched") && fetchedRestrictedQueue.text.includes("Restricted media safety") && fetchedRestrictedQueue.text.includes("metadata only"), "restricted-media queue fetch did not update visible safety lane");

  await page.evaluate(id => App.pilotRestrictedMediaBackendDetail(id), fetchedRestrictedQueue.reportId);
  await page.waitForTimeout(120);
  const restrictedDetailText = await page.evaluate(() => document.body.innerText || "");
  assert(restrictedDetailText.includes("Restricted media report") && restrictedDetailText.includes("Restricted-media safety resolver") && restrictedDetailText.includes("raw media stored: no") && restrictedDetailText.includes("Provider boundary"), "restricted-media detail did not render safety resolver context");
  await page.fill("#backendRestrictedMediaNote", "Review Ops recommends a temporary hold while consent and watermark evidence are checked.");
  await page.evaluate(id => App.resolveBackendRestrictedMediaRow(id, "temporary_hold"), fetchedRestrictedQueue.reportId);
  await page.waitForTimeout(700);
  const resolvedRestricted = await page.evaluate(({ key, id }) => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const backendRow = (state.backendRestrictedMedia?.queue || []).find(row => row.id === id);
    const localLeak = (state.adultLeakReports || []).find(row => row.backendReportId === id);
    return {
      status: state.backendRestrictedMedia?.status || "",
      lastError: state.backendRestrictedMedia?.lastError || "",
      backendStatus: backendRow?.status || "",
      backendDecision: backendRow?.moderationDecision || "",
      backendProviderAction: backendRow?.providerAction || "",
      backendRawStored: backendRow?.rawMediaStored,
      localStatus: localLeak?.status || "",
      localProviderAction: localLeak?.providerAction || "",
      localRawStored: localLeak?.rawMediaStored,
      events: (state.backendEvents || []).map(event => event.label),
      notices: (state.notifications || []).map(note => note.title),
      text: document.body.innerText || ""
    };
  }, { key: KEY, id: fetchedRestrictedQueue.reportId });
  assert(resolvedRestricted.status === "resolved" && !resolvedRestricted.lastError, `restricted-media resolver failed: ${resolvedRestricted.lastError}`);
  assert(resolvedRestricted.backendStatus === "safety_hold" && resolvedRestricted.backendDecision === "temporary_hold_recommended", "restricted-media backend row did not mirror temporary hold decision");
  assert(resolvedRestricted.backendProviderAction === "not_called_provider_fail_closed" && resolvedRestricted.backendRawStored === false, "restricted-media resolver did not keep provider/raw-media guard");
  assert(resolvedRestricted.localStatus === "safety_hold" && resolvedRestricted.localProviderAction === "not_called_provider_fail_closed" && resolvedRestricted.localRawStored === false, "local restricted-media report did not mirror backend safety resolution");
  assert(resolvedRestricted.events.includes("Restricted media resolver completed") && resolvedRestricted.notices.includes("Restricted media safety updated"), "restricted-media resolver did not write local audit trail and notice");
  await page.evaluate(() => App.setAccount("riley_biz", { silent: true }));
  await page.waitForTimeout(100);

  await page.evaluate(() => App.fetchBackendAiContract());
  await page.waitForTimeout(700);
  const aiContractState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const preview = state.backendAiContract?.contextPreview || state.backendAiContract?.brief?.contextPreview || {};
    const brief = state.backendAiContract?.brief || {};
    return {
      status: state.backendAiContract?.status || "",
      lastError: state.backendAiContract?.lastError || "",
      total: preview.recordCounts?.total || 0,
      blockedIds: (preview.blockedActions || brief.guardrails?.blockedActionIds || []).map(row => typeof row === "string" ? row : row.id),
      allowedIds: (preview.allowedActions || brief.guardrails?.allowedActionIds || []).map(row => typeof row === "string" ? row : row.id),
      redaction: preview.redaction?.fieldsOmitted || [],
      settlementStatus: preview.settlementStatus || "",
      moneyMovementEnabled: preview.moneyMovementEnabled,
      sensitiveActionsEnabled: preview.sensitiveActionsEnabled,
      promptShieldPresent: Boolean(preview.promptInjectionDefense),
      promptShieldDetected: preview.promptInjectionDefense?.detected,
      modelGatewayStatus: preview.modelGateway?.status || "",
      modelGatewayLive: preview.modelGateway?.liveCallsEnabled,
      modelGatewayRejects: preview.modelGateway?.outputPolicy?.rejectSensitiveActions || [],
      events: (state.backendEvents || []).map(row => row.label),
      text: document.body.innerText || "",
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
  }, KEY);
  assert(aiContractState.status === "fetched" && !aiContractState.lastError, `AI contract fetch failed: ${aiContractState.lastError}`);
  assert(aiContractState.total >= 1 && aiContractState.settlementStatus === "ai_context_preview_only_no_sensitive_actions", "AI contract did not store scoped preview counts and status");
  assert(aiContractState.moneyMovementEnabled === false && aiContractState.sensitiveActionsEnabled === false, "AI contract should not enable sensitive actions in UI state");
  assert(aiContractState.blockedIds.includes("move_money") && aiContractState.blockedIds.includes("approve_identity") && aiContractState.blockedIds.includes("grant_provenance_seal") && aiContractState.blockedIds.includes("settle_refund_or_payout"), "AI contract did not persist blocked sensitive actions");
  assert(aiContractState.allowedIds.includes("summarize_visible_records") && aiContractState.allowedIds.includes("draft_message") && !aiContractState.allowedIds.includes("move_money"), "AI contract allowed actions were not limited to safe assistant work");
  assert(aiContractState.redaction.includes("phone numbers") && aiContractState.redaction.includes("government ID/KYC fields"), "AI contract redaction policy did not persist");
  assert(aiContractState.promptShieldPresent && aiContractState.promptShieldDetected === false, "AI contract prompt shield should persist even without injected text");
  assert(aiContractState.modelGatewayStatus === "model_gateway_preview_only_no_external_call" && aiContractState.modelGatewayLive === false && aiContractState.modelGatewayRejects.includes("move_money"), "AI contract model gateway did not stay preview-only and sensitive-action blocked");
  assert(aiContractState.events.includes("AI context contract checked"), "AI contract audit event missing");
  assert(aiContractState.text.includes("AI context safety") && aiContractState.text.includes("Backend AI contract") && aiContractState.text.includes("Blocked actions") && aiContractState.text.includes("Prompt shield") && aiContractState.text.includes("Model gateway") && aiContractState.text.includes("Money: blocked"), "AI contract card did not render core safety language");
  assert(aiContractState.overflow <= 2, "AI contract panel introduced horizontal overflow");

  await page.evaluate(() => App.setBackendAuditFilter("settlement"));
  await page.waitForTimeout(80);
  const settlementAuditFilterState = await page.evaluate(() => ({
    text: document.querySelector("#backendAuditTrailList")?.innerText || "",
    count: document.querySelector("#backendAuditTrailCount")?.innerText || "",
    categoryLegend: document.querySelector("#backendAuditFilterLegend")?.innerText || "",
    filters: document.querySelector("#backendAuditTrailFilters")?.innerText || "",
    tagTexts: Array.from(document.querySelectorAll("#backendAuditTrailList .backend-event-tags")).map(row => row.innerText.replace(/\s+/g, " ").trim()),
    active: document.querySelector("#backendAuditTrailFilters .chip.on")?.innerText || ""
  }));
  assert(settlementAuditFilterState.active.includes("Settlement") && settlementAuditFilterState.text.includes("Settlement audit replayed") && settlementAuditFilterState.text.includes("Settlement exceptions") && !settlementAuditFilterState.text.includes("Trust report verified by backend") && /^\d+\/\d+$/.test(settlementAuditFilterState.count), "settlement audit filter did not isolate settlement events");
  assert(settlementAuditFilterState.filters.includes("All") && settlementAuditFilterState.filters.includes("Handoff") && settlementAuditFilterState.filters.includes("Settlement") && settlementAuditFilterState.filters.includes("Trust") && settlementAuditFilterState.filters.includes("Other"), "backend audit filters did not render all lanes");
  assert(/All\s+\d+/.test(settlementAuditFilterState.filters) && /Handoff\s+0/.test(settlementAuditFilterState.filters) && /Settlement\s+[1-9]/.test(settlementAuditFilterState.filters) && /Trust\s+[1-9]/.test(settlementAuditFilterState.filters) && /Other\s+[1-9]/.test(settlementAuditFilterState.filters), "backend audit filter chips did not preview lane counts");
  assert(settlementAuditFilterState.categoryLegend.includes("Current account only") && settlementAuditFilterState.categoryLegend.includes("Handoff: snapshots, packets") && settlementAuditFilterState.categoryLegend.includes("Settlement: payout, refund holds") && settlementAuditFilterState.categoryLegend.includes("Trust: seals, reports, moderation") && settlementAuditFilterState.categoryLegend.includes("Other: provider, wallet, work evidence") && settlementAuditFilterState.categoryLegend.includes("Display-only filters") && !/Handoff\s+0/.test(settlementAuditFilterState.categoryLegend) && !/Other\s+\d+/.test(settlementAuditFilterState.categoryLegend), "backend audit legend did not explain specialized lane scope and display-only safety");
  assert(settlementAuditFilterState.tagTexts.some(text => text.includes("audit only") && text.includes("provider-unverified") && text.includes("non-spendable") && text.includes("no settlement")), "settlement audit row did not render compact audit/provider/spendable guard tags");
  assert(settlementAuditFilterState.tagTexts.some(text => text.includes("provider-unverified") && text.includes("non-spendable") && text.includes("no settlement")), "settlement exception row did not render compact reconciliation guard tags");

  await page.evaluate(() => App.setBackendAuditFilter("trust"));
  await page.waitForTimeout(80);
  const trustAuditFilterState = await page.evaluate(() => ({
    text: document.querySelector("#backendAuditTrailList")?.innerText || "",
    count: document.querySelector("#backendAuditTrailCount")?.innerText || "",
    tagTexts: Array.from(document.querySelectorAll("#backendAuditTrailList .backend-event-tags")).map(row => row.innerText.replace(/\s+/g, " ").trim()),
    active: document.querySelector("#backendAuditTrailFilters .chip.on")?.innerText || ""
  }));
  assert(trustAuditFilterState.active.includes("Trust") && trustAuditFilterState.text.includes("Trust report verified by backend") && trustAuditFilterState.text.includes("Seal verified by backend") && trustAuditFilterState.text.includes("Trust report sent to moderation") && trustAuditFilterState.text.includes("Report intake synced") && !trustAuditFilterState.text.includes("Settlement audit replayed") && /^\d+\/\d+$/.test(trustAuditFilterState.count), "trust audit filter did not isolate trust events");
  assert(trustAuditFilterState.tagTexts.some(text => text.includes("seal verified") && text.includes("server evidence")), "Seal verification Trust row did not render compact evidence tags");
  assert(trustAuditFilterState.tagTexts.some(text => text.includes("evidence-backed") && text.includes("active report") && text.includes("server evidence")), "evidence-backed Trust report row did not render compact active report tags");
  assert(trustAuditFilterState.tagTexts.some(text => text.includes("moderation review") && text.includes("non-scoring")), "moderation Trust row did not render compact non-scoring review tags");
  assert(trustAuditFilterState.tagTexts.some(text => text.includes("intake only") && text.includes("non-scoring")), "intake Trust row did not render compact intake/non-scoring tags");

  await page.evaluate(() => App.setBackendAuditFilter("other"));
  await page.waitForTimeout(80);
  const otherAuditFilterState = await page.evaluate(() => ({
    text: document.querySelector("#backendAuditTrailList")?.innerText || "",
    count: document.querySelector("#backendAuditTrailCount")?.innerText || "",
    filters: document.querySelector("#backendAuditTrailFilters")?.innerText || "",
    summary: document.querySelector("#backendAuditTrailSummary")?.innerText || "",
    tagTexts: Array.from(document.querySelectorAll("#backendAuditTrailList .backend-event-tags")).map(row => row.innerText.replace(/\s+/g, " ").trim()),
    active: document.querySelector("#backendAuditTrailFilters .chip.on")?.innerText || ""
  }));
  assert(otherAuditFilterState.active.includes("Other") && otherAuditFilterState.text.includes("Wallet ledger replayed") && otherAuditFilterState.text.includes("Work evidence synced") && otherAuditFilterState.text.includes("Provider boundary checked") && otherAuditFilterState.text.includes("AI context contract checked") && !otherAuditFilterState.text.includes("Settlement audit replayed") && !otherAuditFilterState.text.includes("Trust report verified by backend") && /^\d+\/\d+$/.test(otherAuditFilterState.count), "other audit filter did not isolate provider, wallet, AI and work-evidence rows");
  assert(/Other\s+[1-9]/.test(otherAuditFilterState.filters) && otherAuditFilterState.summary.includes("other"), "other audit filter chip or summary did not preview uncategorized backend rows");
  assert(otherAuditFilterState.tagTexts.some(text => text.includes("ai context") && text.includes("redacted") && text.includes("no protected action")), "AI contract Other row did not render compact redaction/protected-action tags");
  assert(otherAuditFilterState.tagTexts.some(text => text.includes("provider check") && text.includes("fail closed") && text.includes("no money move")), "provider boundary Other row did not render compact provider/no-money tags");
  assert(otherAuditFilterState.tagTexts.some(text => text.includes("wallet replay") && text.includes("client replay") && text.includes("not settled")), "wallet replay Other row did not render compact replay tags");
  assert(otherAuditFilterState.tagTexts.some(text => text.includes("work evidence") && text.includes("server proof") && text.includes("trace only")), "work evidence Other row did not render compact proof tags");

  await page.evaluate(() => App.setBackendAuditFilter("handoff"));
  await page.waitForTimeout(80);
  const emptyHandoffAuditFilterState = await page.evaluate(() => ({
    text: document.querySelector("#backendAuditTrailList")?.innerText || "",
    count: document.querySelector("#backendAuditTrailCount")?.innerText || "",
    categoryLegend: document.querySelector("#backendAuditFilterLegend")?.innerText || "",
    filters: document.querySelector("#backendAuditTrailFilters")?.innerText || "",
    summary: document.querySelector("#backendAuditTrailSummary")?.innerText || "",
    empty: document.querySelector("#backendAuditTrailEmptyState")?.innerText || "",
    active: document.querySelector("#backendAuditTrailFilters .chip.on")?.innerText || ""
  }));
  assert(emptyHandoffAuditFilterState.active.includes("Handoff") && /^0\/\d+$/.test(emptyHandoffAuditFilterState.count) && emptyHandoffAuditFilterState.summary.includes("No handoff rows yet") && emptyHandoffAuditFilterState.summary.includes("available under All"), "empty handoff audit filter did not explain filtered count versus full trail");
  assert(emptyHandoffAuditFilterState.empty.includes("No handoff events") && emptyHandoffAuditFilterState.empty.includes("Switch to All") && emptyHandoffAuditFilterState.empty.includes("no backend state or money movement"), "empty handoff audit state did not explain how to recover or preserve backend/payment boundaries");
  assert(emptyHandoffAuditFilterState.categoryLegend.includes("Current account only") && emptyHandoffAuditFilterState.categoryLegend.includes("Handoff: snapshots, packets") && emptyHandoffAuditFilterState.categoryLegend.includes("Settlement: payout, refund holds") && emptyHandoffAuditFilterState.categoryLegend.includes("Trust: seals, reports, moderation") && emptyHandoffAuditFilterState.categoryLegend.includes("Other: provider, wallet, work evidence") && emptyHandoffAuditFilterState.categoryLegend.includes("Display-only filters"), "empty handoff audit filter did not keep scoped lane legend context visible");
  assert(/Handoff\s+0/.test(emptyHandoffAuditFilterState.filters), "empty handoff audit chip did not show its zero count before switching");
  assert(!emptyHandoffAuditFilterState.text.includes("Settlement audit replayed") && !emptyHandoffAuditFilterState.text.includes("Trust report verified by backend"), "empty handoff audit filter leaked settlement or trust rows");
  await page.evaluate(() => App.setBackendAuditFilter("all"));
  await page.waitForTimeout(80);

  await page.evaluate(() => {
    App.setAccount("artbook_ops", { silent: true });
    App.backendSyncDesk("provider readiness");
  });
  await page.waitForSelector("#backendBaseUrl", { state: "visible", timeout: 5000 });
  await page.evaluate(() => App.fetchBackendProviderReadiness());
  await page.waitForTimeout(700);
  const providerReadinessState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const readiness = state.backendProviderReadiness?.readiness || {};
    const preview = document.querySelector("#backendHandoffExportPreview");
    const packetArea = document.querySelector("#releaseEvidencePacket");
    const packetSummary = document.querySelector("#releaseEvidencePacketSummary");
    const historySummary = document.querySelector("#releaseEvidenceHistorySummary");
    const historyPacketRows = document.querySelector("#releaseEvidencePacketHistory");
    const historyDiffDetails = document.querySelector("#releaseEvidenceDiffDetails");
    const snapshotArea = document.querySelector("#providerReadinessSnapshot");
    const launchGate = document.querySelector("[data-kenya-pilot-launch-gate]");
    return {
      account: state.account,
      status: state.backendProviderReadiness?.status || "",
      lastError: state.backendProviderReadiness?.lastError || "",
      settlementStatus: readiness.settlementStatus || "",
      moneyMovementEnabled: readiness.moneyMovementEnabled,
      providerVerified: readiness.providerVerified,
      spendable: readiness.spendable,
      groupIds: (readiness.secretGroups || []).map(row => row.id),
      secretNames: (readiness.secretGroups || []).flatMap(row => row.requiredSecrets || []),
      secretValueLeaked: (readiness.secretGroups || []).some(row => (row.secrets || []).some(secret => Object.prototype.hasOwnProperty.call(secret, "value"))),
      rawReady: readiness.rawBodyReadiness?.ready,
      replayReady: readiness.replayStoreReadiness?.ready,
      replayDeliveryEventCount: readiness.replayStoreReadiness?.deliveryProviderEventCount,
      runtimeStatus: readiness.runtimeDeploymentReadiness?.status || "",
      runtimeMoney: readiness.runtimeDeploymentReadiness?.moneyMovementEnabled,
      runtimeDeploy: readiness.runtimeDeploymentReadiness?.deploymentEnabled,
      runtimeCounts: readiness.runtimeDeploymentReadiness?.counts || {},
      runtimeText: document.querySelector("[data-runtime-deployment-summary]")?.innerText || "",
      runtimePacketText: document.querySelector("#runtimeDeploymentPacket")?.value || "",
      runtimeBackendDeploymentPacketText: document.querySelector("#backendDeploymentEvidencePacket")?.value || "",
      runtimeBackendDeploymentPacketStateText: readiness.runtimeDeploymentReadiness?.backendDeploymentEvidencePacket?.text || "",
      runtimeEnvGroups: Array.from(document.querySelectorAll("[data-runtime-env-group]")).map(row => ({
        id: row.getAttribute("data-runtime-env-group") || "",
        status: row.getAttribute("data-runtime-env-status") || "",
        text: row.innerText || ""
      })),
      runtimeSandboxCallbacks: Array.from(document.querySelectorAll("[data-runtime-sandbox-callback]")).map(row => ({
        id: row.getAttribute("data-runtime-sandbox-callback") || "",
        status: row.getAttribute("data-runtime-sandbox-status") || "",
        text: row.innerText || ""
      })),
      runtimeRunbookSteps: Array.from(document.querySelectorAll("[data-runtime-runbook-step]")).map(row => ({
        id: row.getAttribute("data-runtime-runbook-step") || "",
        status: row.getAttribute("data-runtime-runbook-status") || "",
        text: row.innerText || ""
      })),
      runtimeHostingChecks: Array.from(document.querySelectorAll("[data-runtime-hosting-check]")).map(row => ({
        id: row.getAttribute("data-runtime-hosting-check") || "",
        status: row.getAttribute("data-runtime-hosting-status") || "",
        text: row.innerText || ""
      })),
      runtimeFixtureExecutions: Array.from(document.querySelectorAll("[data-runtime-fixture-execution]")).map(row => ({
        id: row.getAttribute("data-runtime-fixture-execution") || "",
        status: row.getAttribute("data-runtime-fixture-status") || "",
        text: row.innerText || ""
      })),
      runtimeFixtureCaptures: Array.from(document.querySelectorAll("[data-runtime-fixture-capture]")).map(row => ({
        id: row.getAttribute("data-runtime-fixture-capture") || "",
        status: row.getAttribute("data-runtime-fixture-capture-status") || "",
        text: row.innerText || ""
      })),
      runtimeBackendDeploymentEvidence: Array.from(document.querySelectorAll("[data-runtime-backend-deployment-evidence]")).map(row => ({
        id: row.getAttribute("data-runtime-backend-deployment-evidence") || "",
        status: row.getAttribute("data-runtime-backend-deployment-status") || "",
        text: row.innerText || ""
      })),
      backendDeploymentProofSummaryText: document.querySelector("[data-backend-deployment-proof-summary]")?.innerText || "",
      backendDeploymentProofOptionCount: document.querySelectorAll("#backendDeploymentProofLane option").length,
      backendDeploymentProofPacketText: document.querySelector("#backendDeploymentProofPacket")?.value || "",
      backendDeploymentProofNotes: Array.from(document.querySelectorAll("[data-backend-deployment-proof-note]")).map(row => ({
        id: row.getAttribute("data-backend-deployment-proof-note") || "",
        lane: row.getAttribute("data-backend-deployment-proof-lane") || "",
        backend: row.getAttribute("data-backend-deployment-proof-backend") || "",
        text: row.innerText || ""
      })),
      backendDeploymentProofStateCount: (state.backendDeploymentProofNotes || []).length,
      backendDeploymentServerSummary: readiness.productionDeploymentEvidenceNoteSummary || {},
      backendDeploymentServerRows: readiness.productionDeploymentEvidenceNoteSummary?.rows || [],
      settlementStateMachineStatus: readiness.settlementReconciliationStateMachine?.settlementStatus || "",
      settlementStateMachineMoney: readiness.settlementReconciliationStateMachine?.moneyMovementEnabled,
      settlementStateMachineCounts: readiness.settlementReconciliationStateMachine?.counts || {},
      settlementStateMachineText: document.querySelector("[data-settlement-state-machine-summary]")?.innerText || "",
      settlementStateMachinePacketText: document.querySelector("#settlementStateMachinePacket")?.value || "",
      settlementStateMachineStates: Array.from(document.querySelectorAll("[data-settlement-state-machine]")).map(row => ({
        id: row.getAttribute("data-settlement-state-machine") || "",
        status: row.getAttribute("data-settlement-state-status") || "",
        text: row.innerText || ""
      })),
      deliveryStatus: readiness.deliveryProviderReadiness?.status || "",
      deliveryRealDispatchEnabled: readiness.deliveryProviderReadiness?.realDispatchEnabled,
      deliveryPayoutEnabled: readiness.deliveryProviderReadiness?.payoutEnabled,
      deliveryWebhookReplayReady: readiness.deliveryProviderReadiness?.webhookReplayReady,
      snapshotStatus: readiness.exportSnapshot?.settlementStatus || "",
      snapshotMoney: readiness.exportSnapshot?.moneyMovementEnabled,
      snapshotText: document.querySelector("#providerReadinessSnapshot")?.value || "",
      evidenceStatus: readiness.releaseEvidencePacket?.settlementStatus || "",
      evidenceMoney: readiness.releaseEvidencePacket?.moneyMovementEnabled,
      evidenceApkHash: readiness.releaseEvidencePacket?.apk?.sha256 || "",
      evidenceText: document.querySelector("#releaseEvidencePacket")?.value || "",
      evidenceHistoryCount: (state.backendReleaseEvidenceHistory || []).length,
      evidenceHistoryHash: state.backendReleaseEvidenceHistory?.[0]?.apkSha || "",
      evidenceHistoryChecked: state.backendReleaseEvidenceHistory?.[0]?.checklistChecked,
      evidenceHistoryMoney: state.backendReleaseEvidenceHistory?.[0]?.moneyMovementEnabled,
      evidenceSummaryText: Array.from(document.querySelectorAll(".backend-sync-row")).find(row => row.innerText.includes("Evidence export"))?.innerText || "",
      packetSummaryText: packetSummary?.innerText || "",
      packetSummaryBeforeTextArea: !!(packetSummary && packetArea && (packetSummary.compareDocumentPosition(packetArea) & Node.DOCUMENT_POSITION_FOLLOWING)),
      evidenceHistorySummaryText: historySummary?.innerText || "",
      evidenceHistoryDiffText: historyDiffDetails?.textContent || "",
      evidenceHistoryDiffCollapsed: historyDiffDetails ? !historyDiffDetails.open : false,
      evidenceHistoryPacketBeforeDiff: !!(historyPacketRows && historyDiffDetails && (historyPacketRows.compareDocumentPosition(historyDiffDetails) & Node.DOCUMENT_POSITION_FOLLOWING)),
      handoffPreviewText: preview?.innerText || "",
      handoffPreviewBeforePacket: !!(preview && packetArea && (preview.compareDocumentPosition(packetArea) & Node.DOCUMENT_POSITION_FOLLOWING)),
      handoffPreviewBeforeSnapshot: !!(preview && snapshotArea && (preview.compareDocumentPosition(snapshotArea) & Node.DOCUMENT_POSITION_FOLLOWING)),
      androidReleaseText: document.querySelector("[data-android-release-handoff]")?.innerText || "",
      androidReleasePacketText: document.querySelector("#androidReleaseHandoffPacket")?.value || "",
      androidReleaseLanes: Array.from(document.querySelectorAll("[data-android-release-lane]")).map(row => ({
        id: row.getAttribute("data-android-release-lane") || "",
        status: row.getAttribute("data-android-release-status") || "",
        text: row.innerText || ""
      })),
      playStoreSafetyText: document.querySelector("[data-play-store-safety-handoff]")?.innerText || "",
      playStoreSafetyPacketText: document.querySelector("#playStoreSafetyPacket")?.value || "",
      playStoreSafetyLanes: Array.from(document.querySelectorAll("[data-play-store-safety-lane]")).map(row => ({
        id: row.getAttribute("data-play-store-safety-lane") || "",
        status: row.getAttribute("data-play-store-safety-status") || "",
        text: row.innerText || ""
      })),
      playBillingText: document.querySelector("[data-play-billing-handoff]")?.innerText || "",
      playBillingPacketText: document.querySelector("#playBillingHandoffPacket")?.value || "",
      playBillingLanes: Array.from(document.querySelectorAll("[data-play-billing-lane]")).map(row => ({
        id: row.getAttribute("data-play-billing-lane") || "",
        status: row.getAttribute("data-play-billing-status") || "",
        text: row.innerText || ""
      })),
      providerBoundaryStatus: readiness.providerPaymentBoundaryReadiness?.settlementStatus || "",
      providerBoundaryMoney: readiness.providerPaymentBoundaryReadiness?.moneyMovementEnabled,
      providerBoundaryCounts: readiness.providerPaymentBoundaryReadiness?.counts || {},
      providerBoundaryRails: (readiness.providerPaymentBoundaryReadiness?.rails || []).map(row => row.id),
      providerBoundaryRules: (readiness.providerPaymentBoundaryReadiness?.boundaryRules || []).map(row => row.id),
      founderFinanceStatus: readiness.founderFinanceExportReadiness?.settlementStatus || "",
      founderFinanceMoney: readiness.founderFinanceExportReadiness?.moneyMovementEnabled,
      founderFinanceRecognized: readiness.founderFinanceExportReadiness?.totals?.recognizedFounderRevenue,
      founderFinanceEstimated: readiness.founderFinanceExportReadiness?.totals?.estimatedFounderRevenue,
      founderFinanceBlocked: readiness.founderFinanceExportReadiness?.totals?.blockedFounderRevenue,
      founderFinanceText: document.querySelector("[data-founder-finance-export-summary]")?.innerText || "",
      founderFinanceJournalStatus: readiness.founderFinanceExportReadiness?.journalPreview?.status || "",
      founderFinanceJournalBalanced: readiness.founderFinanceExportReadiness?.journalPreview?.balanced,
      founderFinanceJournalEntries: readiness.founderFinanceExportReadiness?.journalPreview?.journalEntryCount,
      founderFinanceJournalPosted: readiness.founderFinanceExportReadiness?.journalPreview?.postedJournalCount,
      founderFinanceJournalRevenue: readiness.founderFinanceExportReadiness?.journalPreview?.recognizedRevenueJournaled,
      founderFinanceJournalText: document.querySelector("[data-founder-finance-journal-summary]")?.innerText || "",
      founderFinanceRefundStatus: readiness.founderFinanceExportReadiness?.refundChargebackExport?.settlementStatus || "",
      founderFinanceRefundCases: readiness.founderFinanceExportReadiness?.refundChargebackExport?.counts?.caseCount,
      founderFinanceRefundWebhookRisk: readiness.founderFinanceExportReadiness?.refundChargebackExport?.counts?.webhookRiskEventCount,
      founderFinanceRefundGrossHold: readiness.founderFinanceExportReadiness?.refundChargebackExport?.totals?.grossHoldAmount,
      founderFinanceRefundRevenueAtRisk: readiness.founderFinanceExportReadiness?.refundChargebackExport?.totals?.estimatedFounderRevenueAtRisk,
      founderFinanceRefundText: document.querySelector("[data-founder-finance-refund-chargeback-summary]")?.innerText || "",
      founderFinanceLedgerStatus: readiness.founderFinanceExportReadiness?.ledgerPartnerHandoff?.settlementStatus || "",
      founderFinanceLedgerMoney: readiness.founderFinanceExportReadiness?.ledgerPartnerHandoff?.moneyMovementEnabled,
      founderFinanceLedgerProviderVerified: readiness.founderFinanceExportReadiness?.ledgerPartnerHandoff?.providerVerified,
      founderFinanceLedgerCounts: readiness.founderFinanceExportReadiness?.ledgerPartnerHandoff?.counts || {},
      founderFinanceLedgerText: document.querySelector("[data-founder-finance-ledger-handoff-summary]")?.innerText || "",
      founderFinanceMigrationStatus: readiness.founderFinanceExportReadiness?.ledgerPartnerHandoff?.migrationBlueprint?.status || "",
      founderFinanceMigrationApplied: readiness.founderFinanceExportReadiness?.ledgerPartnerHandoff?.migrationBlueprint?.applied,
      founderFinanceMigrationSqlApply: readiness.founderFinanceExportReadiness?.ledgerPartnerHandoff?.migrationBlueprint?.sqlApplyEnabled,
      founderFinanceMigrationCounts: readiness.founderFinanceExportReadiness?.ledgerPartnerHandoff?.migrationBlueprint?.counts || {},
      founderFinanceMigrationText: document.querySelector("[data-founder-finance-ledger-migration-summary]")?.innerText || "",
      founderFinanceMigrationSqlText: document.querySelector("#founderLedgerMigrationSql")?.value || "",
      founderFinancePacketText: document.querySelector("#founderFinanceExportPacket")?.value || "",
      founderFinanceLanes: Array.from(document.querySelectorAll("[data-founder-finance-lane]")).map(row => ({
        id: row.getAttribute("data-founder-finance-lane") || "",
        status: row.getAttribute("data-founder-finance-status") || "",
        text: row.innerText || ""
      })),
      founderFinanceJournalRows: Array.from(document.querySelectorAll("[data-founder-finance-journal-entry]")).map(row => ({
        id: row.getAttribute("data-founder-finance-journal-entry") || "",
        side: row.getAttribute("data-founder-finance-journal-side") || "",
        text: row.innerText || ""
      })),
      founderFinanceAdjustmentRows: Array.from(document.querySelectorAll("[data-founder-finance-adjustment]")).map(row => ({
        id: row.getAttribute("data-founder-finance-adjustment") || "",
        text: row.innerText || ""
      })),
      founderFinanceRefundRows: Array.from(document.querySelectorAll("[data-founder-finance-refund-case]")).map(row => ({
        id: row.getAttribute("data-founder-finance-refund-case") || "",
        reason: row.getAttribute("data-founder-finance-refund-reason") || "",
        text: row.innerText || ""
      })),
      founderFinanceRefundControlRows: Array.from(document.querySelectorAll("[data-founder-finance-refund-control]")).map(row => ({
        id: row.getAttribute("data-founder-finance-refund-control") || "",
        text: row.innerText || ""
      })),
      founderFinanceLedgerWorkstreams: Array.from(document.querySelectorAll("[data-founder-finance-ledger-workstream]")).map(row => ({
        id: row.getAttribute("data-founder-finance-ledger-workstream") || "",
        status: row.getAttribute("data-founder-finance-ledger-status") || "",
        text: row.innerText || ""
      })),
      founderFinanceLedgerFields: Array.from(document.querySelectorAll("[data-founder-finance-ledger-field]")).map(row => ({
        id: row.getAttribute("data-founder-finance-ledger-field") || "",
        workstream: row.getAttribute("data-founder-finance-ledger-workstream-field") || "",
        text: row.innerText || ""
      })),
      founderFinanceLedgerEndpoints: Array.from(document.querySelectorAll("[data-founder-finance-ledger-endpoint]")).map(row => ({
        id: row.getAttribute("data-founder-finance-ledger-endpoint") || "",
        status: row.getAttribute("data-founder-finance-ledger-endpoint-status") || "",
        text: row.innerText || ""
      })),
      founderFinanceLedgerWorkers: Array.from(document.querySelectorAll("[data-founder-finance-ledger-worker]")).map(row => ({
        id: row.getAttribute("data-founder-finance-ledger-worker") || "",
        status: row.getAttribute("data-founder-finance-ledger-worker-status") || "",
        text: row.innerText || ""
      })),
      founderFinanceLedgerRouteSchemas: Array.from(document.querySelectorAll("[data-founder-finance-ledger-route-schema]")).map(row => ({
        id: row.getAttribute("data-founder-finance-ledger-route-schema") || "",
        status: row.getAttribute("data-founder-finance-ledger-route-schema-status") || "",
        text: row.innerText || ""
      })),
      founderFinanceLedgerTables: Array.from(document.querySelectorAll("[data-founder-finance-ledger-table]")).map(row => ({
        id: row.getAttribute("data-founder-finance-ledger-table") || "",
        authority: row.getAttribute("data-founder-finance-ledger-table-authority") || "",
        text: row.innerText || ""
      })),
      founderFinanceMigrationRoles: Array.from(document.querySelectorAll("[data-founder-finance-ledger-migration-role]")).map(row => ({
        id: row.getAttribute("data-founder-finance-ledger-migration-role") || "",
        text: row.innerText || ""
      })),
      founderFinanceMigrationTables: Array.from(document.querySelectorAll("[data-founder-finance-ledger-migration-table]")).map(row => ({
        id: row.getAttribute("data-founder-finance-ledger-migration-table") || "",
        text: row.innerText || ""
      })),
      playReviewerAccessText: document.querySelector("[data-play-reviewer-access]")?.innerText || "",
      playReviewerAccessPacketText: document.querySelector("#playReviewerAccessPacket")?.value || "",
      playReviewerAccessLanes: Array.from(document.querySelectorAll("[data-play-reviewer-lane]")).map(row => ({
        id: row.getAttribute("data-play-reviewer-lane") || "",
        status: row.getAttribute("data-play-reviewer-status") || "",
        text: row.innerText || ""
      })),
      launchGateText: launchGate?.innerText || "",
      launchGateDecision: launchGate?.getAttribute("data-launch-decision") || "",
      launchGateMoney: launchGate?.getAttribute("data-live-money-enabled") || "",
      launchActionCount: Number(launchGate?.getAttribute("data-founder-action-count") || 0),
      launchNowCount: Number(launchGate?.getAttribute("data-founder-action-now-count") || 0),
      launchVisibleActions: document.querySelectorAll("[data-founder-launch-action]").length,
      founderSummaryText: document.querySelector("#founderActionSummary")?.value || "",
      founderPartnerBriefCount: Number(launchGate?.getAttribute("data-founder-partner-brief-count") || 0),
      founderPartnerBriefRows: Array.from(document.querySelectorAll("[data-founder-partner-brief]")).map(row => ({
        id: row.getAttribute("data-founder-partner-brief") || "",
        status: row.getAttribute("data-founder-partner-status") || "",
        text: row.innerText || ""
      })),
      founderPartnerBriefValues: Array.from(document.querySelectorAll("[id^='founderPartnerBrief_']")).map(row => row.value || ""),
      releaseStatus: readiness.releaseChecklist?.settlementStatus || "",
      releaseMoney: readiness.releaseChecklist?.moneyMovementEnabled,
      releaseLocalOnly: readiness.releaseChecklist?.localOnly,
      releaseOwners: (readiness.releaseChecklist?.ownerGroups || []).map(row => row.owner),
      releaseItems: (readiness.releaseChecklist?.ownerGroups || []).flatMap(group => (group.items || []).map(item => `${group.owner}:${item.id}:${item.status}:${item.blocksMoneyMovement ? "money" : "no_money"}`)),
      releaseSummary: readiness.releaseChecklist?.summary || {},
      releaseLocalChecks: Object.keys(state.backendReleaseChecks || {}),
      releaseNextActionsText: document.querySelector("[data-release-next-actions]")?.innerText || "",
      releaseNextActions: Array.from(document.querySelectorAll("[data-release-next-action]")).map(row => ({
        owner: row.getAttribute("data-release-next-action") || "",
        status: row.getAttribute("data-release-next-status") || "",
        moneyOpen: Number(row.getAttribute("data-release-next-money-open") || 0),
        storeOpen: Number(row.getAttribute("data-release-next-store-open") || 0),
        text: row.innerText || ""
      })),
      blockers: (readiness.playStoreReleaseBlockers || []).map(row => row.id),
      blockedTransitions: readiness.blockedTransitions || [],
      events: (state.backendEvents || []).map(row => row.label),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, KEY);
  assert(providerReadinessState.account === "artbook_ops" && providerReadinessState.status === "fetched" && !providerReadinessState.lastError, `provider readiness fetch failed: ${providerReadinessState.lastError}`);
  assert(providerReadinessState.settlementStatus === "provider_readiness_check_only_no_settlement" && providerReadinessState.moneyMovementEnabled === false && providerReadinessState.providerVerified === false && providerReadinessState.spendable === false, "provider readiness should be non-settling in UI state");
  assert(providerReadinessState.groupIds.includes("mpesa_daraja") && providerReadinessState.groupIds.includes("card_checkout") && providerReadinessState.groupIds.includes("payout_rail") && providerReadinessState.groupIds.includes("delivery_provider") && providerReadinessState.groupIds.includes("google_play_billing"), "provider readiness did not include all provider groups");
  assert(providerReadinessState.secretNames.includes("DARAJA_CONSUMER_KEY") && providerReadinessState.secretNames.includes("CARD_PROVIDER_SECRET_KEY") && providerReadinessState.secretNames.includes("PAYOUT_PROVIDER_API_KEY") && providerReadinessState.secretNames.includes("DELIVERY_PROVIDER_API_KEY") && providerReadinessState.secretNames.includes("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"), "provider readiness did not expose the required secret-name checklist");
  assert(!providerReadinessState.secretValueLeaked && providerReadinessState.rawReady === false && providerReadinessState.replayReady === true, "provider readiness leaked values or missed raw-body/replay status");
  assert(providerReadinessState.runtimeStatus === "runtime_deployment_readiness_review_only_no_provider_activation" && providerReadinessState.runtimeMoney === false && providerReadinessState.runtimeDeploy === false, "runtime deployment readiness should stay review-only, non-deploying and non-settling");
  assert(Number(providerReadinessState.runtimeCounts.environmentGroupCount || 0) >= 5 && Number(providerReadinessState.runtimeCounts.sandboxCallbackCheckCount || 0) >= 6 && Number(providerReadinessState.runtimeCounts.deploymentRunbookStepCount || 0) >= 6 && Number(providerReadinessState.runtimeCounts.hostingChecklistCount || 0) >= 8 && Number(providerReadinessState.runtimeCounts.sandboxFixtureExecutionCount || 0) >= 6 && Number(providerReadinessState.runtimeCounts.executedSandboxFixtureCount || 0) === 0 && Number(providerReadinessState.runtimeCounts.providerCalledSandboxFixtureCount || 0) === 0 && Number(providerReadinessState.runtimeCounts.fixtureResultCaptureRowCount || 0) >= 6 && Number(providerReadinessState.runtimeCounts.capturedFixtureResultRowCount || 0) === 0 && Number(providerReadinessState.runtimeCounts.fixtureReceiptCandidateCreatedCount || 0) === 0 && Number(providerReadinessState.runtimeCounts.backendDeploymentEvidenceRowCount || 0) >= 8 && Number(providerReadinessState.runtimeCounts.backendDeploymentProductionReadyCount || 0) === 0 && Number(providerReadinessState.runtimeCounts.localReplayCountsAsProductionCount || 0) === 0 && Number(providerReadinessState.runtimeCounts.blockedRuntimeGateCount || 0) >= 1, "runtime deployment readiness should summarize env groups, sandbox callbacks, hosting checks, fixture evidence, capture rows, backend deployment evidence, runbook steps and blocked gates");
  assert(providerReadinessState.runtimeText.includes("Runtime and provider deployment") && providerReadinessState.runtimeText.includes("Hosting:") && providerReadinessState.runtimeText.includes("Fixtures:") && providerReadinessState.runtimeText.includes("Executed: 0") && providerReadinessState.runtimeText.includes("Capture rows:") && providerReadinessState.runtimeText.includes("Captured: 0") && providerReadinessState.runtimeText.includes("Backend evidence:") && providerReadinessState.runtimeText.includes("Production ready: 0") && providerReadinessState.runtimeText.includes("Deploy: blocked") && providerReadinessState.runtimeText.includes("Money: blocked"), "runtime deployment summary should make deploy, hosting, fixture, capture, backend evidence and money blocks visible");
  assert(["backend_public_runtime","payment_provider_runtime","delivery_call_runtime","play_android_runtime","compliance_support_runtime"].every(id => providerReadinessState.runtimeEnvGroups.some(row => row.id === id && row.text.includes("Deploy blocked") && row.text.includes("Money blocked"))), "runtime env groups should render all launch runtime lanes as blocked");
  assert(["mpesa_sandbox_callback","card_checkout_sandbox_callback","delivery_sandbox_callback","play_rtdn_sandbox_callback","call_relay_status_callback"].every(id => providerReadinessState.runtimeSandboxCallbacks.some(row => row.id === id && row.text.includes("Dry-run only") && row.text.includes("Money blocked"))), "runtime sandbox callbacks should render dry-run-only provider checks");
  assert(["choose_backend_host","configure_secret_store","prove_sandbox_callbacks","apply_database_migrations","complete_compliance_signoff","enable_pilot_feature_flags"].every(id => providerReadinessState.runtimeRunbookSteps.some(row => row.id === id && row.text.includes("handoff only"))), "runtime deployment runbook should render all production owner steps");
  assert(["public_https_ingress","tls_hsts_domains","auth_session_rate_limits","raw_body_webhook_preservation","secret_store_rotation","observability_alerts","backup_retention_residency","rollback_feature_flags"].every(id => providerReadinessState.runtimeHostingChecks.some(row => row.id === id && row.text.includes("Host blocked") && row.text.includes("Money blocked"))), "runtime hosting checklist should render blocked hosting rows");
  assert(["mpesa_sandbox_callback_fixture_execution","card_checkout_sandbox_callback_fixture_execution","delivery_sandbox_callback_fixture_execution","play_rtdn_sandbox_callback_fixture_execution","call_relay_status_callback_fixture_execution"].every(id => providerReadinessState.runtimeFixtureExecutions.some(row => row.id === id && row.text.includes("Runner disabled") && row.text.includes("No provider call") && row.text.includes("Dry-run only") && row.text.includes("Money blocked"))), "runtime fixture evidence should render no-provider-call dry-run rows");
  assert(["mpesa_sandbox_callback_result_capture","card_checkout_sandbox_callback_result_capture","delivery_sandbox_callback_result_capture","play_rtdn_sandbox_callback_result_capture","call_relay_status_callback_result_capture"].every(id => providerReadinessState.runtimeFixtureCaptures.some(row => row.id === id && row.text.includes("0 captured") && row.text.includes("No receipt candidate") && row.text.includes("No provider call") && row.text.includes("Dispatch blocked") && row.text.includes("Money blocked"))), "runtime fixture capture rows should render no-provider-call and no-receipt safeguards");
  assert(["production_host_selection_proof","server_secret_store_proof","raw_body_gateway_proof","observability_alert_proof","backup_restore_retention_proof","rollback_kill_switch_proof","android_api_config_proof","provider_allowlist_contract_proof"].every(id => providerReadinessState.runtimeBackendDeploymentEvidence.some(row => row.id === id && row.text.includes("Production blocked") && row.text.includes("Replay is not production") && row.text.includes("Provider blocked") && row.text.includes("Money blocked"))), "runtime backend deployment evidence rows should reject local replay as production proof");
  const backendDeploymentPacketText = providerReadinessState.runtimeBackendDeploymentPacketText || providerReadinessState.runtimeBackendDeploymentPacketStateText || "";
  assert(backendDeploymentPacketText.includes("Artbook Backend Deployment Evidence Packet") && backendDeploymentPacketText.includes("local fixture replay is useful QA evidence") && backendDeploymentPacketText.includes("Local replay rows observed") && !/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(backendDeploymentPacketText), "backend deployment evidence packet should be visible, blocked and redacted");
  assert(providerReadinessState.backendDeploymentProofSummaryText.includes("Proof intake stays blocked") && providerReadinessState.backendDeploymentProofSummaryText.includes("Approval: blocked") && providerReadinessState.backendDeploymentProofSummaryText.includes("Money: blocked") && providerReadinessState.backendDeploymentProofOptionCount >= 8 && providerReadinessState.backendDeploymentProofStateCount === 0, "backend deployment proof intake should start empty with all evidence lanes available and blocked");
  assert(Number(providerReadinessState.backendDeploymentServerSummary.noteCount || 0) === 0 && providerReadinessState.backendDeploymentProofSummaryText.includes("Server notes: 0"), "backend deployment proof intake should start with zero server review notes");
  assert(providerReadinessState.backendDeploymentProofPacketText.includes("Artbook Production Deployment Proof Intake") && providerReadinessState.backendDeploymentProofPacketText.includes("No production proof notes captured yet") && providerReadinessState.backendDeploymentProofPacketText.includes("No server deployment evidence notes captured yet") && !/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(providerReadinessState.backendDeploymentProofPacketText), "backend deployment proof intake packet should be copy-ready, empty and redacted");
  assert(providerReadinessState.runtimePacketText.includes("Artbook Production Runtime and Provider Deployment Runbook") && providerReadinessState.runtimePacketText.includes("Sandbox callback checks") && providerReadinessState.runtimePacketText.includes("Hosting deployment checklist") && providerReadinessState.runtimePacketText.includes("Sandbox fixture execution evidence") && providerReadinessState.runtimePacketText.includes("Fixture result capture plan") && providerReadinessState.runtimePacketText.includes("Backend deployment evidence") && providerReadinessState.runtimePacketText.includes("Deployment runbook") && providerReadinessState.runtimePacketText.includes("no deployment, provider activation") && !/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(providerReadinessState.runtimePacketText), "runtime deployment packet should be copy-ready, blocked and redacted");
  assert(providerReadinessState.deliveryWebhookReplayReady === true && providerReadinessState.deliveryRealDispatchEnabled === false && providerReadinessState.deliveryPayoutEnabled === false && typeof providerReadinessState.replayDeliveryEventCount === "number", "delivery provider readiness did not stay visible and fail-closed in UI state");
  assert(providerReadinessState.snapshotStatus === "provider_readiness_export_only_no_settlement" && providerReadinessState.snapshotMoney === false && providerReadinessState.snapshotText.includes("Artbook Provider Readiness Snapshot") && providerReadinessState.snapshotText.includes("Redaction: secret names") && providerReadinessState.snapshotText.includes("Production Runtime Deployment Readiness") && providerReadinessState.snapshotText.includes("Hosting checklist rows") && providerReadinessState.snapshotText.includes("Sandbox fixture executions") && providerReadinessState.snapshotText.includes("Fixture result capture rows") && providerReadinessState.snapshotText.includes("Backend deployment evidence rows") && providerReadinessState.snapshotText.includes("Settlement Reconciliation State Machine") && providerReadinessState.snapshotText.includes("Provider-Led Payment Boundary Readiness") && providerReadinessState.snapshotText.includes("Founder Finance Export Readiness") && providerReadinessState.snapshotText.includes("Production Ledger Partner Handoff") && providerReadinessState.snapshotText.includes("Endpoint contracts") && providerReadinessState.snapshotText.includes("Database tables") && providerReadinessState.snapshotText.includes("Migration SQL blueprint") && providerReadinessState.snapshotText.includes("Worker job contracts") && providerReadinessState.snapshotText.includes("Route schema contracts") && providerReadinessState.snapshotText.includes("RLS policies") && providerReadinessState.snapshotText.includes("Delivery Provider Readiness") && providerReadinessState.snapshotText.includes("Blocked Money Transitions"), "provider readiness snapshot did not render as redacted copy-ready text");
  assert(!/secret value|=demo|password/i.test(providerReadinessState.snapshotText), "provider readiness snapshot appears to leak sensitive values");
  assert(providerReadinessState.settlementStateMachineStatus === "state_machine_review_only_no_settlement" && providerReadinessState.settlementStateMachineMoney === false && providerReadinessState.settlementStateMachineText.includes("Settlement reconciliation path") && providerReadinessState.settlementStateMachineText.includes("Money: blocked"), "settlement state machine did not render a non-settling provider readiness summary");
  assert(["client_replay_audit","provider_webhook_replay","receipt_candidate_intake","settlement_mutation_terminal"].every(id => providerReadinessState.settlementStateMachineStates.some(row => row.id === id)) && providerReadinessState.settlementStateMachineStates.some(row => row.id === "settlement_mutation_terminal" && /blocked/.test(row.status)), "settlement state machine did not expose expected blocked states");
  assert(providerReadinessState.settlementStateMachinePacketText.includes("Artbook Settlement Reconciliation State Machine") && providerReadinessState.settlementStateMachinePacketText.includes("Provider fetch required") && providerReadinessState.settlementStateMachinePacketText.includes("double-entry") && providerReadinessState.settlementStateMachinePacketText.includes("Boundary: state-machine evidence only"), "settlement state machine packet should be copy-ready and production-control aware");
  assert(providerReadinessState.providerBoundaryStatus === "provider_payment_boundary_review_only_no_money_movement" && providerReadinessState.providerBoundaryMoney === false && providerReadinessState.providerBoundaryRails.includes("mpesa_customer_payments") && providerReadinessState.providerBoundaryRails.includes("escrow_jobs_bookings"), "provider-led payment boundary should render in readiness state as non-settling M-Pesa and escrow rails");
  assert(Number(providerReadinessState.providerBoundaryCounts.railCount || 0) >= 6 && providerReadinessState.providerBoundaryRules.includes("physical_services_provider_led") && providerReadinessState.providerBoundaryRules.includes("digital_entitlements_play_billing"), "provider-led payment boundary should expose launch rails and Play Billing split rules");
  assert(providerReadinessState.founderFinanceStatus === "founder_finance_export_review_only_no_settlement" && providerReadinessState.founderFinanceMoney === false && providerReadinessState.founderFinanceRecognized === 0 && providerReadinessState.founderFinanceEstimated >= 0 && providerReadinessState.founderFinanceBlocked >= 0, "founder finance export should render as non-settling with recognized revenue at zero");
  assert(providerReadinessState.founderFinanceText.includes("Founder finance export") && providerReadinessState.founderFinanceText.includes("Recognized:") && providerReadinessState.founderFinanceText.includes("Money: blocked"), "founder finance export summary should show estimates, recognition and blocked money");
  assert(["play_digital_subscriptions","marketplace_service_fee","booking_service_fee","freelancer_escrow_fee","delivery_commission","wallet_transfer_fee","boost_finder_revenue","digital_order_signal_review"].every(id => providerReadinessState.founderFinanceLanes.some(row => row.id === id)), "founder finance export UI missed launch revenue lanes");
  assert(providerReadinessState.founderFinanceJournalStatus === "journal_preview_review_only_not_posted" && providerReadinessState.founderFinanceJournalBalanced === true && providerReadinessState.founderFinanceJournalPosted === 0 && providerReadinessState.founderFinanceJournalRevenue === 0, "founder finance journal should be balanced, unposted and non-revenue");
  assert(providerReadinessState.founderFinanceJournalText.includes("Double-entry journal preview") && providerReadinessState.founderFinanceJournalText.includes("Posted: 0") && providerReadinessState.founderFinanceJournalText.includes("Revenue:"), "founder finance journal summary should explain unposted balanced preview");
  assert(providerReadinessState.founderFinanceAdjustmentRows.some(row => row.id === "refund_window_reserve") && providerReadinessState.founderFinanceAdjustmentRows.some(row => row.id === "chargeback_dispute_reserve") && providerReadinessState.founderFinanceAdjustmentRows.some(row => row.id === "tax_accounting_review"), "founder finance UI should show refund, chargeback and tax/accounting holds");
  assert(providerReadinessState.founderFinanceJournalEntries === 0 || (providerReadinessState.founderFinanceJournalRows.some(row => row.side === "debit") && providerReadinessState.founderFinanceJournalRows.some(row => row.side === "credit")), "non-empty founder finance journal should show both debit and credit rows");
  assert(providerReadinessState.founderFinanceRefundStatus === "refund_chargeback_hold_export_only_no_settlement" && providerReadinessState.founderFinanceRefundCases >= 0 && providerReadinessState.founderFinanceRefundWebhookRisk >= 0 && providerReadinessState.founderFinanceRefundGrossHold >= 0 && providerReadinessState.founderFinanceRefundRevenueAtRisk >= 0, "founder refund and chargeback hold export should render as non-settling with numeric hold counts");
  assert(providerReadinessState.founderFinanceRefundText.includes("Refund and chargeback hold export") && providerReadinessState.founderFinanceRefundText.includes("Recognition: blocked"), "founder refund and chargeback hold summary should explain blocked recognition");
  assert(["provider_refund_receipt_match","support_outcome_and_customer_notice","credit_note_or_reversal_journal","chargeback_window_close"].every(id => providerReadinessState.founderFinanceRefundControlRows.some(row => row.id === id)), "founder refund and chargeback hold UI should show provider, support, reversal and chargeback controls");
  assert(providerReadinessState.founderFinanceRefundRows.length === 0 || providerReadinessState.founderFinanceRefundRows.every(row => row.text.includes("Revenue blocked")), "visible founder refund hold cases should keep revenue blocked");
  assert(providerReadinessState.founderFinanceLedgerStatus === "ledger_partner_handoff_only_no_settlement" && providerReadinessState.founderFinanceLedgerMoney === false && providerReadinessState.founderFinanceLedgerProviderVerified === false && Number(providerReadinessState.founderFinanceLedgerCounts.clientWritableFieldCount || 0) === 0, "production ledger partner handoff should render as non-settling and client-read-only");
  assert(providerReadinessState.founderFinanceLedgerText.includes("Production ledger and partner handoff") && providerReadinessState.founderFinanceLedgerText.includes("Activation: blocked") && providerReadinessState.founderFinanceLedgerText.includes("Client writable: 0") && providerReadinessState.founderFinanceLedgerText.includes("Endpoints:") && providerReadinessState.founderFinanceLedgerText.includes("Workers:") && providerReadinessState.founderFinanceLedgerText.includes("Route schemas:") && providerReadinessState.founderFinanceLedgerText.includes("Enabled workers: 0") && providerReadinessState.founderFinanceLedgerText.includes("Tables:") && providerReadinessState.founderFinanceLedgerText.includes("Migration:"), "ledger partner handoff summary should make activation and client-write boundary obvious");
  assert(["payment_provider_reconciliation","double_entry_ledger","escrow_wallet_payouts","play_billing_revenue","tax_accounting_reporting","support_dispute_controls"].every(id => providerReadinessState.founderFinanceLedgerWorkstreams.some(row => row.id === id)), "ledger partner UI should show all launch implementation workstreams");
  assert(["provider_event_id","journal_id","purchase_token_digest","credit_note_id"].every(id => providerReadinessState.founderFinanceLedgerFields.some(row => row.id === id)) && providerReadinessState.founderFinanceLedgerFields.every(row => row.text.includes("Client writable: no")), "ledger partner UI should show provider, ledger, Play and tax fields as client read-only");
  assert(["provider_webhook_intake","provider_fetch_proof","journal_post","wallet_provider_settlement","play_purchase_verify","tax_export_batch","support_dispute_decision"].every(id => providerReadinessState.founderFinanceLedgerEndpoints.some(row => row.id === id && row.text.includes("Money blocked"))), "ledger partner UI should show non-settling endpoint contracts");
  assert(["provider_webhook_verify_job","provider_fetch_proof_job","receipt_reconciliation_job","ledger_post_approval_job","wallet_provider_settlement_job","play_purchase_verify_job","support_dispute_hold_job"].every(id => providerReadinessState.founderFinanceLedgerWorkers.some(row => row.id === id && row.text.includes("Runner: disabled") && row.text.includes("Server only") && row.text.includes("Money blocked"))), "ledger partner UI should show disabled server-only worker jobs");
  assert(["provider_webhook_intake_schema","provider_fetch_proof_schema","journal_post_schema","wallet_provider_settlement_schema","play_purchase_verify_schema","support_dispute_decision_schema"].every(id => providerReadinessState.founderFinanceLedgerRouteSchemas.some(row => row.id === id && row.text.includes("Server role required") && row.text.includes("Idempotent") && row.text.includes("Money blocked"))), "ledger partner UI should show route schema contracts with server-role and idempotency boundaries");
  assert(["provider_events","idempotency_keys","ledger_journals","escrow_wallet_liabilities","play_billing_entitlements","tax_accounting_exports","support_dispute_holds","audit_events"].every(id => providerReadinessState.founderFinanceLedgerTables.some(row => row.id === id && row.text.includes("Client writable: no"))), "ledger partner UI should show server-owned database tables");
  assert(providerReadinessState.founderFinanceMigrationStatus === "migration_blueprint_review_only_not_applied" && providerReadinessState.founderFinanceMigrationApplied === false && providerReadinessState.founderFinanceMigrationSqlApply === false && Number(providerReadinessState.founderFinanceMigrationCounts.rlsPolicyCount || 0) >= 20, "migration blueprint should render as not applied with RLS policy coverage");
  assert(providerReadinessState.founderFinanceMigrationText.includes("Migration SQL blueprint") && providerReadinessState.founderFinanceMigrationText.includes("Applied: no") && providerReadinessState.founderFinanceMigrationText.includes("SQL apply: blocked"), "migration summary should show not-applied and blocked SQL apply status");
  assert(["artbook_provider_webhook_role","artbook_reconciliation_worker_role","artbook_accounting_approver_role","artbook_review_ops_readonly_role"].every(id => providerReadinessState.founderFinanceMigrationRoles.some(row => row.id === id && row.text.includes("Client assignable: no"))), "migration role rows should show server-owned roles");
  assert(["provider_events","ledger_journals","support_dispute_holds","audit_events"].every(id => providerReadinessState.founderFinanceMigrationTables.some(row => row.id === id && row.text.includes("Money blocked"))), "migration table rows should show money blocked");
  assert(providerReadinessState.founderFinanceMigrationSqlText.includes("create schema if not exists artbook_money_ops") && providerReadinessState.founderFinanceMigrationSqlText.includes("create table if not exists artbook_money_ops.provider_events") && providerReadinessState.founderFinanceMigrationSqlText.includes("check (client_writable = false)") && providerReadinessState.founderFinanceMigrationSqlText.includes("create policy provider_events_no_client_writes"), "migration SQL should be visible and fail closed");
  assert(providerReadinessState.founderFinancePacketText.includes("Artbook Founder Finance Export") && providerReadinessState.founderFinancePacketText.includes("Recognized founder revenue: 0") && providerReadinessState.founderFinancePacketText.includes("Double-entry journal preview") && providerReadinessState.founderFinancePacketText.includes("Credit account used: unearned founder fee clearing, not revenue") && providerReadinessState.founderFinancePacketText.includes("Refund and chargeback hold export") && providerReadinessState.founderFinancePacketText.includes("Open revenue holds") && providerReadinessState.founderFinancePacketText.includes("Production ledger and partner handoff") && providerReadinessState.founderFinancePacketText.includes("Endpoint contracts:") && providerReadinessState.founderFinancePacketText.includes("Database tables:") && providerReadinessState.founderFinancePacketText.includes("Migration blueprint: migration_blueprint_review_only_not_applied") && providerReadinessState.founderFinancePacketText.includes("Migration RLS policies:") && providerReadinessState.founderFinancePacketText.includes("Worker job contracts:") && providerReadinessState.founderFinancePacketText.includes("Route schema contracts:") && providerReadinessState.founderFinancePacketText.includes("Enabled workers: 0") && providerReadinessState.founderFinancePacketText.includes("Client writable fields: 0") && providerReadinessState.founderFinancePacketText.includes("Activation: blocked") && providerReadinessState.founderFinancePacketText.includes("Boundary: export evidence only") && !/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(providerReadinessState.founderFinancePacketText), "founder finance export packet should be copy-ready, blocked and redacted");
  const releaseTotal = Number(providerReadinessState.releaseSummary.totalCount || 0);
  const zeroChecklist = `0/${releaseTotal}`;
  assert(releaseTotal >= 18, "release checklist should include delivery provider gates");
  assert(providerReadinessState.evidenceStatus === "release_evidence_packet_review_only_no_settlement" && providerReadinessState.evidenceMoney === false && /^[A-F0-9]{64}$/.test(providerReadinessState.evidenceApkHash), "release evidence packet should include non-settling status and APK hash in UI state");
  assert(providerReadinessState.evidenceText.includes("Artbook Release Evidence Packet") && providerReadinessState.evidenceText.includes("APK SHA-256") && providerReadinessState.evidenceText.includes("Latest Logged Audit Evidence") && providerReadinessState.evidenceText.includes("Sandbox Fixture Result Capture") && providerReadinessState.evidenceText.includes("Backend Deployment Evidence") && providerReadinessState.evidenceText.includes("Provider Readiness Snapshot"), "release evidence packet did not bundle APK, audit, fixture capture, backend deployment and provider snapshot text");
  assert(providerReadinessState.evidenceText.includes(`Local checklist checked: ${zeroChecklist}`) && !/secret value|=demo|password/i.test(providerReadinessState.evidenceText), "release evidence packet should include local checklist progress without leaking credentials");
  assert(providerReadinessState.evidenceHistoryCount === 1 && providerReadinessState.evidenceHistoryHash === providerReadinessState.evidenceApkHash && providerReadinessState.evidenceHistoryChecked === 0 && providerReadinessState.evidenceHistoryMoney === false, "release evidence history should capture the first non-settling packet");
  assert(providerReadinessState.evidenceSummaryText.includes("Evidence export") && providerReadinessState.evidenceSummaryText.includes("Evidence packet ready") && providerReadinessState.evidenceSummaryText.includes("APK:") && providerReadinessState.evidenceSummaryText.includes(`Checklist: ${zeroChecklist}`) && providerReadinessState.evidenceSummaryText.includes("History: 1 packet") && providerReadinessState.evidenceSummaryText.includes("Diff: new packet") && providerReadinessState.evidenceSummaryText.includes("Phone:"), "release evidence export summary row did not show packet and history status");
  assert(providerReadinessState.packetSummaryText.includes("APK:") && providerReadinessState.packetSummaryText.includes(`Checklist: ${zeroChecklist}`) && providerReadinessState.packetSummaryText.includes("Phone:") && providerReadinessState.packetSummaryText.includes("Money: blocked") && providerReadinessState.packetSummaryBeforeTextArea, "release evidence packet card did not show compact APK checklist phone money summary before the textarea");
  assert(providerReadinessState.evidenceHistorySummaryText.includes("Latest:") && providerReadinessState.evidenceHistorySummaryText.includes(`Checklist: ${zeroChecklist}`) && providerReadinessState.evidenceHistorySummaryText.includes("Diff: new packet") && providerReadinessState.evidenceHistorySummaryText.includes("Phone:") && providerReadinessState.evidenceHistoryDiffCollapsed && providerReadinessState.evidenceHistoryPacketBeforeDiff, "release evidence history did not show compact status and packet actions before collapsed diff detail");
  assert(providerReadinessState.evidenceHistoryDiffText.includes("No previous APK hash is available yet") && providerReadinessState.evidenceHistoryDiffText.includes("No previous audit section is available yet") && providerReadinessState.evidenceHistoryDiffText.includes("No previous checklist count is available yet") && providerReadinessState.evidenceHistoryDiffText.includes("No previous phone-install status is available yet"), "release evidence diff details did not retain baseline field reasons");
  assert(providerReadinessState.handoffPreviewText.includes("Handoff export preview") && providerReadinessState.handoffPreviewText.includes("Both handoff exports are copy-ready") && providerReadinessState.handoffPreviewText.includes("Snapshot: copy-ready") && providerReadinessState.handoffPreviewText.includes("Packet: copy-ready") && providerReadinessState.handoffPreviewText.includes(`Checklist: ${zeroChecklist}`) && providerReadinessState.handoffPreviewText.includes("Money: blocked"), "handoff export preview did not show snapshot and packet copy-ready status");
  assert(providerReadinessState.handoffPreviewBeforePacket && providerReadinessState.handoffPreviewBeforeSnapshot, "handoff export preview should render before the release packet and readiness snapshot textareas");
  assert(providerReadinessState.androidReleaseText.includes("Android and Play Console release proof") && providerReadinessState.androidReleaseText.includes("Signing: blocked") && providerReadinessState.androidReleaseText.includes("Phone:"), "Android release handoff did not render signing and phone proof summary");
  assert(["package_version","release_signing","phone_smoke","play_console"].every(id => providerReadinessState.androidReleaseLanes.some(row => row.id === id)), "Android release handoff did not expose all release lanes");
  assert(providerReadinessState.androidReleaseLanes.some(row => row.id === "release_signing" && row.status === "blocked") && providerReadinessState.androidReleaseLanes.some(row => row.id === "phone_smoke" && row.status === "blocked"), "Android release handoff should keep debug signing and missing phone proof blocked");
  assert(providerReadinessState.androidReleasePacketText.includes("Artbook Android Release and Play Console Handoff") && providerReadinessState.androidReleasePacketText.includes("Package: com.steward.artbook") && providerReadinessState.androidReleasePacketText.includes("Release signing configured: false_blocked") && providerReadinessState.androidReleasePacketText.includes("Boundary: handoff evidence only") && !/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(providerReadinessState.androidReleasePacketText), "Android release handoff packet should be copy-ready, blocked and redacted");
  assert(providerReadinessState.playStoreSafetyText.includes("Play Store Data Safety handoff") && providerReadinessState.playStoreSafetyText.includes("Permissions:") && providerReadinessState.playStoreSafetyText.includes("Billing:"), "Play Store safety handoff did not render the policy summary");
  assert(["data_safety","permissions","billing_subscriptions","restricted_media","privacy_support"].every(id => providerReadinessState.playStoreSafetyLanes.some(row => row.id === id)), "Play Store safety handoff did not expose all policy lanes");
  assert(providerReadinessState.playStoreSafetyLanes.some(row => row.id === "billing_subscriptions" && row.status === "blocked") && providerReadinessState.playStoreSafetyLanes.some(row => row.id === "restricted_media" && /web-only|restricted/i.test(row.text)), "Play Store safety handoff should keep billing blocked and restricted media web-only");
  assert(providerReadinessState.playStoreSafetyPacketText.includes("Artbook Play Store Data Safety Handoff") && providerReadinessState.playStoreSafetyPacketText.includes("Package: com.steward.artbook") && providerReadinessState.playStoreSafetyPacketText.includes("ACCESS_FINE_LOCATION") && providerReadinessState.playStoreSafetyPacketText.includes("RECORD_AUDIO") && providerReadinessState.playStoreSafetyPacketText.includes("restricted creator monetization stays web-only") && providerReadinessState.playStoreSafetyPacketText.includes("Boundary: handoff evidence only") && !/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(providerReadinessState.playStoreSafetyPacketText), "Play Store safety packet should be copy-ready, permission-aware and redacted");
  assert(providerReadinessState.playBillingText.includes("Play Billing and subscription readiness") && providerReadinessState.playBillingText.includes("Digital:") && providerReadinessState.playBillingText.includes("Partner rails: separate"), "Play Billing handoff did not render the entitlement/payment boundary summary");
  assert(["product_catalog","billing_library","purchase_token_verification","entitlement_restore","partner_payment_boundary","revenue_reporting"].every(id => providerReadinessState.playBillingLanes.some(row => row.id === id)), "Play Billing handoff did not expose all subscription and payment-boundary lanes");
  assert(providerReadinessState.playBillingLanes.some(row => row.id === "purchase_token_verification" && row.status === "blocked") && providerReadinessState.playBillingLanes.some(row => row.id === "partner_payment_boundary" && /outside Play Billing|provider-led/i.test(row.text)), "Play Billing handoff should keep token verification blocked while separating partner-led physical/service payments");
  assert(providerReadinessState.playBillingPacketText.includes("Artbook Play Billing and Subscription Handoff") && providerReadinessState.playBillingPacketText.includes("purchase token") && providerReadinessState.playBillingPacketText.includes("partner-led physical services") && providerReadinessState.playBillingPacketText.includes("Provider-led boundary events") && providerReadinessState.playBillingPacketText.includes("Boundary: handoff evidence only") && !/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=|purchase token:\s*\w/i.test(providerReadinessState.playBillingPacketText), "Play Billing packet should be copy-ready, entitlement-aware and redacted");
  assert(providerReadinessState.playReviewerAccessText.includes("Play reviewer access handoff") && providerReadinessState.playReviewerAccessText.includes("Account deletion: blocked") && providerReadinessState.playReviewerAccessText.includes("Privacy policy: blocked"), "Play reviewer access handoff did not render reviewer privacy summary");
  assert(["app_access","demo_roles","account_deletion","privacy_policy","support_path"].every(id => providerReadinessState.playReviewerAccessLanes.some(row => row.id === id)), "Play reviewer access handoff did not expose all access/privacy lanes");
  assert(providerReadinessState.playReviewerAccessLanes.some(row => row.id === "app_access" && row.status === "needed") && providerReadinessState.playReviewerAccessLanes.some(row => row.id === "account_deletion" && row.status === "blocked"), "Play reviewer access handoff should keep App access and deletion gaps visible");
  assert(providerReadinessState.playReviewerAccessPacketText.includes("Artbook Play Reviewer Access and Privacy Handoff") && providerReadinessState.playReviewerAccessPacketText.includes("App access instructions") && providerReadinessState.playReviewerAccessPacketText.includes("Account deletion and privacy support") && providerReadinessState.playReviewerAccessPacketText.includes("Review Ops") && providerReadinessState.playReviewerAccessPacketText.includes("Boundary: handoff evidence only") && !/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(providerReadinessState.playReviewerAccessPacketText), "Play reviewer access packet should be copy-ready, deletion-aware and redacted");
  assert(providerReadinessState.launchGateDecision === "kenya_live_money_launch_blocked" && providerReadinessState.launchGateMoney === "false", "Kenya launch gate should stay fail-closed after provider readiness fetch");
  assert(providerReadinessState.launchGateText.includes("Founder action list") && providerReadinessState.launchGateText.includes("Create release signing and phone-install proof") && providerReadinessState.launchGateText.includes("Approve KYC/KYB and country money rules") && providerReadinessState.launchGateText.includes("Clear settlement exception rows"), "Kenya launch gate did not expose founder action list in backend sync UI");
  assert(providerReadinessState.launchActionCount === 5 && providerReadinessState.launchVisibleActions === 5 && providerReadinessState.launchNowCount >= 3, "Kenya launch gate action metadata did not expose five founder actions and active blockers");
  assert(providerReadinessState.founderSummaryText.includes("Artbook Kenya Pilot Founder Action Summary") && providerReadinessState.founderSummaryText.includes("Live money enabled: false_blocked") && providerReadinessState.founderSummaryText.includes("Boundary: summary is handoff evidence only") && providerReadinessState.founderSummaryText.includes("Redaction:"), "founder action summary did not expose copy-ready blocked launch handoff");
  assert(!/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(providerReadinessState.founderSummaryText), "founder action summary appears to leak sensitive values");
  assert(providerReadinessState.founderPartnerBriefCount === 4 && providerReadinessState.founderPartnerBriefRows.length === 4 && ["payments","compliance","playstore","android"].every(id => providerReadinessState.founderPartnerBriefRows.some(row => row.id === id)), "founder partner handoff briefs did not render all four partner lanes");
  assert(providerReadinessState.founderPartnerBriefRows.some(row => row.text.includes("Payment/backend partner") && row.text.includes("provider receipt")) && providerReadinessState.founderPartnerBriefRows.some(row => row.text.includes("KYC/KYB compliance partner") && row.text.includes("source-of-funds")) && providerReadinessState.founderPartnerBriefRows.some(row => row.text.includes("Play Store/legal partner")) && providerReadinessState.founderPartnerBriefRows.some(row => row.text.includes("Android release partner")), "founder partner handoff brief cards missed partner-specific launch asks");
  assert(providerReadinessState.founderPartnerBriefValues.length === 4 && providerReadinessState.founderPartnerBriefValues.every(text => text.includes("Artbook Partner Handoff Brief") && text.includes("handoff only") && text.includes("no provider state") && !/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(text)), "founder partner handoff briefs should be copy-ready, redacted and non-settling");
  assert(providerReadinessState.releaseStatus === "release_checklist_review_only_no_settlement" && providerReadinessState.releaseMoney === false && providerReadinessState.releaseLocalOnly === true, "release checklist should be local-only and non-settling in UI state");
  assert(["backend", "android", "compliance", "payments"].every(owner => providerReadinessState.releaseOwners.includes(owner)), "release checklist did not render all owner groups");
  assert(providerReadinessState.releaseNextActions.length === providerReadinessState.releaseOwners.length && providerReadinessState.releaseNextActionsText.includes("Next:") && providerReadinessState.releaseNextActionsText.includes("Money gates"), "release checklist next-action rail did not summarize all owner lanes");
  assert(providerReadinessState.releaseNextActions.some(row => row.owner === "backend" && row.moneyOpen >= 1) && providerReadinessState.releaseNextActions.some(row => row.owner === "android" && row.storeOpen >= 1) && providerReadinessState.releaseNextActions.some(row => row.owner === "payments" && row.moneyOpen >= 1), "release checklist next-action rail missed backend, Android or payments blockers");
  assert(providerReadinessState.releaseSummary.totalCount >= 16 && providerReadinessState.releaseSummary.blockedCount >= 6 && providerReadinessState.releaseSummary.moneyBlockingCount >= 6, "release checklist summary missed release or money gates");
  assert(providerReadinessState.releaseItems.some(row => row.startsWith("backend:raw_body_webhook_signatures:blocked:money")) && providerReadinessState.releaseItems.some(row => row.startsWith("backend:delivery_provider_webhook_replay:blocked:money")) && providerReadinessState.releaseItems.some(row => row.startsWith("android:release_signing:blocked")) && providerReadinessState.releaseItems.some(row => row.startsWith("payments:settlement_state_machine:blocked:money")) && providerReadinessState.releaseItems.some(row => row.startsWith("payments:courier_delivery_payout_controls:blocked:money")), "release checklist missed backend Android delivery or payments gates");
  assert(providerReadinessState.blockers.includes("release_signing") && providerReadinessState.blockers.includes("raw_body_webhook_signatures") && providerReadinessState.blockers.includes("delivery_dispatch_webhooks_and_payouts") && providerReadinessState.blockedTransitions.includes("spendable_balance_credit") && providerReadinessState.blockedTransitions.includes("delivery_dispatch_assignment"), "provider readiness did not surface Play Store blockers and blocked money/delivery transitions");
  assert(providerReadinessState.events.includes("Provider readiness checked") && providerReadinessState.text.includes("Payment and delivery provider readiness") && providerReadinessState.text.includes("Provider readiness health") && providerReadinessState.text.includes("Delivery provider and courier dispatch") && providerReadinessState.text.includes("Delivery provider gate") && providerReadinessState.text.includes("Raw-body and replay") && providerReadinessState.text.includes("Production runtime") && providerReadinessState.text.includes("Runtime and provider deployment") && providerReadinessState.text.includes("Handoff export preview") && providerReadinessState.text.includes("Settlement state machine") && providerReadinessState.text.includes("Settlement reconciliation path") && providerReadinessState.text.includes("Founder finance export") && providerReadinessState.text.includes("Production ledger and partner handoff") && providerReadinessState.text.includes("Release checklist lane") && providerReadinessState.text.includes("Local release tracking") && providerReadinessState.text.includes("Play Store Data Safety handoff") && providerReadinessState.text.includes("Play reviewer access handoff") && providerReadinessState.text.includes("Release evidence packet") && providerReadinessState.text.includes("Evidence export") && providerReadinessState.text.includes("Evidence history") && providerReadinessState.text.includes("Packet history") && providerReadinessState.text.includes("Diff reasons") && providerReadinessState.text.includes("No previous packet yet") && providerReadinessState.text.includes("Redacted readiness snapshot"), "provider readiness did not update backend sync desk");
  assert(providerReadinessState.releaseLocalChecks.length === 0, "release checklist should start with no local checks");

  await page.selectOption("#backendDeploymentProofLane", "production_host_selection_proof");
  await page.fill("#backendDeploymentProofType", "public HTTPS health check");
  await page.fill("#backendDeploymentProofSource", "production host dashboard redacted");
  await page.fill("#backendDeploymentProofNote", "Hosted health endpoint returned 200 in the provider dashboard. Credential material omitted and no provider activation requested.");
  await page.evaluate(() => App.saveBackendDeploymentProofNote());
  await page.waitForTimeout(220);
  const deploymentProofState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      noteCount: (state.backendDeploymentProofNotes || []).length,
      latest: state.backendDeploymentProofNotes?.[0] || null,
      synced: state.backendSynced?.deploymentProofNotes || {},
      serverSummary: state.backendProviderReadiness?.readiness?.productionDeploymentEvidenceNoteSummary || {},
      events: (state.backendEvents || []).map(row => row.label),
      summaryText: document.querySelector("[data-backend-deployment-proof-summary]")?.innerText || "",
      packetText: document.querySelector("#backendDeploymentProofPacket")?.value || "",
      releasePacketText: document.querySelector("#releaseEvidencePacket")?.value || "",
      noteCards: Array.from(document.querySelectorAll("[data-backend-deployment-proof-note]")).map(row => ({
        lane: row.getAttribute("data-backend-deployment-proof-lane") || "",
        backend: row.getAttribute("data-backend-deployment-proof-backend") || "",
        text: row.innerText || ""
      }))
    };
  }, KEY);
  assert(deploymentProofState.noteCount === 1 && deploymentProofState.latest?.laneId === "production_host_selection_proof" && deploymentProofState.latest?.backendStatus === "synced_review_only" && deploymentProofState.latest?.backendEvidenceNoteId && deploymentProofState.latest?.productionHostReady === false && deploymentProofState.latest?.providerActivationEnabled === false && deploymentProofState.latest?.moneyMovementEnabled === false, "deployment proof note should persist locally and sync as server review-only evidence without enabling production, providers or money");
  assert(Object.values(deploymentProofState.synced).some(Boolean) && Number(deploymentProofState.serverSummary.noteCount || 0) === 1 && Number(deploymentProofState.serverSummary.moneyMovementCount || 0) === 0, "deployment proof note should update backend synced map and server readiness summary without money movement");
  assert(deploymentProofState.summaryText.includes("Notes: 1") && deploymentProofState.summaryText.includes("Server notes: 1") && deploymentProofState.summaryText.includes("Approval: blocked") && deploymentProofState.summaryText.includes("Money: blocked"), "deployment proof summary should show local/server captured note while staying blocked");
  assert(deploymentProofState.noteCards.some(row => row.lane === "production_host_selection_proof" && row.backend === "synced_review_only" && row.text.includes("Local proof note") && row.text.includes("Server review only") && row.text.includes("Approval blocked") && row.text.includes("Provider blocked") && row.text.includes("Money blocked")), "deployment proof note card should render blocked server-synced review evidence");
  assert(deploymentProofState.packetText.includes("Artbook Production Deployment Proof Intake") && deploymentProofState.packetText.includes("Local proof notes captured: 1") && deploymentProofState.packetText.includes("Server review notes captured: 1") && deploymentProofState.packetText.includes("production_host_selection_proof") && deploymentProofState.packetText.includes("provider activation false") && deploymentProofState.packetText.includes("money movement false") && !/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(deploymentProofState.packetText), "deployment proof packet should include the local/server note without leaking credentials or clearing gates");
  assert(deploymentProofState.releasePacketText.includes("Production deployment proof intake") && deploymentProofState.releasePacketText.includes("Local proof notes captured: 1") && deploymentProofState.releasePacketText.includes("Server review notes captured: 1") && deploymentProofState.releasePacketText.includes("provider activation false") && deploymentProofState.releasePacketText.includes("money movement false"), "release evidence packet should bundle local and server deployment proof notes as blocked handoff evidence");
  assert(deploymentProofState.events.includes("Deployment proof note recorded"), "deployment proof note should write an audit event");

  await page.evaluate(() => App.fetchBackendComplianceRunbook());
  await page.waitForTimeout(700);
  const complianceRunbookState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const runbook = state.backendComplianceRunbook?.runbook || {};
    return {
      account: state.account,
      status: state.backendComplianceRunbook?.status || "",
      lastError: state.backendComplianceRunbook?.lastError || "",
      settlementStatus: runbook.settlementStatus || "",
      moneyMovementEnabled: runbook.moneyMovementEnabled,
      providerVerified: runbook.providerVerified,
      spendable: runbook.spendable,
      approvalAuthority: runbook.approvalAuthority || "",
      tierIds: (runbook.walletLimitTiers || []).map(row => row.id),
      tierStatuses: (runbook.walletLimitTiers || []).map(row => row.status),
      triggerIds: (runbook.sourceOfFundsTriggers || []).map(row => row.id),
      activeTriggers: (runbook.sourceOfFundsTriggers || []).filter(row => row.detected).map(row => row.id),
      runbookSteps: (runbook.operatorRunbook || []).map(row => row.id),
      blockedActions: runbook.blockedActions || [],
      requiredEvidence: runbook.requiredEvidence || [],
      redactionFields: runbook.redaction?.fieldsOmitted || [],
      proofLaneIds: Array.from(document.querySelectorAll("[data-compliance-proof-lane]")).map(row => row.getAttribute("data-compliance-proof-lane") || ""),
      proofIntakeText: document.querySelector("[data-compliance-proof-intake]")?.innerText || "",
      proofPacketText: document.querySelector("#complianceProofIntakePacket")?.value || "",
      counts: runbook.visibleCounts || {},
      rowText: Array.from(document.querySelectorAll(".backend-sync-row")).find(row => row.innerText.includes("KYC money limits"))?.innerText || "",
      modalText: document.querySelector("#modal .modal-body")?.innerText || "",
      events: (state.backendEvents || []).map(row => ({ label: row.label, detail: row.detail, nonSettling: row.nonSettling, complianceRunbook: row.complianceRunbook })),
      auditTrailText: document.querySelector("#backendAuditTrailList")?.innerText || "",
      tagTexts: Array.from(document.querySelectorAll("#backendAuditTrailList .backend-event-tags")).map(row => row.innerText.replace(/\s+/g, " ").trim())
    };
  }, KEY);
  const complianceEvent = complianceRunbookState.events.find(row => row.label === "KYC money runbook checked");
  assert(complianceRunbookState.account === "artbook_ops" && complianceRunbookState.status === "fetched" && !complianceRunbookState.lastError, `KYC money runbook fetch failed: ${complianceRunbookState.lastError}`);
  assert(complianceRunbookState.settlementStatus === "compliance_runbook_review_only_no_money_movement" && complianceRunbookState.moneyMovementEnabled === false && complianceRunbookState.providerVerified === false && complianceRunbookState.spendable === false, "KYC money runbook should be non-settling in UI state");
  assert(complianceRunbookState.approvalAuthority === "provider_or_human_review_required" && complianceRunbookState.tierIds.includes("local_prototype") && complianceRunbookState.tierIds.includes("identity_started") && complianceRunbookState.tierIds.includes("seller_creator_or_courier") && complianceRunbookState.tierIds.includes("enhanced_or_cross_border"), "KYC money runbook missing wallet tier proposals");
  assert(complianceRunbookState.tierStatuses.includes("current_no_live_money") && complianceRunbookState.tierStatuses.includes("manual_review_only_no_auto_limit"), "wallet tiers should keep prototype and enhanced cases blocked");
  assert(complianceRunbookState.triggerIds.includes("money_or_payout_scope") && complianceRunbookState.triggerIds.includes("settlement_exception_hold") && complianceRunbookState.triggerIds.includes("delivery_or_cash_handling"), "KYC money runbook missing source-of-funds triggers");
  assert(complianceRunbookState.runbookSteps.includes("identity_country_review") && complianceRunbookState.runbookSteps.includes("source_of_funds_review") && complianceRunbookState.runbookSteps.includes("settlement_hold_review"), "KYC money runbook missing operator steps");
  assert(complianceRunbookState.blockedActions.includes("approve_identity") && complianceRunbookState.blockedActions.includes("move_money") && complianceRunbookState.blockedActions.includes("raise_wallet_limits") && complianceRunbookState.blockedActions.includes("make_spendable_balance"), "KYC money runbook missing protected action blocks");
  assert(complianceRunbookState.requiredEvidence.some(row => /source-of-funds/i.test(row)) && complianceRunbookState.redactionFields.includes("raw ID images") && complianceRunbookState.redactionFields.includes("provider secrets"), "KYC money runbook should expose evidence checklist and redaction fields");
  assert(["customer_wallet","seller_business","courier_cash","cross_border"].every(id => complianceRunbookState.proofLaneIds.includes(id)), "compliance proof intake should expose customer, business, courier and cross-border lanes");
  assert(complianceRunbookState.proofIntakeText.includes("Proof collection plan") && complianceRunbookState.proofIntakeText.includes("provider/human approval") && complianceRunbookState.proofIntakeText.includes("money blocked"), "compliance proof intake panel did not render the review-only summary");
  assert(complianceRunbookState.proofPacketText.includes("Artbook KYC/KYB Proof Intake Packet") && complianceRunbookState.proofPacketText.includes("Customer wallet and local buyer") && complianceRunbookState.proofPacketText.includes("Business, seller or creator receiving money") && complianceRunbookState.proofPacketText.includes("Courier, transporter or cash-handling role") && complianceRunbookState.proofPacketText.includes("Residence, visa or cross-border operating country"), "compliance proof packet did not include all proof lanes");
  assert(complianceRunbookState.proofPacketText.includes("Boundary: proof intake is a collection and review plan only") && complianceRunbookState.proofPacketText.includes("Money enabled: false_blocked") && !/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(complianceRunbookState.proofPacketText), "compliance proof packet should stay blocked, redacted and non-approving");
  assert(typeof complianceRunbookState.counts.jurisdictionProfiles === "number" && typeof complianceRunbookState.counts.verificationAiDrafts === "number" && typeof complianceRunbookState.counts.walletLedger === "number" && typeof complianceRunbookState.counts.walletRequests === "number", "KYC money runbook should summarize backend identity and wallet count fields");
  assert(complianceRunbookState.rowText.includes("KYC money limits") && complianceRunbookState.rowText.includes("money remains blocked"), "sync plan row did not summarize KYC money runbook");
  assert(complianceRunbookState.modalText.includes("KYC and money limits") && complianceRunbookState.modalText.includes("Compliance proof intake") && complianceRunbookState.modalText.includes("Source-of-funds triggers") && complianceRunbookState.modalText.includes("Wallet limit tiers") && complianceRunbookState.modalText.includes("Operator runbook") && complianceRunbookState.modalText.includes("Money: blocked"), "KYC money runbook did not render the backend sync section");
  assert(complianceEvent?.complianceRunbook === true && complianceEvent?.nonSettling === true && /provider\/human review required/.test(complianceEvent.detail || ""), "KYC money runbook audit row did not preserve review-only boundary");
  assert(complianceRunbookState.auditTrailText.includes("KYC money runbook checked") && complianceRunbookState.tagTexts.some(text => text.includes("kyc runbook") && text.includes("money blocked")), "KYC money runbook audit tags did not render");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async text => { window.__artbookCopiedTexts = [...(window.__artbookCopiedTexts || []), text]; } }
    });
    App.copyProviderReadinessSnapshot();
    App.copyReleaseEvidencePacket();
    App.copyFounderActionSummary();
    App.copyFounderFinanceExportPacket();
    App.copyFounderPartnerBrief("payments");
    App.copyAndroidReleaseHandoffPacket();
    App.copyPlayStoreSafetyPacket();
    App.copyPlayBillingHandoffPacket();
    App.copyPlayReviewerAccessPacket();
    App.copyComplianceProofIntakePacket();
  });
  await page.waitForTimeout(160);
  const handoffCopyAuditState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const events = state.backendEvents || [];
    const snapshot = events.find(row => row.label === "Release handoff snapshot copied");
    const packet = events.find(row => row.label === "Release handoff packet copied");
    const founder = events.find(row => row.label === "Founder action summary copied");
    const founderFinance = events.find(row => row.label === "Founder finance export copied");
    const partner = events.find(row => row.label === "Founder partner brief copied");
    const android = events.find(row => row.label === "Android release handoff copied");
    const playstore = events.find(row => row.label === "Play Store safety handoff copied");
    const playbilling = events.find(row => row.label === "Play Billing handoff copied");
    const playreview = events.find(row => row.label === "Play reviewer access handoff copied");
    const proof = events.find(row => row.label === "KYC proof intake packet copied");
    return {
      copiedCount: (window.__artbookCopiedTexts || []).length,
      snapshot,
      packet,
      founder,
      founderFinance,
      partner,
      android,
      playstore,
      playbilling,
      playreview,
      proof,
      latestLabels: events.slice(0,10).map(row => row.label),
      auditTrailText: document.querySelector("#backendAuditTrailList")?.innerText || "",
      auditTrailCount: document.querySelector("#backendAuditTrailCount")?.innerText || "",
      tagTexts: Array.from(document.querySelectorAll("#backendAuditTrailList .backend-event-tags")).map(row => row.innerText.replace(/\s+/g, " ").trim())
    };
  }, KEY);
  assert(handoffCopyAuditState.copiedCount === 10, "handoff copy buttons did not invoke clipboard writes");
  assert(handoffCopyAuditState.snapshot?.handoffCopy === true && handoffCopyAuditState.snapshot?.handoffKind === "snapshot" && handoffCopyAuditState.snapshot?.nonSettling === true && /review-only/.test(handoffCopyAuditState.snapshot?.detail || "") && /no release approval or money movement/.test(handoffCopyAuditState.snapshot?.detail || ""), "snapshot copy audit row did not preserve review-only boundary");
  assert(handoffCopyAuditState.packet?.handoffCopy === true && handoffCopyAuditState.packet?.handoffKind === "packet" && handoffCopyAuditState.packet?.nonSettling === true && /review-only/.test(handoffCopyAuditState.packet?.detail || "") && /no release approval or money movement/.test(handoffCopyAuditState.packet?.detail || "") && /packet/.test(handoffCopyAuditState.packet?.detail || ""), "packet copy audit row did not preserve review-only boundary");
  assert(handoffCopyAuditState.founder?.handoffCopy === true && handoffCopyAuditState.founder?.founderActionSummary === true && handoffCopyAuditState.founder?.nonSettling === true && /no provider state, Play Store approval, settlement or money movement changed/.test(handoffCopyAuditState.founder?.detail || ""), "founder action summary copy audit row did not preserve non-settling handoff boundary");
  assert(handoffCopyAuditState.founderFinance?.handoffCopy === true && handoffCopyAuditState.founderFinance?.handoffKind === "founder-finance" && handoffCopyAuditState.founderFinance?.founderFinanceExport === true && handoffCopyAuditState.founderFinance?.nonSettling === true && /no provider state, Play Billing payout, settlement, wallet credit, refund, payout, tax filing or founder revenue changed/.test(handoffCopyAuditState.founderFinance?.detail || ""), "founder finance export copy audit row did not preserve non-recognition boundary");
  assert(handoffCopyAuditState.partner?.handoffCopy === true && handoffCopyAuditState.partner?.handoffKind === "partner" && handoffCopyAuditState.partner?.founderPartnerBrief === "payments" && handoffCopyAuditState.partner?.nonSettling === true && /no provider state, Play Store approval, settlement, dispatch, wallet credit, refund, payout or founder revenue changed/.test(handoffCopyAuditState.partner?.detail || ""), "founder partner brief copy audit row did not preserve non-settling handoff boundary");
  assert(handoffCopyAuditState.android?.handoffCopy === true && handoffCopyAuditState.android?.handoffKind === "android" && handoffCopyAuditState.android?.androidReleaseHandoff === true && handoffCopyAuditState.android?.nonSettling === true && /no release key, store approval, provider state, settlement, dispatch, wallet credit, refund, payout or founder revenue changed/.test(handoffCopyAuditState.android?.detail || ""), "Android release handoff copy audit row did not preserve non-publishing boundary");
  assert(handoffCopyAuditState.playstore?.handoffCopy === true && handoffCopyAuditState.playstore?.handoffKind === "playstore" && handoffCopyAuditState.playstore?.playStoreSafetyHandoff === true && handoffCopyAuditState.playstore?.nonSettling === true && /no Data Safety submission, store approval, billing enablement, restricted-content publishing, provider state, settlement, wallet credit, refund, payout or founder revenue changed/.test(handoffCopyAuditState.playstore?.detail || ""), "Play Store safety handoff copy audit row did not preserve non-submission boundary");
  assert(handoffCopyAuditState.playbilling?.handoffCopy === true && handoffCopyAuditState.playbilling?.handoffKind === "playbilling" && handoffCopyAuditState.playbilling?.playBillingHandoff === true && handoffCopyAuditState.playbilling?.nonSettling === true && /no Billing enablement, Play Console product creation, purchase-token verification, entitlement grant, store approval, settlement, wallet credit, refund, payout or founder revenue changed/.test(handoffCopyAuditState.playbilling?.detail || ""), "Play Billing handoff copy audit row did not preserve non-entitlement boundary");
  assert(handoffCopyAuditState.playreview?.handoffCopy === true && handoffCopyAuditState.playreview?.handoffKind === "playreview" && handoffCopyAuditState.playreview?.playReviewerAccessHandoff === true && handoffCopyAuditState.playreview?.nonSettling === true && /no App access submission, reviewer access approval, privacy policy publication, deletion compliance approval, store approval, billing enablement, provider state, settlement, wallet credit, refund, payout or founder revenue changed/.test(handoffCopyAuditState.playreview?.detail || ""), "Play reviewer access handoff copy audit row did not preserve non-submission boundary");
  assert(handoffCopyAuditState.proof?.complianceProofIntake === true && handoffCopyAuditState.proof?.nonSettling === true && /no identity approval, wallet limit increase, settlement, dispatch, refund, payout, spendable balance or founder revenue changed/.test(handoffCopyAuditState.proof?.detail || ""), "KYC proof intake copy audit row did not preserve non-approving boundary");
  assert(handoffCopyAuditState.latestLabels.includes("Release handoff snapshot copied") && handoffCopyAuditState.latestLabels.includes("Release handoff packet copied") && handoffCopyAuditState.latestLabels.includes("Founder action summary copied") && handoffCopyAuditState.latestLabels.includes("Founder finance export copied") && handoffCopyAuditState.latestLabels.includes("Founder partner brief copied") && handoffCopyAuditState.latestLabels.includes("Android release handoff copied") && handoffCopyAuditState.latestLabels.includes("Play Store safety handoff copied") && handoffCopyAuditState.latestLabels.includes("Play Billing handoff copied") && handoffCopyAuditState.latestLabels.includes("Play reviewer access handoff copied"), "handoff copy audit rows were not added to the latest backend trail");
  assert(handoffCopyAuditState.auditTrailText.includes("Release handoff snapshot copied") && handoffCopyAuditState.auditTrailText.includes("Release handoff packet copied") && handoffCopyAuditState.auditTrailText.includes("Founder action summary copied") && handoffCopyAuditState.auditTrailText.includes("Founder finance export copied") && handoffCopyAuditState.auditTrailText.includes("Founder partner brief copied") && handoffCopyAuditState.auditTrailText.includes("Android release handoff copied") && handoffCopyAuditState.auditTrailText.includes("Play Store safety handoff copied") && handoffCopyAuditState.auditTrailText.includes("Play Billing handoff copied") && handoffCopyAuditState.auditTrailText.includes("Play reviewer access handoff copied") && handoffCopyAuditState.auditTrailText.includes("KYC proof intake packet copied"), "handoff copy audit rows did not refresh into the visible backend trail");
  assert(handoffCopyAuditState.tagTexts.some(text => text.includes("handoff copy") && text.includes("snapshot") && text.includes("review only") && text.includes("no money move")), "snapshot copy audit row did not render compact tags");
  assert(handoffCopyAuditState.tagTexts.some(text => text.includes("handoff copy") && text.includes("packet") && text.includes("review only") && text.includes("no money move")), "packet copy audit row did not render compact tags");
  assert(handoffCopyAuditState.tagTexts.some(text => text.includes("handoff copy") && text.includes("founder-finance") && text.includes("review only") && text.includes("no money move")), "founder finance export copy audit row did not render compact review-only tags");
  assert(handoffCopyAuditState.tagTexts.some(text => text.includes("handoff copy") && text.includes("partner") && text.includes("review only") && text.includes("no money move")), "partner brief copy audit row did not render compact tags");
  assert(handoffCopyAuditState.tagTexts.some(text => text.includes("handoff copy") && text.includes("android") && text.includes("review only") && text.includes("no money move")), "Android release handoff copy audit row did not render compact tags");
  assert(handoffCopyAuditState.tagTexts.some(text => text.includes("handoff copy") && text.includes("playstore") && text.includes("review only") && text.includes("no money move")), "Play Store safety handoff copy audit row did not render compact tags");
  assert(handoffCopyAuditState.tagTexts.some(text => text.includes("handoff copy") && text.includes("playbilling") && text.includes("review only") && text.includes("no money move")), "Play Billing handoff copy audit row did not render compact tags");
  assert(handoffCopyAuditState.tagTexts.some(text => text.includes("handoff copy") && text.includes("playreview") && text.includes("review only") && text.includes("no money move")), "Play reviewer access handoff copy audit row did not render compact tags");
  assert(handoffCopyAuditState.tagTexts.some(text => text.includes("kyc runbook") && text.includes("money blocked") && text.includes("review only")), "KYC proof intake copy audit row did not render compact review-only tags");
  assert(Number(handoffCopyAuditState.auditTrailCount) >= 2, "handoff copy audit did not refresh the visible backend event count");

  await page.evaluate(() => App.setBackendAuditFilter("handoff"));
  await page.waitForTimeout(80);
  const handoffAuditFilterState = await page.evaluate(() => ({
    text: document.querySelector("#backendAuditTrailList")?.innerText || "",
    count: document.querySelector("#backendAuditTrailCount")?.innerText || "",
    categoryLegend: document.querySelector("#backendAuditFilterLegend")?.innerText || "",
    filters: document.querySelector("#backendAuditTrailFilters")?.innerText || "",
    active: document.querySelector("#backendAuditTrailFilters .chip.on")?.innerText || ""
  }));
  assert(handoffAuditFilterState.active.includes("Handoff") && handoffAuditFilterState.text.includes("Release handoff snapshot copied") && handoffAuditFilterState.text.includes("Release handoff packet copied") && handoffAuditFilterState.text.includes("Founder action summary copied") && handoffAuditFilterState.text.includes("Founder finance export copied") && handoffAuditFilterState.text.includes("Founder partner brief copied") && handoffAuditFilterState.text.includes("Android release handoff copied") && handoffAuditFilterState.text.includes("Play Store safety handoff copied") && handoffAuditFilterState.text.includes("Play Billing handoff copied") && handoffAuditFilterState.text.includes("Play reviewer access handoff copied") && !handoffAuditFilterState.text.includes("KYC proof intake packet copied") && !handoffAuditFilterState.text.includes("Provider readiness checked") && /^\d+\/\d+$/.test(handoffAuditFilterState.count), "handoff audit filter did not isolate handoff copy events");
  assert(handoffAuditFilterState.categoryLegend.includes("Current account only") && handoffAuditFilterState.categoryLegend.includes("Handoff: snapshots, packets") && handoffAuditFilterState.categoryLegend.includes("Settlement: payout, refund holds") && handoffAuditFilterState.categoryLegend.includes("Trust: seals, reports, moderation") && handoffAuditFilterState.categoryLegend.includes("Other: provider, wallet, work evidence") && handoffAuditFilterState.categoryLegend.includes("Display-only filters") && !/Handoff\s+2/.test(handoffAuditFilterState.categoryLegend) && !/Trust\s+\d+/.test(handoffAuditFilterState.categoryLegend), "handoff copy audit legend repeated chip counts instead of staying contextual");
  assert(/Handoff\s+9/.test(handoffAuditFilterState.filters), "handoff copy audit did not refresh the Handoff filter chip count");
  await page.evaluate(() => App.setBackendAuditFilter("all"));
  await page.waitForTimeout(80);

  await page.evaluate(() => App.toggleReleaseChecklistItem("backend", "raw_body_webhook_signatures", true));
  await page.waitForTimeout(160);
  const releaseChecklistState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const readiness = state.backendProviderReadiness?.readiness || {};
    return {
      checked: !!state.backendReleaseChecks?.["backend:raw_body_webhook_signatures"],
      releaseTotal: readiness.releaseChecklist?.summary?.totalCount || 0,
      moneyMovementEnabled: readiness.releaseChecklist?.moneyMovementEnabled,
      providerVerified: readiness.releaseChecklist?.providerVerified,
      spendable: readiness.releaseChecklist?.spendable,
      events: (state.backendEvents || []).map(row => row.label),
      historyCount: (state.backendReleaseEvidenceHistory || []).length,
      historyChecked: state.backendReleaseEvidenceHistory?.[0]?.checklistChecked,
      historyPacketText: state.backendReleaseEvidenceHistory?.[0]?.packetText || "",
      evidenceText: document.querySelector("#releaseEvidencePacket")?.value || "",
      packetSummaryText: document.querySelector("#releaseEvidencePacketSummary")?.innerText || "",
      evidenceSummaryText: Array.from(document.querySelectorAll(".backend-sync-row")).find(row => row.innerText.includes("Evidence export"))?.innerText || "",
      handoffPreviewText: document.querySelector("#backendHandoffExportPreview")?.innerText || "",
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, KEY);
  const tickedChecklist = `1/${Number(releaseChecklistState.releaseTotal || 0)}`;
  assert(releaseChecklistState.checked && releaseChecklistState.events.includes("Release checklist ticked") && new RegExp(`${tickedChecklist.replace("/", "\\/")}\\s+local`, "i").test(releaseChecklistState.text), "release checklist local tick did not persist or render");
  assert(releaseChecklistState.evidenceText.includes(`Local checklist checked: ${tickedChecklist}`) && releaseChecklistState.evidenceText.includes("Raw-body webhook signature capture"), "release evidence packet did not refresh local checklist progress");
  assert(releaseChecklistState.packetSummaryText.includes(`Checklist: ${tickedChecklist}`) && releaseChecklistState.packetSummaryText.includes("Money: blocked"), "release evidence packet summary did not refresh checklist progress or preserve money block");
  assert(releaseChecklistState.historyCount === 1 && releaseChecklistState.historyChecked === 1 && releaseChecklistState.historyPacketText.includes(`Local checklist checked: ${tickedChecklist}`), "release evidence history did not refresh the current packet after a checklist tick");
  assert(releaseChecklistState.evidenceSummaryText.includes(`Checklist: ${tickedChecklist}`) && releaseChecklistState.evidenceSummaryText.includes("History: 1 packet"), "release evidence export summary row did not refresh local checklist progress");
  assert(releaseChecklistState.handoffPreviewText.includes(`Checklist: ${tickedChecklist}`) && releaseChecklistState.handoffPreviewText.includes("Snapshot: copy-ready") && releaseChecklistState.handoffPreviewText.includes("Packet: copy-ready"), "handoff export preview did not refresh local checklist progress");
  assert(releaseChecklistState.moneyMovementEnabled === false && releaseChecklistState.providerVerified === false && releaseChecklistState.spendable === false, "release checklist local tick should not enable providers or settlement");

  await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const current = stored.backendReleaseEvidenceHistory?.[0];
    if (current) {
      stored.backendReleaseEvidenceHistory = [
        current,
        {
          ...current,
          id: "0000000000000000000000000000000000000000000000000000000000000000::1::previous",
          apkSha: "0000000000000000000000000000000000000000000000000000000000000000",
          progressTitle: "Previous audit packet",
          checklistChecked: 0,
          capturedAt: "previous",
          packetText: "Previous release evidence packet"
        }
      ];
      localStorage.setItem(key, JSON.stringify(stored));
    }
  }, KEY);
  await page.reload();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    App.setAccount("artbook_ops", { silent: true });
    App.backendSyncDesk("history seeded");
  });
  await page.waitForTimeout(160);
  const historyCompareState = await page.evaluate(() => {
    const historyPacketRows = document.querySelector("#releaseEvidencePacketHistory");
    const historyDiffDetails = document.querySelector("#releaseEvidenceDiffDetails");
    return {
      text: document.querySelector("#modal .modal-body")?.innerText || "",
      summaryText: document.querySelector("#releaseEvidenceHistorySummary")?.innerText || "",
      packetHistoryText: historyPacketRows?.innerText || "",
      diffText: historyDiffDetails?.textContent || "",
      diffCollapsed: historyDiffDetails ? !historyDiffDetails.open : false,
      packetBeforeDiff: !!(historyPacketRows && historyDiffDetails && (historyPacketRows.compareDocumentPosition(historyDiffDetails) & Node.DOCUMENT_POSITION_FOLLOWING))
    };
  });
  assert(historyCompareState.text.includes("Evidence history") && historyCompareState.text.includes("Latest vs previous packet") && historyCompareState.text.includes("Packet history") && historyCompareState.text.includes("Diff reasons") && historyCompareState.summaryText.includes("Latest:") && historyCompareState.summaryText.includes(`Checklist: ${tickedChecklist}`) && historyCompareState.summaryText.includes("Diff: 3 changed") && historyCompareState.summaryText.includes("Phone:") && historyCompareState.packetHistoryText.includes("Latest packet") && historyCompareState.packetHistoryText.includes("Previous packet") && historyCompareState.packetHistoryText.includes("Previous audit packet") && historyCompareState.packetBeforeDiff && historyCompareState.diffCollapsed, "release evidence history drawer did not prioritize compact summary and packet actions before diff details");
  assert(historyCompareState.diffText.includes("APK hash changed") && historyCompareState.diffText.includes("Audit section changed") && historyCompareState.diffText.includes("Checklist count changed") && historyCompareState.diffText.includes("Phone install status unchanged") && historyCompareState.diffText.includes("Before: 00000000") && historyCompareState.diffText.includes("After:"), "release evidence history diff details did not compare latest and previous packets");
  assert(historyCompareState.text.includes("Evidence export") && historyCompareState.text.includes("History: 2 packets") && historyCompareState.text.includes("Diff: 3 changed"), "release evidence export summary row did not surface previous-packet diff status");

  await page.evaluate(() => App.setAccount("riley_biz", { silent: true }));

  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const id = state.backendSettlementExceptions?.queue?.[0]?.id;
    if (id) App.settlementExceptionDryRun(id);
  }, KEY);
  await page.waitForTimeout(120);
  const settlementDryRunText = await page.evaluate(() => document.querySelector("#modal .modal-body")?.innerText || "");
  assert(settlementDryRunText.includes("Dry-run only") && settlementDryRunText.includes("no payout") && settlementDryRunText.includes("Operator plan") && settlementDryRunText.includes("Backend note locked"), "settlement exception dry-run did not explain safe operator plan");
  assert(settlementDryRunText.includes("Work evidence") && settlementDryRunText.includes("Provider receipt placeholder") && settlementDryRunText.includes("Support timeline"), "settlement exception dry-run did not show support evidence timeline");

  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const id = state.backendSettlementExceptions?.queue?.[0]?.id;
    App.setAccount("artbook_ops", { silent: true });
    if (id) App.settlementExceptionDryRun(id);
  }, KEY);
  await page.waitForTimeout(160);
  await page.fill("#settlementReviewNote", "Ops keeps this payout held until provider reconciliation clears.");
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const id = state.backendSettlementExceptions?.queue?.[0]?.id;
    return App.submitSettlementExceptionReview(id);
  }, KEY);
  await page.waitForTimeout(700);
  const settlementReviewNoteState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const row = state.backendSettlementExceptions?.queue?.[0] || {};
    return {
      account: state.account,
      latestDecision: row.latestReviewNote?.decision || "",
      nonSettling: row.latestReviewNote?.nonSettling === true,
      supportStatus: row.supportStatus || "",
      receiptStatus: row.providerReceipt?.status || "",
      hasTimelineReview: (row.supportTimeline || []).some(item => item.type === "review_note" && item.nonSettling),
      events: (state.backendEvents || []).map(event => event.label),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, KEY);
  assert(settlementReviewNoteState.account === "artbook_ops" && settlementReviewNoteState.latestDecision === "hold_payout" && settlementReviewNoteState.nonSettling, "review ops settlement note did not sync into local exception state");
  assert(settlementReviewNoteState.supportStatus === "await_provider_reconciliation" && settlementReviewNoteState.receiptStatus === "placeholder_required" && settlementReviewNoteState.hasTimelineReview, "review ops settlement note did not sync support timeline metadata");
  assert(settlementReviewNoteState.events.includes("Settlement review note synced") && settlementReviewNoteState.text.includes("Backend note synced") && settlementReviewNoteState.text.includes("Support timeline"), "settlement review note sync did not update modal audit surface");

  await page.fill("#settlementReceiptProvider", "mpesa");
  await page.fill("#settlementReceiptId", "MPESA-UI-001");
  await page.fill("#settlementReceiptIdempotency", "ui-idem-001");
  await page.selectOption("#settlementReceiptSignature", "unverified");
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const id = state.backendSettlementExceptions?.queue?.[0]?.id;
    return App.submitSettlementReceiptCandidate(id);
  }, KEY);
  await page.waitForTimeout(700);
  const receiptCandidateState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const row = state.backendSettlementExceptions?.queue?.[0] || {};
    return {
      receiptStatus: row.providerReceipt?.status || "",
      candidateCount: row.providerReceipt?.candidateCount || 0,
      latestReceiptId: row.providerReceipt?.latestCandidate?.receiptId || "",
      signatureStatus: row.providerReceipt?.signatureStatus || "",
      idempotencyStatus: row.providerReceipt?.idempotencyStatus || "",
      supportStatus: row.supportStatus || "",
      hasCandidateTimeline: (row.supportTimeline || []).some(item => item.type === "provider_receipt_candidate" && item.nonSettling),
      events: (state.backendEvents || []).map(event => event.label),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, KEY);
  assert(receiptCandidateState.receiptStatus === "candidate_recorded_not_reconciled" && receiptCandidateState.candidateCount === 1 && receiptCandidateState.latestReceiptId === "MPESA-UI-001", "receipt candidate did not sync into local settlement exception");
  assert(receiptCandidateState.signatureStatus === "unverified" && receiptCandidateState.idempotencyStatus === "recorded_unique_candidate" && receiptCandidateState.supportStatus === "provider_receipt_candidate_review" && receiptCandidateState.hasCandidateTimeline, "receipt candidate did not preserve signature/idempotency timeline state");
  assert(receiptCandidateState.events.includes("Settlement receipt candidate logged") && receiptCandidateState.text.includes("Latest candidate") && receiptCandidateState.text.includes("Receipt candidate intake"), "receipt candidate did not update modal audit surface");
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const id = state.backendSettlementExceptions?.queue?.[0]?.id;
    return App.fetchSettlementReconciliationPreview(id);
  }, KEY);
  await page.waitForTimeout(700);
  const reconciliationPreviewState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const row = state.backendSettlementExceptions?.queue?.[0] || {};
    const preview = row.reconciliationPreview || {};
    const checks = preview.candidates?.[0]?.checks || [];
    return {
      status: preview.settlementStatus || "",
      providerVerified: preview.providerVerified,
      spendable: preview.spendable,
      reasons: preview.mismatchReasons || [],
      amountOk: checks.some(check => check.key === "amount_match" && check.ok),
      currencyOk: checks.some(check => check.key === "currency_match" && check.ok),
      partiesOk: checks.some(check => check.key === "parties_match" && check.ok),
      events: (state.backendEvents || []).map(event => event.label),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, KEY);
  assert(reconciliationPreviewState.status === "preview_only_no_settlement" && reconciliationPreviewState.providerVerified === false && reconciliationPreviewState.spendable === false, "reconciliation preview should remain non-settling");
  assert(reconciliationPreviewState.amountOk && reconciliationPreviewState.currencyOk && reconciliationPreviewState.partiesOk && reconciliationPreviewState.reasons.includes("signature_not_verified"), "reconciliation preview did not compare amount currency parties and signature state");
  assert(reconciliationPreviewState.events.includes("Settlement reconciliation preview") && reconciliationPreviewState.text.includes("Reconciliation preview"), "reconciliation preview did not update modal audit surface");
  await page.fill("#settlementReceiptId", "MPESA-WEBHOOK-UI-001");
  await page.fill("#settlementReceiptIdempotency", "ui-webhook-idem-001");
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const id = state.backendSettlementExceptions?.queue?.[0]?.id;
    return App.dryRunSettlementWebhook(id);
  }, KEY);
  await page.waitForTimeout(700);
  const webhookDryRunState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const row = state.backendSettlementExceptions?.queue?.[0] || {};
    const dryRun = row.webhookDryRun || {};
    const preview = dryRun.preview || {};
    const event = (row.webhookEvents || [])[0] || {};
    return {
      failClosed: dryRun.failClosed === true,
      targetFound: dryRun.targetFound === true,
      receiptId: dryRun.receiptCandidatePayload?.receiptId || "",
      eventDecision: event.idempotencyDecision || "",
      eventStatus: event.settlementStatus || "",
      eventDigest: event.payloadDigest || "",
      status: dryRun.settlementStatus || "",
      previewStatus: preview.settlementStatus || "",
      reasons: dryRun.mismatchReasons || [],
      providerVerified: dryRun.providerVerified,
      spendable: dryRun.spendable,
      events: (state.backendEvents || []).map(event => event.label),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, KEY);
  assert(webhookDryRunState.failClosed && webhookDryRunState.targetFound && webhookDryRunState.receiptId === "MPESA-WEBHOOK-UI-001", "webhook dry-run did not map provider payload into local settlement state");
  assert(webhookDryRunState.status === "webhook_dry_run_only_no_settlement" && webhookDryRunState.previewStatus === "preview_only_no_settlement" && webhookDryRunState.providerVerified === false && webhookDryRunState.spendable === false, "webhook dry-run should remain fail-closed and non-settling");
  assert(webhookDryRunState.eventDecision === "first_seen_unverified_no_settlement" && webhookDryRunState.eventStatus === "webhook_event_replay_only_no_settlement" && webhookDryRunState.eventDigest.startsWith("sha256:"), "webhook dry-run did not merge replay ledger event metadata");
  assert(webhookDryRunState.reasons.includes("signature_not_verified") && webhookDryRunState.reasons.includes("idempotency_not_unique"), "webhook dry-run did not surface signature/idempotency review reasons");
  assert(webhookDryRunState.events.includes("Settlement webhook dry-run parsed") && webhookDryRunState.text.includes("Webhook dry-run") && webhookDryRunState.text.includes("Webhook event ledger") && webhookDryRunState.text.includes("Provider still fail-closed"), "webhook dry-run did not update modal audit surface");
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const id = state.backendSettlementExceptions?.queue?.[0]?.id;
    return App.fetchSettlementWebhookEvents(id);
  }, KEY);
  await page.waitForTimeout(700);
  const webhookEventLedgerState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const row = state.backendSettlementExceptions?.queue?.[0] || {};
    return {
      count: (row.webhookEvents || []).length,
      decisions: (row.webhookEvents || []).map(item => item.idempotencyDecision),
      receiptIds: (row.webhookEvents || []).map(item => item.providerReceiptId),
      events: (state.backendEvents || []).map(event => event.label),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, KEY);
  assert(webhookEventLedgerState.count >= 1 && webhookEventLedgerState.decisions.includes("first_seen_unverified_no_settlement") && webhookEventLedgerState.receiptIds.includes("MPESA-WEBHOOK-UI-001"), "webhook event replay ledger fetch did not load provider event metadata");
  assert(webhookEventLedgerState.events.includes("Settlement webhook events fetched") && webhookEventLedgerState.text.includes("Webhook event ledger") && webhookEventLedgerState.text.includes("Replay-only"), "webhook event replay ledger did not update modal audit surface");
  await page.selectOption("#settlementWebhookEventDecision", "needs_provider_fetch");
  await page.fill("#settlementWebhookEventNote", "Review Ops needs server-to-server M-Pesa status before any receipt candidate.");
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const id = state.backendSettlementExceptions?.queue?.[0]?.id;
    return App.submitSettlementWebhookEventDecision(id);
  }, KEY);
  await page.waitForTimeout(700);
  const webhookEventDecisionState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const row = state.backendSettlementExceptions?.queue?.[0] || {};
    const event = (row.webhookEvents || []).find(item => item.providerReceiptId === "MPESA-WEBHOOK-UI-001") || {};
    const decision = event.latestReviewDecision || {};
    return {
      decision: decision.decision || "",
      decisionStatus: event.decisionStatus || "",
      reviewCount: event.reviewCount || 0,
      nonSettling: event.nonSettling === true && decision.nonSettling === true,
      providerVerified: event.providerVerified,
      spendable: event.spendable,
      events: (state.backendEvents || []).map(event => event.label),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, KEY);
  assert(webhookEventDecisionState.decision === "needs_provider_fetch" && webhookEventDecisionState.decisionStatus === "provider_fetch_required_no_settlement" && webhookEventDecisionState.reviewCount >= 1, "webhook event decision did not sync into local modal state");
  assert(webhookEventDecisionState.nonSettling && webhookEventDecisionState.providerVerified === false && webhookEventDecisionState.spendable === false, "webhook event decision mutated settlement flags in UI state");
  assert(webhookEventDecisionState.events.includes("Settlement webhook event classified") && webhookEventDecisionState.text.includes("Webhook event decision") && webhookEventDecisionState.text.includes("needs_provider_fetch"), "webhook event decision did not update modal audit surface");
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const id = state.backendSettlementExceptions?.queue?.[0]?.id;
    return App.fetchSettlementWebhookFixtures(id);
  }, KEY);
  await page.waitForTimeout(700);
  const webhookFixtureState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const row = state.backendSettlementExceptions?.queue?.[0] || {};
    const fixtures = row.webhookFixtures || {};
    return {
      status: fixtures.settlementStatus || "",
      nonSettling: fixtures.nonSettling === true,
      templateIds: (fixtures.templates || []).map(item => item.id),
      dryRunTargets: (fixtures.templates || []).map(item => item.dryRun?.targetFound === true),
      handoff: fixtures.signatureHandoff || [],
      events: (state.backendEvents || []).map(event => event.label),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, KEY);
  assert(webhookFixtureState.status === "fixture_templates_only_no_settlement" && webhookFixtureState.nonSettling, "webhook fixture templates should remain non-settling");
  assert(webhookFixtureState.templateIds.includes("mpesa_daraja_stk_callback") && webhookFixtureState.templateIds.includes("card_checkout_settled") && webhookFixtureState.templateIds.includes("payout_disbursement_paid"), "webhook fixtures did not include mobile money card and payout templates");
  assert(webhookFixtureState.dryRunTargets.every(Boolean) && webhookFixtureState.handoff.some(row => /raw webhook bodies/i.test(row)), "webhook fixtures should include target dry-runs and signature handoff notes");
  assert(webhookFixtureState.events.includes("Settlement webhook fixtures fetched") && webhookFixtureState.text.includes("Webhook fixtures") && webhookFixtureState.text.includes("M-Pesa/Daraja") && webhookFixtureState.text.includes("Card checkout") && webhookFixtureState.text.includes("Payout rail"), "webhook fixtures did not update modal audit surface");
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const id = state.backendSettlementExceptions?.queue?.[0]?.id;
    return App.fetchSettlementProviderFetchProof(id);
  }, KEY);
  await page.waitForTimeout(700);
  const providerFetchProofState = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const row = state.backendSettlementExceptions?.queue?.[0] || {};
    const proof = row.providerFetchProof || {};
    return {
      status: proof.settlementStatus || "",
      nonSettling: proof.nonSettling === true,
      providerVerified: proof.providerVerified,
      spendable: proof.spendable,
      planIds: (proof.plans || []).map(item => item.id),
      secrets: (proof.plans || []).flatMap(item => item.requiredSecrets || []),
      controls: proof.requiredServerControls || [],
      blocked: proof.blockedTransitions || [],
      events: (state.backendEvents || []).map(event => event.label),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, KEY);
  assert(providerFetchProofState.status === "provider_fetch_stub_only_no_settlement" && providerFetchProofState.nonSettling && providerFetchProofState.providerVerified === false && providerFetchProofState.spendable === false, "provider fetch proof stub should remain non-settling in UI state");
  assert(providerFetchProofState.planIds.includes("mpesa_daraja_transaction_status") && providerFetchProofState.planIds.includes("card_checkout_payment_intent_fetch") && providerFetchProofState.planIds.includes("payout_rail_transfer_fetch"), "provider fetch proof did not include all rail plans");
  assert(providerFetchProofState.secrets.includes("DARAJA_CONSUMER_KEY") && providerFetchProofState.secrets.includes("CARD_PROVIDER_SECRET_KEY") && providerFetchProofState.secrets.includes("PAYOUT_PROVIDER_API_KEY"), "provider fetch proof did not expose required server-side secret checklist");
  assert(providerFetchProofState.controls.some(row => /secrets outside the APK/i.test(row)) && providerFetchProofState.blocked.includes("spendable_balance_credit"), "provider fetch proof did not show server controls and blocked transitions");
  assert(providerFetchProofState.events.includes("Settlement provider fetch proof fetched") && providerFetchProofState.text.includes("Provider fetch proof") && providerFetchProofState.text.includes("M-Pesa/Daraja transaction status fetch"), "provider fetch proof did not update modal audit surface");
  await page.evaluate(() => App.setAccount("riley_biz", { silent: true }));

  await page.evaluate(() => App.pilotModerationDesk());
  await page.waitForTimeout(160);
  const moderationQueueText = await page.evaluate(() => document.body.innerText || "");
  assert(moderationQueueText.includes("Pilot moderation") && moderationQueueText.includes("Resolver mapping") && moderationQueueText.includes("Queue rows") && moderationQueueText.includes("Backend queue"), "pilot moderation queue did not render handoff surface");
  await page.evaluate(() => App.fetchBackendModerationQueue());
  await page.waitForTimeout(160);
  const blockedModeration = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      status: state.backendModeration?.status || "",
      lastError: state.backendModeration?.lastError || "",
      events: (state.backendEvents || []).map(event => event.label),
      text: document.body.innerText || ""
    };
  }, KEY);
  assert(blockedModeration.status === "blocked" && blockedModeration.lastError === "moderator_role_required", "normal account was not blocked from backend moderation queue");
  assert(blockedModeration.events.includes("Moderation queue fetch blocked") && blockedModeration.text.includes("Backend queue locked"), "blocked moderation queue did not show role-gated state");
  const conflictId = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    return (state.trustReports || []).find(row => row.from === "riley_biz" && row.to === "riley_artist" && row.status === "conflict_review")?.id || "";
  }, KEY);
  assert(Boolean(conflictId), "conflict-review report id missing before pilot moderation detail");
  await page.evaluate(id => App.pilotModerationDetail(id), conflictId);
  await page.waitForTimeout(120);
  const moderationDetailText = await page.evaluate(() => document.body.innerText || "");
  assert(moderationDetailText.includes("Report review") && moderationDetailText.includes("Backend resolver") && moderationDetailText.includes("PATCH /api/moderation/trust-reports") && moderationDetailText.includes("request more evidence"), "pilot moderation detail did not show backend resolver decisions");
  await page.fill("#moderationNote", "Pilot reviewer needs one more customer photo before scoring.");
  await page.evaluate(id => App.pilotModerationDecision(id, "request_more_evidence"), conflictId);
  await page.waitForTimeout(160);
  const stagedModeration = await page.evaluate(({ key, id }) => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const row = (state.trustReports || []).find(report => report.id === id);
    return {
      status: row?.status || "",
      decision: row?.moderationDecision || "",
      scoring: row?.scoring || "",
      events: (state.backendEvents || []).map(event => event.label),
      notices: (state.notifications || []).map(note => note.title)
    };
  }, { key: KEY, id: conflictId });
  assert(stagedModeration.status === "under_review" && stagedModeration.decision === "requested_more_evidence" && stagedModeration.scoring === "non_scoring_until_evidence", "pilot moderation decision did not stage non-scoring evidence request");
  assert(stagedModeration.events.includes("Pilot moderation decision staged") && stagedModeration.notices.includes("Trust moderation staged"), "pilot moderation staging did not write audit trail and notice");

  await page.evaluate(() => App.setAccount("artbook_ops", { silent: true }));
  await page.waitForTimeout(120);
  await page.evaluate(() => App.pilotModerationDesk());
  await page.waitForTimeout(100);
  await page.evaluate(() => App.fetchBackendModerationQueue());
  await page.waitForTimeout(900);
  const fetchedModeration = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const queue = state.backendModeration?.queue || [];
    return {
      account: state.account,
      hasModeratorAuth: Boolean(state.backendAuthByAccount?.artbook_ops?.token),
      status: state.backendModeration?.status || "",
      lastError: state.backendModeration?.lastError || "",
      queueCount: queue.length,
      statuses: queue.map(row => row.status),
      conflictId: queue.find(row => row.status === "conflict_review")?.id || "",
      events: (state.backendEvents || []).map(event => event.label),
      text: document.body.innerText || ""
    };
  }, KEY);
  assert(fetchedModeration.account === "artbook_ops" && fetchedModeration.hasModeratorAuth, "review ops account did not become the active authenticated moderator");
  assert(fetchedModeration.status === "fetched" && !fetchedModeration.lastError, `moderator queue fetch failed: ${fetchedModeration.lastError}`);
  assert(fetchedModeration.queueCount >= 2 && fetchedModeration.statuses.includes("open") && fetchedModeration.statuses.includes("conflict_review"), "backend moderation queue did not include active and conflict reports");
  assert(fetchedModeration.events.includes("Moderation queue fetched") && fetchedModeration.text.includes("Backend queue") && fetchedModeration.text.includes("moderator review"), "moderator queue fetch did not update visible backend state");
  assert(Boolean(fetchedModeration.conflictId), "fetched backend conflict id missing");

  await page.evaluate(() => App.setAccount("riley_biz", { silent: true }));
  await page.waitForTimeout(100);
  await page.evaluate(id => App.pilotModerationBackendDetail(id), fetchedModeration.conflictId);
  await page.waitForTimeout(100);
  await page.evaluate(id => App.resolveBackendModerationRow(id, "request_more_evidence"), fetchedModeration.conflictId);
  await page.waitForTimeout(160);
  const blockedResolver = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      status: state.backendModeration?.status || "",
      lastError: state.backendModeration?.lastError || "",
      events: (state.backendEvents || []).map(event => event.label),
      text: document.body.innerText || ""
    };
  }, KEY);
  assert(blockedResolver.status === "blocked" && blockedResolver.lastError === "moderator_role_required", "normal account was not blocked from backend resolver");
  assert(blockedResolver.events.includes("Moderation resolver blocked"), "blocked backend resolver did not write audit event");

  await page.evaluate(() => App.setAccount("artbook_ops", { silent: true }));
  await page.waitForTimeout(100);
  await page.evaluate(id => App.pilotModerationBackendDetail(id), fetchedModeration.conflictId);
  await page.waitForTimeout(120);
  const backendDetailText = await page.evaluate(() => document.body.innerText || "");
  assert(backendDetailText.includes("Backend report") && backendDetailText.includes("Backend resolver row") && backendDetailText.includes("Backend resolver"), "backend moderation detail did not render resolver context");
  await page.fill("#backendModerationNote", "Backend moderator requested one more photo before scoring.");
  await page.evaluate(id => App.resolveBackendModerationRow(id, "request_more_evidence"), fetchedModeration.conflictId);
  await page.waitForTimeout(900);
  const resolvedModeration = await page.evaluate(({ key, backendId }) => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const backendRow = (state.backendModeration?.queue || []).find(row => row.id === backendId);
    const localRow = (state.trustReports || []).find(row => row.backendReportId === backendId);
    return {
      status: state.backendModeration?.status || "",
      lastError: state.backendModeration?.lastError || "",
      backendStatus: backendRow?.status || "",
      backendDecision: backendRow?.moderationDecision || "",
      backendScoring: backendRow?.scoring || "",
      localStatus: localRow?.status || "",
      localDecision: localRow?.moderationDecision || "",
      localScoring: localRow?.scoring || "",
      events: (state.backendEvents || []).map(event => event.label),
      notices: (state.notifications || []).map(note => note.title),
      text: document.body.innerText || ""
    };
  }, { key: KEY, backendId: fetchedModeration.conflictId });
  assert(resolvedModeration.status === "resolved" && !resolvedModeration.lastError, `backend resolver failed: ${resolvedModeration.lastError}`);
  assert(resolvedModeration.backendStatus === "under_review" && resolvedModeration.backendDecision === "requested_more_evidence" && resolvedModeration.backendScoring === "non_scoring_until_evidence", "backend queue row did not mirror resolver result");
  assert(resolvedModeration.localStatus === "under_review" && resolvedModeration.localDecision === "requested_more_evidence" && resolvedModeration.localScoring === "non_scoring_until_evidence", "local trust row did not mirror backend resolver result");
  assert(resolvedModeration.events.includes("Moderation resolver completed") && resolvedModeration.notices.includes("Backend moderation resolved"), "backend resolver did not write local audit trail and notice");
  await page.evaluate(() => App.setAccount("riley_biz", { silent: true }));
  await page.waitForTimeout(100);
  await page.evaluate(() => App.trustDesk("riley_artist"));
  await page.waitForTimeout(140);
  const trustOutcomeText = await page.evaluate(() => document.querySelector("#modal .modal-body")?.innerText || "");
  assert(trustOutcomeText.includes("Moderation outcomes") && trustOutcomeText.includes("Awaiting evidence"), "Trust desk did not surface backend moderation outcome");
  assert(trustOutcomeText.includes("Not scoring") && trustOutcomeText.includes("Backend moderator requested one more photo before scoring."), "Trust desk did not explain resolved report scoring and note to the involved customer");
  assert(trustOutcomeText.includes("Add proof"), "Trust desk did not expose an evidence follow-up action for the involved customer");
  await page.evaluate(id => App.trustEvidenceFollowUp(id), fetchedModeration.conflictId);
  await page.waitForSelector("#trustFollowupEvidence", { state: "visible", timeout: 5000 });
  await page.selectOption("#trustFollowupEvidence", "order:sync_order_done");
  await page.fill("#trustFollowupNote", "Added the pickup proof photo and receipt trail requested by moderation.");
  await page.evaluate(id => App.submitTrustEvidenceFollowUp(id), fetchedModeration.conflictId);
  await page.waitForTimeout(180);
  const proofFollowUp = await page.evaluate(({ key, backendId }) => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const row = (state.trustReports || []).find(report => report.backendReportId === backendId);
    const follow = (row?.evidenceFollowUps || [])[0];
    const task = (state.followUps || []).find(item => item.report === row?.id);
    const thread = state.messages?.riley_artist || [];
    return {
      followEvidence: follow?.evidenceId || "",
      followLabel: follow?.evidenceLabel || "",
      followBackendStatus: follow?.backendStatus || "",
      followBackendResponseId: follow?.backendResponseId || "",
      followBackendEvidenceId: follow?.backendEvidenceId || "",
      moderationState: row?.moderationState || "",
      followUpStatus: row?.followUpStatus || "",
      backendEvidenceResponses: row?.backendEvidenceResponses || [],
      taskTitle: task?.title || "",
      taskAudience: task?.audience || [],
      threadText: thread.map(message => message.text || "").join("\n"),
      events: (state.backendEvents || []).map(event => event.label),
      notices: (state.notifications || []).map(note => note.title),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, { key: KEY, backendId: fetchedModeration.conflictId });
  assert(proofFollowUp.followEvidence === "order:sync_order_done" && /Backend proof conditioner/.test(proofFollowUp.followLabel), "evidence follow-up did not attach the selected proof record");
  assert(proofFollowUp.followBackendStatus === "synced" && /^evidence_response_/.test(proofFollowUp.followBackendResponseId) && /^order:order_/.test(proofFollowUp.followBackendEvidenceId), "evidence follow-up did not sync to the backend response endpoint");
  assert(proofFollowUp.backendEvidenceResponses.some(row => /^order:order_/.test(row.evidenceId || "")), "local trust row did not mirror backend evidence responses");
  assert(proofFollowUp.moderationState === "evidence_response_submitted" && proofFollowUp.followUpStatus === "waiting_moderator_review", "evidence response did not keep the report in moderator review");
  assert(/Trust evidence follow-up/.test(proofFollowUp.taskTitle) && proofFollowUp.taskAudience.includes("artbook_ops"), "evidence follow-up did not create a moderator-visible follow-up task");
  assert(proofFollowUp.threadText.includes("Added the pickup proof photo") && proofFollowUp.events.includes("Trust evidence response synced") && proofFollowUp.events.includes("Trust evidence follow-up routed") && proofFollowUp.notices.includes("Trust evidence routed"), "evidence follow-up did not write thread, backend sync event, audit event and notice");
  assert(proofFollowUp.text.includes("Evidence follow-up sent") && proofFollowUp.text.includes("Backend proof conditioner"), "Trust desk did not show the routed evidence follow-up summary");

  await page.evaluate(() => App.setAccount("artbook_ops", { silent: true }));
  await page.waitForTimeout(100);
  await page.evaluate(({ id, responseId }) => App.reviewBackendEvidenceResponse(id, responseId, "accept"), { id: fetchedModeration.conflictId, responseId: proofFollowUp.followBackendResponseId });
  await page.waitForTimeout(220);
  const reviewedProof = await page.evaluate(({ key, backendId, responseId }) => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const backendRow = (state.backendModeration?.queue || []).find(report => report.id === backendId);
    const localRow = (state.trustReports || []).find(report => report.backendReportId === backendId);
    const response = (backendRow?.evidenceResponses || []).find(row => row.id === responseId);
    return {
      responseStatus: response?.status || "",
      responseDecision: response?.reviewDecision || "",
      backendState: backendRow?.moderationState || "",
      backendDecision: backendRow?.moderationDecision || "",
      backendScoring: backendRow?.scoring || "",
      localState: localRow?.moderationState || "",
      localDecision: localRow?.moderationDecision || "",
      localScoring: localRow?.scoring || "",
      localReviewId: localRow?.latestEvidenceResponseReview?.responseId || "",
      events: (state.backendEvents || []).map(event => event.label),
      notices: (state.notifications || []).map(note => note.title),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, { key: KEY, backendId: fetchedModeration.conflictId, responseId: proofFollowUp.followBackendResponseId });
  assert(reviewedProof.responseStatus === "accepted_by_moderator" && reviewedProof.responseDecision === "accept", "moderator evidence response review did not update the response row");
  assert(reviewedProof.backendState === "evidence_response_accepted" && reviewedProof.backendDecision === "evidence_response_accepted" && reviewedProof.backendScoring === "non_scoring_until_moderator_resolution", "backend queue row did not mirror accepted evidence response state");
  assert(reviewedProof.localState === "evidence_response_accepted" && reviewedProof.localDecision === "evidence_response_accepted" && reviewedProof.localScoring === "non_scoring_until_moderator_resolution" && reviewedProof.localReviewId === proofFollowUp.followBackendResponseId, "local trust row did not mirror accepted evidence response state");
  assert(reviewedProof.events.includes("Evidence response reviewed") && reviewedProof.notices.includes("Backend evidence reviewed"), "evidence response review did not write local audit event and notice");
  assert(reviewedProof.text.includes("accepted by moderator") && reviewedProof.text.includes("Final decision required") && reviewedProof.text.includes("Accepted proof is evidence only"), "backend detail did not show accepted proof final-resolution guidance");

  await page.fill("#backendModerationNote", "Final moderator closed the report after accepted proof.");
  await page.evaluate(id => App.resolveBackendModerationRow(id, "dismiss"), fetchedModeration.conflictId);
  await page.waitForTimeout(220);
  const finalResolution = await page.evaluate(({ key, backendId, responseId }) => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const backendRow = (state.backendModeration?.queue || []).find(report => report.id === backendId);
    const localRow = (state.trustReports || []).find(report => report.backendReportId === backendId);
    const response = (backendRow?.evidenceResponses || []).find(row => row.id === responseId);
    return {
      backendStatus: backendRow?.status || "",
      backendDecision: backendRow?.moderationDecision || "",
      backendScoring: backendRow?.scoring || "",
      backendSource: backendRow?.finalResolutionSource || "",
      backendAcceptedId: backendRow?.acceptedEvidenceResponseId || "",
      responseFinalDecision: response?.finalResolutionDecision || "",
      localStatus: localRow?.status || "",
      localDecision: localRow?.moderationDecision || "",
      localScoring: localRow?.scoring || "",
      localSource: localRow?.finalResolutionSource || "",
      localAcceptedId: localRow?.acceptedEvidenceResponseId || "",
      events: (state.backendEvents || []).map(event => event.label),
      notices: (state.notifications || []).map(note => note.title),
      text: document.querySelector("#modal .modal-body")?.innerText || ""
    };
  }, { key: KEY, backendId: fetchedModeration.conflictId, responseId: proofFollowUp.followBackendResponseId });
  assert(finalResolution.backendStatus === "closed" && finalResolution.backendDecision === "dismissed" && finalResolution.backendScoring === "non_scoring_dismissed", "backend final resolution did not close the accepted-proof report as non-scoring");
  assert(finalResolution.backendSource === "accepted_evidence_response" && finalResolution.backendAcceptedId === proofFollowUp.followBackendResponseId && finalResolution.responseFinalDecision === "dismiss", "backend final resolution did not carry accepted proof source");
  assert(finalResolution.localStatus === "closed" && finalResolution.localDecision === "dismissed" && finalResolution.localScoring === "non_scoring_dismissed", "local trust row did not mirror accepted-proof final resolution");
  assert(finalResolution.localSource === "accepted_evidence_response" && finalResolution.localAcceptedId === proofFollowUp.followBackendResponseId, "local final resolution did not carry accepted proof source");
  assert(finalResolution.events.includes("Moderation resolver completed") && finalResolution.notices.includes("Backend moderation resolved"), "accepted-proof final resolution did not write resolver event and notice");
  assert(finalResolution.text.includes("Final resolution recorded") && finalResolution.text.includes("Accepted proof"), "backend detail did not show final resolution recorded state");

  await page.evaluate(() => App.setAccount("riley_biz", { silent: true }));
  await page.waitForTimeout(100);
  await page.evaluate(() => App.trustDesk("riley_artist"));
  await page.waitForTimeout(140);
  const finalOutcomeText = await page.evaluate(() => document.querySelector("#modal .modal-body")?.innerText || "");
  assert(finalOutcomeText.includes("Dismissed after accepted proof") && finalOutcomeText.includes("Not scoring") && finalOutcomeText.includes("Final moderator closed the report after accepted proof."), "Trust desk did not show plain final outcome language after accepted proof");

  await page.evaluate(({ key, backendId }) => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const queue = state.backendModeration?.queue || [];
    const source = queue.find(report => report.id === backendId) || (state.trustReports || []).find(report => report.backendReportId === backendId) || {};
    const makeOutcome = (suffix, outcome, decision, status, scoring, label) => {
      const responseId = `summary_response_${suffix}`;
      return {
        ...source,
        id: `summary_${suffix}`,
        backendReportId: `summary_${suffix}`,
        reason: `Summary ${label}`,
        status,
        moderationDecision: decision,
        moderationState: decision === "upheld" ? "upheld_active" : decision === "escalated" ? "escalated" : "dismissed",
        scoring,
        finalResolutionSource: "accepted_evidence_response",
        acceptedEvidenceResponseId: responseId,
        finalResolutionAt: `2026-05-30T00:0${suffix === "uphold" ? "1" : "2"}:00.000Z`,
        evidenceResponses: [{
          id: responseId,
          status: "accepted_by_moderator",
          reviewDecision: "accept",
          finalResolutionDecision: outcome,
          evidenceLabel: `${label} accepted proof`
        }]
      };
    };
    state.backendModeration = state.backendModeration || {};
    state.backendModeration.queue = [
      makeOutcome("dismiss", "dismiss", "dismissed", "closed", "non_scoring_dismissed", "Dismissed"),
      makeOutcome("uphold", "uphold", "upheld", "open", "active", "Upheld"),
      makeOutcome("escalate", "escalate", "escalated", "under_review", "non_scoring_escalated", "Escalated"),
      ...queue
    ];
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: KEY, backendId: fetchedModeration.conflictId });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });
  await page.evaluate(() => {
    App.setAccount("artbook_ops", { silent: true });
    App.pilotModerationDesk();
  });
  await page.waitForTimeout(160);
  const outcomeSummaryText = await page.evaluate(() => document.querySelector("#modal .modal-body")?.innerText || "");
  assert(outcomeSummaryText.includes("Accepted-proof outcomes") && /final/i.test(outcomeSummaryText), "moderation desk did not show accepted-proof outcome summary count");
  assert(outcomeSummaryText.includes("Dismissed, no score") && outcomeSummaryText.includes("Upheld, scoring") && outcomeSummaryText.includes("Escalated, not scoring"), "moderation desk did not summarize all accepted-proof final outcomes");
  assert(/\d+\s+Dismissed/i.test(outcomeSummaryText) && /\d+\s+Upheld/i.test(outcomeSummaryText) && /\d+\s+Escalated/i.test(outcomeSummaryText), "accepted-proof outcome summary did not count each final decision lane");

  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    state.account = "riley_artist";
    state.jurisdictionProfiles = state.jurisdictionProfiles || {};
    state.jurisdictionProfiles.riley_artist = {
      account: "riley_artist",
      idCountry: "Kenya",
      residenceCountry: "Australia",
      operatingCountry: "Australia",
      payoutCountry: "Australia",
      taxCountry: "Australia",
      gpsCountry: "Australia",
      gpsLat: "-34.92850",
      gpsLng: "138.60070",
      gpsAccuracy: "18m",
      gpsAt: "2026-05-30T03:00:00.000Z",
      residencyProof: "Australian residence and visa proof checked for backend sync.",
      residencyExpiry: "2028-12-31",
      workPermission: "Artist can sell, license music and receive royalties in Australia after provider review.",
      travelMode: "diaspora_artist",
      reviewStatus: "Saved for review",
      aiNote: "Cross-border artist account needs provider/human review before country rules, payouts or release filing."
    };
    state.identityReviews = state.identityReviews || {};
    state.identityReviews["riley_artist:money"] = {
      id: "idv_riley_artist_money",
      account: "riley_artist",
      scope: "money",
      status: "AI draft ready for provider review",
      legalName: "Riley",
      proofType: "Passport + selfie",
      roleProof: "Artist payout and country passport proof ready for provider/human review.",
      payoutMethod: "Creator income from music and Artbook work",
      riskNote: "Cross-border payout needs source-of-funds and residence review.",
      audience: "private review"
    };
    state.verificationAiAudits = state.verificationAiAudits || [];
    state.verificationAiAudits.unshift({
      id: "vai_backend_sync_artist",
      account: "riley_artist",
      scope: "money",
      title: "AI verification draft for Money and payouts",
      detail: "Fields look ready for provider/human review under Australia operating rules.",
      risk: "review",
      decision: "AI draft ready",
      missing: [],
      time: "Now",
      providerRequired: true
    });
    state.artistLabelPlans = state.artistLabelPlans || {};
    state.artistLabelPlans.riley_artist = { tier: "pro", status: "Artist Pro active", startedAt: "Today", renews: "Monthly demo renewal", releasesPrepared: 1 };
    state.customAlbums = state.customAlbums || [];
    state.musicRightsReviews = state.musicRightsReviews || {};
    const album = {
      id: "sync_album_release_packet",
      artist: "riley_artist",
      title: "Backend Sync Rights Song",
      year: 2026,
      type: "Original release",
      a: "#f472b6",
      b: "#38bdf8",
      tracks: ["Backend Sync Rights Song"],
      plays: 0,
      rights: "Original composition and master controlled by Riley for provider review.",
      rightsType: "original",
      proof: "Studio proof, split sheet and artwork proof attached for backend sync.",
      releaseStatus: "Artist-approved packet",
      reviewStatus: "Artist-approved packet",
      distribution: "Artbook review queue",
      platforms: ["Artbook"],
      payoutHold: "Held until backend royalty, tax and platform connector setup.",
      submittedAt: "Today",
      src: "assets/audio-westlands-nights.wav"
    };
    state.customAlbums = state.customAlbums.filter(row => row.id !== album.id);
    state.customAlbums.unshift(album);
    state.musicRightsReviews[album.id] = {
      id: "music_review_sync_album_release_packet",
      album: album.id,
      owner: "riley_artist",
      title: album.title,
      rightsType: "original",
      declaration: album.rights,
      proof: album.proof,
      status: "Artist-approved packet",
      releaseStatus: "Artist-approved packet",
      distribution: "Artbook review queue",
      platforms: ["Artbook"],
      payoutHold: album.payoutHold,
      compositionOwner: "Riley controls the composition.",
      masterOwner: "Riley controls the master recording.",
      performerCredits: "Riley as primary artist.",
      producerCredits: "Smoke Producer and Riley engineering.",
      collaboratorSplits: "Signed split sheet: Riley 100 percent for this QA packet.",
      sampleClearance: "No samples or third-party beats used.",
      copyrightRegistration: "Kenya/Australia copyright admin handoff prepared, not filed.",
      cmoAdmin: "APRA AMCOS or MCSK admin note prepared for provider/legal review.",
      isrc: "QMART2600002",
      upc: "ARTBOOK2600002",
      artworkProof: "Artist-owned cover proof and source note attached.",
      masterQuality: "16-bit WAV master checked with no clipping.",
      metadataSheet: "Title, artist, writers, language, genre, territory and clean explicit flag complete.",
      explicitLabel: "Not explicit",
      releaseDate: "After provider review",
      takedownContact: "riley.artist@artbook.local",
      royaltyAdmin: "Riley royalty admin pending backend provider setup.",
      artistApproval: "Riley approved this Artbook release packet before release/filing handoff.",
      submittedAt: "Today",
      updated: "Today"
    };
    localStorage.setItem(key, JSON.stringify(state));
  }, KEY);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });
  await page.evaluate(() => App.setAccount("riley_artist", { silent: true }));
  await page.evaluate(() => App.backendSyncDesk("artist identity music contracts"));
  await page.waitForSelector("#backendBaseUrl", { state: "visible", timeout: 5000 });
  await page.fill("#backendBaseUrl", base);
  await page.selectOption("#backendMode", "local");
  await page.evaluate(() => App.runBackendSync());
  await page.waitForTimeout(1400);
  const artistContractSync = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      lastError: state.backendConfig?.lastError || "",
      jurisdiction: state.backendSynced?.jurisdictionProfiles?.riley_artist || null,
      verification: state.backendSynced?.verificationAiDrafts?.vai_backend_sync_artist || null,
      music: state.backendSynced?.musicReleasePackets?.sync_album_release_packet || null,
      events: (state.backendEvents || []).filter(row => row.account === "riley_artist").map(row => row.label),
      text: document.body.innerText || "",
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
  }, KEY);
  assert(!artistContractSync.lastError, `artist backend contract sync ended with error: ${artistContractSync.lastError}`);
  assert(artistContractSync.jurisdiction?.id && artistContractSync.jurisdiction?.status === "ready_for_provider_review", "Country Passport was not marked synced for backend review");
  assert(artistContractSync.verification?.id && artistContractSync.verification?.canApprove === false, "AI verification draft was not synced with no-approval boundary");
  assert(artistContractSync.music?.id && artistContractSync.music?.artistApproved === true && artistContractSync.music?.distributionEnabled === false, "music release packet was not synced as artist-approved but non-distributing");
  assert(artistContractSync.events.includes("Country Passport synced") && artistContractSync.events.includes("AI verification draft synced") && artistContractSync.events.includes("Music release packet synced"), "artist contract sync events were missing");
  assert(artistContractSync.text.includes("Country Passport") && artistContractSync.text.includes("AI verification draft") && artistContractSync.text.includes("Music release packet"), "backend sync desk did not show artist contract rows");
  assert(artistContractSync.overflow <= 2, "artist backend contract sync introduced horizontal overflow");

  const stored = JSON.parse(await readFile(store, "utf8"));
  assert(stored.profiles.some(row => row.id === "riley_biz" && row.privacy?.location), "profile/privacy did not persist to backend store");
  assert(stored.posts.some(row => /Backend sync UI test/.test(row.text || "")), "post did not persist to backend store");
  assert(stored.followUps.some(row => /Backend sync UI follow-up/.test(row.title || "")), "follow-up did not persist to backend store");
  assert(stored.listings.some(row => row.ownerId === "riley_biz" && row.status === "review-pending"), "listing did not persist to backend review state");
  assert(stored.walletLedger.some(row => /Backend sync wallet replay/.test(row.note || "") && row.settlementStatus === "client_replayed_not_settled"), "wallet ledger did not persist as client replay");
  assert(stored.walletRequests.some(row => /Backend sync request replay/.test(row.note || "")), "wallet request did not persist to backend store");
  assert(stored.settlementAudits.some(row => row.record?.type === "fundiJob" && row.record?.id === "sync_fundi_complete" && row.settlementStatus === "client_replayed_audit_only_not_settled" && row.providerVerified === false && row.spendable === false), "Fundi settlement audit did not persist as provider-unverified audit-only data");
  assert(stored.settlementAudits.some(row => row.record?.type === "fundiJob" && row.record?.id === "sync_fundi_complete" && row.reviewNotes?.some(note => note.by === "artbook_ops" && note.nonSettling && note.decision === "hold_payout")), "Fundi settlement review note did not persist as non-settling ops audit data");
  assert(stored.settlementAudits.some(row => row.record?.type === "fundiJob" && row.record?.id === "sync_fundi_complete" && row.supportTimeline?.some(item => item.type === "review_note" && item.nonSettling)), "Fundi settlement support timeline did not persist review-note metadata");
  assert(stored.settlementAudits.some(row => row.record?.type === "fundiJob" && row.record?.id === "sync_fundi_complete" && row.providerReceiptCandidates?.length === 1 && row.providerReceipt?.status === "candidate_recorded_not_reconciled" && row.providerReceipt?.signatureStatus === "unverified" && row.providerReceipt?.idempotencyStatus === "recorded_unique_candidate" && row.supportTimeline?.some(item => item.type === "provider_receipt_candidate" && item.nonSettling)), "Fundi settlement receipt candidate did not persist signature/idempotency guard");
  assert(stored.settlementAudits.some(row => row.record?.type === "fundiJob" && row.record?.id === "sync_fundi_complete" && row.providerReceiptCandidates?.length === 1 && !row.providerReceiptCandidates?.some(candidate => candidate.receiptId === "MPESA-WEBHOOK-UI-001")), "Fundi settlement webhook dry-run should not persist a receipt candidate");
  assert(stored.settlementWebhookEvents.some(row => row.provider === "mpesa" && row.providerReceiptId === "MPESA-WEBHOOK-UI-001" && row.idempotencyDecision === "first_seen_unverified_no_settlement" && row.payloadDigest?.startsWith("sha256:") && row.settlementStatus === "webhook_event_replay_only_no_settlement" && row.nonSettling === true), "Fundi settlement webhook event replay metadata did not persist separately");
  assert(stored.settlementWebhookEvents.some(row => row.provider === "mpesa" && row.providerReceiptId === "MPESA-WEBHOOK-UI-001" && row.latestReviewDecision?.decision === "needs_provider_fetch" && row.decisionStatus === "provider_fetch_required_no_settlement" && row.reviewDecisions?.some(decision => decision.by === "artbook_ops" && decision.nonSettling && decision.providerVerified === false && decision.spendable === false)), "Fundi settlement webhook event decision did not persist as non-settling review metadata");
  assert(stored.orders.some(row => row.buyer === "riley_biz" && row.seller === "riley_artist" && row.evidenceStatus === "verified_completion"), "completed order evidence did not persist to backend store");
  assert(stored.bookings.some(row => row.booker === "riley_biz" && row.provider === "riley_artist" && row.evidenceStatus === "verified_completion"), "completed booking evidence did not persist to backend store");
  assert(stored.profiles.some(row => row.id === "artbook_ops" && row.role === "moderator"), "moderator profile did not persist to backend store");
  assert(stored.trustSeals.some(row => row.from === "riley_biz" && row.to === "riley_artist" && /^order:order_/.test(row.evidenceId || "")), "backend Seal did not persist with mapped evidence");
  assert(stored.trustReports.some(row => row.from === "riley_biz" && row.to === "riley_artist" && row.status === "open" && /^booking:booking_/.test(row.evidenceId || "")), "backend active trust report did not persist with mapped evidence");
  assert(stored.trustReports.some(row => row.from === "riley_biz" && row.to === "riley_artist" && row.status === "closed" && row.moderationDecision === "dismissed" && row.finalResolutionSource === "accepted_evidence_response" && row.acceptedEvidenceResponseId === proofFollowUp.followBackendResponseId && /^order:order_/.test(row.evidenceId || "")), "backend accepted-proof final resolution did not persist review status with mapped evidence");
  assert(stored.trustReports.some(row => row.from === "riley_biz" && row.to === "riley_artist" && row.moderationState === "dismissed" && row.latestEvidenceResponseReview?.decision === "accept" && row.evidenceResponses?.some(response => /^order:order_/.test(response.evidenceId || "") && response.status === "accepted_by_moderator" && response.finalResolutionDecision === "dismiss")), "backend evidence response final decision did not persist on the trust report");
  assert(stored.auditLog.some(row => row.action === "trust.report.evidence_response" && /^order:order_/.test(row.detail?.evidenceId || "")), "backend evidence response audit did not persist");
  assert(stored.auditLog.some(row => row.action === "moderation.trust_report.evidence_response_review" && row.detail?.decision === "accept" && /^order:order_/.test(row.detail?.evidenceId || "")), "backend evidence response review audit did not persist");
  assert(stored.auditLog.some(row => row.action === "moderation.trust_report.resolve" && row.detail?.decision === "request_more_evidence"), "backend resolver audit did not persist requested-evidence action");
  assert(stored.auditLog.some(row => row.action === "moderation.trust_report.resolve" && row.detail?.decision === "dismiss" && row.detail?.finalResolutionSource === "accepted_evidence_response" && row.detail?.acceptedEvidenceResponseId === proofFollowUp.followBackendResponseId), "backend accepted-proof final resolution audit did not persist moderator action");
  assert(stored.auditLog.some(row => row.action === "settlement.escrow_audit.replay" && row.detail?.accepted >= 1), "backend settlement audit replay did not persist audit action");
  assert(stored.auditLog.some(row => row.action === "settlement.exception.review_note" && row.detail?.nonSettling === true && row.detail?.providerVerified === false && row.detail?.spendable === false && row.detail?.providerReceiptStatus === "placeholder_required"), "backend settlement review note audit did not persist non-settling guard");
  assert(stored.auditLog.some(row => row.action === "settlement.provider_receipt.candidate" && row.detail?.idempotencyStatus === "recorded_unique_candidate" && row.detail?.signatureStatus === "unverified" && row.detail?.nonSettling === true && row.detail?.providerVerified === false && row.detail?.spendable === false), "backend settlement receipt candidate audit did not persist non-settling guard");
  assert(stored.auditLog.some(row => row.action === "provider.fail_closed" && row.resourceType === "settlement_webhook" && row.detail?.dryRun === true && row.detail?.targetFound === true && row.detail?.receiptId === "MPESA-WEBHOOK-UI-001" && row.detail?.idempotencyDecision === "first_seen_unverified_no_settlement"), "settlement webhook dry-run fail-closed audit did not persist");
  assert(stored.auditLog.some(row => row.action === "settlement.webhook_event.review_decision" && row.detail?.decision === "needs_provider_fetch" && row.detail?.settlementStatus === "webhook_event_decision_only_no_settlement" && row.detail?.providerVerified === false && row.detail?.spendable === false), "settlement webhook event review decision audit did not persist non-settling guard");
  assert(stored.auditLog.some(row => row.action === "ai.business_brief" && row.detail?.moneyMovementEnabled === false && row.detail?.sensitiveActionsEnabled === false && row.detail?.recordCounts?.total >= 1 && row.detail?.promptInjectionDetected === false && row.detail?.modelGatewayStatus === "model_gateway_preview_only_no_external_call"), "backend AI business brief audit did not persist scoped prompt/model no-action guard");
  assert(stored.jurisdictionProfiles.some(row => row.profileId === "riley_artist" && row.operatingCountry === "Australia" && row.providerVerified === false && row.countryRulesEnabled === false), "Country Passport did not persist as review-only backend state");
  assert(stored.verificationAiDrafts.some(row => row.profileId === "riley_artist" && row.canApprove === false && row.providerRequired === true && row.decisionAuthority === "provider_or_human_review_required"), "AI verification draft did not persist no-approval provider boundary");
  assert(stored.musicReleasePackets.some(row => row.ownerId === "riley_artist" && row.title === "Backend Sync Rights Song" && row.artistApproval?.accepted === true && row.readiness?.distributionEnabled === false), "music release packet did not persist artist-approved no-distribution backend state");
  assert(stored.restrictedMediaReports.some(row => row.id === fetchedRestrictedQueue.reportId && row.status === "safety_hold" && row.rawMediaStored === false && row.providerAction === "not_called_provider_fail_closed" && row.reviewHistory?.some(review => review.decision === "temporary_hold" && review.rawMediaStored === false)), "restricted-media backend UI resolution did not persist metadata-only safety hold");
  assert(stored.supportIncidents.some(row => row.restrictedMediaReportId === fetchedRestrictedQueue.reportId && row.priority === "urgent" && row.latestReview?.decision === "temporary_hold"), "restricted-media support incident did not persist latest safety review");
  assert(stored.auditLog.some(row => row.action === "identity.jurisdiction_profile.save" && row.resourceType === "jurisdiction_profile" && row.detail?.countryRulesEnabled === false), "Country Passport audit did not persist no-country-rule boundary");
  assert(stored.auditLog.some(row => row.action === "identity.ai_verification_draft" && row.detail?.canApprove === false && row.detail?.providerRequired === true), "AI verification draft audit did not persist provider/human boundary");
  assert(stored.auditLog.some(row => row.action === "music.release_packet.artist_approval" && row.detail?.accepted === true && row.detail?.distributionEnabled === false), "music artist approval audit did not persist no-distribution boundary");
  assert(stored.auditLog.some(row => row.action === "restricted_media.report.create" && row.resourceId === fetchedRestrictedQueue.reportId && row.detail?.rawMediaStored === false), "restricted-media report create audit did not persist metadata-only boundary from UI sync");
  assert(stored.auditLog.some(row => row.action === "moderation.restricted_media.resolve" && row.resourceId === fetchedRestrictedQueue.reportId && row.detail?.decision === "temporary_hold" && row.detail?.rawMediaStored === false && row.detail?.contentAction === "recommend_temporary_visibility_hold"), "restricted-media resolver audit did not persist fail-closed temporary hold from UI");

  await browser.close();
  console.log(JSON.stringify({ ok: true, base, checks: 348, pageErrors, consoleErrors }, null, 2));
} catch (error) {
  await browser.close().catch(() => {});
  if (stderr.trim()) console.error(stderr);
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  server.kill();
  await rm(store, { force: true });
}
