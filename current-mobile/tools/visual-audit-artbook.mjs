import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromiumExecutablePath } from "./runtime-browser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const playwrightPath = "C:\\Users\\brown\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.60.0\\node_modules\\playwright\\index.mjs";
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const KEY = "artbook.mobile.demo.v5";
const html = process.env.ARTBOOK_HTML || path.join(root, "src", "artbook-mobile.html");
const outDir = path.join(root, "build", "artbook-apk", "visual-audit");
fs.mkdirSync(outDir, { recursive: true });

const accounts = ["riley_artist", "riley_biz", "riley_streamer", "riley_creator", "riley_courier"];
const routes = ["home", "circle", "studio", "inbox", "more", "market", "live", "jobs", "delivery", "calendar", "wallet", "audio", "podcasts", "subscriptions", "register"];
const modalFlows = [
  { name: "create", account: "riley_artist", run: () => App.createHub() },
  { name: "compose-business", account: "riley_biz", run: () => App.compose("businessUpdate") },
  { name: "compose-streamer", account: "riley_streamer", run: () => App.compose("roomSignal") },
  { name: "messages", account: "riley_artist", run: () => App.openComms("messages") },
  { name: "cart", account: "riley_artist", run: () => { App.addCart("p1"); App.openCart(); } },
  { name: "account-picker", account: "riley_artist", run: () => App.accountPicker() },
  { name: "booking-desk", account: "riley_biz", run: () => App.bookingDesk("sv1") },
  { name: "sales-payment", account: "riley_biz", run: () => { App.go("register"); App.posAdd("p1"); App.posPaymentDesk(); } },
  { name: "invoice", account: "riley_biz", run: () => { App.go("register"); App.posAdd("p1"); App.invoiceMaker(); } },
  { name: "ride", account: "riley_artist", run: () => App.requestRideDesk() },
  { name: "fundi-job-post", account: "riley_creator", run: () => App.postFundiJob() },
  { name: "fundi-job-detail", account: "riley_creator", run: () => App.fundiJobDetail("fj_uniform_repair_seed") },
  { name: "delivery-quote", account: "riley_artist", run: () => App.deliveryQuoteDesk() },
  { name: "wishlist", account: "riley_artist", run: () => App.wishlistDesk() },
  { name: "artguide", account: "riley_artist", run: () => App.artguide() },
];

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

await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
await page.evaluate(key => localStorage.removeItem(key), KEY);
await page.reload({ waitUntil: "load" });
await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });

async function audit(label) {
  return page.evaluate(name => {
    const allowed = [
      ".chiprow",
      ".scroll",
      ".frame-strip",
      ".follow-strip",
      ".compose-hint-row",
      ".tour-lane",
      ".media-rail",
      ".media-strip",
      ".live-rail",
      ".story-rail",
      ".status-rail",
      ".staff-strip",
      ".client-strip",
      ".subscription-lane",
      ".booking-tabs",
      ".booking-chip-row",
      ".customer-worker-strip",
      ".booking-table-wrap",
      ".atelier-board-wrap",
      ".invoice-table-wrap",
      ".podcast-episode-strip",
      ".podcast-lens",
      ".world-switch",
      ".theme-grid",
      ".profile-action-strip",
      ".thread-tools",
      ".chat-tools",
      ".metric-strip",
      ".business-day-stats",
      ".pilot-mini",
      ".setup-pill-row",
      ".top-context",
      ".artguide-fab",
      ".market-art",
    ];
    const isVisible = el => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) !== 0 && r.width > 1 && r.height > 1;
    };
    const allowedOverflow = el => allowed.some(sel => el.closest(sel));
    const rootNode = document.querySelector("#modal.on .sheet") || document.body;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const offscreen = [...rootNode.querySelectorAll("button,.card,.more-action,.start-card,.pos-item,.product-row,.profile-card,.thread-card,.appointment-card,.sheet,.register-panel,.booking-panel,.delivery-stage,.fundi-job-hero,.fundi-job-card,.fundi-bid-card,.fundi-room-card,.checkout-card")]
      .filter(isVisible)
      .filter(el => !allowedOverflow(el))
      .map(el => {
        const r = el.getBoundingClientRect();
        const leak = Math.max(0, r.right - vw, -r.left);
        return leak > 4 ? {
          selector: el.className || el.tagName.toLowerCase(),
          text: (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").slice(0, 90),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          leak: Math.round(leak),
        } : null;
      })
      .filter(Boolean)
      .slice(0, 8);
    const clippedText = [...rootNode.querySelectorAll("button,strong,h1,h2,h3,p,span,small,label")]
      .filter(isVisible)
      .filter(el => !allowedOverflow(el))
      .filter(el => el.scrollWidth > el.clientWidth + 6 && el.clientWidth > 20)
      .map(el => ({
        selector: el.className || el.tagName.toLowerCase(),
        text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 90),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }))
      .slice(0, 8);
    return {
      label: name,
      page: JSON.parse(localStorage.getItem("artbook.mobile.demo.v5") || "{}").page,
      bodyClass: document.querySelector(".app")?.className || "",
      mood: document.documentElement.dataset.mood || "",
      ui: document.documentElement.dataset.ui || "",
      themeMode: document.documentElement.dataset.themeMode || "",
      viewport: { width: vw, height: vh },
      scrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - vw),
      modalOpen: Boolean(document.querySelector("#modal.on")),
      offscreen,
      clippedText,
      hasNaN: /\bNaN\b|\bundefined\b/.test(document.body.innerText),
    };
  }, label);
}

const results = [];
for (const account of accounts) {
  await page.evaluate(id => App.setAccount(id), account);
  await page.waitForTimeout(80);
  for (const route of routes) {
    await page.evaluate(r => App.go(r), route);
    await page.waitForTimeout(100);
    results.push(await audit(`${account}:${route}`));
  }
}

for (const flow of modalFlows) {
  await page.evaluate(id => App.setAccount(id), flow.account);
  await page.waitForTimeout(80);
  await page.evaluate(fnText => {
    const run = new Function(`return (${fnText})`)();
    run();
  }, flow.run.toString());
  await page.waitForTimeout(180);
  results.push(await audit(`modal:${flow.name}`));
  await page.screenshot({ path: path.join(outDir, `${flow.name}.png`), fullPage: true });
  await page.evaluate(() => App.closeModal());
  await page.waitForTimeout(80);
}

await page.screenshot({ path: path.join(outDir, "last-page.png"), fullPage: true });
await browser.close();

const problems = results.filter(row =>
  row.horizontalOverflow > 4 ||
  row.offscreen.length ||
  row.clippedText.length ||
  row.hasNaN
);
const report = {
  checked: results.length,
  problems,
  pageErrors,
  consoleErrors,
  screenshots: outDir,
};

console.log(JSON.stringify(report, null, 2));
if (problems.length || pageErrors.length || consoleErrors.length) {
  process.exitCode = 1;
}
