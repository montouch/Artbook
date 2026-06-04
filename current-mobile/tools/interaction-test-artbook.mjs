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
page.on("pageerror", error => pageErrors.push(error.message));

await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
await page.evaluate(() => localStorage.removeItem("artbook.mobile.demo.v5"));
await page.reload({ waitUntil: "load" });
await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });

await page.evaluate(() => App.go("circle"));
await page.waitForSelector(".page-circle", { state: "visible", timeout: 5000 });
await page.evaluate(() => App.compose());
await page.waitForSelector("#composeText", { state: "visible", timeout: 5000 });
await page.fill("#composeText", "Testing the current Artbook phone flow.");
await page.click(".compose-bottom-bar .btn");
await page.waitForTimeout(300);

await page.evaluate(() => {
  App.addCart("p1");
  App.openCart();
  App.setMood("ocean");
  App.openComms("messages");
});
await page.waitForSelector(".thread-list", { state: "visible", timeout: 5000 });

const state = await page.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5") || "{}");
  return {
    topNav: Boolean(document.querySelector(".top.artbar")),
    bottomNav: Boolean(document.querySelector(".flow-dock")),
    savedSummary: {
      page: saved.page,
      mood: saved.mood,
      cart: saved.cart || [],
      posted: saved.posts?.some(post => /current Artbook phone flow/.test(post.text || "")) || false,
    },
    text: document.body.innerText.slice(0, 800),
    pageErrors: [],
  };
});

await page.screenshot({ path: path.join(root, "build", "artbook-apk", "signed-in-mobile.png"), fullPage: true });
await browser.close();

console.log(JSON.stringify({ state, pageErrors }, null, 2));
const savedPost = state.savedSummary.posted;
const savedCart = state.savedSummary.cart.includes("p1");
if (!state.topNav || !state.bottomNav || !savedPost || !savedCart || state.savedSummary.mood !== "ocean" || pageErrors.length) {
  process.exitCode = 1;
}
