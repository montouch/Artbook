import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.env.ARTBOOK_NODE || process.execPath;

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(base, path, options = {}) {
  const res = await fetch(base + path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) }
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const fakeOpenAiPort = await freePort();
const fakeOpenAi = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/responses") {
    res.writeHead(429, { "content-type": "application/json" });
    res.end(JSON.stringify({
      error: {
        code: "insufficient_quota",
        message: "You exceeded your current quota, please check your plan and billing details.",
        type: "insufficient_quota"
      }
    }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: { message: "not_found" } }));
});

await new Promise(resolve => fakeOpenAi.listen(fakeOpenAiPort, "127.0.0.1", resolve));

const port = await freePort();
const store = path.join(os.tmpdir(), `artbook-live-ai-provider-error-${Date.now()}.json`);
const server = spawn(node, ["server/src/server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    ARTBOOK_STORE: store,
    OPENAI_API_KEY: "sk-test-redacted",
    ARTBOOK_AI_LIVE: "1",
    OPENAI_API_BASE_URL: `http://127.0.0.1:${fakeOpenAiPort}`,
    OPENAI_MODEL: "test-model"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let stdout = "";
let stderr = "";
server.stdout.on("data", chunk => { stdout += chunk.toString(); });
server.stderr.on("data", chunk => { stderr += chunk.toString(); });
server.on("error", error => {
  stderr += error.stack || error.message;
});

const base = `http://127.0.0.1:${port}`;
try {
  for (let i = 0; i < 40; i++) {
    try {
      const health = await request(base, "/api/health");
      if (health.status === 200) break;
    } catch {}
    await wait(100);
  }

  const registered = await request(base, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: "live-fallback@artbook.local", password: "demo", name: "Live Fallback", role: "creator", city: "Nairobi" })
  });
  assert(registered.status === 201 && registered.json.token, "registration failed");

  const live = await request(base, "/api/ai/live-assist", {
    method: "POST",
    headers: { authorization: `Bearer ${registered.json.token}` },
    body: JSON.stringify({ source: "provider_error_test", question: "Can AI help everyone in the app?" })
  });

  assert(live.status === 200, "provider errors should return HTTP 200 with guarded fallback");
  assert(live.json.liveAssist?.status === "ai_live_assist_provider_error_fail_closed", "provider error status missing");
  assert(live.json.liveAssist?.providerStatus === "provider_quota_or_billing_fail_closed", "quota/billing provider status missing");
  assert(/quota|billing|credits|usage limit/i.test(live.json.liveAssist?.providerActionRequired || ""), "quota/billing provider next action missing");
  assert(live.json.liveAssist?.modelGateway?.liveCallsEnabled === false, "provider fallback should disable live flag");
  assert(/guarded local brief|Money, identity, Seals/i.test(live.json.liveAssist?.reply || ""), "fallback reply missing guardrails");
  assert(live.json.moneyMovementEnabled === false && live.json.sensitiveActionsEnabled === false, "provider fallback enabled protected actions");

  console.log(JSON.stringify({ ok: true, base, fakeOpenAi: `http://127.0.0.1:${fakeOpenAiPort}`, status: live.json.liveAssist.status }, null, 2));
} finally {
  server.kill();
  fakeOpenAi.close();
  await rm(store, { force: true });
  if (stderr.trim()) console.error(stderr);
}
