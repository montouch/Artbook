import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromiumExecutablePath } from "./runtime-browser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const runtimeNodeModules = "C:\\Users\\brown\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.60.0\\node_modules";
const require = createRequire(path.join(runtimeNodeModules, "package-anchor.js"));
const { chromium } = require("playwright");

const appHtml = path.join(root, "src", "artbook-mobile.html");
const reviewHtml = path.join(root, "docs", "artbook-app-prototype-review.html");
const pdf = path.join(root, "docs", "Artbook-App-Prototype-Review.pdf");
const desktopPdf = "C:\\Users\\brown\\OneDrive\\Desktop\\Artbook-App-Prototype-Review.pdf";
const preview = path.join(root, "build", "artbook-app-prototype-review-preview.png");
const shots = {
  discover: path.join(root, "build", "app-review-discover.png"),
  location: path.join(root, "build", "app-review-location.png")
};

fs.mkdirSync(path.join(root, "build"), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumExecutablePath()
});

const pageErrors = [];
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
page.on("pageerror", (error) => pageErrors.push(error.message));
await page.goto(pathToFileURL(appHtml).href, { waitUntil: "load" });
await page.evaluate(() => localStorage.removeItem("artbook.mobile.demo.v2"));
await page.reload({ waitUntil: "load" });
await page.evaluate(() => {
  window.App.go("discover", true);
  window.App.applyPick("country:discover", "Australia");
});
await page.screenshot({ path: shots.discover, fullPage: false });
await page.evaluate(() => window.App.locationSettings("discover"));
await page.screenshot({ path: shots.location, fullPage: false });

const docPage = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
docPage.on("pageerror", (error) => pageErrors.push(error.message));
await docPage.goto(pathToFileURL(reviewHtml).href, { waitUntil: "load" });
await docPage.pdf({
  path: pdf,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false
});
await docPage.screenshot({ path: preview, fullPage: false });
await browser.close();

fs.copyFileSync(pdf, desktopPdf);

console.log(JSON.stringify({ pdf, desktopPdf, preview, shots, pageErrors }, null, 2));
if (pageErrors.length) process.exitCode = 1;
