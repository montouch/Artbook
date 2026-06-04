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
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
await page.evaluate(() => localStorage.removeItem("artbook.mobile.demo.v2"));
await page.reload({ waitUntil: "load" });

await page.click("button[onclick=\"App.compose()\"]", { force: true });
await page.fill("#composeText", "Testing a usable phone demo flow.");
await page.click("text=Post stroke");
await page.waitForTimeout(200);

await page.click(".actions .act");
await page.evaluate(() => App.go("market"));
await page.click("text=Add to cart");
await page.click("text=Cart (1)");
await page.click("text=Checkout");
await page.click("text=Pay wallet");
await page.evaluate(() => App.go("wallet"));
await page.click("text=Top up");
await page.fill("#moneyAmount", "1000");
await page.click("button[onclick=\"App.confirmMoney('topup')\"]");
await page.evaluate(() => App.go("live"));
await page.click("text=Enter room");
await page.fill("#liveText", "Hello from test.");
await page.click("button[onclick^=\"App.liveSend\"]");
await page.click(".sheet-head .icon-btn");
await page.click(".more-bar");
await page.click("text=Forest");

const state = await page.evaluate(() => ({
  text: document.body.innerText.slice(0, 900),
  saved: JSON.parse(localStorage.getItem("artbook.mobile.demo.v2") || "{}"),
  hasMoreBar: !!document.querySelector(".more-bar"),
  modalOpen: document.getElementById("modal").classList.contains("on"),
}));

await page.screenshot({ path: path.join(root, "build", "enhanced-artbook-test.png"), fullPage: true });
await browser.close();

const failures = [];
if (!state.hasMoreBar) failures.push("floating More bar missing");
if (!state.saved.posts || !state.saved.posts.some(p => /usable phone demo/.test(p.text))) failures.push("composer did not persist");
if (!state.saved.purchases || state.saved.purchases.length < 1) failures.push("checkout did not persist");
if (!state.saved.liveChats || !Object.values(state.saved.liveChats).some(msgs => msgs.some(m => /Hello from test/.test(m.text)))) failures.push("live chat did not persist");
if (state.saved.mood !== "forest") failures.push("theme did not persist");
if (pageErrors.length) failures.push("page errors: " + pageErrors.join(" | "));
if (consoleErrors.length) failures.push("console errors: " + consoleErrors.join(" | "));

console.log(JSON.stringify({ failures, stateSummary: { hasMoreBar: state.hasMoreBar, modalOpen: state.modalOpen, text: state.text }, pageErrors, consoleErrors }, null, 2));
if (failures.length) process.exitCode = 1;
