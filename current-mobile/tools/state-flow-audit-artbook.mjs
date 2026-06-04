import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromiumExecutablePath } from "./runtime-browser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const playwrightPath = "C:\\Users\\brown\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.60.0\\node_modules\\playwright\\index.mjs";
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const KEY = "artbook.mobile.demo.v5";
const html = process.env.ARTBOOK_HTML || path.join(root, "src", "artbook-mobile.html");

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
const checks = [];
const failures = [];

page.on("pageerror", error => pageErrors.push(error.message));
page.on("console", msg => {
  const text = msg.text();
  if (msg.type() === "error" && !/Failed to load resource|ERR_TUNNEL|ERR_PROXY|ERR_INTERNET|404/.test(text)) {
    consoleErrors.push(text);
  }
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function saved() {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || "{}"), KEY);
}

async function step(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (error) {
    failures.push({ name, message: error.message });
    checks.push({ name, ok: false });
  }
}

async function unlockFinance(account = "riley_artist") {
  await page.evaluate(id => {
    App.setAccount(id);
    App.go("wallet");
  }, account);
  await page.waitForSelector("#financePin", { state: "visible", timeout: 5000 });
  await page.fill("#financePin", "0000");
  await page.evaluate(() => App.unlockFinance());
  await page.waitForTimeout(160);
}

function visibleTo(entry, account) {
  const audience = entry?.audience;
  return !audience || audience === "all" || audience === account || (Array.isArray(audience) && audience.includes(account));
}

await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
await page.evaluate(key => localStorage.removeItem(key), KEY);
await page.reload({ waitUntil: "load" });
await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });

await step("market checkout creates buyer, seller and courier trails", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.addCart("p1");
    App.payCart("card", {
      fulfillment: "Drop-off",
      proof: "Photo + customer PIN",
      window: "Today 16:00-18:00",
      note: "QA delivery route consistency check",
      noContact: true,
      fastLane: true,
    });
  });
  await page.waitForTimeout(250);
  const state = await saved();
  const order = (state.orders || [])[0];
  assert(order?.buyer === "riley_artist", "checkout order buyer missing");
  assert(order?.seller === "riley_biz", "checkout seller trail missing");
  assert(order?.fulfillment === "Drop-off", "checkout fulfillment did not persist");
  assert((state.cart || []).length === 0, "cart was not cleared after checkout");
  assert(!state.marketShop, "checkout should clear a scoped seller shelf");
  assert((state.lastCartEvent?.parties || []).includes("riley_biz"), "seller was not included in the top basket event");
  assert((state.messages?.riley_courier || []).some(msg => msg.type === "order" && msg.order === order.id), "courier thread did not receive order");
  assert((state.notifications || []).some(n => n.kind === "order" && n.link === "delivery" && visibleTo(n, "riley_artist") && visibleTo(n, "riley_biz")), "buyer/seller order notification missing");
  assert((state.notifications || []).some(n => n.kind === "delivery" && visibleTo(n, "riley_courier")), "courier notification missing");
  assert((state.followUps || []).some(f => /Confirm delivery or pickup/.test(f.title || "") && f.entity === "riley_biz"), "seller delivery follow-up missing");
  assert(state.page === "delivery", "checkout did not land on delivery");
  await page.evaluate(() => App.setAccount("riley_biz"));
  await page.waitForTimeout(160);
  assert(await page.locator(".top-cart.active").count(), "seller top basket indicator did not appear after buyer purchase");
});

await step("order trail gives seller, buyer and courier exact work views", async () => {
  let state = await saved();
  const order = (state.orders || []).find(o => o.buyer === "riley_artist" && o.seller === "riley_biz");
  assert(order, "test order missing");

  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.orderDetail(id);
  }, order.id);
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Proof cockpit"), "seller order detail missing proof cockpit");
  assert(text.includes("Seller proof") && text.includes("Buyer thread"), "seller order detail missing seller actions");

  await page.evaluate(id => {
    App.setAccount("riley_artist");
    App.orderDetail(id);
  }, order.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Buyer view") && text.includes("Review proof"), "buyer order detail missing buyer proof view");

  await page.evaluate(id => {
    App.setAccount("riley_courier");
    App.orderDetail(id);
  }, order.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Courier view") && text.includes("Accept / own route") && text.includes("Incident"), "courier order detail missing courier controls");

  await page.evaluate(id => App.courierAcceptJob(id), order.id);
  await page.waitForTimeout(160);
  state = await saved();
  assert((state.notifications || []).some(n => n.title === "Courier assigned" && n.record?.type === "order" && n.record?.id === order.id), "courier assignment notification missing exact order record");
  assert((state.courierLedger || []).some(row => row.order === order.id && row.status === "assigned" && row.amount > 0), "courier accept did not create payout ledger row");
});

await step("fundi job creates agreement customer room escrow proof and customer-controlled seal", async () => {
  const title = "QA wardrobe hinge install";
  await page.evaluate(jobTitle => {
    App.setAccount("riley_creator");
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = jobTitle;
    document.getElementById("fundiJobCategory").value = "Repair";
    document.getElementById("fundiJobBudget").value = "3900";
    document.getElementById("fundiJobLocality").value = "Westlands";
    document.getElementById("fundiJobDue").value = "Tomorrow";
    document.getElementById("fundiJobDuration").value = "4";
    document.getElementById("fundiJobDetails").value = "Install hinge, repaint edge, add before and after proof.";
    App.saveFundiJob();
  }, title);
  await page.waitForTimeout(180);

  await page.evaluate(({ key, title }) => {
    let state = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (state.fundiJobs || []).find(row => row.title === title);
    App.fundiBid(job.id, "kariokor_threads");
    state = JSON.parse(localStorage.getItem(key) || "{}");
    job = (state.fundiJobs || []).find(row => row.title === title);
    const bid = (job.bids || []).find(row => row.fundi === "kariokor_threads");
    App.acceptFundiBid(job.id, bid.id);
    App.fundiStartJob(job.id);
    const blocked = (JSON.parse(localStorage.getItem(key) || "{}").fundiJobs || []).find(row => row.title === title);
    if (blocked.status !== "terms_pending") throw new Error("fundi job started before both sides agreed terms");
    App.fundiJobDetail(job.id);
    const agreementText = document.body.textContent || "";
    if (!agreementText.includes("Agreement strip - Agreement needed") || !agreementText.includes("Before work starts") || !agreementText.includes("Price") || !agreementText.includes("Scope") || !agreementText.includes("Escrow")) {
      throw new Error("fundi agreement strip missing before start");
    }
    const cockpitText = document.querySelector("[data-fundi-cockpit]")?.textContent || "";
    if (!/job cockpit/i.test(cockpitText) || !/customer room/i.test(cockpitText) || !/provider escrow preview/i.test(cockpitText) || !/private content isolated/i.test(cockpitText)) {
      throw new Error("fundi cockpit missing room, privacy or provider escrow cues");
    }
    if (!document.querySelector(".fundi-room-card[id^='fundiRoom_']")) {
      throw new Error("fundi customer room missing scroll anchor");
    }
    const roomStrip = document.querySelector(".fundi-room-card [data-fundi-agreement-strip]")?.textContent || "";
    if (!roomStrip.includes("Agreement strip") || !roomStrip.includes("Customer signature") || !roomStrip.includes("Freelancer signature")) throw new Error("fundi customer room missing agreement strip");
    App.setAccount("kariokor_threads");
    App.confirmFundiAgreement(job.id);
    App.fundiStartJob(job.id);
    const fundingBlocked = (JSON.parse(localStorage.getItem(key) || "{}").fundiJobs || []).find(row => row.title === title);
    if (fundingBlocked.status !== "funding_pending") throw new Error("fundi job started before escrow funding");
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    App.setAccount("kariokor_threads");
    App.fundiStartJob(job.id);
    App.fundiSubmitProof(job.id);
    App.setAccount("riley_creator");
    App.approveFundiJob(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(220);

  let state = await saved();
  let job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job?.status === "completed", "fundi job did not complete");
  assert(job.assigned === "kariokor_threads", "fundi assignment missing");
  assert(job.agreement?.status === "agreed" && job.agreement?.clientAgreed && job.agreement?.fundiAgreed, "fundi agreement missing both approvals");
  assert(job.durationDays === 4 && job.startedAtMs && job.deadlineAtMs, "fundi agreement did not create a started work-window deadline");
  assert(job.deadlineStatus === "completed_on_time", "completed fundi job did not keep an on-time deadline status");
  assert(job.escrow?.state === "released", "fundi escrow did not release");
  assert(job.escrow?.nonSettling === true && job.escrow?.providerVerified === false && job.escrow?.spendable === false && /no_provider_settlement/.test(job.escrow?.settlementStatus || ""), "fundi escrow release should remain provider-led and non-spendable");
  assert((state.fundiJobRooms?.[job.id]?.messages || []).some(msg => /Customer approved|Proof submitted|Bid accepted/.test(msg.text || "")), "job customer room missing workflow messages");
  assert(job.sealDecision === "pending", "fundi completion should wait for customer Seal decision");
  assert(!(state.trustSeals || []).some(seal => seal.job === job.id && seal.to === "kariokor_threads"), "fundi completion should not auto-write provenance seal");
  assert((state.notifications || []).some(n => n.record?.type === "fundiJob" && visibleTo(n, "riley_creator")), "fundi notification missing exact route");

  await page.evaluate(({ key, title }) => {
    let stored = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (stored.fundiJobs || []).find(row => row.title === title);
    delete job.sealAvailableAtMs;
    job.completedAtMs = Date.now();
    localStorage.setItem(key, JSON.stringify(stored));
    App.setAccount("kariokor_threads");
    App.requestFundiSeal(job.id, "fundi");
    App.closeModal();
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    if (!Number(job.sealAvailableAtMs || 0) || Number(job.sealAvailableAtMs) <= Date.now()) throw new Error("missing Seal window was not backfilled to a future 24-hour gate");
    if ((job.sealRequests || []).some(row => row.target === "fundi")) throw new Error("backfilled Seal window allowed an immediate fundi request");
  }, { key: KEY, title });

  await page.evaluate(({ key, title }) => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const job = (stored.fundiJobs || []).find(row => row.title === title);
    job.sealAvailableAtMs = Date.now() - 1000;
    localStorage.setItem(key, JSON.stringify(stored));
  }, { key: KEY, title });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(180);
  await page.evaluate(({ key, title }) => {
    App.setAccount("kariokor_threads");
    let stored = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (stored.fundiJobs || []).find(row => row.title === title);
    App.requestFundiSeal(job.id, "fundi");
    App.requestFundiSeal(job.id, "fundi");
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    if ((job.sealRequests || []).filter(row => row.target === "fundi").length !== 1) throw new Error("fundi Seal request was not limited to one request");
    App.setAccount("riley_creator");
    App.grantFundiSeal(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(160);
  state = await saved();
  job = (state.fundiJobs || []).find(row => row.title === title);
  assert((state.trustSeals || []).some(seal => seal.job === job.id && seal.to === "kariokor_threads" && seal.kind === "fundi_service"), "customer Seal decision did not write provenance seal");

  await page.evaluate(id => {
    App.customerLetter("riley_creator", "fundiJob:" + id);
  }, job.id);
  await page.waitForTimeout(160);
  const text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("QA wardrobe hinge install") && text.includes("fundiJob record"), "customer record did not expose fundi job");
});

await step("fundi work-window extension requires both parties", async () => {
  const title = "QA mutual deadline extension";
  await page.evaluate(jobTitle => {
    App.setAccount("riley_creator");
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = jobTitle;
    document.getElementById("fundiJobCategory").value = "Repair";
    document.getElementById("fundiJobBudget").value = "4400";
    document.getElementById("fundiJobLocality").value = "Westlands";
    document.getElementById("fundiJobDue").value = "Friday";
    document.getElementById("fundiJobDuration").value = "4";
    document.getElementById("fundiJobDetails").value = "Repair wardrobe rail, record proof and completion approval.";
    App.saveFundiJob();
  }, title);
  await page.waitForTimeout(160);

  await page.evaluate(({ key, title }) => {
    let state = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (state.fundiJobs || []).find(row => row.title === title);
    App.fundiBid(job.id, "kariokor_threads");
    state = JSON.parse(localStorage.getItem(key) || "{}");
    job = (state.fundiJobs || []).find(row => row.title === title);
    const bid = job.bids.find(row => row.fundi === "kariokor_threads");
    App.acceptFundiBid(job.id, bid.id);
    App.setAccount("kariokor_threads");
    App.confirmFundiAgreement(job.id);
    state = JSON.parse(localStorage.getItem(key) || "{}");
    job = (state.fundiJobs || []).find(row => row.title === title);
    if (job.startedAtMs || job.deadlineAtMs) throw new Error("work clock started before funding/start");
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    state = JSON.parse(localStorage.getItem(key) || "{}");
    job = (state.fundiJobs || []).find(row => row.title === title);
    if (job.startedAtMs || job.deadlineAtMs) throw new Error("funding alone started the work clock");
    App.setAccount("kariokor_threads");
    App.fundiStartJob(job.id);
    state = JSON.parse(localStorage.getItem(key) || "{}");
    job = (state.fundiJobs || []).find(row => row.title === title);
    if (!job.startedAtMs || !job.deadlineAtMs) throw new Error("fundi start did not start the deadline clock");
    const oldDeadline = job.deadlineAtMs;
    App.fundiExtensionDesk(job.id);
    document.getElementById("fundiExtensionDays").value = "2";
    document.getElementById("fundiExtensionReason").value = "Supplier delivery needs two more days.";
    App.requestFundiExtension(job.id);
    state = JSON.parse(localStorage.getItem(key) || "{}");
    job = (state.fundiJobs || []).find(row => row.title === title);
    const pending = (job.extensionRequests || [])[0];
    if (!pending || pending.status !== "pending") throw new Error("deadline extension was not pending after request");
    if (job.deadlineAtMs !== oldDeadline) throw new Error("deadline changed before client approval");
    App.approveFundiExtension(job.id, pending.id);
    state = JSON.parse(localStorage.getItem(key) || "{}");
    job = (state.fundiJobs || []).find(row => row.title === title);
    if ((job.extensionRequests || [])[0].status !== "pending") throw new Error("fundi self-approved their own extension");
    App.setAccount("riley_creator");
    App.approveFundiExtension(job.id, pending.id);
  }, { key: KEY, title });
  await page.waitForTimeout(180);

  const state = await saved();
  const job = (state.fundiJobs || []).find(row => row.title === title);
  const extension = (job.extensionRequests || [])[0];
  assert(extension?.status === "approved", "client did not approve mutual deadline extension");
  assert(job.deadlineAtMs > extension.previousDeadlineAtMs, "approved extension did not move the job deadline");
  assert((state.notifications || []).some(n => /Extension approved/.test(n.title || "") && n.record?.id === job.id), "extension approval notification missing exact job record");
});

await step("fundi funded change order requires customer top-up before work continues", async () => {
  const title = "QA topup after inspection";
  await page.evaluate(jobTitle => {
    App.setAccount("riley_creator");
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = jobTitle;
    document.getElementById("fundiJobCategory").value = "Repair";
    document.getElementById("fundiJobBudget").value = "5000";
    document.getElementById("fundiJobLocality").value = "Westlands";
    document.getElementById("fundiJobDue").value = "Tomorrow";
    document.getElementById("fundiJobDetails").value = "Inspect cabinet frame, replace damaged rail and submit proof.";
    App.saveFundiJob();
  }, title);
  await page.waitForTimeout(160);

  await page.evaluate(({ key, title }) => {
    let stored = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiBid(job.id, "kariokor_threads");
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    const bid = (job.bids || []).find(row => row.fundi === "kariokor_threads");
    App.acceptFundiBid(job.id, bid.id);
    App.setAccount("kariokor_threads");
    App.confirmFundiAgreement(job.id);
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiAgreementDesk(job.id);
    document.getElementById("fundiChangeAmount").value = "6100";
    document.getElementById("fundiChangeReason").value = "Hidden rail damage found after inspection.";
    App.requestFundiChange(job.id);
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    const change = (job.changeOrders || []).find(row => row.status === "pending");
    App.setAccount("kariokor_threads");
    App.approveFundiChange(job.id, change.id);
    App.fundiStartJob(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(180);

  let state = await saved();
  let job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job?.status === "funding_pending", "work continued before revised escrow top-up was funded");
  assert(job.escrow?.state === "topup pending", "approved higher change did not create top-up escrow state");
  assert(Number(job.escrow?.fundedAmount || 0) === 4600, "original held escrow amount changed incorrectly");
  assert(Number(job.escrow?.topupDue || 0) === 1500, "top-up due should equal revised amount minus already held escrow");
  assert((state.notifications || []).some(n => /top-up needed/i.test(n.title || "") && n.record?.id === job.id), "top-up notification missing exact fundi job record");

  await page.evaluate(({ key, title }) => {
    let stored = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (stored.fundiJobs || []).find(row => row.title === title);
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    App.setAccount("kariokor_threads");
    App.fundiStartJob(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(180);

  state = await saved();
  job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job?.status === "in_progress", "work did not resume after customer funded the top-up");
  assert(job.escrow?.state === "funded" && Number(job.escrow?.fundedAmount || 0) === 6100, "top-up did not settle to revised funded escrow");
  assert(job.escrow?.nonSettling === true && job.escrow?.providerVerified === false && /no_provider_settlement/.test(job.escrow?.settlementStatus || ""), "top-up escrow should remain provider-unverified demo state");
  assert((state.fundiJobRooms?.[job.id]?.messages || []).some(msg => /Escrow top-up funded/.test(msg.text || "")), "customer room missing top-up funding event");
});

await step("fundi funded price decrease creates provider-pending surplus credit", async () => {
  const title = "QA surplus after inspection";
  await page.evaluate(jobTitle => {
    App.setAccount("riley_creator");
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = jobTitle;
    document.getElementById("fundiJobCategory").value = "Repair";
    document.getElementById("fundiJobBudget").value = "5000";
    document.getElementById("fundiJobLocality").value = "Westlands";
    document.getElementById("fundiJobDue").value = "Tomorrow";
    document.getElementById("fundiJobDetails").value = "Repair panel, then record before and after proof.";
    App.saveFundiJob();
  }, title);
  await page.waitForTimeout(160);

  await page.evaluate(({ key, title }) => {
    let stored = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiBid(job.id, "kariokor_threads");
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    const bid = (job.bids || []).find(row => row.fundi === "kariokor_threads");
    App.acceptFundiBid(job.id, bid.id);
    App.setAccount("kariokor_threads");
    App.confirmFundiAgreement(job.id);
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiAgreementDesk(job.id);
    document.getElementById("fundiChangeAmount").value = "4100";
    document.getElementById("fundiChangeReason").value = "Material cost dropped after inspection.";
    App.requestFundiChange(job.id);
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    const change = (job.changeOrders || []).find(row => row.status === "pending");
    App.setAccount("kariokor_threads");
    App.approveFundiChange(job.id, change.id);
    App.fundiStartJob(job.id);
    App.fundiSubmitProof(job.id);
    App.setAccount("riley_creator");
    App.approveFundiJob(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(220);

  let state = await saved();
  let job = (state.fundiJobs || []).find(row => row.title === title);
  const credit = (state.fundiRefunds || []).find(row => row.job === job?.id && row.refundType === "surplus_credit");
  assert(job?.status === "completed", "price decrease job did not remain completed");
  assert(job.escrow?.state === "released" && Number(job.escrow?.releasedAmount || 0) === 4100, "completed job did not release only revised agreement amount");
  assert(credit?.amount === 500 && credit.providerStatus === "provider pending", "surplus credit was not recorded as provider-pending");
  assert(credit?.nonSettling === true && credit.providerVerified === false && credit.spendable === false && /no_settlement/.test(credit?.settlementStatus || ""), "surplus credit should remain provider-led and non-spendable");
  assert((state.notifications || []).some(n => /surplus credit/i.test(n.title || "") && n.refund === credit.id), "surplus credit notification missing exact refund id");
  assert((state.emails || []).some(e => e.to === "riley_creator" && /surplus credit/i.test(e.subject || "")), "surplus credit email missing");

  await page.evaluate(id => {
    App.setAccount("kariokor_threads");
    App.refundProviderUpdate("fundi", id, "provider succeeded");
  }, credit.id);
  await page.waitForTimeout(160);
  state = await saved();
  job = (state.fundiJobs || []).find(row => row.title === title);
  const settled = (state.fundiRefunds || []).find(row => row.id === credit.id);
  assert(settled?.providerStatus === "provider succeeded", "surplus credit provider success did not settle refund row");
  assert(job.escrow?.state === "released" && job.escrow?.surplusStatus === "provider succeeded", "surplus credit settlement should not mark the whole job refunded");
});

await step("fundi cancellation separates clean close refund and support review", async () => {
  const openTitle = "QA cancel before funding";
  const refundTitle = "QA refund funded not started";
  const supportTitle = "QA support after start";
  await page.evaluate(({ key, openTitle, refundTitle, supportTitle }) => {
    const setupQuotedJob = title => {
      App.setAccount("riley_creator");
      App.postFundiJob();
      document.getElementById("fundiJobTitle").value = title;
      document.getElementById("fundiJobCategory").value = "Repair";
      document.getElementById("fundiJobBudget").value = "4200";
      document.getElementById("fundiJobLocality").value = "Westlands";
      document.getElementById("fundiJobDue").value = "Tomorrow";
      document.getElementById("fundiJobDetails").value = "Use agreed price, room notes and before/after proof.";
      App.saveFundiJob();
      let job = JSON.parse(localStorage.getItem(key) || "{}").fundiJobs.find(row => row.title === title);
      App.fundiBid(job.id, "kariokor_threads");
      job = JSON.parse(localStorage.getItem(key) || "{}").fundiJobs.find(row => row.title === title);
      const bid = job.bids.find(row => row.fundi === "kariokor_threads");
      App.acceptFundiBid(job.id, bid.id);
      return job.id;
    };
    const setupFundedJob = title => {
      const id = setupQuotedJob(title);
      App.setAccount("kariokor_threads");
      App.confirmFundiAgreement(id);
      App.setAccount("riley_creator");
      App.fundFundiJob(id);
      return id;
    };
    const openId = setupQuotedJob(openTitle);
    App.cancelFundiJob(openId);
    const refundId = setupFundedJob(refundTitle);
    App.cancelFundiJob(refundId);
    const supportId = setupFundedJob(supportTitle);
    App.setAccount("kariokor_threads");
    App.fundiStartJob(supportId);
    App.setAccount("riley_creator");
    App.cancelFundiJob(supportId);
  }, { key: KEY, openTitle, refundTitle, supportTitle });
  await page.waitForTimeout(240);
  let state = await saved();
  const open = (state.fundiJobs || []).find(row => row.title === openTitle);
  const refunded = (state.fundiJobs || []).find(row => row.title === refundTitle);
  const support = (state.fundiJobs || []).find(row => row.title === supportTitle);
  const fundiRefund = (state.fundiRefunds || []).find(row => row.job === refunded?.id);
  assert(open?.status === "cancelled" && open.escrow?.state === "cancelled", "pre-funding cancellation did not close without refund");
  assert(!(state.fundiRefunds || []).some(row => row.job === open.id), "pre-funding cancellation should not create refund");
  assert(refunded?.status === "cancelled" && refunded.escrow?.state === "refunded", "funded pre-start cancellation did not refund and close");
  assert(fundiRefund?.amount === refunded.escrow.amount && fundiRefund.providerStatus === "provider pending", "fundi refund record missing exact escrow amount/provider status");
  assert(fundiRefund?.nonSettling === true && fundiRefund.providerVerified === false && fundiRefund.spendable === false && /no_settlement/.test(fundiRefund?.settlementStatus || ""), "fundi refund should remain provider-led and non-spendable");
  assert((state.notifications || []).some(n => n.kind === "refund" && n.refund && n.record?.id === refunded.id), "fundi refund notification missing exact record");
  assert((state.emails || []).some(e => e.to === "riley_creator" && /Freelancer escrow refund/.test(e.subject || "")), "freelancer refund email missing");
  assert((state.followUps || []).some(f => /freelancer refund provider status|fundi refund provider status/i.test(f.title || "")), "freelancer refund follow-up missing");
  assert((state.fundiJobRooms?.[refunded.id]?.messages || []).some(msg => /Escrow refund recorded/.test(msg.text || "")), "refund event missing from customer room");
  await page.evaluate(id => {
    App.setAccount("riley_creator");
    App.refundOpsDesk(id);
  }, fundiRefund.id);
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Refund operations") && text.includes("Provider pending") && text.includes("Freelancer escrow"), "refund operations desk missing freelancer provider queue");
  assert(text.includes("View only"), "customer-facing fundi refund row should be view-only");
  await page.evaluate(id => App.refundProviderUpdate("fundi", id, "provider failed"), fundiRefund.id);
  await page.waitForTimeout(120);
  state = await saved();
  assert((state.fundiRefunds || []).find(row => row.id === fundiRefund.id)?.providerStatus === "provider pending", "customer should not be able to update fundi refund provider status");
  await page.evaluate(id => {
    App.setAccount("kariokor_threads");
    App.refundProviderUpdate("fundi", id, "provider failed");
  }, fundiRefund.id);
  await page.waitForTimeout(180);
  state = await saved();
  const failedRefund = (state.fundiRefunds || []).find(row => row.id === fundiRefund.id);
  const failedJob = (state.fundiJobs || []).find(row => row.id === refunded.id);
  assert(failedRefund?.providerStatus === "provider failed" && failedRefund.support, "fundi provider failure did not update refund/support link");
  assert(failedJob?.escrow?.state === "refund review", "fundi provider failure did not move escrow to refund review");
  assert((state.supportIncidents || []).some(row => row.refund === failedRefund.id && row.type === "fundiRefundProvider"), "fundi provider failure support incident missing");
  assert(support?.status === "disputed" && support.escrow?.state === "held", "post-start cancellation did not route to support hold");
  assert((state.supportIncidents || []).some(row => row.job === support.id && row.type === "fundiJobCancellation" && row.priority === "trust hold"), "post-start cancellation support case missing");
  assert(!(state.fundiRefunds || []).some(row => row.job === support.id), "post-start cancellation should not auto-refund");
});

await step("founder revenue and anti-bypass keep freelancer escrow inside the app", async () => {
  const title = "QA state anti bypass";
  await page.evaluate(({ key, title }) => {
    const stored = () => JSON.parse(localStorage.getItem(key) || "{}");
    const findJob = () => (stored().fundiJobs || []).find(row => row.title === title);
    App.setAccount("riley_creator");
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = title;
    document.getElementById("fundiJobCategory").value = "Repair";
    document.getElementById("fundiJobBudget").value = "4800";
    document.getElementById("fundiJobLocality").value = "Westlands";
    document.getElementById("fundiJobDue").value = "Tomorrow";
    document.getElementById("fundiJobDetails").value = "Keep all price, proof and payment notes in Artbook.";
    App.saveFundiJob();
    let job = findJob();
    App.fundiBid(job.id, "kariokor_threads");
    job = findJob();
    App.acceptFundiBid(job.id, job.bids.find(row => row.fundi === "kariokor_threads").id);
    App.setAccount("kariokor_threads");
    App.confirmFundiAgreement(job.id);
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    App.fundiJobDetail(job.id);
    document.getElementById(`fundiRoomText_${job.id}`).value = "Pay me direct on WhatsApp +254 700 222 333 outside app.";
    App.sendFundiJobRoom(job.id);
    App.setAccount("kariokor_threads");
    App.fundiStartJob(job.id);
    App.founderRevenueDesk();
  }, { key: KEY, title });
  await page.waitForTimeout(260);
  let state = await saved();
  const job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job?.status === "funded", "off-app warning did not hold freelancer work before start");
  assert((job.bypassFlags || []).some(row => row.status === "open"), "bypass flag missing");
  assert((state.supportIncidents || []).some(row => row.job === job.id && row.type === "fundiBypass"), "bypass support/compliance incident missing");
  const text = await page.evaluate(() => document.body.textContent || "");
  assert(/Founder revenue cockpit/i.test(text) && /Fee preview/i.test(text) && /Provider review/i.test(text) && /Moto signals/i.test(text), "founder revenue cockpit missing fee, provider or Moto signal summary");
  assert(/No hidden custody/i.test(text), "founder revenue cockpit missing custody boundary");
  assert(text.includes("Freelancer escrow") && text.includes("Subscribed content") && text.includes("Anti-bypass warnings"), "founder revenue desk missing escrow/subscription/anti-bypass model");
  assert(text.includes("Provider-led money boundary") && text.includes("Demo ledger only") && text.includes("No custody"), "founder revenue desk missing non-settling provider boundary");
});

await step("courier trip sheet writes incident cash and payout ledger", async () => {
  let state = await saved();
  const order = (state.orders || []).find(o => o.buyer === "riley_artist" && o.seller === "riley_biz");
  assert(order, "courier ledger test order missing");

  await page.evaluate(id => {
    App.setAccount("riley_courier");
    App.courierTripDesk(id);
  }, order.id);
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Courier trip sheet") && text.includes("Payout ledger") && text.includes("Cash reconciliation") && text.includes("Request payout"), "courier trip sheet missing ledger, cash or payout controls");

  await page.evaluate(id => {
    App.requestCourierPayout(id);
  }, order.id);
  await page.waitForTimeout(220);
  state = await saved();
  let ledger = (state.courierLedger || []).find(row => row.order === order.id);
  assert(ledger?.status === "proof pending" && /goods count|route update|drop-off|customer PIN/i.test(ledger.hold || ""), "courier payout was not blocked by missing handoff proof");
  assert((state.notifications || []).some(n => /Courier payout waiting on proof/.test(n.title || "") && n.record?.type === "order" && n.record?.id === order.id && visibleTo(n, "riley_courier")), "courier payout proof-hold notification missing");

  await page.evaluate(id => {
    for (let i = 0; i < 5; i += 1) App.courierAdvance(id);
    App.requestCourierPayout(id);
  }, order.id);
  await page.waitForTimeout(220);
  state = await saved();
  ledger = (state.courierLedger || []).find(row => row.order === order.id);
  const proofedOrder = (state.orders || []).find(o => o.id === order.id);
  assert(ledger?.status === "payout requested" && ledger.amount > 0, "courier payout request did not update ledger");
  assert(proofedOrder?.proof?.goods && proofedOrder?.proof?.route && proofedOrder?.proof?.dropoff && proofedOrder?.proof?.customerPin, "courier handoff proof did not capture goods, route, drop-off and customer PIN");
  assert((state.notifications || []).some(n => /Courier payout requested/.test(n.title || "") && n.record?.type === "order" && n.record?.id === order.id && visibleTo(n, "riley_courier")), "courier payout notification missing");
  assert((state.emails || []).some(e => e.to === "riley_courier" && /Courier payout update/.test(e.subject || "")), "courier payout email missing");
  assert((state.followUps || []).some(f => /Courier payout review/.test(f.title || "") && visibleTo(f, "riley_courier")), "courier payout follow-up missing");

  await page.evaluate(id => App.courierCashDesk(id), order.id);
  await page.waitForSelector("#cashExpected", { state: "visible", timeout: 5000 });
  await page.fill("#cashExpected", "1200");
  await page.fill("#cashCollected", "900");
  await page.fill("#cashNote", "Customer only had 900 cash; dispatch must reconcile the balance.");
  await page.evaluate(id => App.saveCourierCash(id), order.id);
  await page.waitForTimeout(180);
  state = await saved();
  ledger = (state.courierLedger || []).find(row => row.order === order.id);
  const cashOrder = (state.orders || []).find(o => o.id === order.id);
  assert(ledger?.cashStatus === "mismatch" && ledger.status === "cash review", "cash mismatch did not hold courier ledger");
  assert(/cash reconciliation/i.test(cashOrder?.payoutHold || ""), "cash mismatch did not hold order payout");

  await page.evaluate(id => App.courierIncident(id), order.id);
  await page.waitForSelector("#incidentType", { state: "visible", timeout: 5000 });
  await page.selectOption("#incidentType", "Safety concern");
  await page.fill("#incidentNote", "Unsafe handoff location; rider needs dispatch support before returning.");
  await page.evaluate(id => App.saveCourierIncident(id), order.id);
  await page.waitForTimeout(200);
  state = await saved();
  const incident = (state.courierIncidents || [])[0];
  const support = (state.supportIncidents || []).find(row => row.courierIncident === incident?.id);
  const held = (state.orders || []).find(o => o.id === order.id);
  assert(incident?.order === order.id && incident.type === "Safety concern" && incident.priority === "urgent", "courier incident was not stored with priority");
  assert(support?.order === order.id && support.reason === "Safety concern", "courier incident did not create exact support case");
  assert(/incident review/i.test(held?.payoutHold || ""), "courier incident did not hold payout for review");
  assert((state.messages?.riley_biz || []).some(msg => msg.type === "support" && msg.support === support.id), "seller thread missing courier incident support message");
  assert((state.notifications || []).some(n => n.title === "Delivery incident" && n.support === support.id && visibleTo(n, "riley_courier") && visibleTo(n, "riley_biz")), "courier incident notification missing audience or support link");
  assert((state.followUps || []).some(f => /Resolve courier incident/.test(f.title || "") && visibleTo(f, "riley_courier")), "courier incident follow-up missing");
});

await step("order support creates exact dispute and trust trail", async () => {
  let state = await saved();
  const order = (state.orders || []).find(o => o.buyer === "riley_artist" && o.seller === "riley_biz");
  assert(order, "support test order missing");

  await page.evaluate(id => {
    App.setAccount("riley_artist");
    App.orderSupportDesk(id);
  }, order.id);
  await page.waitForSelector("#supportReason", { state: "visible", timeout: 5000 });
  await page.selectOption("#supportReason", "Proof mismatch / damaged package");
  await page.selectOption("#supportPriority", "trust hold");
  await page.fill("#supportRequest", "Hold payout and review proof before release.");
  await page.fill("#supportNote", "QA support trail: package photo does not match buyer handoff.");
  await page.evaluate(id => App.saveOrderSupport(id), order.id);
  await page.waitForTimeout(200);

  state = await saved();
  const support = (state.supportIncidents || [])[0];
  const updated = (state.orders || []).find(o => o.id === order.id);
  assert(support?.order === order.id && support.reason === "Proof mismatch / damaged package", "support incident missing exact order reason");
  assert(updated?.status === "Support trust hold" && /support review/i.test(updated.payoutHold || ""), "support did not hold order payout/status");
  assert((updated?.events || []).some(e => /Support opened/.test(e.label || "")), "support event missing from order trail");
  assert((state.messages?.riley_biz || []).some(msg => msg.type === "support" && msg.order === order.id && msg.support === support.id), "seller support thread missing");
  assert((state.notifications || []).some(n => n.kind === "support" && n.record?.type === "order" && n.record?.id === order.id && visibleTo(n, "riley_artist") && visibleTo(n, "riley_biz")), "support notification missing exact order audience");
  assert((state.followUps || []).some(f => /Resolve order support/.test(f.title || "") && f.entity === "riley_biz"), "support follow-up missing");
  assert((state.emails || []).some(e => e.to === "riley_biz" && /Order support case/.test(e.subject || "")), "support email missing");
  assert((state.trustReports || []).some(r => r.order === order.id && r.support === support.id && r.to === "riley_biz"), "trust report missing for damaged proof support case");

  await page.evaluate(id => App.orderDetail(id), order.id);
  await page.waitForTimeout(160);
  const text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Support cases") && text.includes("Proof mismatch / damaged package"), "order detail did not expose support case");

  await page.evaluate(id => App.openSupportCase(id), support.id);
  await page.waitForTimeout(160);
  let supportText = await page.evaluate(() => document.body.textContent || "");
  assert(supportText.includes("Support case") && supportText.includes("Proof mismatch / damaged package") && supportText.includes("Open order") && supportText.includes("Close-out review"), "support case detail did not expose exact source, message and close-out actions");
  await page.evaluate(id => App.supportResolutionDesk(id), support.id);
  await page.waitForSelector("[data-support-resolution-v7]", { state: "visible", timeout: 5000 });
  supportText = await page.evaluate(() => document.querySelector("#modal.on")?.textContent || "");
  assert(supportText.includes("Support close-out") && supportText.includes("Confirm close-out") && supportText.includes("Backend boundary"), "support close-out gate did not expose proof, note and backend boundary");
  await page.evaluate(() => App.closeModal());

  await page.evaluate(id => {
    App.setAccount("riley_artist");
    App.openWorkChat("support", id, "riley_biz");
  }, support.id);
  await page.waitForTimeout(160);
  let route = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      page: stored.page,
      tab: stored.commTab,
      activeChat: stored.activeChat,
      activeWorkChat: stored.activeWorkChat,
      text: document.body.textContent || "",
    };
  }, KEY);
  assert(route.page === "inbox" && route.tab === "messages", `support Message button did not open message inbox: page=${route.page || ""}, tab=${route.tab || ""}, active=${route.activeChat || ""}, work=${route.activeWorkChat || ""}`);
  assert(route.activeChat === "riley_biz", `support Message opened ${route.activeChat || "nothing"} instead of seller`);
  assert(String(route.activeWorkChat) === `support:${support.id}`, "support Message route did not keep exact support case context");
  assert(route.text.includes("Proof mismatch / damaged package"), "support chat did not show the exact case context");
  await page.fill("#chatText", "QA support-specific message");
  await page.evaluate(() => App.sendChat("riley_biz"));
  await page.waitForTimeout(160);
  state = await saved();
  assert((state.messages?.riley_biz || []).some(msg => msg.type === "support" && msg.support === support.id && /QA support-specific message/.test(msg.text || "")), "support chat message did not keep support id");

  await page.evaluate(id => App.openSupportCase(id), support.id);
  await page.waitForTimeout(120);
  await page.fill("#supportCaseNote", "QA support exact case note");
  await page.evaluate(id => App.addSupportCaseNote(id), support.id);
  await page.waitForTimeout(160);
  state = await saved();
  const noted = (state.supportIncidents || []).find(row => row.id === support.id);
  assert((noted?.events || []).some(row => row.label === "Support note" && /QA support exact case note/.test(row.detail || "")), "support note did not persist on exact case");
  assert((state.notifications || []).some(n => n.kind === "support" && n.support === support.id), "support note notification missing exact support link");

  await page.evaluate(id => App.resolveSupportCase(id), support.id);
  await page.waitForTimeout(160);
  state = await saved();
  const resolved = (state.supportIncidents || []).find(row => row.id === support.id);
  const resolvedOrder = (state.orders || []).find(o => o.id === order.id);
  assert(resolved?.status === "resolved" && resolved.resolvedBy === "riley_artist", "support case did not resolve with actor");
  assert(resolvedOrder?.status === "Support resolved" && /Support resolved/i.test(resolvedOrder.payoutHold || ""), "support resolution did not update source order");
});

await step("general provenance seals require completed evidence records", async () => {
  let state = await saved();
  const order = (state.orders || []).find(o => o.buyer === "riley_artist" && o.seller === "riley_biz");
  assert(order, "provenance evidence test order missing");

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.giveSeal("nyota_poet");
  });
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Evidence needed") && text.includes("No completed proof record"), "loose Seal path did not block missing evidence");
  state = await saved();
  assert(!(state.trustSeals || []).some(row => row.from === "riley_artist" && row.to === "nyota_poet"), "loose evidence-free Seal was written");

  await page.evaluate(id => {
    App.setAccount("riley_artist");
    App.giveSeal("riley_biz");
  }, order.id);
  await page.waitForSelector("#sealEvidence", { state: "visible", timeout: 5000 });
  await page.fill("#sealText", "QA evidence-backed vouch: delivery, support trail and customer approval are visible on the order.");
  await page.evaluate(() => App.saveSeal("riley_biz"));
  await page.waitForTimeout(160);
  state = await saved();
  const evidenceId = `order:${order.id}`;
  const evidenceSeals = (state.trustSeals || []).filter(row => row.from === "riley_artist" && row.to === "riley_biz" && row.evidenceId === evidenceId);
  assert(evidenceSeals.length === 1 && evidenceSeals[0].type === "buyer" && evidenceSeals[0].record?.type === "order", "evidence-backed order Seal missing proof metadata");
  assert((state.notifications || []).some(n => n.title === "New Provenance Seal" && visibleTo(n, "riley_artist") && visibleTo(n, "riley_biz")), "evidence-backed Seal notification missing");

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.giveSeal("riley_biz");
  });
  await page.waitForSelector("#sealEvidence", { state: "visible", timeout: 5000 });
  await page.fill("#sealText", "Duplicate should not write another Seal for the same proof.");
  await page.evaluate(() => App.saveSeal("riley_biz"));
  await page.waitForTimeout(160);
  state = await saved();
  assert((state.trustSeals || []).filter(row => row.from === "riley_artist" && row.to === "riley_biz" && row.evidenceId === evidenceId).length === 1, "duplicate evidence-backed Seal was allowed");
});

await step("trust reports require evidence before affecting trust score", async () => {
  let state = await saved();
  const order = (state.orders || []).find(o => o.buyer === "riley_artist" && o.seller === "riley_biz");
  assert(order, "trust report evidence test order missing");

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.reportSeller("london_amina");
  });
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Intake only") && text.includes("non-scoring intake"), "evidence-free report did not render intake-only copy");
  assert((await page.locator("#reportEvidence").count()) === 0, "evidence-free report should not show a linked-record picker");
  await page.fill("#reportText", "QA unsupported accusation should stay intake only.");
  await page.evaluate(() => App.submitReport("london_amina"));
  await page.waitForTimeout(160);
  state = await saved();
  const intake = (state.trustReports || []).find(row => row.from === "riley_artist" && row.to === "london_amina" && /unsupported accusation/.test(row.text || ""));
  assert(intake?.status === "intake" && !intake.evidenceId, "unsupported report did not become non-scoring intake");
  await page.evaluate(() => App.trustDesk("london_amina"));
  await page.waitForTimeout(120);
  text = await page.evaluate(() => document.querySelector("#modal .modal-body")?.textContent || document.body.textContent || "");
  assert(text.includes("Report intake") && text.includes("not scoring yet"), "intake report was not visible to reporter as non-scoring");
  assert(!text.includes("Active report review"), "intake report appeared in active trust flags");

  await page.evaluate(() => App.reportSeller("riley_biz"));
  await page.waitForSelector("#reportEvidence", { state: "visible", timeout: 5000 });
  await page.fill("#reportText", "QA evidence-backed report should link to order/support proof.");
  await page.evaluate(() => App.submitReport("riley_biz"));
  await page.waitForTimeout(160);
  state = await saved();
  const active = (state.trustReports || []).find(row => row.from === "riley_artist" && row.to === "riley_biz" && /evidence-backed report/.test(row.text || ""));
  assert(active?.status === "open", "linked report did not open active review");
  assert(active.evidenceId && active.record && (active.order === order.id || active.support), "linked report missing evidence metadata");
  await page.evaluate(() => App.trustDesk("riley_biz"));
  await page.waitForTimeout(120);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Active reports") && text.includes("Active report review"), "evidence-backed report did not affect active trust review");
});

await step("business invoice creates receipt, inbox, email and notification trail", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.go("register");
    App.setPosCustomer("zuri");
    App.posAdd("p1");
    App.posCharge("invoice");
  });
  await page.waitForTimeout(250);
  const state = await saved();
  const invoice = (state.posInvoices || [])[0];
  assert(invoice?.seller === "riley_biz", "invoice seller missing");
  assert(invoice?.customer === "zuri", "invoice customer missing");
  assert((state.posCart || []).length === 0, "POS cart did not clear after invoice");
  assert((state.messages?.zuri || []).some(msg => msg.type === "invoice" && /Invoice from Business/.test(msg.text || "")), "customer thread did not get invoice");
  assert((state.emails || []).some(e => e.to === "zuri" && /Artbook invoice/.test(e.subject || "")), "customer invoice email missing");
  assert((state.notifications || []).some(n => n.kind === "invoice" && visibleTo(n, "riley_biz") && visibleTo(n, "zuri")), "invoice notification missing");
  assert(state.registerTab === "receipts", "invoice did not land in receipts");
});

await step("POS sale and refund restock write stock movement history", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.closeModal();
    App.inventoryDesk("p1");
    document.getElementById("inventoryCount").value = "10";
    document.getElementById("inventoryNote").value = "QA opening stock before POS movement audit.";
    App.saveInventory("p1");
  });
  await page.waitForTimeout(120);
  await unlockFinance("riley_biz");
  await page.evaluate(() => {
    App.go("register");
    App.setPosCustomer("zuri");
    App.posAdd("p1");
    App.posCharge("card");
  });
  await page.waitForTimeout(220);
  let state = await saved();
  const sale = (state.posSales || []).find(row => row.time === "Just now" && row.items?.some(i => i.id === "p1"));
  assert(sale?.seller === "riley_biz" && sale.items?.some(i => i.id === "p1"), "paid POS sale was not recorded");
  assert(Number(state.inventory?.p1) === 9, "paid POS sale did not decrement physical stock");
  assert((state.stockIntakeAudits || []).some(row => row.item === "p1" && row.sale === sale.id && row.source === "POS sale stock decrement" && row.previous === 10 && row.count === 9 && row.delta === -1), "paid POS sale missing stock movement audit row");

  await page.evaluate(id => App.posRefundDesk(id), sale.id);
  await page.waitForSelector("#refundAmount", { state: "visible", timeout: 5000 });
  await page.fill("#refundAmount", String(sale.total));
  await page.selectOption("#refundReason", "Customer return");
  await page.fill("#refundNote", "QA restock audit trail");
  await page.evaluate(id => {
    const restock = document.getElementById("refundRestock");
    if(restock) restock.checked = true;
    App.confirmPosRefund(id);
  }, sale.id);
  await page.waitForTimeout(220);
  state = await saved();
  const refund = (state.posRefunds || [])[0];
  assert(refund?.sale === sale.id && refund.restocked === true, "restocked refund row missing");
  assert(Number(state.inventory?.p1) === 10, "restocked refund did not restore physical stock");
  assert((state.stockIntakeAudits || []).some(row => row.item === "p1" && row.sale === sale.id && row.refund === refund.id && row.source === "Refund restock" && row.previous === 9 && row.count === 10 && row.delta === 1), "refund restock missing stock movement audit row");
  await page.evaluate(() => App.inventoryDesk("p1"));
  await page.waitForTimeout(160);
  const text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Movement history") && text.includes("POS sale stock decrement") && text.includes("Refund restock"), "stock desk did not expose sale/refund movement history");
  await page.evaluate(() => App.closeModal());
});

await step("low stock reorder creates supplier PO and receiving proof", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.inventoryDesk("p2");
    document.getElementById("inventoryCount").value = "2";
    document.getElementById("inventoryNote").value = "QA low stock before supplier reorder.";
    App.saveInventory("p2");
  });
  await page.waitForTimeout(160);
  await page.evaluate(() => {
    App.inventoryDesk("p2");
    document.getElementById("inventoryReorderPoint").value = "4";
    document.getElementById("inventoryRestockTarget").value = "11";
    document.getElementById("inventorySupplier").value = "Kilimani Beauty Supply";
    document.getElementById("inventorySupplierRef").value = "KBS-DET-SET";
    document.getElementById("inventoryLeadTime").value = "2";
    document.getElementById("inventoryOrderQty").value = "9";
    document.getElementById("inventoryPaymentTerms").value = "Pay on delivery / M-Pesa till";
    document.getElementById("inventoryProofNote").value = "Supplier invoice, delivery photo and item count required.";
    App.createStockPurchaseOrder("p2");
  });
  await page.waitForTimeout(220);
  let state = await saved();
  const po = (state.stockPurchaseOrders || []).find(row => row.item === "p2" && row.supplierRef === "KBS-DET-SET");
  assert(po?.status === "draft" && po.qty === 9 && po.totalCost > 0, "supplier PO draft missing quantity, status or cost");
  assert(Number(state.inventory?.p2) === 2, "draft supplier PO should not change stock");
  assert((state.stockIntakeAudits || []).some(row => row.item === "p2" && row.po === po.id && row.source === "Supplier purchase order drafted"), "supplier PO draft missing audit row");

  await page.evaluate(id => App.markStockPurchaseOrderOrdered(id), po.id);
  await page.waitForTimeout(180);
  state = await saved();
  assert((state.stockPurchaseOrders || []).find(row => row.id === po.id)?.status === "ordered", "supplier PO did not move to ordered");
  assert(Number(state.inventory?.p2) === 2, "ordered supplier PO should not change stock before receiving");

  await page.evaluate(id => App.receiveStockPurchaseOrder(id), po.id);
  await page.waitForTimeout(220);
  state = await saved();
  const received = (state.stockPurchaseOrders || []).find(row => row.id === po.id);
  assert(received?.status === "received" && received.receivedQty === 9, "supplier PO did not receive with exact quantity");
  assert(Number(state.inventory?.p2) === 11, "supplier receiving did not increase stock by received quantity");
  assert((state.stockIntakeAudits || []).some(row => row.item === "p2" && row.po === po.id && row.source === "Supplier purchase order received" && row.previous === 2 && row.count === 11), "supplier receiving missing stock movement audit row");
  await page.evaluate(() => App.accountingReadoutDesk());
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Supplier orders") && text.includes("Supplier PO") && text.includes("Stock purchase order"), "accounting readout missing supplier purchase order lane");
  await page.evaluate(() => App.accountingExportDesk());
  await page.waitForSelector("#accountingExportText", { state: "visible", timeout: 5000 });
  const exportText = await page.$eval("#accountingExportText", el => el.value);
  assert(exportText.includes("Supplier PO") && exportText.includes(po.poNumber), "accounting export missing supplier PO row");
  await page.evaluate(() => App.closeModal());
});

await step("partial supplier receiving records damaged missing exception", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.inventoryDesk("p3");
    document.getElementById("inventoryCount").value = "1";
    document.getElementById("inventoryNote").value = "QA stock before partial supplier receipt.";
    App.saveInventory("p3");
  });
  await page.waitForTimeout(160);
  await page.evaluate(() => {
    App.inventoryDesk("p3");
    document.getElementById("inventoryReorderPoint").value = "4";
    document.getElementById("inventoryRestockTarget").value = "11";
    document.getElementById("inventorySupplier").value = "Kilimani Beauty Supply";
    document.getElementById("inventorySupplierRef").value = "KBS-PARTIAL-SCARF";
    document.getElementById("inventoryLeadTime").value = "3";
    document.getElementById("inventoryOrderQty").value = "10";
    document.getElementById("inventoryPaymentTerms").value = "Pay on delivery / supplier credit for shortages";
    document.getElementById("inventoryProofNote").value = "Supplier waybill, delivery photo and mismatch note required.";
    App.createStockPurchaseOrder("p3");
  });
  await page.waitForTimeout(220);
  let state = await saved();
  const po = (state.stockPurchaseOrders || []).find(row => row.item === "p3" && row.supplierRef === "KBS-PARTIAL-SCARF");
  assert(po?.status === "draft" && po.qty === 10, "partial supplier PO draft missing expected quantity");

  await page.evaluate(id => App.markStockPurchaseOrderOrdered(id), po.id);
  await page.waitForTimeout(180);
  await page.evaluate(id => App.stockPurchaseOrderReceiveDesk(id), po.id);
  await page.waitForSelector("#poReceiveAccepted", { state: "visible", timeout: 5000 });
  await page.fill("#poReceiveAccepted", "4");
  await page.fill("#poReceiveDamaged", "2");
  await page.fill("#poReceiveMissing", "1");
  await page.fill("#poReceiveProof", "Phone QA partial delivery: waybill photo, damaged pack photo and supplier shortage note.");
  await page.fill("#poReceiveNote", "Supplier promised replacement or credit for the damaged/missing units.");
  await page.evaluate(id => App.receiveStockPurchaseOrder(id), po.id);
  await page.waitForTimeout(220);
  state = await saved();
  const updated = (state.stockPurchaseOrders || []).find(row => row.id === po.id);
  assert(updated?.status === "partial received" && updated.receivedQty === 4 && updated.damagedQty === 2 && updated.missingQty === 1, "partial supplier PO did not persist accepted damaged and missing counts");
  assert(updated.receipts?.[0]?.accepted === 4 && updated.receipts?.[0]?.damaged === 2 && updated.receipts?.[0]?.missing === 1, "partial supplier PO missing receipt trail");
  assert(Number(state.inventory?.p3) === 5, "partial supplier receiving should only add accepted units to stock");
  assert(/supplier exception open/i.test(updated.exceptionStatus || "") && updated.supportIncident, "partial supplier PO did not keep supplier exception open");
  assert((state.supportIncidents || []).some(row => row.id === updated.supportIncident && row.type === "supplierReceivingException" && row.po === po.id && /damaged 2, missing 1/.test(row.detail || "")), "supplier receiving exception support case missing damaged/missing detail");
  assert((state.stockIntakeAudits || []).some(row => row.item === "p3" && row.po === po.id && row.source === "Supplier purchase order partially received" && row.previous === 1 && row.count === 5 && row.support === updated.supportIncident), "partial supplier receipt missing stock movement audit row");
  assert((state.followUps || []).some(f => /Resolve supplier exception/.test(f.title || "") && f.audience === "riley_biz"), "supplier exception follow-up missing");
  await page.evaluate(() => App.inventoryDesk("p3"));
  await page.waitForTimeout(160);
  const text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("partial received") && text.includes("accepted 4") && text.includes("damaged 2") && text.includes("missing 1"), "stock desk did not expose partial supplier receipt counts");
  await page.evaluate(() => App.closeModal());
});

await step("business refund writes customer, email, follow-up and accounting trail", async () => {
  const before = await saved();
  const sale = (before.posSales || []).find(s => s.id === "sale_demo_receipt") || (before.posSales || [])[0];
  assert(sale, "refund test sale missing");
  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.posRefundDesk(id);
  }, sale.id);
  await page.waitForSelector("#refundAmount", { state: "visible", timeout: 5000 });
  await page.fill("#refundAmount", "1200");
  await page.selectOption("#refundReason", "Service recovery");
  await page.fill("#refundNote", "QA refund trail consistency check");
  await page.evaluate(id => App.confirmPosRefund(id), sale.id);
  await page.waitForTimeout(220);
  let state = await saved();
  const refund = (state.posRefunds || [])[0];
  const updatedSale = (state.posSales || []).find(s => s.id === sale.id);
  assert(refund?.sale === sale.id && refund.amount === 1200, "refund record missing amount and sale link");
  assert(refund.providerStatus === "provider pending", "refund provider boundary missing");
  assert(updatedSale?.status === "partially refunded", "sale did not record partial refund state");
  assert((state.messages?.zuri || []).some(msg => msg.type === "refund" && msg.refund === refund.id), "customer thread did not receive refund");
  assert((state.emails || []).some(e => e.to === "zuri" && /Refund recorded/.test(e.subject || "")), "refund email missing");
  assert((state.followUps || []).some(f => /Refund follow-up/.test(f.title || "") && f.audience === "riley_biz"), "refund follow-up missing");
  assert((state.notifications || []).some(n => n.kind === "refund" && n.record?.focus === `refund:${refund.id}`), "refund notification missing exact record");
  await page.evaluate(() => App.accountingReadoutDesk());
  await page.waitForTimeout(180);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Refund") && text.includes("Refund desk"), "accounting readout missing refund ledger line");
  assert(text.includes("Refund ops"), "accounting readout missing refund operations button");
  await page.evaluate(id => App.refundOpsDesk(id), refund.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Refund operations") && text.includes("Provider pending") && text.includes("Sales Desk"), "refund operations desk missing POS provider queue");
  await page.evaluate(id => {
    App.setAccount("zuri");
    App.refundOpsDesk(id);
  }, refund.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("View only"), "customer-facing POS refund row should be view-only");
  await page.evaluate(id => App.refundProviderUpdate("pos", id, "provider succeeded"), refund.id);
  await page.waitForTimeout(120);
  state = await saved();
  assert((state.posRefunds || []).find(row => row.id === refund.id)?.providerStatus === "provider pending", "customer should not be able to update POS refund provider status");
  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.refundProviderUpdate("pos", id, "provider succeeded");
  }, refund.id);
  await page.waitForTimeout(180);
  state = await saved();
  const settledRefund = (state.posRefunds || []).find(row => row.id === refund.id);
  assert(settledRefund?.providerStatus === "provider succeeded" && settledRefund.providerRef, "POS provider success did not settle refund with provider reference");
  assert((state.notifications || []).some(n => n.title === "Refund provider succeeded" && n.refund === refund.id), "POS provider success notification missing");
  assert((state.messages?.zuri || []).some(msg => msg.refund === refund.id && /provider update/i.test(msg.text || "")), "customer thread missing provider success update");
  await page.evaluate(() => App.closeModal());
});

await step("booking writes both calendars, provider prep and booker reminder", async () => {
  await unlockFinance("riley_artist");
  await page.evaluate(() => {
    App.confirmBooking("sv1", "Sat 12:00", "wk_owner", {
      slot: "Sat 12:00",
      staffId: "wk_owner",
      place: "seller",
      placeNote: "QA booking trail consistency check",
    });
  });
  await page.waitForTimeout(260);
  let state = await saved();
  const booking = (state.bookings || []).find(b => b.booker === "riley_artist" && b.provider === "riley_biz" && b.slot === "Sat 12:00");
  assert(Boolean(booking), "booking not stored for both parties");
  assert((state.messages?.riley_biz || []).some(msg => msg.type === "booking" && /Silk Press/.test(msg.text || "")), "provider did not receive booking message");
  assert((state.notifications || []).some(n => n.kind === "booking" && n.link === "home" && visibleTo(n, "riley_artist") && visibleTo(n, "riley_biz")), "booking Today notification missing");
  assert((state.emails || []).some(e => e.to === "riley_biz" && /New Artbook booking/.test(e.subject || "")), "provider booking email missing");
  assert((state.followUps || []).some(f => /Provider prep/.test(f.title || "") && f.audience === "riley_biz"), "provider prep follow-up missing");
  assert((state.followUps || []).some(f => /Booker reminder/.test(f.title || "") && f.audience === "riley_artist"), "booker reminder missing");
  assert(state.page === "home", "booking did not return to Today");

  await page.evaluate(id => {
    App.setAccount("riley_artist");
    App.bookingMessages(id);
  }, booking.id);
  await page.waitForTimeout(180);
  let route = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      page: stored.page,
      tab: stored.commTab,
      activeChat: stored.activeChat,
      activeBookingChat: stored.activeBookingChat,
      activeWorkChat: stored.activeWorkChat,
      text: document.body.textContent || "",
    };
  }, KEY);
  assert(route.page === "inbox" && route.tab === "messages", "booking Message button did not open message inbox");
  assert(route.activeChat === "riley_biz", `booker booking message opened ${route.activeChat || "nothing"} instead of provider`);
  assert(String(route.activeBookingChat) === String(booking.id), "booking message route did not keep exact booking context");
  assert(String(route.activeWorkChat) === `booking:${booking.id}`, "booking message route did not set exact work chat context");
  assert(route.text.includes("Silk Press") && route.text.includes("Sat 12:00"), "booking chat did not show the exact booking context");
  assert(/Contact passport/i.test(route.text) && /Exact work record/i.test(route.text) && /No direct numbers/i.test(route.text), "booking work chat did not expose contact privacy passport");

  await page.fill("#chatText", "QA booking-specific message");
  await page.evaluate(() => App.sendChat("riley_biz"));
  await page.waitForTimeout(160);
  state = await saved();
  assert((state.messages?.riley_biz || []).some(msg => msg.type === "booking" && String(msg.booking) === String(booking.id) && /QA booking-specific message/.test(msg.text || "")), "booking chat message did not keep booking id");

  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.bookingMessages(id);
  }, booking.id);
  await page.waitForTimeout(180);
  route = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      page: stored.page,
      tab: stored.commTab,
      activeChat: stored.activeChat,
      activeBookingChat: stored.activeBookingChat,
      activeWorkChat: stored.activeWorkChat,
      text: document.body.textContent || "",
    };
  }, KEY);
  assert(route.activeChat === "riley_artist", `provider booking message opened ${route.activeChat || "nothing"} instead of customer`);
  assert(String(route.activeBookingChat) === String(booking.id), "provider booking message route lost exact booking context");
  assert(String(route.activeWorkChat) === `booking:${booking.id}`, "provider booking message route lost work chat context");
  assert(route.text.includes("QA booking-specific message"), "provider booking chat did not show customer booking message");

  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.openComms("messages");
  });
  await page.waitForSelector(".thread-list", { state: "visible", timeout: 5000 });
  await page.locator(".thread-row.clean").filter({ hasText: "Riley" }).first().click();
  await page.waitForTimeout(180);
  route = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      page: stored.page,
      tab: stored.commTab,
      activeChat: stored.activeChat,
      activeBookingChat: stored.activeBookingChat,
      activeWorkChat: stored.activeWorkChat,
      text: document.body.textContent || "",
    };
  }, KEY);
  assert(route.page === "inbox" && route.tab === "messages", "thread row with customer work did not stay in Messages");
  assert(route.activeChat === "riley_artist", "thread row with booking work did not open the exact customer chat");
  assert(!route.activeBookingChat && !route.activeWorkChat, "plain thread row should not force the consultation filter");
  assert(route.text.includes("QA booking-specific message"), "plain customer chat did not show the booking conversation");
  assert(/\d+ record/.test(route.text), "plain customer chat missing work-record shortcut");

  await page.evaluate(id => {
    App.setAccount("musa");
    App.confirmReschedule(id, "Tue 09:00", "wk_owner");
    App.cancelBooking(id);
    App.setAccount("riley_biz");
  }, booking.id);
  await page.waitForTimeout(160);
  state = await saved();
  let guarded = (state.bookings || []).find(row => String(row.id) === String(booking.id));
  assert(guarded?.slot === booking.slot && guarded.status === booking.status, "unrelated account could mutate booking reschedule/cancel");

  await page.evaluate(id => App.confirmReschedule(id, "Fri 15:00", "wk_owner"), booking.id);
  await page.waitForTimeout(180);
  state = await saved();
  let changed = (state.bookings || []).find(row => String(row.id) === String(booking.id));
  assert(changed?.slot === "Fri 15:00" && changed.status === "rescheduled", "provider reschedule did not update booking");
  assert(changed?.rescheduleCount === 1, "provider reschedule did not increment reschedule count");
  assert((state.messages?.riley_artist || []).some(msg => msg.type === "booking" && String(msg.booking) === String(booking.id) && /Booking rescheduled/.test(msg.text || "")), "provider reschedule did not write customer booking thread");
  assert((state.emails || []).some(email => email.to === "riley_artist" && /Booking rescheduled/.test(email.subject || "")), "provider reschedule email missing");

  await page.evaluate(id => App.bookingProtocol(id), booking.id);
  await page.waitForTimeout(120);
  await page.fill("#bookingNote", "QA provider cancellation trail");
  await page.evaluate(id => App.cancelBooking(id), booking.id);
  await page.waitForTimeout(180);
  state = await saved();
  changed = (state.bookings || []).find(row => String(row.id) === String(booking.id));
  assert(changed?.status === "cancelled", "provider cancellation did not update booking");
  assert((state.messages?.riley_artist || []).some(msg => msg.type === "booking" && String(msg.booking) === String(booking.id) && /Booking cancelled/.test(msg.text || "")), "provider cancellation did not write customer booking thread");
  assert((state.emails || []).some(email => email.to === "riley_artist" && /Booking cancelled/.test(email.subject || "")), "provider cancellation email missing");
  assert((state.followUps || []).some(f => /Review cancelled booking/.test(f.title || "") && f.audience === "riley_biz"), "provider cancellation review follow-up missing");
  let refund = (state.bookingRefunds || []).find(row => String(row.booking) === String(booking.id));
  assert(refund?.amount === booking.deposit && refund.providerStatus === "provider pending", "provider cancellation did not create full provider-pending booking deposit refund");
  await page.evaluate(id => App.refundOpsDesk(id), refund.id);
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Refund operations") && text.includes("Booking deposit") && text.includes("Provider pending"), "refund operations desk missing booking provider queue");
  await page.evaluate(id => {
    App.setAccount("riley_artist");
    App.refundOpsDesk(id);
  }, refund.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("View only"), "customer-facing booking refund row should be view-only");
  await page.evaluate(id => App.refundProviderUpdate("booking", id, "provider failed"), refund.id);
  await page.waitForTimeout(120);
  state = await saved();
  assert((state.bookingRefunds || []).find(row => String(row.id) === String(refund.id))?.providerStatus === "provider pending", "customer should not be able to update booking refund provider status");
  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.refundProviderUpdate("booking", id, "provider failed");
  }, refund.id);
  await page.waitForTimeout(180);
  state = await saved();
  refund = (state.bookingRefunds || []).find(row => String(row.id) === String(refund.id));
  assert(refund?.providerStatus === "provider failed" && refund.support, "booking provider failure did not persist support reference");
  assert((state.supportIncidents || []).some(row => row.refund === refund.id && row.type === "bookingRefundProvider"), "booking provider failure support incident missing");
  assert((state.messages?.riley_artist || []).some(msg => msg.type === "refund" && msg.refund === refund.id && /Booking refund provider update/.test(msg.text || "")), "customer thread missing booking refund provider update");
  await page.evaluate(() => App.closeModal());
});

await step("booking protocol blocks outsiders and no-show triggers full pay", async () => {
  await unlockFinance("riley_artist");
  await page.evaluate(() => {
    App.confirmBooking("sv1", "Mon 10:00", "wk_owner", {
      slot: "Mon 10:00",
      staffId: "wk_owner",
      place: "seller",
      placeNote: "QA no-show boundary booking",
    });
  });
  await page.waitForTimeout(220);
  let state = await saved();
  const booking = (state.bookings || []).find(b => b.booker === "riley_artist" && b.provider === "riley_biz" && b.slot === "Mon 10:00");
  assert(booking, "no-show test booking was not created");

  await page.evaluate(id => {
    App.setAccount("musa");
    App.cancelBooking(id);
    App.confirmReschedule(id, "Tue 11:00", "wk_owner");
  }, booking.id);
  await page.waitForTimeout(120);
  state = await saved();
  let checked = (state.bookings || []).find(b => String(b.id) === String(booking.id));
  assert(checked?.status === booking.status && checked.slot === "Mon 10:00", "outsider could cancel or reschedule a booking");

  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.bookingProtocol(id);
  }, booking.id);
  await page.waitForTimeout(120);
  await page.fill("#bookingNote", "QA provider recorded no-show after waiting.");
  await page.evaluate(id => App.markBookingNoShow(id), booking.id);
  await page.waitForTimeout(180);
  state = await saved();
  checked = (state.bookings || []).find(b => String(b.id) === String(booking.id));
  const rule = state.bookingClientRules?.riley_artist;
  assert(checked?.status === "no-show" && checked.noShow, "provider no-show did not close the booking as no-show");
  assert(Number(rule?.noShowCount || 0) >= 1 && rule.fullPay, "no-show did not update future full-pay client rule");
  assert((state.messages?.riley_artist || []).some(msg => msg.type === "booking" && String(msg.booking) === String(booking.id) && /no-show/i.test(msg.text || "")), "no-show did not write customer booking thread");

  await unlockFinance("riley_artist");
  await page.evaluate(() => {
    App.confirmBooking("sv1", "Tue 11:00", "wk_owner", {
      slot: "Tue 11:00",
      staffId: "wk_owner",
      place: "seller",
      placeNote: "QA full-pay booking after no-show",
    });
  });
  await page.waitForTimeout(220);
  state = await saved();
  const future = (state.bookings || []).find(b => b.booker === "riley_artist" && b.provider === "riley_biz" && b.slot === "Tue 11:00");
  assert(future?.deposit === future?.price && future?.policy?.paymentMode === "full", "future booking after no-show did not require full payment");
});

await step("order buyer thread keeps exact order context", async () => {
  let state = await saved();
  const order = (state.orders || []).find(row => row.buyer === "riley_artist" && row.seller === "riley_biz");
  assert(Boolean(order), "order route test needs a buyer-seller order");
  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.openWorkChat("order", id, "riley_artist");
  }, order.id);
  await page.waitForTimeout(180);
  let route = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      page: stored.page,
      tab: stored.commTab,
      activeChat: stored.activeChat,
      activeWorkChat: stored.activeWorkChat,
      text: document.body.textContent || "",
    };
  }, KEY);
  assert(route.page === "inbox" && route.tab === "messages", "order work chat did not open Messages");
  assert(route.activeChat === "riley_artist", "order work chat did not open buyer thread");
  assert(String(route.activeWorkChat) === `order:${order.id}`, "order work chat lost exact order context");
  assert(route.text.includes(order.items[0]) && route.text.includes(order.status), "order work chat did not show order context");
  await page.fill("#chatText", "QA seller order context message");
  await page.evaluate(() => App.sendChat("riley_artist"));
  await page.waitForTimeout(160);
  state = await saved();
  assert((state.messages?.riley_artist || []).some(msg => msg.type === "order" && String(msg.order) === String(order.id) && /QA seller order context message/.test(msg.text || "")), "order work message did not save order id");
});

await step("guest order lands in open-door, email and follow-up lanes", async () => {
  const before = await saved();
  const beforeCount = (before.guestOrders || []).length;
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.guestCheckoutDesk("p1");
  });
  await page.waitForSelector("#guestContact", { state: "visible", timeout: 5000 });
  await page.fill("#guestContact", "+254711111111");
  await page.fill("#guestNote", "QA guest order consistency check");
  await page.evaluate(() => App.saveGuestCheckout("p1"));
  await page.waitForTimeout(220);
  const state = await saved();
  const guest = (state.guestOrders || [])[0];
  assert((state.guestOrders || []).length === beforeCount + 1, "guest order was not added");
  assert(guest?.seller === "riley_biz", "guest order seller missing");
  assert((state.notifications || []).some(n => n.kind === "order" && /Guest order created/.test(n.title || "") && visibleTo(n, "riley_biz")), "guest order notification missing");
  assert((state.emails || []).some(e => e.to === "riley_biz" && /Guest order/.test(e.subject || "")), "guest order email missing");
  assert((state.followUps || []).some(f => /Confirm guest order/.test(f.title || "") && f.audience === "riley_biz"), "guest order follow-up missing");
});

await step("wish request and covered purchase stay in messages and notifications", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.requestPatronForItem("p1", "zuri");
  });
  await page.waitForSelector("#patronNote", { state: "visible", timeout: 5000 });
  await page.fill("#patronNote", "QA gentle wish request from the canvas.");
  await page.evaluate(() => App.sendPatronHint("p1"));
  await page.waitForTimeout(180);
  let state = await saved();
  assert((state.messages?.zuri || []).some(msg => msg.type === "wishRequest" && /QA gentle wish request/.test(msg.text || "")), "wish request did not appear in thread");
  assert((state.notifications || []).some(n => n.kind === "message" && /Wish request sent/.test(n.title || "") && visibleTo(n, "zuri")), "wish request notification missing");

  await unlockFinance("riley_biz");
  await page.evaluate(() => App.buyForPerson("p1", "riley_artist"));
  await page.waitForSelector("#careVisibility", { state: "visible", timeout: 5000 });
  await page.selectOption("#careVisibility", "shared");
  await page.fill("#careNote", "QA cover flow with shared updates.");
  await page.evaluate(() => App.confirmAssistedPurchase("p1"));
  await page.waitForTimeout(220);
  state = await saved();
  const covered = (state.assistedOrders || [])[0];
  assert(covered?.buyer === "riley_biz" && covered?.recipient === "riley_artist", "covered purchase did not store buyer/recipient");
  assert((state.messages?.riley_artist || []).some(msg => msg.type === "coveredPurchase" && msg.order === covered.id), "recipient thread did not get covered purchase");
  assert((state.notifications || []).some(n => n.kind === "message" && /Cover saved/.test(n.title || "") && visibleTo(n, "riley_artist")), "cover message notification missing");
  assert((state.notifications || []).some(n => n.kind === "order" && /Shared purchase ready/.test(n.title || "") && visibleTo(n, "riley_artist")), "shared purchase calendar notification missing");
});

await step("non-physical purchases stay visible in basket and Today", async () => {
  await unlockFinance("riley_artist");
  await page.evaluate(() => {
    App.buyDigital("d1");
  });
  await page.waitForTimeout(180);
  let state = await saved();
  const event = (state.purchaseEvents || []).find(row => row.type === "digital" && row.title === "Street Pop stems bundle");
  assert(event, "digital purchase did not create purchase event");
  assert(state.lastCartEvent?.purchaseEvent === event.id, "digital purchase did not activate top basket event");
  assert((state.messages?.musa || []).some(msg => msg.type === "purchase" && msg.purchase === event.id && /Street Pop stems bundle/.test(msg.text || "")), "digital seller thread did not get purchase trail");
  assert((state.notifications || []).some(n => n.kind === "sale" && /digital sale/i.test(n.title || "") && visibleTo(n, "musa")), "digital seller sale notification missing");
  assert((state.emails || []).some(e => e.to === "musa" && /Artbook sale: Street Pop stems bundle/.test(e.subject || "")), "digital seller email record missing");
  assert((state.followUps || []).some(f => /Fulfil Street Pop stems bundle/.test(f.title || "") && f.audience === "musa"), "digital seller follow-up missing");
  assert(await page.locator(".top-cart.active").count(), "top basket indicator did not appear after digital purchase");

  await page.evaluate(() => App.cartDesk());
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Street Pop stems bundle") && text.includes("Digital asset added"), "basket desk did not show digital purchase receipt");
  state = await saved();
  assert((state.purchaseEvents || []).find(row => row.id === event.id)?.seenBy?.includes("riley_artist"), "opening basket desk did not mark purchase attention seen");

  await page.evaluate(() => { App.closeModal(); App.go("home"); });
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Basket and purchases") && text.includes("Street Pop stems bundle"), "Today did not surface non-physical purchase receipt");
  assert(await page.locator(".top-cart.active").count() === 0, "top basket indicator stayed on after purchase receipt was reviewed");

  await page.evaluate(eventId => {
    App.setAccount("musa");
    App.customerLetter("riley_artist", `purchase:${eventId}`);
  }, event.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Street Pop stems bundle") && /ready for fulfilment/i.test(text), "seller customer letter did not focus the purchase trail");

  await page.evaluate(() => App.accountingReadoutDesk());
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Digital asset sale") && text.includes("Street Pop stems bundle"), "seller accounting readout did not include digital sale");

  await page.evaluate(() => App.closeModal());
  await unlockFinance("riley_artist");
  await page.evaluate(() => {
    App.confirmSubscribe("mv2");
    App.confirmTicket("ev1");
  });
  await page.waitForTimeout(220);
  state = await saved();
  const sub = (state.purchaseEvents || []).find(row => row.type === "subscription" && row.title === "Beat Battle archive");
  const ticket = (state.purchaseEvents || []).find(row => row.type === "ticket" && row.title === "Mainland Midnight Live");
  assert(sub && ticket, "subscription or ticket purchase event missing");
  assert((state.messages?.musa || []).some(msg => msg.type === "subscription" && msg.purchase === sub.id), "subscription owner thread did not link purchase event");
  assert((state.messages?.musa || []).some(msg => msg.type === "ticket" && msg.purchase === ticket.id), "ticket owner thread did not link purchase event");
  assert((state.emails || []).some(e => e.to === "musa" && /Beat Battle archive/.test(e.subject || "")), "subscription owner email record missing");
  assert((state.emails || []).some(e => e.to === "musa" && /Mainland Midnight Live/.test(e.subject || "")), "ticket owner email record missing");

  await page.evaluate(subId => {
    App.setAccount("musa");
    App.customerLetter("riley_artist", `purchase:${subId}`);
  }, sub.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Beat Battle archive") && /subscribed/i.test(text), "subscription customer letter did not focus owner trail");

  await page.evaluate(ticketId => App.customerLetter("riley_artist", `purchase:${ticketId}`), ticket.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Mainland Midnight Live") && /Ticket purchased/i.test(text), "ticket customer letter did not focus owner trail");
});

await step("event operations manage resale support check-in and exact trails", async () => {
  await unlockFinance("riley_artist");
  await page.evaluate(() => App.confirmTicket("ev1"));
  await page.waitForTimeout(180);
  let state = await saved();
  let ticket = (state.tickets || []).find(row => row.event === "ev1" && row.owner === "riley_artist");
  assert(ticket?.entryCode && ticket.status === "active", "ticket purchase missing entry code or active status");
  assert((ticket.events || []).some(row => row.label === "Ticket issued"), "ticket issued trail missing");
  assert((state.eventOpsEvents || []).some(row => row.event === "ev1" && row.label === "Ticket sold"), "event ops ticket-sale trail missing");
  assert((state.notifications || []).some(n => n.title === "Ticket saved" && n.record?.type === "ticket" && n.record?.id === ticket.id && visibleTo(n, "riley_artist") && visibleTo(n, "musa")), "ticket saved exact notification missing");

  await page.evaluate(id => {
    App.setAccount("opal_room");
    App.confirmResell(id);
    App.reportTicketIssue(id, "Outsider support", "Outsider should not be able to change this ticket.");
    App.checkInTicket(id);
    App.markEventReady("ev1");
    App.saveEventOps("ev1");
    App.setAccount("riley_artist");
    App.checkInTicket(id);
  }, ticket.id);
  await page.waitForTimeout(180);
  state = await saved();
  ticket = (state.tickets || []).find(row => row.id === ticket.id);
  assert(ticket.status === "active" && !ticket.checkedInAt, "outsider or owner should not be able to check in the ticket");
  assert(!(state.supportIncidents || []).some(row => row.ticket === ticket.id && row.actor === "opal_room"), "outsider should not open ticket support");
  assert(!(ticket.events || []).some(row => /Outsider support/i.test(row.detail || "")), "outsider support attempt leaked into ticket trail");
  assert(state.eventOps?.ev1?.status !== "Door-ready", "outsider should not mark event door-ready");

  await page.evaluate(id => App.ticketDetail(id), ticket.id);
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Entry pass") && text.includes("Entry ready") && text.includes("Support/refund") && text.includes("Resale cap"), "ticket detail missing owner support or resale controls");

  await page.evaluate(id => App.resellTicket(id), ticket.id);
  await page.waitForSelector("#resellPrice", { state: "visible", timeout: 5000 });
  await page.fill("#resellPrice", "999999");
  await page.evaluate(id => App.confirmResell(id), ticket.id);
  await page.waitForTimeout(180);
  state = await saved();
  ticket = (state.tickets || []).find(row => row.id === ticket.id);
  const resaleCap = Math.round(ticket.price * (state.eventOps?.ev1?.resaleCapPct || 110) / 100);
  assert(ticket.status === "listed for resale" && ticket.resellPrice === resaleCap, "ticket resale was not capped at event limit");
  assert((ticket.events || []).some(row => row.label === "Ticket listed for resale"), "ticket resale trail missing");
  assert((state.notifications || []).some(n => n.title === "Ticket resale listed" && n.record?.type === "ticket" && n.record?.id === ticket.id), "ticket resale exact notification missing");

  await page.evaluate(id => App.reportTicketIssue(id, "Refund review", "QA wristband and door-support issue."), ticket.id);
  await page.waitForTimeout(180);
  state = await saved();
  ticket = (state.tickets || []).find(row => row.id === ticket.id);
  const ticketSupport = (state.supportIncidents || []).find(row => row.ticket === ticket.id && row.type === "ticket_support");
  assert(ticketSupport, "ticket support incident missing");
  assert((ticket.events || []).some(row => row.label === "Ticket support opened"), "ticket support trail missing");
  assert((state.eventOpsEvents || []).some(row => row.event === "ev1" && row.label === "Ticket support opened"), "event ops support trail missing");
  assert((state.notifications || []).some(n => n.title === "Ticket support opened" && n.support === ticketSupport.id && visibleTo(n, "riley_artist") && visibleTo(n, "musa")), "ticket support notification missing exact support link or audience");
  await page.evaluate(id => App.openSupportCase(id), ticketSupport.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Support case") && text.includes("Refund review") && text.includes("Open ticket"), "ticket support case detail missing exact ticket route");

  await page.evaluate(id => {
    App.setAccount("musa");
    App.checkInTicket(id);
  }, ticket.id);
  await page.waitForTimeout(200);
  state = await saved();
  ticket = (state.tickets || []).find(row => row.id === ticket.id);
  assert(ticket.status === "checked in" && ticket.checkedInAt, "ticket check-in did not persist");
  assert((ticket.events || []).some(row => row.label === "Ticket checked in"), "ticket check-in trail missing");
  assert((state.eventOpsEvents || []).some(row => row.event === "ev1" && row.label === "Ticket checked in"), "event ops check-in trail missing");
  assert((state.followUps || []).some(f => /Thank/.test(f.title || "") && visibleTo(f, "musa")), "post-event organizer follow-up missing");
  assert((state.notifications || []).some(n => n.title === "Ticket checked in" && n.record?.type === "ticket" && n.record?.id === ticket.id && visibleTo(n, "riley_artist") && visibleTo(n, "musa")), "ticket check-in exact notification missing");

  await page.evaluate(() => {
    App.setAccount("musa");
    App.eventOpsDesk("ev1");
  });
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Event operations") && text.includes("Venue and door readiness") && text.includes("Attendees") && text.includes("Checked in"), "event operations desk missing door or attendee view");

  await page.evaluate(() => App.markEventReady("ev1"));
  await page.waitForTimeout(180);
  state = await saved();
  assert(state.eventOps?.ev1?.status === "Door-ready", "event was not marked door-ready");
  assert((state.eventOpsEvents || []).some(row => row.event === "ev1" && row.label === "Event marked door-ready"), "event door-ready trail missing");
  assert((state.notifications || []).some(n => n.title === "Event door-ready" && n.record?.type === "event" && n.record?.id === "ev1" && visibleTo(n, "musa")), "event door-ready exact notification missing");

  await page.evaluate(() => {
    App.setAccount("opal_room");
    App.createEvent();
  });
  await page.waitForSelector("#eventTitle", { state: "visible", timeout: 5000 });
  await page.fill("#eventTitle", "QA venue proof night");
  await page.selectOption("#eventType", "Film screening");
  await page.fill("#eventVenue", "Opal Room Door 2");
  await page.fill("#eventDate", "Fri 20:00");
  await page.fill("#eventPrice", "1400");
  await page.fill("#eventCapacity", "44");
  await page.fill("#eventResaleCap", "108");
  await page.fill("#eventVenueProof", "Venue hold email, room cap and staff door list are attached for QA.");
  await page.fill("#eventRefundPolicy", "Refunds until 24h before doors, transfer allowed before check-in, support case required after scan.");
  await page.evaluate(() => App.saveEvent());
  await page.waitForTimeout(180);
  state = await saved();
  const created = (state.customEvents || []).find(row => row.title === "QA venue proof night");
  assert(created && state.eventOps?.[created.id]?.capacity === 44 && state.eventOps?.[created.id]?.resaleCapPct === 108, "custom event operations were not saved from create flow");
  assert((state.eventOpsEvents || []).some(row => row.event === created.id && row.label === "Event submitted"), "custom event submit trail missing");

  await page.evaluate(id => {
    App.setAccount("riley_artist");
    App.confirmTicket(id);
  }, created.id);
  await page.waitForTimeout(180);
  state = await saved();
  assert(!(state.tickets || []).some(row => row.event === created.id), "review-pending custom event should block ticket purchase");

  await page.evaluate(() => {
    App.setAccount("opal_room");
    App.createEvent();
  });
  await page.waitForSelector("#eventTitle", { state: "visible", timeout: 5000 });
  await page.fill("#eventTitle", "QA one seat door");
  await page.fill("#eventVenue", "Opal Room Door 1");
  await page.fill("#eventDate", "Tonight 20:00");
  await page.fill("#eventPrice", "10");
  await page.fill("#eventCapacity", "1");
  await page.fill("#eventVenueProof", "Venue hold and one-seat room cap checked.");
  await page.fill("#eventRefundPolicy", "Refunds before doors; support case after scan.");
  await page.evaluate(() => App.saveEvent());
  await page.waitForTimeout(180);
  state = await saved();
  const capCreated = (state.customEvents || []).find(row => row.title === "QA one seat door");
  assert(capCreated, "capacity gate event was not created");
  await page.evaluate(id => {
    App.setAccount("opal_room");
    App.markEventReady(id);
  }, capCreated.id);
  await unlockFinance("riley_artist");
  await page.evaluate(id => {
    App.confirmTicket(id);
    App.setAccount("riley_creator");
    App.confirmTicket(id);
  }, capCreated.id);
  await page.waitForTimeout(220);
  state = await saved();
  assert((state.tickets || []).filter(row => row.event === capCreated.id).length === 1, "event capacity cap did not stop overselling");
});

await step("subscription access desk manages renewal cancellation and owner trail", async () => {
  await unlockFinance("riley_artist");
  await page.evaluate(() => {
    App.confirmSubscribe("mv2");
    App.subscriptionAccessDesk("mv2");
  });
  await page.waitForTimeout(180);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Subscription access") && text.includes("Active paid membership") && text.includes("Cancellation"), "subscription access desk did not expose status and cancellation terms");
  assert(/Access passport/i.test(text) && /Content first/i.test(text) && /Open now/i.test(text), "subscription access desk did not make the access passport the first action");
  assert(text.includes("You already have access") && text.includes("Open subscribed content"), "subscription access desk did not make paid content re-entry obvious");

  await page.evaluate(() => App.openSubscriptionContent("mv2"));
  await page.waitForTimeout(180);
  text = await page.evaluate(() => document.body.textContent || "");
  let state = await saved();
  assert(text.includes("Subscribed content") && text.includes("Access unlocked") && text.includes("Beat Battle archive"), "subscribed content screen did not open from active membership");
  assert((state.subscriptionContentViews || []).some(row => row.vault === "mv2" && row.subscriber === "riley_artist"), "subscription content open did not write an access trail");

  await page.evaluate(() => App.cancelSubscription("mv2"));
  await page.waitForTimeout(180);
  state = await saved();
  const sub = state.subscriptionsByAccount?.riley_artist?.find(row => row.vault === "mv2");
  assert(sub?.cancelAtPeriodEnd && /cancel/i.test(sub.status || ""), "subscription cancellation was not scheduled on the subscriber record");
  const cancelEvent = (state.purchaseEvents || []).find(row => row.type === "subscription cancellation" && row.item === "mv2" && row.account === "riley_artist");
  assert(cancelEvent?.record?.type === "subscription", "subscription cancellation event missing subscription record route");
  assert((state.messages?.musa || []).some(msg => msg.type === "subscription" && msg.purchase === cancelEvent.id && /cancelled renewal/i.test(msg.text || "")), "subscription owner cancellation message missing");
  assert((state.emails || []).some(mail => mail.to === "musa" && /subscription update/i.test(mail.subject || "")), "subscription owner cancellation email missing");
  assert((state.emails || []).some(mail => mail.to === "riley_artist" && /subscription receipt/i.test(mail.subject || "")), "subscriber cancellation receipt email missing");
  assert((state.followUps || []).some(f => f.entity === "riley_artist" && /Subscriber follow-up/i.test(f.title || "")), "subscription cancellation follow-up missing");
  assert((state.notifications || []).some(n => n.kind === "subscription" && /cancellation/i.test(n.title || "") && visibleTo(n, "riley_artist") && visibleTo(n, "musa")), "subscription cancellation notification audience missing");
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Resume renewal"), "cancelled paid subscription did not offer a resume-renewal path");

  await page.evaluate(() => App.resumeSubscription("mv2"));
  await page.waitForTimeout(160);
  state = await saved();
  const resumed = state.subscriptionsByAccount?.riley_artist?.find(row => row.vault === "mv2");
  const resumeEvent = (state.purchaseEvents || []).find(row => row.type === "subscription resumed" && row.item === "mv2" && row.account === "riley_artist");
  assert(resumed && !resumed.cancelAtPeriodEnd && resumed.status === "active", "subscription renewal was not resumed cleanly");
  assert(resumeEvent?.record?.type === "subscription", "subscription resume event missing subscription route");
  assert((state.messages?.musa || []).some(msg => msg.type === "subscription" && msg.purchase === resumeEvent.id && /resumed renewal/i.test(msg.text || "")), "subscription owner resume message missing");
  assert((state.notifications || []).some(n => n.kind === "subscription" && /resumed/i.test(n.title || "") && visibleTo(n, "riley_artist") && visibleTo(n, "musa")), "subscription resume notification audience missing");

  await page.evaluate(eventId => {
    App.setAccount("musa");
    App.customerLetter("riley_artist", `purchase:${eventId}`);
  }, cancelEvent.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Beat Battle archive") && /Cancellation scheduled|cancelled renewal/i.test(text), "subscription customer letter did not focus cancellation trail");
});

await step("adult creator discovery controls require full ID and hide local vaults", async () => {
  await page.evaluate(() => {
    App.setLaunchProfile("founder_lab");
    App.setAccount("riley_streamer");
    App.completeVerification("streamer", "riley_streamer");
    App.createListing("vault");
    document.getElementById("listingName").value = "State Flow Adult Vault";
    document.getElementById("listingPrice").value = "1800";
    document.getElementById("listingAudience").value = "adult";
    document.getElementById("listingCategory").value = "Paid photos + videos";
    document.getElementById("listingDesc").value = "18+ subscriber media with consent and secure viewing rules.";
    App.saveListing("vault");
  });
  await page.waitForTimeout(180);
  let text = await page.evaluate(() => document.body.textContent || "");
  let state = await saved();
  assert(text.includes("Full 18+ creator verification needed"), "adult creator listing did not stop for full verification");
  assert(!(state.customVaults || []).some(row => row.title === "State Flow Adult Vault"), "adult vault saved before creator adult verification");

  await page.evaluate(() => {
    App.completeVerification("adult", "riley_streamer");
    App.createListing("vault");
    document.getElementById("listingName").value = "State Flow Adult Vault";
    document.getElementById("listingPrice").value = "1800";
    document.getElementById("listingAudience").value = "adult";
    document.getElementById("listingDesc").value = "18+ subscriber media with consent, secure viewing and discovery controls.";
    document.getElementById("adultLocalDiscovery").checked = false;
    document.getElementById("adultDiscoveryMode").value = "subscribers";
    document.getElementById("adultDiscoveryRadius").value = "8";
    document.getElementById("adultAllowedCities").value = "Nairobi";
    document.getElementById("adultHiddenCities").value = "Adelaide, Lagos";
    App.saveListing("vault");
  });
  await page.waitForTimeout(200);
  state = await saved();
  const vault = (state.customVaults || []).find(row => row.title === "State Flow Adult Vault");
  assert(vault?.adult && vault.requiresAgeId && vault.screenRecordBlocked, "adult vault did not save protected media fields");
  assert(state.adultDiscoveryControls?.[vault.id]?.localDiscovery === false && state.adultDiscoveryControls?.[vault.id]?.hiddenCities?.includes("Lagos"), "adult discovery city/radius controls did not persist");

  await page.evaluate(id => App.subscriptionAccessDesk(id), vault.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Creator discovery controls") && text.includes("Local discovery off") && text.includes("8 km"), "adult owner access desk did not show discovery controls");

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.marketTab("vaults");
    App.go("market");
  });
  await page.waitForTimeout(180);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(!text.includes("State Flow Adult Vault"), "adult local discovery off vault appeared in marketplace for non-owner");

  await page.evaluate(() => App.go("discover"));
  await page.waitForTimeout(180);
  let profileCards = await page.evaluate(() => [...document.querySelectorAll(".profile-card h3")].map(el => el.textContent || ""));
  assert(!profileCards.includes("Riley Live"), "adult creator profile leaked into local discovery for non-owner");

  await page.evaluate(() => {
    App.setAccount("riley_streamer");
    App.go("discover");
  });
  await page.waitForTimeout(180);
  profileCards = await page.evaluate(() => [...document.querySelectorAll(".profile-card h3")].map(el => el.textContent || ""));
  assert(profileCards.includes("Riley Live"), "adult creator owner lost access to their own local profile");

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.reportAdultLeak("mv13");
    App.setLaunchProfile("kenya_play_store");
  });
  await page.waitForTimeout(160);
  state = await saved();
  const leak = (state.adultLeakReports || []).find(row => row.vault === "mv13" && row.viewer === "riley_artist");
  assert(leak?.rawMediaStored === false && leak.contentAction === "review_hold_recommended" && leak.backendStatus === "local_only", "adult leak report did not stay metadata-only and backend-ready while offline");
  assert((state.supportIncidents || []).some(row => row.restrictedMediaReport === leak.id && row.priority === "urgent"), "adult leak report did not create urgent restricted-media support incident");
});

await step("podcast episode release writes platform analytics and notice trail", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_streamer");
    App.newPodcastEpisode("pod_riley_signal");
  });
  await page.waitForSelector("#podEpisodeTitle", { state: "visible", timeout: 5000 });
  await page.fill("#podEpisodeTitle", "QA release desk episode");
  await page.selectOption("#podEpisodeKind", "Full episode");
  await page.fill("#podEpisodeSponsor", "None");
  await page.fill("#podEpisodeSummary", "QA transcript seed with guest consent, sponsor disclosure, subscriber access and rights-safe music notes for publishing review.");
  await page.fill("#podEpisodeChapters", "00:00 - Setup\n08:00 - Rights check\n16:00 - Subscriber feed");
  await page.evaluate(() => App.savePodcastEpisode("pod_riley_signal"));
  await page.waitForTimeout(180);
  let state = await saved();
  const show = (state.customPodcasts || []).find(row => row.id === "pod_riley_signal");
  const ep = show?.episodes?.find(row => row.title === "QA release desk episode");
  assert(show && ep, "podcast episode was not saved to editable show");
  assert((state.podcastPublishEvents || []).some(row => row.show === show.id && row.episode === ep.id && row.status === "Draft saved"), "podcast draft release event missing");

  await page.evaluate(({ showId, epId }) => App.podcastEpisodePublishDesk(showId, epId), { showId: show.id, epId: ep.id });
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Episode release") && text.includes("Release readiness") && text.includes("Platform sync"), "podcast release desk missing readiness or platform sync");

  await page.evaluate(({ showId, epId }) => App.publishPodcastEpisode(showId, epId, "public"), { showId: show.id, epId: ep.id });
  await page.waitForTimeout(180);
  state = await saved();
  const publishedShow = (state.customPodcasts || []).find(row => row.id === "pod_riley_signal");
  const publishedEp = publishedShow?.episodes?.find(row => row.id === ep.id);
  const publishEvent = (state.podcastPublishEvents || []).find(row => row.show === show.id && row.episode === ep.id && row.status === "Published to RSS");
  assert(publishedEp?.published === "Published now" && publishedEp.releaseStatus === "Published to RSS", "podcast publish did not update episode status");
  assert(publishEvent?.platforms?.includes("Public podcast directories"), "podcast publish event missing platform list");
  assert(state.podcastPlatformChecks?.[`${show.id}:Public podcast directories`]?.status === "Queued for sync", "podcast platform check was not queued");
  assert((state.notifications || []).some(n => n.kind === "podcast" && n.record?.type === "podcast" && n.record?.id === show.id && n.record?.episode === ep.id && visibleTo(n, "riley_streamer")), "podcast release notification missing exact route");
  assert((state.emails || []).some(mail => mail.to === "riley_streamer" && /Podcast release/.test(mail.subject || "")), "podcast release email missing");
  assert((state.followUps || []).some(f => /Review analytics/.test(f.title || "") && visibleTo(f, "riley_streamer")), "podcast release follow-up missing");

  await page.evaluate(showId => App.submitPodcastPlatform(showId, "Public podcast directories"), show.id);
  await page.waitForTimeout(180);
  state = await saved();
  assert(state.podcastPlatformChecks?.[`${show.id}:Public podcast directories`]?.status === "Submitted to platform", "podcast platform submission did not persist");
  assert((state.podcastPublishEvents || []).some(row => row.show === show.id && /Public podcast directories submitted/.test(row.status || "")), "podcast platform release event missing");

  await page.evaluate(showId => App.podcastAnalytics(showId), show.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Release trail") && text.includes("QA release desk episode"), "podcast analytics did not expose release trail");
});

await step("music upload rights review writes release desk and exact trail", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.completeVerification("artist");
    App.uploadMusic();
  });
  await page.waitForSelector("#songTitle", { state: "visible", timeout: 5000 });
  await page.fill("#songTitle", "QA rights ledger single");
  await page.selectOption("#rightsType", "original");
  await page.selectOption("#releasePath", "Artbook public release");
  await page.fill("#rightsProof", "Studio session, project file and collaborator-free original composition proof are attached for QA.");
  await page.fill("#rightsNote", "Original song written and recorded by Riley with no outside samples, clear takedown path, royalty hold and Artbook release review.");
  await page.evaluate(() => App.submitMusic());
  await page.waitForTimeout(180);
  let state = await saved();
  const album = (state.customAlbums || []).find(row => row.title === "QA rights ledger single");
  assert(album, "music upload did not create a custom album");
  assert(state.musicRightsReviews?.[album.id]?.status === "Rights review", "music rights review missing after upload");
  assert((state.musicReleaseEvents || []).some(row => row.album === album.id && row.label === "Release submitted"), "music submit release event missing");
  assert((state.notifications || []).some(n => n.title === "Music release submitted" && n.record?.type === "music" && n.record?.id === album.id && visibleTo(n, "riley_artist")), "music submit notification missing exact route");
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Music release desk") && text.includes("Release readiness") && text.includes("Release trail"), "music release desk did not open after upload");

  await page.fill("#musicRightsProof", "Original DAW project file, vocal session notes, ownership statement and no-sample declaration are stored.");
  await page.fill("#musicRightsNote", "Original master owned by Riley Sounds, no third-party samples, public Artbook release, takedown contact and royalty hold before payout.");
  await page.fill("#musicDistribution", "Artbook public release");
  await page.fill("#musicPlatforms", "Artbook, Public music platforms, Sound ribbons");
  await page.evaluate(id => App.saveMusicReleaseReview(id), album.id);
  await page.waitForTimeout(180);
  state = await saved();
  assert(state.musicRightsReviews?.[album.id]?.platforms?.includes("Public music platforms"), "music platform list did not persist");
  assert((state.musicReleaseEvents || []).some(row => row.album === album.id && row.label === "Rights review saved"), "music rights saved event missing");

  await page.evaluate(id => {
    App.upgradeArtistLabelPlan("pro");
    App.autoDraftMusicReleasePacket(id);
    App.artistApproveMusicPacket(id);
    App.markMusicReviewReady(id);
  }, album.id);
  await page.waitForTimeout(180);
  state = await saved();
  assert((state.musicReleaseEvents || []).some(row => row.album === album.id && row.label === "Artbook prepared release packet"), "artist release packet assistant event missing");
  assert((state.musicReleaseEvents || []).some(row => row.album === album.id && row.label === "Artist approved release packet"), "artist approval packet event missing");
  assert(state.musicRightsReviews?.[album.id]?.status === "Ready for reviewer", "music release was not marked review-ready");
  assert((state.followUps || []).some(f => /Approve music release/.test(f.title || "") && visibleTo(f, "riley_artist")), "music review-ready follow-up missing");

  await page.evaluate(id => App.approveMusicRelease(id), album.id);
  await page.waitForTimeout(200);
  state = await saved();
  const review = state.musicRightsReviews?.[album.id];
  assert(review?.status === "Released with rights ledger" && review.releaseStatus === "Released to Artbook", "music release approval did not persist");
  assert(/Released memory|artist|sample|admin|approval/i.test(review?.rightsMemory || ""), "music release did not preserve rights memory");
  assert((state.customAlbums || []).find(row => row.id === album.id)?.releaseStatus === "Released to Artbook", "music album release status missing");
  assert((state.musicReleaseEvents || []).some(row => row.album === album.id && row.label === "Music released"), "music release event missing");
  assert((state.trustSeals || []).some(row => row.id === `seal_music_${album.id}_riley_artist` && row.type === "rights"), "music rights provenance seal missing");
  assert((state.notifications || []).some(n => n.title === "Music release approved" && n.record?.type === "music" && n.record?.id === album.id && visibleTo(n, "riley_artist")), "music release notification missing exact audience");
  assert((state.emails || []).some(mail => /Music release approved/.test(mail.subject || "") && visibleTo(mail, "riley_artist")), "music release email missing");
  assert((state.followUps || []).some(f => /music release analytics/i.test(f.title || "") && visibleTo(f, "riley_artist")), "music analytics follow-up missing");

  await page.evaluate(id => App.musicReleaseDesk(id), album.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Released to Artbook") && text.includes("Public music platforms"), "music release desk missing released state or platform path");
});

await step("collab clearance manages split rights approvals and provenance trail", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.collab("cr1", "accepted");
    App.collabRoom("cr1");
  });
  await page.waitForTimeout(180);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Split and rights clearance") && text.includes("Release trail"), "collab room missing clearance desk");

  await page.fill("#collabSplit", "60 / 40 after expenses");
  await page.fill("#collabDeliverable", "QA split-rights live release");
  await page.fill("#collabCredit", "Riley Sounds x Thabo Visuals");
  await page.fill("#collabRights", "Both co-creators approve audio, visuals, credit line, replay usage, takedown path and demo payout split before release.");
  await page.fill("#collabNote", "QA release checklist stored in the collaboration room.");
  await page.evaluate(() => App.saveCollabPlan("cr1"));
  await page.waitForTimeout(180);
  let state = await saved();
  assert(state.collabPlans?.cr1?.split === "60 / 40 after expenses", "collab split was not saved");
  assert(state.collabClearances?.cr1?.credit === "Riley Sounds x Thabo Visuals", "collab credit line was not saved");
  assert((state.collabEvents || []).some(row => row.collab === "cr1" && row.label === "Clearance terms saved"), "collab terms event missing");

  await page.evaluate(() => App.approveCollabClearance("cr1"));
  await page.waitForTimeout(180);
  state = await saved();
  assert(state.collabClearances?.cr1?.approvals?.riley_artist, "artist collab approval missing");

  await page.evaluate(() => {
    App.setAccount("thabo");
    App.collabRoom("cr1");
    App.approveCollabClearance("cr1");
    App.releaseCollabWork("cr1");
  });
  await page.waitForTimeout(240);
  state = await saved();
  const collab = (state.collabs || []).find(row => row.id === "cr1");
  assert(collab?.status === "released", "collab did not move to released status");
  assert(state.collabClearances?.cr1?.approvals?.thabo, "co-creator collab approval missing");
  assert(state.collabClearances?.cr1?.releaseStatus === "Released with provenance", "collab clearance status missing released provenance");
  assert((state.collabEvents || []).some(row => row.collab === "cr1" && row.label === "Collab released"), "collab release event missing");
  assert((state.trustSeals || []).some(row => row.id === "seal_collab_cr1_riley_artist_thabo" && row.type === "collab"), "collab provenance seal from artist to co-creator missing");
  assert((state.notifications || []).some(n => n.title === "Collaboration released" && n.record?.type === "collab" && n.record?.id === "cr1" && visibleTo(n, "riley_artist") && visibleTo(n, "thabo")), "collab release notification missing exact audience");
  assert((state.emails || []).some(mail => /Collab released/.test(mail.subject || "") && visibleTo(mail, "riley_artist") && visibleTo(mail, "thabo")), "collab release email missing");
  assert((state.followUps || []).some(f => /collab performance/.test(f.title || "") && visibleTo(f, "riley_artist") && visibleTo(f, "thabo")), "collab release follow-up missing");
});

await step("live control room writes moderation guest merch and replay trails", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_streamer");
    App.startLive();
    App.closeModal();
    App.setAccount("riley_artist");
    App.enterLive("riley_streamer");
  });
  await page.waitForSelector("#liveText", { state: "visible", timeout: 5000 });
  await page.fill("#liveText", "QA says pirate stream so the host can review it.");
  await page.evaluate(() => {
    App.liveSend("riley_streamer");
    App.raiseLiveHand("riley_streamer");
  });
  await page.waitForTimeout(180);
  let state = await saved();
  let messages = state.liveChats?.riley_streamer || [];
  let heldIndex = messages.findIndex(msg => msg.from === "riley_artist" && /pirate stream/.test(msg.text || "") && msg.status === "held");
  const hand = (state.liveRoomActions || []).find(row => row.room === "riley_streamer" && row.actor === "riley_artist" && row.type === "hand" && row.status !== "closed");
  assert(heldIndex >= 0, "live blocked chat was not held for host review");
  assert(hand, "live raised hand was not queued");
  assert((state.liveRoomEvents || []).some(row => row.room === "riley_streamer" && row.label === "Chat held"), "live moderation event missing");

  await page.evaluate(() => {
    App.setAccount("riley_streamer");
    App.liveControlRoom("riley_streamer");
  });
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Live control room") && text.includes("Guest queue") && text.includes("Moderation queue") && text.includes("Pinned merch"), "live control room missing expected panels");

  await page.evaluate(({ actionId, msgIndex }) => {
    App.admitLiveHand("riley_streamer", actionId);
    App.moderateLiveMessage("riley_streamer", msgIndex, "release");
    App.pinLiveMerch("riley_streamer");
  }, { actionId: hand.id, msgIndex: heldIndex });
  await page.waitForTimeout(220);
  state = await saved();
  messages = state.liveChats?.riley_streamer || [];
  const released = messages.find(msg => /pirate stream/.test(msg.text || ""));
  const admitted = (state.liveRoomActions || []).find(row => row.id === hand.id);
  assert(admitted?.status === "admitted", "live hand was not admitted");
  assert(released?.status === "visible", "live held chat was not released");
  assert(state.liveMerchPins?.riley_streamer, "live merch pin was not saved");
  assert((state.notifications || []).some(n => n.title === "Guest admitted" && n.record?.type === "live" && n.record?.id === "riley_streamer" && visibleTo(n, "riley_artist") && visibleTo(n, "riley_streamer")), "live guest notification missing exact audience");
  assert((state.notifications || []).some(n => n.title === "Live merch pinned" && n.record?.type === "live" && n.record?.id === "riley_streamer"), "live merch notification missing exact route");

  await page.evaluate(() => App.liveReplayToPodcast("riley_streamer"));
  await page.waitForTimeout(220);
  state = await saved();
  assert((state.liveRoomEvents || []).some(row => row.room === "riley_streamer" && /Replay blocked/.test(row.label || "")), "live replay did not block before guest consent");

  await page.evaluate(actionId => {
    App.setAccount("riley_artist");
    App.approveLiveReplayConsent("riley_streamer", actionId);
    App.setAccount("riley_streamer");
    App.liveReplayToPodcast("riley_streamer");
  }, hand.id);
  await page.waitForTimeout(220);
  state = await saved();
  const show = (state.customPodcasts || []).find(row => row.owner === "riley_streamer");
  const ep = show?.episodes?.find(row => /live room replay/i.test(row.title || ""));
  assert(ep && ep.releaseStatus === "Draft from live", "live replay did not create a podcast draft");
  assert(ep.guestConsents?.some(row => row.guest === "riley_artist" && row.status === "approved"), "live replay draft missing approved stage guest consent");
  assert(/guest|music|takedown/i.test(ep.rightsMemory || ""), "live replay draft missing rights memory");
  assert((state.podcastPublishEvents || []).some(row => row.show === show.id && row.episode === ep.id && row.status === "Draft from live room"), "live replay publish event missing");
  assert((state.emails || []).some(mail => mail.to === "riley_streamer" && /Live replay draft/.test(mail.subject || "")), "live replay email missing");
  assert((state.followUps || []).some(f => /Review live replay/.test(f.title || "") && f.entity === "riley_streamer"), "live replay follow-up missing");
});

await step("ride request creates passenger and courier views", async () => {
  const before = await saved();
  const beforeCount = (before.rideRequests || []).length;
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.requestRideDesk();
  });
  await page.waitForSelector("#rideDropoff", { state: "visible", timeout: 5000 });
  await page.fill("#rideDropoff", "QA Westlands stage");
  await page.evaluate(() => {
    App.estimateRide();
    App.confirmRide();
  });
  await page.waitForTimeout(220);
  const state = await saved();
  const ride = (state.rideRequests || [])[0];
  assert((state.rideRequests || []).length === beforeCount + 1, "ride request was not added");
  assert(ride?.passenger === "riley_artist", "ride passenger missing");
  assert((state.messages?.riley_courier || []).some(msg => msg.type === "ride" && msg.ride === ride.id), "courier ride thread missing");
  assert((state.notifications || []).some(n => n.kind === "ride" && n.link === "delivery" && visibleTo(n, "riley_artist") && visibleTo(n, "riley_courier")), "ride notification audience missing");
  assert(state.page === "delivery" && state.deliveryTab === "rides", "ride did not land on delivery rides");
});

await step("customer letters isolate transaction-specific messages", async () => {
  const seed = await saved();
  seed.account = "riley_biz";
  seed.posSales = [
    { id: "sale_scope_a", seller: "riley_biz", customer: "zuri", method: "card", status: "paid", time: "Now", items: [{ id: "p1", name: "Scope A", price: 1000, qty: 1 }], subtotal: 1000, discount: 0, tax: 0, tip: 0, total: 1000, receiptNote: "A" },
    { id: "sale_scope_b", seller: "riley_biz", customer: "zuri", method: "card", status: "paid", time: "Now", items: [{ id: "p2", name: "Scope B", price: 2000, qty: 1 }], subtotal: 2000, discount: 0, tax: 0, tip: 0, total: 2000, receiptNote: "B" },
    ...(seed.posSales || []).filter(sale => !["sale_scope_a", "sale_scope_b"].includes(String(sale.id))),
  ];
  seed.messages = seed.messages || {};
  seed.messages.zuri = [
    { from: "riley_biz", to: "zuri", type: "receipt", sale: "sale_scope_a", text: "Receipt A", time: "now" },
    { from: "riley_biz", to: "zuri", type: "receipt", sale: "sale_scope_b", text: "Receipt B", time: "now" },
    { from: "riley_biz", to: "zuri", type: "receipt", text: "Generic old receipt", time: "old" },
  ];
  await page.evaluate(({ key, seed }) => localStorage.setItem(key, JSON.stringify(seed)), { key: KEY, seed });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });
  const result = await page.evaluate(() => {
    App.customerLetter("zuri", "sale:sale_scope_a");
    const text = document.body.textContent || "";
    return {
      hasA: text.includes("Receipt A"),
      hasB: text.includes("Receipt B"),
      hasGeneric: text.includes("Generic old receipt"),
      hasTrail: text.includes("Record trail"),
      title: document.querySelector(".compass-title")?.textContent || "",
    };
  });
  assert(result.hasA, "scoped receipt message missing");
  assert(!result.hasB, "other receipt leaked into scoped customer letter");
  assert(!result.hasGeneric, "generic old receipt leaked into scoped customer letter");
  assert(result.hasTrail, "scoped customer record trail missing");
});

await step("business care desk writes labels, replies and catalog trail", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.openChat("zuri");
    App.customerCareDesk("zuri");
  });
  await page.waitForTimeout(180);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Customer care") && text.includes("Quick replies") && text.includes("Catalog and services"), "care desk did not render expected sections");

  await page.evaluate(() => App.sendCareReply("zuri", "away"));
  await page.waitForTimeout(180);
  let state = await saved();
  assert((state.customerLabels?.zuri || []).includes("needs_reply"), "care reply did not add needs-reply label");
  assert((state.messages?.zuri || []).some(msg => msg.type === "careReply" && msg.care === "away"), "care reply message missing");
  assert((state.emails || []).some(mail => mail.to === "zuri" && /Away response/.test(mail.subject || "")), "care reply email missing");
  assert((state.followUps || []).some(f => f.entity === "zuri" && /Away response/.test(f.title || "")), "care reply follow-up missing");
  assert((state.notifications || []).some(n => n.title === "Customer care reply sent" && visibleTo(n, "riley_biz") && visibleTo(n, "zuri")), "care reply notification audience missing");

  await page.evaluate(() => App.sendCareItem("zuri", "p1"));
  await page.waitForTimeout(180);
  state = await saved();
  assert((state.customerLabels?.zuri || []).includes("pickup"), "catalog share did not add pickup label");
  assert((state.messages?.zuri || []).some(msg => msg.type === "productShare" && msg.care === "catalog" && msg.item === "p1"), "care catalog share missing from thread");
  assert((state.followUps || []).some(f => f.entity === "zuri" && /catalog link/i.test(f.title || "")), "care catalog follow-up missing");

  await page.evaluate(() => App.customerLetter("zuri"));
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Customer care") && text.includes("Shea Butter Conditioner"), "customer record did not expose care and catalog messages");
});

await step("promotion creates Finder ledger and status trail", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.promotionDesk();
  });
  await page.waitForSelector("#promoBudget", { state: "visible", timeout: 5000 });
  await page.fill("#promoBudget", "2200");
  await page.evaluate(() => App.savePromotion());
  await page.waitForTimeout(180);
  let state = await saved();
  const promo = (state.promotions || [])[0];
  assert(promo?.owner === "riley_biz", "promotion owner missing");
  assert(["review-pending", "trust-hold"].includes(promo.status), "promotion did not enter review or trust hold");
  assert((state.finderLedger || []).some(row => row.promo === promo.id && /reserved/.test(row.status || "")), "Finder reserved ledger row missing");
  assert((state.notifications || []).some(n => n.kind === "promotion" && /Boost submitted/.test(n.title || "") && visibleTo(n, "riley_biz")), "boost submission notification missing");

  await page.evaluate(id => App.updatePromotionStatus(id, "live"), promo.id);
  await page.waitForTimeout(160);
  state = await saved();
  const livePromo = (state.promotions || []).find(row => row.id === promo.id);
  assert(livePromo?.status === "live", "promotion did not move live");
  assert((state.finderLedger || []).some(row => row.promo === promo.id && /approved|earning/.test(row.status || "")), "Finder approved ledger row missing");

  await page.evaluate(id => App.updatePromotionStatus(id, "settled"), promo.id);
  await page.waitForTimeout(160);
  state = await saved();
  const settledPromo = (state.promotions || []).find(row => row.id === promo.id);
  assert(settledPromo?.status === "settled", "promotion did not settle");
  assert((state.finderLedger || []).some(row => row.promo === promo.id && (row.settled || /settled/.test(row.status || ""))), "Finder settled ledger row missing");
});

await step("accounting readout exposes clickable ledger and export", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.accountingReadoutDesk();
  });
  await page.waitForTimeout(180);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Ledger lines"), "accounting readout missing ledger lines");
  assert(/Sale|Invoice|Booking|Order|Boost|Finder share/.test(text), "accounting ledger missing mixed business rows");

  await page.evaluate(() => App.accountingExportDesk());
  await page.waitForSelector("#accountingExportText", { state: "visible", timeout: 5000 });
  const exportText = await page.$eval("#accountingExportText", el => el.value);
  assert(exportText.includes("AmountKES") && exportText.includes("Sales Desk") && exportText.includes("Finder ledger"), "accounting export missing expected columns or sources");
});

await step("wallet ledger settles internal send and payer-approved request", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.completeVerification("money", "riley_artist");
    App.closeModal();
  });
  await unlockFinance("riley_artist");
  let payText = await page.evaluate(() => document.body.textContent || "");
  let payTextLower = payText.toLowerCase();
  assert(payTextLower.includes("provider-led pay") && payTextLower.includes("demo balance") && payTextLower.includes("provider-led money boundary"), "wallet did not render the simplified provider-led Pay surface after unlock");
  await page.evaluate(() => App.moneyFlow("send"));
  await page.waitForSelector("#moneyAmount", { state: "visible", timeout: 5000 });
  await page.fill("#moneyAmount", "1200");
  await page.waitForTimeout(100);
  const feeCopy = await page.evaluate(() => document.querySelector("#transferFeePreview")?.textContent || "");
  assert(/External KES 23/.test(feeCopy) && /Artbook KES 17/.test(feeCopy) && /Saving KES 6/.test(feeCopy), "Artbook rail should price KES 1,200 from the corrected Kenya benchmark");
  await page.evaluate(() => App.closeModal());
  let state = await saved();
  const artistBeforeSend = state.walletBalancesByAccount?.riley_artist ?? state.balance;
  const zuriBeforeSend = state.walletBalancesByAccount?.zuri ?? 24800;

  await page.evaluate(() => App.confirmMoney("send", {
    amount: 700,
    person: "zuri",
    note: "State flow internal transfer",
  }));
  await page.waitForTimeout(180);
  state = await saved();
  assert(state.walletBalancesByAccount?.riley_artist === artistBeforeSend - 710, "internal wallet send did not debit sender plus Artbook fee");
  assert(state.walletBalancesByAccount?.zuri === zuriBeforeSend + 700, "internal wallet send did not credit recipient");
  const sendLedger = (state.walletLedger || []).find(row => row.kind === "internal send" && row.from === "riley_artist" && row.to === "zuri" && row.fee === 10 && row.feeSaved === 3);
  assert(sendLedger, "internal wallet send ledger row missing Artbook transfer fee");
  assert(sendLedger.nonSettling === true && sendLedger.providerVerified === false && sendLedger.spendable === false && /no_provider_settlement/.test(sendLedger.settlementStatus || ""), "internal wallet send should remain provider-led and non-spendable");

  const artistBeforeRequest = state.walletBalancesByAccount.riley_artist;
  const zuriBeforeRequest = state.walletBalancesByAccount.zuri;
  await page.evaluate(() => App.confirmMoney("request", {
    amount: 450,
    person: "zuri",
    note: "State flow wallet request",
  }));
  await page.waitForTimeout(160);
  state = await saved();
  const request = (state.walletRequests || []).find(row => row.note === "State flow wallet request");
  assert(request?.status === "pending", "wallet request should remain pending before payer approval");
  assert(request?.nonSettling === true && request.providerVerified === false && request.spendable === false && /no_provider_settlement/.test(request.settlementStatus || ""), "wallet request should remain provider-led and non-spendable before approval");
  assert(state.walletBalancesByAccount.riley_artist === artistBeforeRequest, "wallet request credited requester too early");
  assert(state.walletBalancesByAccount.zuri === zuriBeforeRequest, "wallet request debited payer too early");

  await page.evaluate(() => {
    App.setAccount("zuri");
    App.completeVerification("money", "zuri");
    App.closeModal();
  });
  await unlockFinance("zuri");
  await page.evaluate(id => App.settleWalletRequest(id, "paid"), request.id);
  await page.waitForTimeout(180);
  state = await saved();
  assert((state.walletRequests || []).find(row => row.id === request.id)?.status === "paid", "payer-approved request did not close paid");
  assert(state.walletBalancesByAccount.zuri === zuriBeforeRequest - 455, "payer-approved request did not debit payer plus Artbook fee");
  assert(state.walletBalancesByAccount.riley_artist === artistBeforeRequest + 450, "payer-approved request did not credit requester");
  const paidLedger = (state.walletLedger || []).find(row => row.kind === "request paid" && row.request === request.id && row.status === "paid" && row.fee === 5 && row.feeSaved === 2);
  assert(paidLedger, "payer-approved request ledger row missing Artbook transfer fee");
  assert(paidLedger.nonSettling === true && paidLedger.providerVerified === false && paidLedger.spendable === false && /no_provider_settlement/.test(paidLedger.settlementStatus || ""), "payer-approved request ledger should remain provider-led and non-spendable");
  assert((state.notifications || []).some(n => n.record?.type === "wallet" && visibleTo(n, "riley_artist") && visibleTo(n, "zuri")), "wallet settlement notification missing exact audience");
});

await step("identity verification writes scoped review seal and exact route", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.verificationCenter("business", "riley_biz");
  });
  await page.waitForSelector("#identityLegalName", { state: "visible", timeout: 5000 });
  await page.fill("#identityLegalName", "Riley Business Studio");
  await page.selectOption("#identityProofType", "Business registration + owner ID");
  await page.fill("#identityRoleProof", "Shop owner identity, seller terms, refund policy, stock and pickup proof, payout owner match.");
  await page.fill("#identityPayoutMethod", "M-Pesa till and bank payout owner matched");
  await page.fill("#identityRiskNote", "No open reports; seller terms, payout limit and manual review note are ready for launch.");
  await page.evaluate(() => App.saveIdentityReview("business", "riley_biz"));
  await page.waitForTimeout(160);
  await page.evaluate(() => App.submitIdentityReview("business", "riley_biz"));
  await page.waitForTimeout(160);
  await page.evaluate(() => App.completeVerification("business", "riley_biz"));
  await page.waitForTimeout(220);

  const state = await saved();
  const review = state.identityReviews?.["riley_biz:business"];
  assert(state.identity?.business === true && state.identity?.market === true, "business identity did not unlock business and market scopes");
  assert(state.identityAccounts?.riley_biz?.business === true && state.identityAccounts?.riley_biz?.market === true, "account-scoped identity unlock missing");
  assert(review?.status === "Approved demo verification", "identity review did not persist approved status");
  assert((state.identityEvents || []).some(row => row.account === "riley_biz" && row.scope === "business" && row.label === "Identity review saved"), "identity saved event missing");
  assert((state.identityEvents || []).some(row => row.account === "riley_biz" && row.scope === "business" && row.label === "Identity submitted"), "identity submitted event missing");
  assert((state.identityEvents || []).some(row => row.account === "riley_biz" && row.scope === "business" && row.label === "Identity approved"), "identity approved event missing");
  assert((state.trustSeals || []).some(row => row.id === "seal_identity_riley_biz_business" && row.type === "identity"), "identity provenance seal missing");
  assert((state.emails || []).some(mail => mail.to === "riley_biz" && /Identity approved/.test(mail.subject || "")), "identity approval email missing");
  assert((state.followUps || []).some(f => f.entity === "riley_biz" && /Recheck Business seller evidence/.test(f.title || "")), "identity follow-up missing");
  const notice = (state.notifications || []).find(n => n.title === "Identity approved" && n.record?.type === "identity" && n.record?.id === "business" && n.record?.account === "riley_biz");
  assert(notice, "identity exact notification missing");

  await page.evaluate(id => App.openNotice(id), notice.id);
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Record route") && text.includes("business") && /Open identity review/.test(text), "identity notice did not show exact record route");
  await page.evaluate(() => App.identityReviewDesk("business", "riley_biz"));
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Identity verification") && text.includes("Review trail") && text.includes("Backend boundary"), "identity review desk missing audit sections");
});

await step("privacy center saves settings export deletion and exact route", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_creator");
    App.privacySettings();
  });
  await page.waitForSelector("#privProfile", { state: "visible", timeout: 5000 });
  await page.selectOption("#privProfile", "private");
  await page.selectOption("#privStatus", "private");
  await page.selectOption("#privMessages", "followers");
  await page.selectOption("#privCalls", "none");
  await page.selectOption("#privLocation", "hidden");
  await page.selectOption("#privActivity", "private");
  await page.selectOption("#privAccountType", "hidden");
  await page.evaluate(() => App.savePrivacy("riley_creator"));
  await page.waitForTimeout(160);
  await page.evaluate(() => App.requestDataExport("riley_creator"));
  await page.waitForTimeout(160);
  await page.evaluate(() => App.requestAccountDeletion("riley_creator"));
  await page.waitForTimeout(220);

  const state = await saved();
  const privacy = state.profilePrivacy?.riley_creator;
  assert(privacy?.profile === "private" && privacy?.location === "hidden" && privacy?.accountType === "hidden", "privacy settings did not persist for creator account");
  assert(!state.profilePrivacy?.riley_biz || state.profilePrivacy.riley_biz.profile !== "private", "creator privacy leaked to business account");
  assert((state.privacyEvents || []).some(row => row.account === "riley_creator" && row.label === "Privacy settings saved"), "privacy settings event missing");
  assert((state.privacyEvents || []).some(row => row.account === "riley_creator" && row.label === "Data export prepared"), "privacy export event missing");
  assert((state.privacyEvents || []).some(row => row.account === "riley_creator" && row.label === "Account deletion requested"), "privacy deletion event missing");
  assert((state.privacyExports || []).some(row => row.account === "riley_creator" && /Ready local demo archive/.test(row.status || "") && (row.categories || []).some(c => /Messages/.test(c.name || ""))), "privacy export archive missing message category");
  assert((state.accountDeletionRequests || []).some(row => row.account === "riley_creator" && /Deletion review requested/.test(row.status || "") && /retention/i.test(row.retention || "")), "account deletion request missing retention review");
  assert((state.emails || []).some(mail => mail.to === "riley_creator" && /Account deletion request/.test(mail.subject || "")), "privacy deletion email missing");
  assert((state.followUps || []).some(f => f.entity === "riley_creator" && /Resolve account deletion/.test(f.title || "")), "privacy deletion follow-up missing");
  const notice = (state.notifications || []).find(n => n.title === "Account deletion requested" && n.record?.type === "privacy" && n.record?.id === "deletion" && n.record?.account === "riley_creator");
  assert(notice, "privacy exact notification missing");

  await page.evaluate(id => App.openNotice(id), notice.id);
  await page.waitForTimeout(160);
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Record route") && text.includes("deletion") && /Open privacy center/.test(text), "privacy notice did not show exact record route");
  await page.evaluate(() => App.privacyCenter("deletion", "riley_creator"));
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Privacy center") && text.includes("Data rights") && text.includes("Privacy trail") && text.includes("Backend boundary"), "privacy center missing review sections");
});

await step("bell notifications route to exact records", async () => {
  const state = await saved();
  const exactNotices = [
    ["Order scheduled", "order"],
    ["Invoice sent", "customer"],
    ["Booking confirmed", "booking"],
    ["Ride requested", "ride"],
    ["Boost submitted", "promotion"],
    ["Ticket checked in", "ticket"],
    ["Event door-ready", "event"],
    ["Identity approved", "identity"],
    ["Account deletion requested", "privacy"],
    ["Music release approved", "music"],
    ["Guest admitted", "live"],
    ["Collaboration released", "collab"],
  ].map(([title, type]) => {
    const notice = (state.notifications || []).find(n => n.title === title && n.record?.type === type && n.record?.id);
    assert(notice, `${title} notification missing exact ${type} record`);
    return notice;
  });
  const orderNotice = exactNotices.find(n => n.record.type === "order");
  await page.evaluate(({ key, id }) => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const notice = (snap.notifications || []).find(row => row.id === id);
    if (notice) notice.read = false;
    localStorage.setItem(key, JSON.stringify(snap));
  }, { key: KEY, id: orderNotice.id });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });
  await page.evaluate(() => App.openNotifications());
  await page.waitForTimeout(160);
  let bellState = await saved();
  assert(bellState.notifications.find(n => n.id === orderNotice.id)?.read === false, "opening Bell should preserve unread notice until the exact item is opened");
  let text = await page.evaluate(() => document.body.textContent || "");
  assert(/unread update|unread/.test(text), "bell list did not show unread notice state");

  await page.evaluate(id => {
    App.closeModal();
    App.openNotice(id);
  }, orderNotice.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Record route") && text.includes(orderNotice.record.id) && /Open order trail/.test(text), "order notice did not show exact record route");
  bellState = await saved();
  assert(bellState.notifications.find(n => n.id === orderNotice.id)?.read === true, "opening exact Bell notice should mark that notice read");

  const promoNotice = exactNotices.find(n => n.record.type === "promotion");
  await page.evaluate(id => App.openNotice(id), promoNotice.id);
  await page.waitForTimeout(160);
  text = await page.evaluate(() => document.body.textContent || "");
  assert(text.includes("Record route") && text.includes(promoNotice.record.id) && /Open boost record/.test(text), "promotion notice did not show exact record route");
});

await page.screenshot({ path: path.join(root, "build", "artbook-apk", "state-flow-audit-mobile.png"), fullPage: true });
await browser.close();

const result = { checks, failures, pageErrors, consoleErrors };
console.log(JSON.stringify(result, null, 2));
if (failures.length || pageErrors.length || consoleErrors.length) {
  process.exitCode = 1;
}
