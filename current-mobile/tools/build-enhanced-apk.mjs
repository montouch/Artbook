import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sourceApk = "C:\\Users\\brown\\OneDrive\\Desktop\\app-debug.apk";
const htmlPath = path.join(root, "src", "artbook-mobile.html");
const outDir = path.join(root, "build", "enhanced-artbook");
const unsignedApk = path.join(outDir, "artbook-usable-unsigned.apk");
const jszipRoot = "C:\\Users\\brown\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\jszip@3.10.1\\node_modules\\jszip";

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const html = fs.readFileSync(htmlPath);
const JSZip = (await import(pathToFileURL(path.join(jszipRoot, "lib", "index.js")).href)).default;
const apk = await JSZip.loadAsync(fs.readFileSync(sourceApk));
const next = new JSZip();

for (const [name, entry] of Object.entries(apk.files)) {
  if (entry.dir) continue;
  const upper = name.toUpperCase();
  if (
    upper === "META-INF/MANIFEST.MF" ||
    upper.endsWith(".SF") ||
    upper.endsWith(".RSA") ||
    upper.endsWith(".DSA") ||
    upper.endsWith(".EC")
  ) continue;
  if (name === "assets/index.html") {
    next.file(name, html, { date: new Date("2026-05-19T00:00:00Z") });
    continue;
  }
  next.file(name, await entry.async("nodebuffer"), {
    date: entry.date,
    compression: name === "resources.arsc" ? "STORE" : "DEFLATE",
  });
}

if (!apk.files["assets/index.html"]) {
  next.file("assets/index.html", html, { date: new Date("2026-05-19T00:00:00Z") });
}

const out = await next.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 9 },
  platform: "UNIX",
});
fs.writeFileSync(unsignedApk, out);

console.log(JSON.stringify({
  htmlPath,
  htmlBytes: html.length,
  unsignedApk,
  unsignedBytes: out.length
}, null, 2));
