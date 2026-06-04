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
const outDir = path.join(root, "build", "artbook-apk", "head-to-toe");
fs.mkdirSync(outDir, { recursive: true });

const accounts = ["riley_artist", "riley_biz", "riley_streamer", "riley_creator", "riley_courier"];
const routes = [
  "home",
  "circle",
  "discover",
  "worlds",
  "market",
  "register",
  "calendar",
  "jobs",
  "inbox",
  "delivery",
  "subscriptions",
  "audio",
  "podcasts",
  "live",
  "collabs",
  "wallet",
  "profile",
  "studio",
  "tour",
  "more",
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
const failures = [];
const checks = [];

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

async function screenHealth(label) {
  const health = await page.evaluate(() => {
    const text = document.body.innerText || "";
    const main = document.querySelector(".main");
    const dock = document.querySelector(".flow-dock");
    const top = document.querySelector(".top.artbar") || document.querySelector(".top");
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const viewport = window.innerWidth;
    const actionable = [...document.querySelectorAll("button,[onclick],a,input,textarea,select")]
      .filter(el => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return box.width > 1 && box.height > 1 && style.visibility !== "hidden" && style.display !== "none";
      }).length;
    const visibleButtons = [...document.querySelectorAll("button")]
      .filter(el => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return box.width > 1 && box.height > 1 && style.visibility !== "hidden" && style.display !== "none";
      })
      .map(el => (el.innerText || el.getAttribute("aria-label") || "").trim())
      .filter(Boolean)
      .slice(0, 24);
    return {
      title: document.title,
      hasTop: Boolean(top),
      hasDock: Boolean(dock),
      hasMain: Boolean(main),
      textLength: text.trim().length,
      hasUndefined: /\bundefined\b|\bNaN\b|\[object Object\]/.test(text),
      horizontalOverflow: scrollWidth - viewport,
      actionable,
      visibleButtons,
    };
  });
  assert(health.hasTop, `${label}: top bar missing`);
  assert(health.hasDock, `${label}: bottom dock missing`);
  assert(health.hasMain, `${label}: main surface missing`);
  assert(health.textLength > 40, `${label}: screen text too sparse`);
  assert(!health.hasUndefined, `${label}: visible undefined/NaN/object text`);
  assert(health.horizontalOverflow <= 6, `${label}: page-level horizontal overflow ${health.horizontalOverflow}px`);
  assert(health.actionable >= 3, `${label}: too few actionable controls`);
  return health;
}

async function runCheck(name, fn) {
  try {
    const result = await fn();
    checks.push({ name, ok: true, ...(result || {}) });
  } catch (error) {
    failures.push({ name, message: error.message });
    checks.push({ name, ok: false, message: error.message });
  }
}

await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
await page.evaluate(key => localStorage.removeItem(key), KEY);
await page.reload({ waitUntil: "load" });
await page.waitForSelector(".flow-dock", { state: "visible", timeout: 8000 });

for (const account of accounts) {
  await runCheck(`role ${account} route sweep`, async () => {
    const routeResults = [];
    for (const route of routes) {
      await page.evaluate(({ account, route }) => {
        App.setAccount(account);
        App.go(route);
      }, { account, route });
      await page.waitForTimeout(80);
      const health = await screenHealth(`${account}/${route}`);
      routeResults.push({
        route,
        actions: health.actionable,
        buttons: health.visibleButtons.slice(0, 8),
      });
    }
    await page.screenshot({ path: path.join(outDir, `${account}-last-route.png`), fullPage: false });
    return { routes: routeResults.length };
  });
}

await runCheck("cross-account commerce isolation", async () => {
  const result = await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.go("market");
    App.addCart("p1");
    App.payCart("card");
    const afterPay = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5") || "{}");
    const purchased = [...(afterPay.purchases || [])];
    App.setAccount("riley_creator");
    const creator = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5") || "{}");
    App.setAccount("riley_artist");
    const artist = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5") || "{}");
    return {
      purchased,
      creatorPurchases: creator.purchases || [],
      artistPurchases: artist.purchases || [],
    };
  });
  assert(result.purchased.length, "purchase label missing immediately after checkout");
  const label = result.purchased[0];
  assert(result.creatorPurchases.every(item => item !== label), "creator inherited artist purchase label");
  assert(result.artistPurchases.includes(label), "artist purchase label missing after account switch");
});

await runCheck("seller/customer work trail opens exact records", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.accountingReadoutDesk();
  });
  await page.waitForTimeout(200);
  await screenHealth("business/accounting modal");
  await page.evaluate(() => {
    App.closeModal();
    App.customerLetter("zuri", "sales");
  });
  await page.waitForTimeout(200);
  await screenHealth("business/customer letter");
});

await runCheck("major modal surfaces remain healthy", async () => {
  const flows = [
    () => App.accountPicker(),
    () => App.backendHandoff(),
    () => App.openComms("messages"),
    () => App.openCart(),
    () => App.deliverySheet(),
    () => App.postFundiJob(),
    () => App.bookingDesk(),
    () => App.promotionDesk(),
    () => App.founderRevenueDesk(),
    () => App.artguide(),
  ];
  for (const [index, flow] of flows.entries()) {
    await page.evaluate(fnText => {
      App.closeModal();
      (0, eval)(`(${fnText})`)();
    }, flow.toString());
    await page.waitForTimeout(140);
    await screenHealth(`modal flow ${index + 1}`);
  }
});

await browser.close();

console.log(JSON.stringify({
  checks,
  failures,
  pageErrors,
  consoleErrors,
  screenshots: outDir,
}, null, 2));

if (failures.length || pageErrors.length || consoleErrors.length) process.exitCode = 1;
