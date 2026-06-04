import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromiumExecutablePath } from "./runtime-browser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const playwrightPath = "C:\\Users\\brown\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.60.0\\node_modules\\playwright\\index.mjs";
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const KEY = "artbook.mobile.demo.v5";
const html = process.env.ARTBOOK_HTML || path.join(root, "src", "artbook-mobile.html");
const targets = [
  ["riley_artist", "home"],
  ["riley_artist", "circle"],
  ["riley_artist", "market"],
  ["riley_artist", "inbox"],
  ["riley_artist", "delivery"],
  ["riley_biz", "home"],
  ["riley_biz", "register"],
  ["riley_biz", "calendar"],
  ["riley_biz", "inbox"],
  ["riley_streamer", "live"],
  ["riley_streamer", "podcasts"],
  ["riley_creator", "home"],
  ["riley_courier", "delivery"],
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
const clicks = [];

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

async function prepare(account, route) {
  await page.evaluate(([id, pageName]) => {
    App.closeModal?.();
    App.setAccount(id);
    App.go(pageName);
  }, [account, route]);
  await page.waitForTimeout(160);
}

async function candidates() {
  return page.evaluate(() => {
    const reject = /reset|delete|remove|refund|cancel|lock finance|wrong|decline|sos|flag driver|reset demo|completeStartPath/i;
    const visible = el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 24 && r.height > 24 && r.bottom > 0 && r.top < innerHeight && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) !== 0;
    };
    const rows = [...document.querySelectorAll(".main button,.top button,.flow-dock button")]
      .filter(visible)
      .filter(el => !el.closest("#modal"))
      .filter(el => !el.classList.contains("flow-tab"))
      .filter(el => !el.classList.contains("artguide-fab"))
      .filter(el => {
        const text = (el.innerText || el.getAttribute("aria-label") || el.title || "").replace(/\s+/g, " ").trim();
        const onclick = el.getAttribute("onclick") || "";
        return onclick && !reject.test(text) && !reject.test(onclick);
      });
    return rows.map((el, index) => ({
      index,
      text: (el.innerText || el.getAttribute("aria-label") || el.title || "").replace(/\s+/g, " ").trim(),
      onclick: el.getAttribute("onclick") || "",
      className: el.className || "",
    }))
      .slice(0, 10);
  });
}

async function health(label) {
  const state = await page.evaluate(() => ({
    hasTop: Boolean(document.querySelector(".top.artbar")),
    hasDock: Boolean(document.querySelector(".flow-dock")),
    hasMain: Boolean(document.querySelector(".main")),
    modalOpen: Boolean(document.querySelector("#modal.on")),
    bootErrorVisible: document.getElementById("boot-error") ? getComputedStyle(document.getElementById("boot-error")).display !== "none" : false,
    text: document.body.innerText.slice(0, 900),
  }));
  if (!state.hasTop || !state.hasDock || !state.hasMain) throw new Error(`${label}: app shell missing`);
  if (state.bootErrorVisible) throw new Error(`${label}: boot error visible`);
  if (/\bundefined\b|\bNaN\b/.test(state.text)) throw new Error(`${label}: visible undefined/NaN`);
  if (state.modalOpen) {
    await page.evaluate(() => App.closeModal?.());
    await page.waitForTimeout(80);
  }
}

for (const [account, route] of targets) {
  await prepare(account, route);
  const rows = await candidates();
  for (const row of rows) {
    const label = `${account}:${route}:${row.text || row.className || row.onclick}`;
    try {
      await prepare(account, route);
      const clicked = await page.evaluate(target => {
        const reject = /reset|delete|remove|refund|cancel|lock finance|wrong|decline|sos|flag driver|reset demo|completeStartPath/i;
        const visible = el => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 24 && r.height > 24 && r.bottom > 0 && r.top < innerHeight && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) !== 0;
        };
        const rows = [...document.querySelectorAll(".main button,.top button,.flow-dock button")]
          .filter(visible)
          .filter(el => !el.closest("#modal"))
          .filter(el => !el.classList.contains("flow-tab"))
          .filter(el => !el.classList.contains("artguide-fab"))
          .filter(el => {
            const text = (el.innerText || el.getAttribute("aria-label") || el.title || "").replace(/\s+/g, " ").trim();
            const onclick = el.getAttribute("onclick") || "";
            return onclick && !reject.test(text) && !reject.test(onclick);
          });
        const el = rows[target.index];
        if (!el) return false;
        el.click();
        return true;
      }, row);
      if (!clicked) throw new Error("button moved before tap");
      await page.waitForTimeout(240);
      await health(label);
      clicks.push({ label, ok: true });
    } catch (error) {
      failures.push({ label, message: error.message });
      clicks.push({ label, ok: false });
    }
  }
}

await page.screenshot({ path: path.join(root, "build", "artbook-apk", "tap-audit-mobile.png"), fullPage: true });
await browser.close();

const result = {
  targetCount: targets.length,
  clicked: clicks.length,
  failures,
  pageErrors,
  consoleErrors,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length || pageErrors.length || consoleErrors.length) {
  process.exitCode = 1;
}
