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
const outDir = path.join(root, "build", "artbook-apk", "accessibility-audit");
fs.mkdirSync(outDir, { recursive: true });

const accounts = ["riley_artist", "riley_biz", "riley_streamer", "riley_creator", "riley_courier"];
const routes = ["home", "circle", "discover", "worlds", "market", "register", "calendar", "inbox", "delivery", "subscriptions", "audio", "podcasts", "live", "collabs", "wallet", "profile", "studio", "tour", "more"];
const modalFlows = [
  { name: "compose", account: "riley_artist", run: () => App.compose() },
  { name: "artguide", account: "riley_biz", run: () => { App.go("register"); App.artguide(); } },
  { name: "workflow-search", account: "riley_biz", run: () => { App.go("more"); App.setWorkflowSearch("receipt"); } },
  { name: "basket", account: "riley_artist", run: () => App.cartDesk() },
  { name: "backend-sync", account: "riley_biz", run: () => App.backendSyncDesk() },
  { name: "privacy", account: "riley_creator", run: () => App.privacySettings() },
  { name: "ride", account: "riley_artist", run: () => App.requestRideDesk() },
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
await page.waitForSelector(".flow-dock", { state: "visible", timeout: 8000 });

async function auditScreen(label) {
  return page.evaluate(screenLabel => {
    const visible = el => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) !== 0 && r.width > 1 && r.height > 1;
    };
    const accessibleName = el => {
      const tag = el.tagName.toLowerCase();
      const id = el.getAttribute("id");
      const explicit = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText : "";
      const wrapped = tag === "input" || tag === "select" || tag === "textarea" ? el.closest("label")?.innerText : "";
      return [
        el.getAttribute("aria-label"),
        el.getAttribute("aria-labelledby") ? [...el.getAttribute("aria-labelledby").split(/\s+/)].map(x => document.getElementById(x)?.innerText || "").join(" ") : "",
        explicit,
        wrapped,
        el.innerText,
        el.textContent,
        el.getAttribute("title"),
        el.getAttribute("placeholder"),
        tag === "input" ? el.getAttribute("value") : "",
      ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    };
    const isInlineTiny = el => el.closest(".tag-pill,.pilot-mini,.simple-focus-foot,.start-path-foot,.business-day-stats,.player-meta-row,.delivery-steps,.proof-row,.workflow-finder-chips");
    const rootNode = document.querySelector("#modal.on .sheet") || document.body;
    const controls = [...rootNode.querySelectorAll("button,a[href],input,select,textarea,[role='button'],[tabindex]:not([tabindex='-1'])")]
      .filter(visible)
      .filter(el => !el.closest("[aria-hidden='true']"));
    const unnamed = controls
      .map(el => ({ el, name: accessibleName(el), r: el.getBoundingClientRect() }))
      .filter(row => !row.name)
      .map(row => ({
        selector: row.el.className || row.el.tagName.toLowerCase(),
        html: row.el.outerHTML.slice(0, 160),
        x: Math.round(row.r.left),
        y: Math.round(row.r.top),
        width: Math.round(row.r.width),
        height: Math.round(row.r.height),
      }))
      .slice(0, 10);
    const undersized = controls
      .map(el => ({ el, name: accessibleName(el), r: el.getBoundingClientRect() }))
      .filter(row => !isInlineTiny(row.el))
      .filter(row => row.r.width < 24 || row.r.height < 24)
      .map(row => ({
        name: row.name.slice(0, 80),
        selector: row.el.className || row.el.tagName.toLowerCase(),
        width: Math.round(row.r.width),
        height: Math.round(row.r.height),
      }))
      .slice(0, 10);
    const touchWarnings = controls
      .map(el => ({ el, name: accessibleName(el), r: el.getBoundingClientRect() }))
      .filter(row => !isInlineTiny(row.el))
      .filter(row => (row.r.width < 44 || row.r.height < 44) && row.r.width >= 24 && row.r.height >= 24)
      .map(row => ({
        name: row.name.slice(0, 80),
        selector: row.el.className || row.el.tagName.toLowerCase(),
        width: Math.round(row.r.width),
        height: Math.round(row.r.height),
      }))
      .slice(0, 8);
    const nonSemantic = [...rootNode.querySelectorAll("[onclick]:not(button):not(a):not(input):not(select):not(textarea):not([role='button'])")]
      .filter(visible)
      .filter(el => !el.closest(".market-art,.route-map,.player-art-large,.story-sound-controls"))
      .map(el => ({
        text: (accessibleName(el) || el.innerText || el.className || el.tagName.toLowerCase()).replace(/\s+/g, " ").slice(0, 80),
        selector: el.className || el.tagName.toLowerCase(),
      }))
      .slice(0, 8);
    const inputProblems = [...rootNode.querySelectorAll("input,select,textarea")]
      .filter(visible)
      .filter(el => !accessibleName(el))
      .map(el => ({ selector: el.className || el.tagName.toLowerCase(), placeholder: el.getAttribute("placeholder") || "" }))
      .slice(0, 8);
    return {
      label: screenLabel,
      page: JSON.parse(localStorage.getItem("artbook.mobile.demo.v5") || "{}").page,
      modalOpen: Boolean(document.querySelector("#modal.on")),
      controls: controls.length,
      unnamed,
      undersized,
      inputProblems,
      touchWarnings,
      nonSemantic,
      textHasBadTokens: /\bundefined\b|\bNaN\b|\[object Object\]/.test(document.body.innerText || ""),
    };
  }, label);
}

const results = [];
for (const account of accounts) {
  await page.evaluate(id => App.setAccount(id), account);
  await page.waitForTimeout(80);
  for (const route of routes) {
    await page.evaluate(r => App.go(r), route);
    await page.waitForTimeout(90);
    results.push(await auditScreen(`${account}:${route}`));
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
  results.push(await auditScreen(`modal:${flow.name}`));
  await page.screenshot({ path: path.join(outDir, `${flow.name}.png`), fullPage: true });
  await page.evaluate(() => App.closeModal());
  await page.waitForTimeout(80);
}

await browser.close();

const failures = results.filter(row => row.unnamed.length || row.undersized.length || row.inputProblems.length || row.textHasBadTokens);
const warnings = results.filter(row => row.touchWarnings.length || row.nonSemantic.length).map(row => ({
  label: row.label,
  touchWarnings: row.touchWarnings,
  nonSemantic: row.nonSemantic,
}));
const report = {
  checked: results.length,
  failures,
  warningScreens: warnings.length,
  warnings: warnings.slice(0, 20),
  pageErrors,
  consoleErrors,
  screenshots: outDir,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length || pageErrors.length || consoleErrors.length) process.exit(1);
