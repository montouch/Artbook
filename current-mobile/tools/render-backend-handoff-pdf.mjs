import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromiumExecutablePath } from "./runtime-browser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const runtimeNodeModules = "C:\\Users\\brown\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.60.0\\node_modules";
const require = createRequire(path.join(runtimeNodeModules, "package-anchor.js"));
const { chromium } = require("playwright");

const html = path.join(root, "docs", "artbook-backend-handoff.html");
const pdf = path.join(root, "docs", "Artbook-Backend-Handoff.pdf");
const preview = path.join(root, "build", "artbook-backend-handoff-preview.png");

const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumExecutablePath(),
});
const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
await page.pdf({
  path: pdf,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false
});
await page.screenshot({ path: preview, fullPage: false });
await browser.close();

console.log(JSON.stringify({ pdf, preview, pageErrors }, null, 2));
if (pageErrors.length) process.exitCode = 1;
