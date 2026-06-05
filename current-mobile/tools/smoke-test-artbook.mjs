import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromiumExecutablePath } from "./runtime-browser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const playwrightPath = "C:\\Users\\brown\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.60.0\\node_modules\\playwright\\index.mjs";
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const html = process.env.ARTBOOK_HTML || path.join(root, "src", "artbook-mobile.html");
const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumExecutablePath(),
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const pageErrors = [];
const consoleErrors = [];

page.on("pageerror", error => pageErrors.push(error.message));
page.on("console", msg => {
  if (msg.type() === "error" && !/Failed to load resource|ERR_TUNNEL|ERR_PROXY|ERR_INTERNET/.test(msg.text())) {
    consoleErrors.push(msg.text());
  }
});

await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
await page.evaluate(() => localStorage.removeItem("artbook.mobile.demo.v5"));
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(2500);

const state = await page.evaluate(() => ({
  title: document.title,
  text: document.body.innerText.slice(0, 600),
  hasTopNav: Boolean(document.querySelector(".top.artbar")),
  hasDock: Boolean(document.querySelector(".flow-dock")),
  hasMain: Boolean(document.querySelector(".main")),
  bootError: document.getElementById("boot-error")?.textContent || "",
  bootErrorVisible: document.getElementById("boot-error") ? getComputedStyle(document.getElementById("boot-error")).display !== "none" : false,
}));

const walletProof = await page.evaluate(() => {
  App.setAccount?.("riley_artist");
  App.go?.("wallet");
  const card = document.querySelector("[data-wallet-backend-replay-proof]");
  return {
    present: Boolean(card),
    moneyEnabled: card?.getAttribute("data-money-enabled") || "",
    providerCalled: card?.getAttribute("data-provider-called") || "",
    walletCreditEnabled: card?.getAttribute("data-wallet-credit-enabled") || "",
    text: card?.textContent?.replace(/\s+/g, " ").trim().slice(0, 240) || "",
  };
});

await page.screenshot({ path: path.join(root, "build", "artbook-apk", "smoke-mobile.png"), fullPage: true });
await browser.close();

console.log(JSON.stringify({ state, walletProof, pageErrors, consoleErrors }, null, 2));
if (!state.hasTopNav || !state.hasDock || !state.hasMain || state.bootErrorVisible || !walletProof.present || walletProof.moneyEnabled !== "false" || walletProof.providerCalled !== "false" || walletProof.walletCreditEnabled !== "false" || pageErrors.length || consoleErrors.length) {
  process.exitCode = 1;
}
