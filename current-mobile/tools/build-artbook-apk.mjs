import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const sourceJsx = "C:\\Users\\brown\\OneDrive\\Desktop\\documents\\artbook.jsx";
const sourceApk = "C:\\Users\\brown\\OneDrive\\Desktop\\app-debug.apk";
const jszipRoot = "C:\\Users\\brown\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\jszip@3.10.1\\node_modules\\jszip";

const outDir = path.join(root, "build", "artbook-apk");
const distAssets = path.join(outDir, "assets");
const distVendor = path.join(distAssets, "vendor");
const unsignedApk = path.join(outDir, "artbook-full-unsigned.apk");
const htmlOut = path.join(distAssets, "index.html");
const jsOut = path.join(distAssets, "app.js");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(distVendor, { recursive: true });

const babelStandalone = fs.readFileSync(path.join(root, "vendor", "babel.min.js"), "utf8");
const babelContext = {
  window: {},
  self: {},
  console,
  setTimeout,
  clearTimeout,
};
babelContext.global = babelContext;
vm.runInNewContext(babelStandalone, babelContext, { filename: "babel.min.js" });
const Babel = babelContext.Babel || babelContext.window.Babel || babelContext.self.Babel;
if (!Babel) throw new Error("Could not load Babel standalone.");

let jsx = fs.readFileSync(sourceJsx, "utf8");
jsx = jsx.replace(/^\uFEFF?import\s+\{\s*useState,\s*useEffect,\s*useRef,\s*useMemo\s*\}\s+from\s+["']react["'];\s*/m, "const { useState, useEffect, useRef, useMemo } = React;\n");
jsx = jsx.replace("export default function Artbook()", "function Artbook()");
if (!jsx.includes("function Artbook()")) throw new Error("Could not find Artbook component export.");

const bootCode = `
window.addEventListener("error", function (event) {
  var el = document.getElementById("boot-error");
  if (el) {
    el.textContent = "Artbook could not start: " + (event.error && event.error.message ? event.error.message : event.message);
    el.style.display = "block";
  }
});

${jsx}

ReactDOM.createRoot(document.getElementById("root")).render(<Artbook />);
`;

const transformed = Babel.transform(bootCode, {
  presets: [
    ["env", { targets: { android: "8" }, modules: false }],
    ["react", { runtime: "classic" }],
  ],
  sourceType: "script",
  comments: false,
  compact: false,
}).code;

fs.writeFileSync(jsOut, transformed, "utf8");

for (const file of ["react.production.min.js", "react-dom.production.min.js"]) {
  fs.copyFileSync(path.join(root, "vendor", file), path.join(distVendor, file));
}

const indexHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0e0a14">
<title>Artbook</title>
<style>
html,body,#root{width:100%;min-height:100%;margin:0;background:#0e0a14;color:#f7f2fb}
body{overflow:hidden;-webkit-tap-highlight-color:transparent}
#boot{position:fixed;inset:0;display:grid;place-items:center;font:700 14px system-ui;background:#0e0a14;color:#f7f2fb;z-index:1}
#boot strong{display:block;font-size:28px;letter-spacing:-.04em;margin-bottom:8px;background:linear-gradient(135deg,#f472b6,#a78bfa,#38bdf8);-webkit-background-clip:text;color:transparent}
#boot-error{display:none;position:fixed;left:14px;right:14px;bottom:14px;z-index:9999;padding:12px;border-radius:12px;background:#35151d;color:#fecdd3;border:1px solid #fb7185;font:600 12px system-ui;line-height:1.45}
</style>
</head>
<body>
<div id="root"></div>
<div id="boot"><div><strong>Artbook</strong><span>Opening your creator app...</span></div></div>
<div id="boot-error"></div>
<script src="vendor/react.production.min.js"></script>
<script src="vendor/react-dom.production.min.js"></script>
<script src="app.js"></script>
<script>
setTimeout(function(){var boot=document.getElementById("boot");if(boot)boot.style.display="none";},500);
</script>
</body>
</html>
`;
fs.writeFileSync(htmlOut, indexHtml, "utf8");

const JSZip = (await import(pathToFileURL(path.join(jszipRoot, "lib", "index.js")).href)).default;
const apk = await JSZip.loadAsync(fs.readFileSync(sourceApk));
const next = new JSZip();

for (const [name, entry] of Object.entries(apk.files)) {
  if (entry.dir) continue;
  const upper = name.toUpperCase();
  if (upper === "META-INF/MANIFEST.MF" || upper === "META-INF/CERT.SF" || upper === "META-INF/CERT.RSA" || upper === "META-INF/CERT.DSA" || upper === "META-INF/CERT.EC") {
    continue;
  }
  if (name === "assets/index.html") {
    next.file(name, fs.readFileSync(htmlOut), { date: entry.date });
    continue;
  }
  const data = await entry.async("nodebuffer");
  next.file(name, data, { date: entry.date });
}

next.file("assets/app.js", fs.readFileSync(jsOut), { date: new Date("2026-05-19T00:00:00Z") });
next.file("assets/vendor/react.production.min.js", fs.readFileSync(path.join(distVendor, "react.production.min.js")), { date: new Date("2026-05-19T00:00:00Z") });
next.file("assets/vendor/react-dom.production.min.js", fs.readFileSync(path.join(distVendor, "react-dom.production.min.js")), { date: new Date("2026-05-19T00:00:00Z") });

const unsigned = await next.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 9 },
  platform: "UNIX",
});
fs.writeFileSync(unsignedApk, unsigned);

const stats = {
  html: fs.statSync(htmlOut).size,
  appJs: fs.statSync(jsOut).size,
  unsignedApk: fs.statSync(unsignedApk).size,
};
console.log(JSON.stringify({
  outDir,
  htmlOut,
  jsOut,
  unsignedApk,
  ...stats,
}, null, 2));
