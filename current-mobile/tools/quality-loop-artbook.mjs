import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromiumExecutablePath } from "./runtime-browser.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const playwrightPath = "C:\\Users\\brown\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.60.0\\node_modules\\playwright\\index.mjs";
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const KEY = "artbook.mobile.demo.v5";
const html = process.env.ARTBOOK_HTML || path.join(root, "src", "artbook-mobile.html");
const screenshotPath = path.join(root, "build", "artbook-apk", "quality-loop-mobile.png");
const nativeBuildScript = fs.readFileSync(path.join(root, "tools", "build-native-artbook-apk.mjs"), "utf8");

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
const checks = [];
const failures = [];
const source = fs.readFileSync(html, "utf8");

page.on("pageerror", error => pageErrors.push(error.message));
page.on("console", msg => {
  const text = msg.text();
  if (msg.type() === "error" && !/Failed to load resource|ERR_TUNNEL|ERR_PROXY|ERR_INTERNET|404/.test(text)) {
    consoleErrors.push(text);
  }
});

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function saved() {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || "{}"), KEY);
}

async function visibleText() {
  return page.evaluate(() => document.body.innerText);
}

async function collectGeometry(containerSelector, itemSelector) {
  return page.evaluate(({ containerSelector, itemSelector }) => {
    const container = document.querySelector(containerSelector);
    const nodes = container ? [...container.querySelectorAll(itemSelector)] : [];
    const visible = nodes.filter(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    const widths = visible.map(node => Math.round(node.getBoundingClientRect().width * 10) / 10);
    const heights = visible.map(node => Math.round(node.getBoundingClientRect().height * 10) / 10);
    const delta = values => values.length ? Math.max(...values) - Math.min(...values) : 0;
    return {
      exists: Boolean(container),
      count: visible.length,
      labels: visible.map(node => (node.textContent || "").trim().replace(/\s+/g, " ")),
      widths,
      heights,
      widthDelta: Math.round(delta(widths) * 10) / 10,
      heightDelta: Math.round(delta(heights) * 10) / 10,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  }, { containerSelector, itemSelector });
}

function assertEqualWidths(geometry, label, minCount = 2, tolerance = 2) {
  assert(geometry.exists, `${label} tab container did not render`);
  assert(geometry.count >= minCount, `${label} rendered too few tabs: ${geometry.count}`);
  assert(geometry.widthDelta <= tolerance, `${label} tabs are uneven widths: ${geometry.widths.join(", ")}`);
}

function assertEqualHeights(geometry, label, minCount = 2, tolerance = 3) {
  assert(geometry.exists, `${label} tab container did not render`);
  assert(geometry.count >= minCount, `${label} rendered too few tabs: ${geometry.count}`);
  assert(geometry.heightDelta <= tolerance, `${label} tabs are uneven heights: ${geometry.heights.join(", ")}`);
}

async function probeKeyboardViewport({ fieldSelector, actionSelector, surfaceSelector = "#modal.on .sheet", viewportHeight = 520 }) {
  return page.evaluate(async ({ fieldSelector, actionSelector, surfaceSelector, viewportHeight }) => {
    const root = document.documentElement;
    const prior = {
      keyboard: root.dataset.keyboard || "",
      fitVh: root.style.getPropertyValue("--fit-vh"),
      fitVw: root.style.getPropertyValue("--fit-vw"),
      fitTop: root.style.getPropertyValue("--fit-visual-top"),
      fitLeft: root.style.getPropertyValue("--fit-visual-left"),
    };
    const field = document.querySelector(fieldSelector);
    const action = document.querySelector(actionSelector);
    const surface = document.querySelector(surfaceSelector);
    const wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
    const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!field || !action || !surface) {
      return { exists: false, field: Boolean(field), action: Boolean(action), surface: Boolean(surface) };
    }
    root.dataset.keyboard = "open";
    root.style.setProperty("--fit-vh", `${viewportHeight}px`);
    root.style.setProperty("--fit-vw", "390px");
    root.style.setProperty("--fit-visual-top", "0px");
    root.style.setProperty("--fit-visual-left", "0px");
    field.focus();
    try { field.scrollIntoView({ block: "center", inline: "nearest" }); } catch (err) {}
    await wait(330);
    root.dataset.keyboard = "open";
    root.style.setProperty("--fit-vh", `${viewportHeight}px`);
    root.style.setProperty("--fit-vw", "390px");
    root.style.setProperty("--fit-visual-top", "0px");
    root.style.setProperty("--fit-visual-left", "0px");
    await waitFrame();
    try { action.scrollIntoView({ block: "end", inline: "nearest" }); } catch (err) {}
    await waitFrame();
    const surfaceRect = surface.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    const dock = document.querySelector(".flow-dock");
    const dockStyle = dock ? getComputedStyle(dock) : null;
    const result = {
      exists: true,
      keyboard: root.dataset.keyboard,
      surfaceBottom: Math.round(surfaceRect.bottom),
      surfaceHeight: Math.round(surfaceRect.height),
      fieldBottom: Math.round(fieldRect.bottom),
      actionBottom: Math.round(actionRect.bottom),
      dockHidden: !dock || dockStyle.visibility === "hidden" || dockStyle.opacity === "0" || dockStyle.pointerEvents === "none",
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      active: document.activeElement?.id || "",
    };
    if (prior.keyboard) root.dataset.keyboard = prior.keyboard;
    else delete root.dataset.keyboard;
    if (prior.fitVh) root.style.setProperty("--fit-vh", prior.fitVh);
    else root.style.removeProperty("--fit-vh");
    if (prior.fitVw) root.style.setProperty("--fit-vw", prior.fitVw);
    else root.style.removeProperty("--fit-vw");
    if (prior.fitTop) root.style.setProperty("--fit-visual-top", prior.fitTop);
    else root.style.removeProperty("--fit-visual-top");
    if (prior.fitLeft) root.style.setProperty("--fit-visual-left", prior.fitLeft);
    else root.style.removeProperty("--fit-visual-left");
    return result;
  }, { fieldSelector, actionSelector, surfaceSelector, viewportHeight });
}

async function expectHealthyScreen(label) {
  const health = await page.evaluate(() => {
    const text = document.body.innerText;
    const dock = document.querySelector(".flow-dock");
    const top = document.querySelector(".top.artbar");
    const main = document.querySelector(".main");
    return {
      top: Boolean(top),
      dock: Boolean(dock),
      main: Boolean(main),
      bootError: document.getElementById("boot-error")?.textContent || "",
      bootErrorVisible: document.getElementById("boot-error")
        ? getComputedStyle(document.getElementById("boot-error")).display !== "none"
        : false,
      hasUndefined: /\bundefined\b|\bNaN\b/.test(text),
    };
  });
  assert(health.top, `${label}: top bar missing`);
  assert(health.dock, `${label}: bottom bar missing`);
  assert(health.main, `${label}: main surface missing`);
  assert(!health.bootErrorVisible, `${label}: boot error visible ${health.bootError}`);
  assert(!health.hasUndefined, `${label}: visible undefined/NaN text`);
}

async function dragModalSheetDownFrom(selector, options = {}) {
  await page.evaluate(({ sel, resetScroll }) => {
    const target = document.querySelector(sel);
    if (!target) throw new Error(`sheet drag target not found: ${sel}`);
    const sheet = document.querySelector("#modal.on .sheet");
    if (!sheet) throw new Error("open sheet missing");
    const body = sheet.querySelector(".modal-body");
    if (resetScroll) {
      sheet.scrollTop = 0;
      if (body) body.scrollTop = 0;
    } else {
      target.scrollIntoView({ block: "center", inline: "nearest" });
    }
    const rect = target.getBoundingClientRect();
    const x = Math.max(24, Math.min(window.innerWidth - 24, rect.left + Math.min(Math.max(rect.width / 2, 14), Math.max(rect.width - 8, 14))));
    const y = Math.max(96, Math.min(window.innerHeight - 160, rect.top + Math.min(Math.max(rect.height / 2, 14), Math.max(rect.height - 8, 14))));
    const fireTouch = (type, px, py) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      const touch = { identifier: 1, target, clientX: px, clientY: py, pageX: px, pageY: py, screenX: px, screenY: py };
      Object.defineProperty(event, "touches", { value: type === "touchend" || type === "touchcancel" ? [] : [touch] });
      Object.defineProperty(event, "changedTouches", { value: [touch] });
      target.dispatchEvent(event);
    };
    fireTouch("touchstart", x, y);
    fireTouch("touchmove", x + 2, y + 138);
    fireTouch("touchend", x + 2, y + 138);
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }, { sel: selector, resetScroll: options.resetScroll !== false });
  await page.waitForTimeout(420);
}

async function step(name, fn) {
  try {
    await fn();
    await expectHealthyScreen(name);
    checks.push({ name, ok: true });
  } catch (error) {
    failures.push({ name, message: error.message });
    checks.push({ name, ok: false });
  }
}

function assertIconCallsAreCovered() {
  const pathBlock = /const paths = \{([\s\S]*?)\n    \};/.exec(source)?.[1] || "";
  const defined = new Set([...pathBlock.matchAll(/^\s*([A-Za-z0-9_]+):/gm)].map(match => match[1]));
  const calls = new Set([...source.matchAll(/icon\("([A-Za-z0-9_]+)"\)/g)].map(match => match[1]));
  const missing = [...calls].filter(name => !defined.has(name));
  assert(!missing.length, `missing icon definitions: ${missing.join(", ")}`);
}

function assertNoToastOnlyControls() {
  const rawToastControls = [...source.matchAll(/onclick="toast\(/g)].map(match => {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    return line;
  });
  assert(!rawToastControls.length, `toast-only controls still exist on lines: ${rawToastControls.join(", ")}`);
}

async function unlockFinance(account = null) {
  await page.evaluate(id => {
    if (id) App.setAccount(id);
    App.go("wallet");
  }, account);
  await page.waitForSelector("#financePin", { state: "visible", timeout: 5000 });
  await page.fill("#financePin", "0000");
  await page.evaluate(() => App.unlockFinance());
  await page.waitForTimeout(250);
  const state = await saved();
  assert(state.page === "wallet", "finance unlock should stay on Pay/Wallet");
}

await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
await page.evaluate(key => localStorage.removeItem(key), KEY);
await page.reload({ waitUntil: "load" });
await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });

await step("icon set covers visible actions", async () => {
  assertIconCallsAreCovered();
});

await step("no toast-only controls", async () => {
  assertNoToastOnlyControls();
});

await step("navigation and role homes", async () => {
  for (const route of ["home", "circle", "studio", "inbox", "more", "market", "live", "jobs", "delivery", "calendar"]) {
    await page.evaluate(r => App.go(r), route);
    await page.waitForTimeout(120);
    const state = await saved();
    assert(state.page === route, `route ${route} did not persist`);
  }
});

await step("inbox compass routes communication modes", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.openComms("messages");
  });
  await page.waitForTimeout(200);
  let text = await visibleText();
  assert(/Inbox compass/i.test(text) && /Customer command/i.test(text) && /Work records/i.test(text) && /Customer rooms/i.test(text), "inbox compass did not summarize customer communication");
  for (const tab of ["rooms", "calls", "followups", "notifications", "messages"]) {
    await page.locator(`[data-inbox-command-action="${tab}"]`).first().click();
    await page.waitForTimeout(160);
    const state = await saved();
    assert(state.page === "inbox" && state.commTab === tab, `inbox compass did not route to ${tab}`);
  }
});

await step("message header opens the other profile", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.openChat("musa");
  });
  await page.waitForTimeout(180);
  await page.locator(".chat-profile-link").first().click();
  await page.waitForTimeout(180);
  const state = await saved();
  assert(state.page === "profile" && state.profileId === "musa", "tapping message header did not open that person's profile");
});

await step("pulling down refreshes the current page", async () => {
  await page.evaluate(() => App.go("discover"));
  await page.waitForTimeout(180);
  const before = await saved();
  const beforeTick = Number(before.pageRefreshes?.discover?.tick || 0);
  await page.evaluate(() => {
    const main = document.querySelector(".main");
    if(!main) throw new Error("main surface missing");
    main.scrollTop = 0;
    const buttonTarget = [...document.querySelectorAll(".main button")].find(button =>
      button.offsetParent &&
      !button.closest(".flow-dock,.chat-compose,.compose-line,.chiprow,.scroll,.world-switch") &&
      button.innerText.trim()
    ) || main;
    const fireTouch = (type, target, x, y) => {
      const event = new Event(type, {bubbles:true,cancelable:true});
      const touch = {identifier:1,target,clientX:x,clientY:y,pageX:x,pageY:y,screenX:x,screenY:y};
      Object.defineProperty(event, "touches", {value:type === "touchend" || type === "touchcancel" ? [] : [touch]});
      Object.defineProperty(event, "changedTouches", {value:[touch]});
      target.dispatchEvent(event);
    };
    fireTouch("touchstart", buttonTarget, 200, 110);
    fireTouch("touchmove", buttonTarget, 202, 250);
    fireTouch("touchend", buttonTarget, 202, 250);
    buttonTarget.dispatchEvent(new MouseEvent("click", {bubbles:true,cancelable:true}));
  });
  await page.waitForTimeout(420);
  const state = await saved();
  assert(state.page === "discover", "pull refresh should keep the user on the same page");
  assert(Number(state.pageRefreshes?.discover?.tick || 0) > beforeTick, "pull refresh did not record a page refresh tick");
  assert(state.pageRefreshes?.discover?.source === "pull", "pull refresh source was not recorded");
});

await step("Artguide sheet swipes down closed from body", async () => {
  await page.evaluate(() => App.artguide());
  await page.waitForSelector("#modal.on .artguide-panel", { state: "visible", timeout: 5000 });
  await dragModalSheetDownFrom("#modal.on .artguide-oracle");
  const open = await page.evaluate(() => document.querySelector("#modal")?.classList.contains("on"));
  assert(!open, "swiping down on Artguide body did not close the sheet");
});

await step("Artguide fits compact and landscape phone sheets", async () => {
  const inspect = async (width, height) => {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(220);
    await page.evaluate(() => {
      App.setAccount("riley_biz");
      App.go("register");
      App.artguide();
    });
    await page.waitForSelector("#modal.on .sheet.artguide-sheet .artguide-panel", { state: "visible", timeout: 5000 });
    await page.waitForTimeout(180);
    return page.evaluate(() => {
      const rectOf = selector => {
        const el = document.querySelector(selector);
        if(!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          overflowY: getComputedStyle(el).overflowY,
        };
      };
      const body = document.querySelector("#modal.on .sheet.artguide-sheet .modal-body");
      return {
        fit: document.documentElement.dataset.fit,
        orientation: document.documentElement.dataset.orientation,
        active: document.activeElement?.id || document.activeElement?.tagName || "",
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        sheetClass: document.querySelector("#modal.on .sheet")?.className || "",
        sheet: rectOf("#modal.on .sheet.artguide-sheet"),
        head: rectOf("#modal.on .sheet.artguide-sheet .sheet-head"),
        close: rectOf("#modal.on .sheet.artguide-sheet .sheet-head .icon-btn"),
        body: rectOf("#modal.on .sheet.artguide-sheet .modal-body"),
        oracle: rectOf("#modal.on .sheet.artguide-sheet .artguide-home-compact"),
        talk: rectOf("#modal.on .sheet.artguide-sheet [data-artguide-talk]"),
        prompt: rectOf("#modal.on .sheet.artguide-sheet .artguide-prompt"),
        bodyScrolls: !!body && body.scrollHeight > body.clientHeight + 8,
        operatorSummary: document.querySelector("#modal.on [data-ai-operator-map] summary")?.innerText || document.querySelector("#modal.on [data-artguide-copilot-drawer] summary")?.innerText || "",
        drawerCount: document.querySelectorAll("#modal.on .sheet.artguide-sheet details").length,
        closedDrawers: Array.from(document.querySelectorAll("#modal.on .sheet.artguide-sheet details")).filter(item => !item.open).length,
        copilotDrawerOpen: document.querySelector("#modal.on [data-artguide-copilot-drawer]")?.open ?? null,
      };
    });
  };
  const portrait = await inspect(390, 844);
  assert(portrait.sheetClass.includes("fit-scroll-sheet") && portrait.sheetClass.includes("artguide-sheet"), `Artguide did not opt into fitted sheet rules: ${portrait.sheetClass}`);
  assert(portrait.sheet && portrait.sheet.top >= -1 && portrait.sheet.bottom <= portrait.viewportHeight + 1, `portrait Artguide sheet escapes viewport: ${JSON.stringify(portrait)}`);
  assert(portrait.head && portrait.head.top >= portrait.sheet.top - 1 && portrait.head.bottom <= portrait.sheet.bottom + 1, `portrait Artguide header is not contained: ${JSON.stringify(portrait)}`);
  assert(portrait.close && portrait.close.right <= portrait.viewportWidth + 1 && portrait.close.bottom <= portrait.sheet.bottom + 1, `portrait Artguide close control is clipped: ${JSON.stringify(portrait)}`);
  assert(portrait.active !== "artguideInput", "compact Artguide should not auto-open the keyboard");
  assert(portrait.bodyScrolls && /auto|scroll/.test(portrait.body.overflowY), `portrait Artguide body should own the scroll: ${JSON.stringify(portrait.body)}`);
  assert(/AI operator coverage/.test(portrait.operatorSummary) && /Whole-app capability map/.test(portrait.operatorSummary) && /Action boundaries/.test(portrait.operatorSummary), "Artguide fitted summary lost AI operator coverage");
  assert(portrait.oracle?.height > 0 && portrait.oracle.height <= 190, `portrait Artguide hero should stay compact: ${JSON.stringify(portrait.oracle)}`);
  assert(portrait.talk?.height > 0 && portrait.talk.height <= 380, `portrait Artguide talk card should stay chat-first and compact: ${JSON.stringify(portrait.talk)}`);
  assert(portrait.drawerCount >= 4 && portrait.closedDrawers >= 4 && portrait.copilotDrawerOpen === false, `portrait Artguide deeper maps should start tucked in drawers: ${JSON.stringify(portrait)}`);

  const landscape = await inspect(820, 430);
  assert(landscape.orientation === "landscape", `expected landscape Artguide fit, got ${JSON.stringify(landscape)}`);
  assert(landscape.sheet && landscape.sheet.top >= -1 && landscape.sheet.bottom <= landscape.viewportHeight + 1, `landscape Artguide sheet escapes viewport: ${JSON.stringify(landscape)}`);
  assert(landscape.head && landscape.head.top >= landscape.sheet.top - 1 && landscape.head.bottom <= landscape.sheet.bottom + 1, `landscape Artguide header is not contained: ${JSON.stringify(landscape)}`);
  assert(landscape.active !== "artguideInput", "landscape Artguide should not auto-open the keyboard");
  assert(landscape.overflow <= 2, `landscape Artguide introduced horizontal overflow: ${JSON.stringify(landscape)}`);
  await page.evaluate(() => App.closeModal());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(160);
});

await step("Artguide has natural talk and operate controls", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(180);
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.go("home");
    App.artguide("help me bill a client for package delivery");
  });
  await page.waitForSelector("#modal.on .sheet.artguide-sheet [data-artguide-talk]", { state: "visible", timeout: 5000 });
  let state = await page.evaluate(() => {
    const modal = document.querySelector("#modal.on");
    return {
      text: modal?.innerText || "",
      homeUi: !!document.querySelector("#modal.on [data-ai-assistant-ui='artguide-home']"),
      chatUi: !!document.querySelector("#modal.on [data-ai-assistant-ui='artguide-chat']"),
      input: !!document.querySelector("#artguideInput"),
      placeholder: document.querySelector("#artguideInput")?.getAttribute("placeholder") || "",
      voiceButton: !!document.querySelector("#modal.on .sheet.artguide-sheet .live-ai-voice-btn"),
      talkRows: document.querySelectorAll("#modal.on .artguide-talk-msg").length,
      actionLabels: Array.from(document.querySelectorAll("#modal.on .artguide-talk-actions .btn")).map(btn => btn.textContent.trim()).join(" "),
    };
  });
  assert(state.text.includes("Talk with Artguide") && /normal words|speak back|safe navigation/i.test(state.text), `Artguide talk surface does not feel conversational: ${JSON.stringify(state)}`);
  assert(state.homeUi && state.chatUi && /Message Artguide/i.test(state.placeholder), `Artguide did not use the unified chat-first AI UI: ${JSON.stringify(state)}`);
  assert(state.input && state.voiceButton && state.talkRows >= 1, `Artguide talk surface missing input/voice/log: ${JSON.stringify(state)}`);
  assert(/Operate/i.test(state.actionLabels) && /Speak/i.test(state.actionLabels) && /Full chat/i.test(state.actionLabels), `Artguide talk actions missing operate/speech/chat: ${JSON.stringify(state)}`);

  await page.evaluate(async () => {
    await App.sendArtguideOperate("open package delivery and help me bill the client");
    await new Promise(resolve => setTimeout(resolve, 820));
  });
  state = await page.evaluate(() => {
    const ai = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5")).liveAi;
    return {
      floatVisible: !!document.querySelector("[data-live-ai-float]"),
      floatText: document.querySelector("[data-live-ai-float]")?.innerText || "",
      modalText: document.querySelector("#modal.on")?.innerText || "",
      target: !!document.querySelector("#modal.on [data-live-ai-operate-target='packageBilling']"),
      targetText: document.querySelector("#modal.on [data-live-ai-operate-target-card]")?.innerText || "",
      packagePayer: document.querySelector("#packagePayer")?.value || "",
      controlMode: ai.controlMode,
      plan: ai.lastPlan,
      floating: ai.floating,
    };
  });
  assert(state.controlMode === "operate" && state.floating && state.floatVisible, `Artguide Operate did not keep chat floating: ${JSON.stringify(state)}`);
  assert(state.plan?.key === "packageDelivery" && /Package delivery/i.test(state.modalText), `Artguide Operate did not open package delivery naturally: ${JSON.stringify(state)}`);
  assert(state.target && state.packagePayer === "client_request" && /Live AI landed here|cannot/i.test(state.targetText), `Artguide Operate did not land on package billing safely: ${JSON.stringify(state)}`);
  assert(/Artguide is with you|Chat while I work|Package/i.test(state.floatText), `Artguide floating copy is not natural enough: ${JSON.stringify(state)}`);

  await page.evaluate(async () => {
    App.closeModal();
    App.hideLiveAiFloat();
    App.artguide("set up booking deposits and cancellation rules");
    await new Promise(resolve => setTimeout(resolve, 160));
    await App.sendArtguideOperate("set up booking deposits and cancellation rules");
    await new Promise(resolve => setTimeout(resolve, 860));
  });
  state = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5"));
    const ai = saved.liveAi;
    return {
      page: saved.page,
      calendarTab: saved.calendarTab,
      floatVisible: !!document.querySelector("[data-live-ai-float]"),
      target: !!document.querySelector("[data-live-ai-operate-target='bookingSetup']"),
      targetText: document.querySelector("[data-live-ai-operate-target-card]")?.innerText || "",
      paymentModeVisible: !!document.querySelector("#bookingPaymentMode"),
      modalOpen: !!document.querySelector("#modal.on"),
      plan: ai.lastPlan,
      controlMode: ai.controlMode,
    };
  });
  assert(state.page === "calendar" && state.calendarTab === "policy", `Artguide Operate did not land on booking policy tab: ${JSON.stringify(state)}`);
  assert(state.plan?.key === "bookingSetup" && state.controlMode === "operate" && state.floatVisible, `Artguide booking Operate did not keep safe route/floating chat: ${JSON.stringify(state)}`);
  assert(state.target && state.paymentModeVisible && /Live AI landed here|owner taps Save protocol|cannot publish policy/i.test(state.targetText), `Artguide booking Operate did not mark the exact policy field safely: ${JSON.stringify(state)}`);

  await page.evaluate(async () => {
    App.closeModal();
    App.hideLiveAiFloat();
    App.artguide("show Jay Counter delivery permission");
    await new Promise(resolve => setTimeout(resolve, 160));
    await App.sendArtguideOperate("show Jay Counter delivery permission");
    await new Promise(resolve => setTimeout(resolve, 860));
  });
  state = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5"));
    const ai = saved.liveAi;
    return {
      floatVisible: !!document.querySelector("[data-live-ai-float]"),
      modalTitle: document.querySelector("#modal.on h2")?.textContent || document.querySelector("#modal.on")?.innerText.slice(0, 80) || "",
      target: !!document.querySelector("[data-live-ai-operate-target='staffAccess']"),
      targetText: document.querySelector("[data-live-ai-operate-target-card]")?.innerText || "",
      permissionText: document.querySelector("[data-staff-permission='delivery']")?.innerText || "",
      plan: ai.lastPlan,
      controlMode: ai.controlMode,
    };
  });
  assert(state.plan?.key === "staffAccess" && state.controlMode === "operate" && state.floatVisible, `Artguide staff Operate did not keep safe route/floating chat: ${JSON.stringify(state)}`);
  assert(/Staff access/i.test(state.modalTitle) && state.target && /delivery/i.test(state.permissionText), `Artguide staff Operate did not land on the delivery permission row: ${JSON.stringify(state)}`);
  assert(/Live AI landed here|AI cannot grant staff access|owner decides/i.test(state.targetText), `Artguide staff Operate did not show owner-gated guardrail copy: ${JSON.stringify(state)}`);

  await page.evaluate(async () => {
    App.closeModal();
    App.hideLiveAiFloat();
    App.setAccount("riley_artist");
    App.artguide("open cover artwork proof for my music release");
    await new Promise(resolve => setTimeout(resolve, 160));
    await App.sendArtguideOperate("open cover artwork proof for my music release");
    await new Promise(resolve => setTimeout(resolve, 940));
  });
  state = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5"));
    const ai = saved.liveAi;
    return {
      floatVisible: !!document.querySelector("[data-live-ai-float]"),
      modalText: document.querySelector("#modal.on")?.innerText.slice(0, 700) || "",
      target: !!document.querySelector("[data-live-ai-operate-target='artistRelease']"),
      targetText: document.querySelector("[data-live-ai-operate-target-card]")?.innerText || "",
      artworkVisible: !!document.querySelector("#musicArtworkProof"),
      focusedField: document.activeElement?.id || "",
      operateTarget: ai.lastPlan?.operateTarget || null,
      plan: ai.lastPlan,
      controlMode: ai.controlMode,
    };
  });
  assert(state.plan?.key === "artistRelease" && state.controlMode === "operate" && state.floatVisible, `Artguide artist release Operate did not keep safe route/floating chat: ${JSON.stringify(state)}`);
  assert(/Music release desk/i.test(state.modalText) && state.target && state.artworkVisible, `Artguide artist release Operate did not land on the artwork proof field: ${JSON.stringify(state)}`);
  assert(state.operateTarget?.selector === "#musicArtworkProof" && /Cover artwork proof/i.test(state.operateTarget?.label || ""), `Artguide artist release Operate chose the wrong release field: ${JSON.stringify(state)}`);
  assert(/Live AI landed here|cannot file copyright|approve rights|move royalties/i.test(state.targetText), `Artguide artist release Operate did not show legal/provider guardrail copy: ${JSON.stringify(state)}`);

  await page.evaluate(async () => {
    App.closeModal();
    App.hideLiveAiFloat();
    App.setAccount("riley_biz");
    App.artguide("show unpaid invoice reminder");
    await new Promise(resolve => setTimeout(resolve, 160));
    await App.sendArtguideOperate("show unpaid invoice reminder");
    await new Promise(resolve => setTimeout(resolve, 940));
  });
  state = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5"));
    const ai = saved.liveAi;
    const target = document.querySelector("[data-live-ai-operate-target='salesDocument']");
    const focusedText = document.activeElement?.innerText || document.activeElement?.value || "";
    return {
      page: saved.page,
      registerTab: saved.registerTab,
      floatVisible: !!document.querySelector("[data-live-ai-float]"),
      target: !!target,
      targetText: document.querySelector("[data-live-ai-operate-target-card]")?.innerText || "",
      rowText: target?.innerText || "",
      focusedText,
      operateTarget: ai.lastPlan?.operateTarget || null,
      plan: ai.lastPlan,
      controlMode: ai.controlMode,
    };
  });
  assert(state.plan?.key === "receipts" && state.controlMode === "operate" && state.floatVisible, `Artguide receipts Operate did not keep safe route/floating chat: ${JSON.stringify(state)}`);
  assert(state.page === "register" && state.registerTab === "receipts" && state.target && /Invoice|Remind|due/i.test(state.rowText), `Artguide receipts Operate did not land on the unpaid invoice reminder row: ${JSON.stringify(state)}`);
  assert(state.operateTarget?.mode === "invoiceReminder" && /Invoice reminder/i.test(state.operateTarget?.label || ""), `Artguide receipts Operate chose the wrong sales document target: ${JSON.stringify(state)}`);
  assert(/owner\/staff still taps Remind|cannot send|mark paid|settle payment/i.test(state.targetText), `Artguide receipts Operate did not show payment-safe guardrail copy: ${JSON.stringify(state)}`);

  await page.evaluate(async () => {
    App.closeModal();
    App.hideLiveAiFloat();
    App.artguide("open receipt settings business email");
    await new Promise(resolve => setTimeout(resolve, 160));
    await App.sendArtguideOperate("open receipt settings business email");
    await new Promise(resolve => setTimeout(resolve, 820));
  });
  state = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5"));
    const ai = saved.liveAi;
    const target = document.querySelector("[data-live-ai-operate-target='salesDocument']");
    return {
      page: saved.page,
      registerTab: saved.registerTab,
      floatVisible: !!document.querySelector("[data-live-ai-float]"),
      target: !!target,
      targetText: document.querySelector("[data-live-ai-operate-target-card]")?.innerText || "",
      focusedField: document.activeElement?.id || "",
      operateTarget: ai.lastPlan?.operateTarget || null,
      plan: ai.lastPlan,
      controlMode: ai.controlMode,
    };
  });
  assert(state.plan?.key === "receipts" && state.controlMode === "operate" && state.floatVisible, `Artguide receipt settings Operate did not keep safe route/floating chat: ${JSON.stringify(state)}`);
  assert(state.page === "register" && state.registerTab === "settings" && state.target && state.focusedField === "posBusinessEmail", `Artguide receipt settings Operate did not land on business email settings: ${JSON.stringify(state)}`);
  assert(state.operateTarget?.mode === "settings" && /Receipt settings/i.test(state.operateTarget?.label || ""), `Artguide receipt settings Operate chose the wrong target: ${JSON.stringify(state)}`);
  assert(/Receipt settings are open|cannot change tax treatment|delivery rules/i.test(state.targetText), `Artguide receipt settings Operate did not show safe settings guardrail: ${JSON.stringify(state)}`);

  await page.evaluate(async () => {
    App.closeModal();
    App.hideLiveAiFloat();
    App.artguide("show refund review for receipt");
    await new Promise(resolve => setTimeout(resolve, 160));
    await App.sendArtguideOperate("show refund review for receipt");
    await new Promise(resolve => setTimeout(resolve, 940));
  });
  state = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5"));
    const ai = saved.liveAi;
    const target = document.querySelector("[data-live-ai-operate-target='salesDocument']");
    return {
      floatVisible: !!document.querySelector("[data-live-ai-float]"),
      modalText: document.querySelector("#modal.on")?.innerText || "",
      target: !!target,
      targetText: document.querySelector("[data-live-ai-operate-target-card]")?.innerText || "",
      refundAmountVisible: !!document.querySelector("#refundAmount"),
      operateTarget: ai.lastPlan?.operateTarget || null,
      plan: ai.lastPlan,
      controlMode: ai.controlMode,
    };
  });
  assert(state.plan?.key === "receipts" && state.controlMode === "operate" && state.floatVisible, `Artguide refund review Operate did not keep safe route/floating chat: ${JSON.stringify(state)}`);
  assert(/Refund desk|Refund complete/i.test(state.modalText) && state.target, `Artguide refund review Operate did not land on refund review: ${JSON.stringify(state)}`);
  assert(state.operateTarget?.mode === "refund" && /Refund desk/i.test(state.operateTarget?.label || ""), `Artguide refund review Operate chose the wrong target: ${JSON.stringify(state)}`);
  assert(/Refund desk is open|AI cannot record|send or settle a refund/i.test(state.targetText), `Artguide refund review Operate did not show provider refund guardrail: ${JSON.stringify(state)}`);

  await page.evaluate(async () => {
    App.closeModal();
    App.hideLiveAiFloat();
    App.artguide("open invoice maker pdf draft");
    await new Promise(resolve => setTimeout(resolve, 160));
    await App.sendArtguideOperate("open invoice maker pdf draft");
    await new Promise(resolve => setTimeout(resolve, 940));
  });
  state = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5"));
    const ai = saved.liveAi;
    const target = document.querySelector("[data-live-ai-operate-target='salesDocument']");
    return {
      floatVisible: !!document.querySelector("[data-live-ai-float]"),
      modalText: document.querySelector("#modal.on")?.innerText || "",
      target: !!target,
      targetText: document.querySelector("[data-live-ai-operate-target-card]")?.innerText || "",
      documentPreview: !!document.querySelector("#modal.on .invoice-preview"),
      operateTarget: ai.lastPlan?.operateTarget || null,
      plan: ai.lastPlan,
      controlMode: ai.controlMode,
    };
  });
  assert(state.plan?.key === "receipts" && state.controlMode === "operate" && state.floatVisible, `Artguide invoice maker Operate did not keep safe route/floating chat: ${JSON.stringify(state)}`);
  assert(/Invoice|Receipt|maker/i.test(state.modalText) && state.target && state.documentPreview, `Artguide invoice maker Operate did not land on document maker: ${JSON.stringify(state)}`);
  assert(state.operateTarget?.mode === "maker" && /Invoice maker/i.test(state.operateTarget?.label || ""), `Artguide invoice maker Operate chose the wrong target: ${JSON.stringify(state)}`);
  assert(/Invoice maker is open|AI cannot issue the invoice|collect money/i.test(state.targetText), `Artguide invoice maker Operate did not show issue/payment guardrail: ${JSON.stringify(state)}`);
  await page.evaluate(() => { App.closeModal(); App.hideLiveAiFloat(); });
});

await step("Live AI room supports voice UI and guarded app control", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(180);
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.go("home");
    App.liveAiRoom();
  });
  await page.waitForSelector("#modal.on .sheet.live-ai-sheet .live-ai-panel", { state: "visible", timeout: 5000 });
  let state = await page.evaluate(() => {
    const modal = document.querySelector("#modal.on");
    const sheet = document.querySelector("#modal.on .sheet.live-ai-sheet");
    const intro = document.querySelector("#modal.on .live-ai-chat-intro");
    const chatWindow = document.querySelector("#modal.on [data-live-ai-chat-window]");
    const modeDrawer = document.querySelector("#modal.on [data-live-ai-mode-drawer]");
    const rect = sheet?.getBoundingClientRect();
    const introRect = intro?.getBoundingClientRect();
    const chatRect = chatWindow?.getBoundingClientRect();
    return {
      text: modal?.innerText || "",
      sheetClass: sheet?.className || "",
      chatShell: !!document.querySelector("#modal.on [data-ai-assistant-ui='live-chat']"),
      chatWindow: !!chatWindow,
      composer: !!document.querySelector("#modal.on [data-ai-chat-composer]"),
      minimize: !!document.querySelector("#modal.on [data-live-ai-minimize]"),
      placeholder: document.querySelector("#liveAiInput")?.getAttribute("placeholder") || "",
      voiceButton: !!document.querySelector(".live-ai-voice-btn"),
      modeCount: document.querySelectorAll(".live-ai-mode").length,
      modeDrawer: !!modeDrawer,
      modeDrawerOpen: !!modeDrawer?.open,
      introHeight: Math.round(introRect?.height || 0),
      introBottom: Math.round(introRect?.bottom || 0),
      chatTop: Math.round(chatRect?.top || 0),
      input: !!document.querySelector("#liveAiInput"),
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      bottom: Math.round(rect?.bottom || 0),
      viewportHeight: window.innerHeight,
      audioPermissionInNative: /RECORD_AUDIO/.test(window.__ARTBOOK_NATIVE_SCRIPT__ || ""),
    };
  });
  assert(state.text.includes("Talk to Artguide") && state.text.includes("Drive") && state.text.includes("Operate"), "Live AI command room did not expose chat/control modes");
  assert(state.chatShell && state.chatWindow && state.composer && state.minimize && /Message Artguide/i.test(state.placeholder), `Live AI did not render as the simplified chat-first assistant UI: ${JSON.stringify(state)}`);
  assert(state.sheetClass.includes("fit-scroll-sheet") && state.sheetClass.includes("live-ai-sheet"), `Live AI sheet is not fitted: ${state.sheetClass}`);
  assert(state.voiceButton && state.input && state.modeCount >= 4, `Live AI room missing voice/input/mode controls: ${JSON.stringify(state)}`);
  assert(state.modeDrawer && !state.modeDrawerOpen, `Live AI mode controls should start tucked inside a closed drawer: ${JSON.stringify(state)}`);
  assert(state.introHeight > 0 && state.introHeight <= 180 && state.chatTop <= state.introBottom + 16, `Live AI room is no longer chat-first on compact phones: ${JSON.stringify(state)}`);
  assert(state.overflow <= 2 && state.bottom <= state.viewportHeight + 1, `Live AI sheet does not fit compact phone: ${JSON.stringify(state)}`);

  await page.evaluate(async () => {
    App.setLiveAiControlMode("confirm");
    await App.sendLiveAiCommand("open package delivery", "test");
  });
  await page.waitForTimeout(300);
  state = await page.evaluate(() => {
    const ai = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5")).liveAi;
    return {
      modalText: document.querySelector("#modal.on")?.innerText || "",
      status: ai.status,
      plan: ai.lastPlan,
      messages: ai.messages.map(row => row.text).join("\n"),
    };
  });
  assert(state.plan?.allowed === true && /delivery|package/i.test(`${state.plan.label} ${state.plan.desc}`), `Live AI did not produce a safe package-delivery route: ${JSON.stringify(state.plan)}`);
  assert(/Open|Route/i.test(state.modalText) && /protected actions/i.test(state.modalText), "Live AI room did not keep the action boundary visible");

  await page.evaluate(async () => {
    await App.sendLiveAiCommand("advise me on the main app flows and what I should open first as a business owner", "test");
  });
  await page.waitForTimeout(300);
  state = await page.evaluate(() => {
    const ai = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5")).liveAi;
    return { plan: ai.lastPlan, modalText: document.querySelector("#modal.on")?.innerText || "" };
  });
  assert(state.plan?.key === "businessSystem", `Live AI should route broad business-owner advice to Business OS: ${JSON.stringify(state.plan)}`);

  await page.evaluate(async () => {
    await App.sendLiveAiCommand("set up appointments with staff hours deposits and intake forms", "test");
  });
  await page.waitForTimeout(300);
  state = await page.evaluate(() => {
    const ai = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5")).liveAi;
    return { plan: ai.lastPlan, modalText: document.querySelector("#modal.on")?.innerText || "" };
  });
  assert(state.plan?.key === "bookingSetup", `Live AI should route booking setup intent to Booking setup: ${JSON.stringify(state.plan)}`);

  await page.evaluate(async () => {
    await App.sendLiveAiCommand("send money to Zuri and grant a provenance seal", "test");
  });
  await page.waitForTimeout(300);
  state = await page.evaluate(() => {
    const ai = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5")).liveAi;
    return {
      modalText: document.querySelector("#modal.on")?.innerText || "",
      plan: ai.lastPlan,
      messages: ai.messages.map(row => row.text).join("\n"),
    };
  });
  assert(state.plan?.allowed === false, `Live AI should block protected action requests: ${JSON.stringify(state.plan)}`);
  assert(/Protected action blocked|Blocked:/i.test(state.modalText) && /human|provider|confirmation/i.test(state.modalText), "Live AI did not explain protected action boundaries");
  await page.evaluate(() => {
    App.liveAiRoom();
    App.minimizeLiveAi("test");
  });
  await page.waitForSelector("[data-live-ai-float]", { state: "visible", timeout: 5000 });
  state = await page.evaluate(async () => {
    App.setLiveAiControlMode("operate");
    await App.sendLiveAiCommand("open package delivery", "test");
    await new Promise(resolve => setTimeout(resolve, 750));
    const ai = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5")).liveAi;
    const float = document.querySelector("[data-live-ai-float]");
    const rect = float?.getBoundingClientRect();
    const compose = float?.querySelector(".live-ai-float-compose")?.getBoundingClientRect();
    return {
      floatVisible:!!float,
      floatUi: !!document.querySelector("[data-ai-assistant-ui='floating-chat']"),
      draggable: !!document.querySelector("[data-live-ai-draggable='true']"),
      dragGrip: !!document.querySelector("[data-live-ai-drag-grip]"),
      dotButton: !!document.querySelector("[aria-label='Minimize Artguide to active dot']"),
      floatInput: !!document.querySelector("#liveAiFloatInput"),
      floatText:float?.innerText || "",
      floatHeight:Math.round(rect?.height || 0),
      floatBottomGap:Math.round(window.innerHeight - (rect?.bottom || window.innerHeight)),
      floatWidth:Math.round(rect?.width || 0),
      composeHeight:Math.round(compose?.height || 0),
      modalText:document.querySelector("#modal.on")?.innerText || "",
      plan:ai.lastPlan,
      controlMode:ai.controlMode,
      floating:ai.floating
    };
  });
  assert(state.floatVisible && state.floating && /Artguide|Chat while I work|Package/i.test(state.floatText), `Live AI floating chat did not persist while operating: ${JSON.stringify(state)}`);
  assert(state.floatUi && state.floatInput && state.draggable && state.dragGrip && state.dotButton, `Live AI floating chat is not an active movable mini chat UI: ${JSON.stringify(state)}`);
  assert(state.floatHeight > 0 && state.floatHeight <= 306 && state.floatBottomGap >= 72 && state.composeHeight <= 72, `Live AI floating chat is not compact enough for one-handed phone use: ${JSON.stringify(state)}`);
  assert(state.controlMode === "operate" && state.plan?.key === "packageDelivery", `Live AI operate mode did not keep package delivery route: ${JSON.stringify(state)}`);
  assert(/Package delivery/i.test(state.modalText), "Live AI operate mode did not open the destination while keeping chat available");
  await page.evaluate(() => App.collapseLiveAiFloat());
  await page.waitForSelector("[data-live-ai-dot]", { state: "visible", timeout: 5000 });
  const dotBox = await page.locator("[data-live-ai-dot]").boundingBox();
  assert(dotBox, "Live AI active dot did not produce a draggable bounding box");
  await page.mouse.move(dotBox.x + dotBox.width / 2, dotBox.y + dotBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(Math.max(24, dotBox.x - 42), Math.max(96, dotBox.y - 36), { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  state = await page.evaluate(() => {
    const ai = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5")).liveAi;
    const dot = document.querySelector("[data-live-ai-dot]");
    const rect = dot?.getBoundingClientRect();
    return {
      dotVisible: !!dot,
      collapsed: ai.floatCollapsed,
      floating: ai.floating,
      position: ai.floatPosition,
      rectLeft: Math.round(rect?.left || 0),
      rectTop: Math.round(rect?.top || 0),
      text: dot?.innerText || "",
    };
  });
  assert(state.dotVisible && state.collapsed && state.floating && /AI/i.test(state.text), `Live AI did not minimize to an active dot: ${JSON.stringify(state)}`);
  assert(Number.isFinite(state.position?.x) && Number.isFinite(state.position?.y), `Live AI dot drag did not persist a screen position: ${JSON.stringify(state)}`);
  await page.evaluate(() => App.expandLiveAiFloat());
  await page.waitForSelector("[data-ai-assistant-ui='floating-chat']", { state: "visible", timeout: 5000 });
  await page.evaluate(() => App.aiControlDesk());
  await page.waitForSelector("#modal.on [data-ai-assistant-ui='controls']", { state: "visible", timeout: 5000 });
  state = await page.evaluate(() => ({
    text: document.querySelector("#modal.on")?.innerText || "",
    commandCards: document.querySelectorAll("#modal.on .ai-command-card").length,
    controlsUi: !!document.querySelector("#modal.on [data-ai-assistant-ui='controls']"),
    compact: !!document.querySelector("#modal.on .ai-control-shell.compact"),
    shellHeight: Math.round(document.querySelector("#modal.on [data-ai-assistant-ui='controls']")?.getBoundingClientRect().height || 0),
    heroHeight: Math.round(document.querySelector("#modal.on .ai-control-compact-hero")?.getBoundingClientRect().height || 0),
    brief: !!document.querySelector("#modal.on .ai-command-brief"),
    toolDrawer: !!document.querySelector("#modal.on [data-ai-control-tools-drawer]"),
    toolDrawerOpen: document.querySelector("#modal.on [data-ai-control-tools-drawer]")?.open ?? null,
    drawers: document.querySelectorAll("#modal.on .ai-compact-drawer").length,
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(state.controlsUi && state.compact && state.brief && state.toolDrawer && state.toolDrawerOpen === false && state.drawers >= 2 && state.commandCards >= 4 && /Chat room|Control map|Stock assistant/i.test(state.text), `AI controls did not use the compact unified assistant launchpad: ${JSON.stringify(state)}`);
  assert(state.shellHeight > 0 && state.shellHeight <= 520 && state.heroHeight > 0 && state.heroHeight <= 210, `AI controls should stay compact and drawer-first on phone: ${JSON.stringify(state)}`);
  assert(state.overflow <= 2, `AI controls overflow compact phone width: ${JSON.stringify(state)}`);
  await page.evaluate(() => App.aiMissionControl());
  await page.waitForSelector("#modal.on [data-ai-assistant-ui='mission-control']", { state: "visible", timeout: 5000 });
  state = await page.evaluate(() => ({
    text: document.querySelector("#modal.on")?.innerText || "",
    missionUi: !!document.querySelector("#modal.on [data-ai-assistant-ui='mission-control']"),
    compact: !!document.querySelector("#modal.on .ai-command-shell.compact"),
    heroHeight: Math.round(document.querySelector("#modal.on .ai-control-hero")?.getBoundingClientRect().height || 0),
    brief: !!document.querySelector("#modal.on .ai-command-brief"),
    drawers: document.querySelectorAll("#modal.on .ai-compact-drawer").length,
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(state.missionUi && state.compact && state.brief && state.heroHeight > 0 && state.heroHeight <= 310 && state.drawers >= 3 && /App-wide AI copilot|Open chat|AI map|Talk|Protected actions/i.test(state.text), `AI command center did not use the compact unified assistant launchpad: ${JSON.stringify(state)}`);
  assert(state.overflow <= 2, `AI command center overflowed compact phone width: ${JSON.stringify(state)}`);
  await page.evaluate(() => { App.closeModal(); App.hideLiveAiFloat(); });
});

await step("Live AI floating assistant avoids player controls", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(180);
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.go("home");
    App.playAlbum("alb1");
    App.hideLiveAiFloat();
  });
  await page.waitForSelector(".artguide-fab", { state: "visible", timeout: 5000 });
  await page.waitForTimeout(180);
  let state = await page.evaluate(() => {
    const rect = selector => {
      const el = document.querySelector(selector);
      if(!el) return null;
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if(style.display === "none" || style.visibility === "hidden" || r.width < 8 || r.height < 8) return null;
      return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height, text:el.innerText || el.getAttribute("aria-label") || "" };
    };
    const overlaps = (a,b,pad=8) => !!(a && b && a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad);
    const artguide = rect(".artguide-fab");
    const quickPay = rect(".quick-pay-fab");
    const player = rect(".mini-player");
    const dock = rect(".flow-dock");
    return {
      artguide, quickPay, player, dock,
      overlapsPay:overlaps(artguide, quickPay, 8),
      overlapsPlayer:overlaps(artguide, player, 8),
      overlapsDock:overlaps(artguide, dock, 8),
    };
  });
  assert(state.artguide && /AI|Artguide/i.test(state.artguide.text), `Artguide launcher missing before Live AI activation: ${JSON.stringify(state)}`);
  assert(state.artguide.width <= 58 && state.artguide.height <= 58 && !state.overlapsPay && !state.overlapsPlayer && !state.overlapsDock, `Artguide launcher should sit as a player-safe right-rail dot: ${JSON.stringify(state)}`);
  await page.evaluate(async () => {
    App.setAccount("riley_artist");
    App.go("home");
    App.playAlbum("alb1");
    App.setLiveAiControlMode("operate");
    App.liveAiRoom();
    await new Promise(resolve => setTimeout(resolve, 80));
    App.minimizeLiveAi("tap");
  });
  await page.waitForSelector("[data-ai-assistant-ui='floating-chat']", { state: "visible", timeout: 5000 });
  await page.waitForTimeout(220);
  state = await page.evaluate(() => {
    const rect = selector => {
      const el = document.querySelector(selector);
      if(!el) return null;
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if(style.display === "none" || style.visibility === "hidden" || r.width < 8 || r.height < 8) return null;
      return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height, text:el.innerText || el.getAttribute("aria-label") || "" };
    };
    const overlaps = (a,b,pad=8) => !!(a && b && a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad);
    const float = rect("[data-ai-assistant-ui='floating-chat']");
    const artguide = rect(".artguide-fab");
    const quickPay = rect(".quick-pay-fab");
    const player = rect(".mini-player");
    const dock = rect(".flow-dock");
    return {
      float, artguide, quickPay, player, dock,
      hostClass:document.querySelector("#app")?.className || "",
      overlapsPay:overlaps(float, quickPay, 8),
      overlapsPlayer:overlaps(float, player, 8),
      overlapsDock:overlaps(float, dock, 8),
    };
  });
  assert(/has-player/.test(state.hostClass) && state.float && state.quickPay && state.player && state.dock, `Live AI player-safe setup missing surfaces: ${JSON.stringify(state)}`);
  assert(!state.artguide, `Static Artguide launcher should hide while floating Live AI is active: ${JSON.stringify(state)}`);
  assert(state.float.width <= 330 && state.float.height <= 232, `Live AI floating chat should be compact on player screens: ${JSON.stringify(state)}`);
  assert(state.float.left > state.quickPay.right + 8, `Live AI floating chat should sit away from Pay Lens: ${JSON.stringify(state)}`);
  assert(!state.overlapsPay && !state.overlapsPlayer && !state.overlapsDock, `Live AI floating chat overlaps player payment controls: ${JSON.stringify(state)}`);
  await page.evaluate(() => App.collapseLiveAiFloat());
  await page.waitForSelector("[data-live-ai-dot]", { state: "visible", timeout: 5000 });
  await page.waitForTimeout(180);
  state = await page.evaluate(() => {
    const rect = selector => {
      const el = document.querySelector(selector);
      if(!el) return null;
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if(style.display === "none" || style.visibility === "hidden" || r.width < 8 || r.height < 8) return null;
      return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height, text:el.innerText || el.getAttribute("aria-label") || "" };
    };
    const overlaps = (a,b,pad=8) => !!(a && b && a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad);
    const dot = rect("[data-live-ai-dot]");
    const quickPay = rect(".quick-pay-fab");
    const player = rect(".mini-player");
    const dock = rect(".flow-dock");
    return {
      dot, quickPay, player, dock,
      overlapsPay:overlaps(dot, quickPay, 8),
      overlapsPlayer:overlaps(dot, player, 8),
      overlapsDock:overlaps(dot, dock, 8),
    };
  });
  assert(state.dot && /AI|operate|active/i.test(state.dot.text), `Live AI dot did not remain active after player-safe collapse: ${JSON.stringify(state)}`);
  assert(state.dot.width <= 58 && state.dot.height <= 58, `Live AI active dot should stay icon-sized: ${JSON.stringify(state)}`);
  assert(!state.overlapsPay && !state.overlapsPlayer && !state.overlapsDock, `Live AI active dot overlaps player payment controls: ${JSON.stringify(state)}`);
  await page.evaluate(() => { App.hideLiveAiFloat(); App.clearPlayer(); });
});

await step("sheet action cards swipe down without firing", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.chatOptions("musa");
  });
  await page.waitForSelector("#modal.on .chat-menu-grid .more-action", { state: "visible", timeout: 5000 });
  await dragModalSheetDownFrom("#modal.on .chat-menu-grid .more-action");
  const status = await page.evaluate(() => ({
    open: document.querySelector("#modal")?.classList.contains("on"),
    title: document.querySelector("#modal .sheet-head h2")?.textContent || "",
  }));
  assert(!status.open, `dragging from a sheet action card left a sheet open: ${status.title}`);
});

await step("Moto World sheet bars swipe down closed", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.demoAiWorldDesk();
  });
  await page.waitForSelector("#modal.on .handle", { state: "visible", timeout: 5000 });
  await dragModalSheetDownFrom("#modal.on .handle");
  let open = await page.evaluate(() => document.querySelector("#modal")?.classList.contains("on"));
  assert(!open, "swiping down on the Moto World handle did not close the sheet");

  await page.evaluate(() => App.demoAiWorldDesk());
  await page.waitForSelector("#modal.on .simple-focus-foot span", { state: "visible", timeout: 5000 });
  await dragModalSheetDownFrom("#modal.on .simple-focus-foot span");
  open = await page.evaluate(() => document.querySelector("#modal")?.classList.contains("on"));
  assert(!open, "swiping down on a Moto World compact bar did not close the sheet");

  await page.evaluate(() => App.demoAiWorldDesk());
  await page.waitForSelector("#modal.on .thread-meta span", { state: "visible", timeout: 5000 });
  await dragModalSheetDownFrom("#modal.on .thread-meta span", { resetScroll: false });
  open = await page.evaluate(() => document.querySelector("#modal")?.classList.contains("on"));
  assert(!open, "swiping down on a Moto World row metadata bar did not close the sheet");
});

await step("follows stay specific to each account", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.follow("musa");
  });
  await page.waitForTimeout(160);
  let state = await saved();
  assert(state.followingByAccount?.riley_biz?.musa, "business follow did not persist on business account");
  await page.evaluate(() => App.setAccount("riley_creator"));
  await page.waitForTimeout(160);
  state = await saved();
  assert(!state.followingByAccount?.riley_creator?.musa, "business follow leaked into creator account");
  assert(!state.following?.musa, "active creator following map inherited business follow");
  await page.evaluate(() => App.setAccount("riley_biz"));
  await page.waitForTimeout(160);
  state = await saved();
  assert(state.following?.musa, "business follow was lost after switching accounts");
});

await step("subscriptions and purchases stay specific to each account", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.confirmSubscribe("mv7");
  });
  await page.waitForTimeout(180);
  let state = await saved();
  let text = await visibleText();
  assert(text.includes("Subscribed content") && text.includes("Access unlocked"), "subscription confirmation did not open the subscribed content directly");
  assert((state.subscriptionsByAccount?.riley_artist || []).some(row => row.vault === "mv7"), "artist subscription did not persist on artist account");
  assert((state.purchasesByAccount?.riley_artist || []).some(label => /Harbour session notes/.test(label)), "artist purchase label did not persist on artist account");
  await page.evaluate(() => App.setAccount("riley_biz"));
  await page.waitForTimeout(160);
  state = await saved();
  assert(!(state.subscriptions || []).some(row => row.vault === "mv7"), "artist subscription leaked into business account");
  assert(!(state.purchases || []).some(label => /Harbour session notes/.test(label)), "artist purchase label leaked into business account");
  await page.evaluate(() => App.setAccount("riley_artist"));
  await page.waitForTimeout(160);
  state = await saved();
  assert((state.subscriptions || []).some(row => row.vault === "mv7"), "artist subscription was lost after switching accounts");

  await page.evaluate(() => App.subscriptionDesk("mv7"));
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(/Access passport/i.test(text) && /Content first/i.test(text) && /Open now/i.test(text), "subscribed series desk did not surface the access passport first");
  assert(text.includes("Open access"), "subscribed series desk did not expose an open-access action");
  assert(text.includes("Open subscribed content") && text.includes("Access desk"), "subscribed series desk did not put content opening before management");
  await page.evaluate(() => App.subscriptionAccessDesk("mv7"));
  await page.waitForTimeout(160);
  const accessActions = await page.evaluate(() => Array.from(document.querySelectorAll("#modal.on .subscription-access-actions .btn")).map(btn => btn.textContent.trim().replace(/\s+/g, " ")));
  assert(/Open subscribed content/i.test(accessActions[0] || ""), `subscription access desk did not make content opening the primary action: ${JSON.stringify(accessActions)}`);
  assert(accessActions.slice(1).some(label => /Refresh access|Cancel renewal|Leave free|Check trail|Resume renewal|Rejoin free/i.test(label)), `subscription access desk did not keep management secondary: ${JSON.stringify(accessActions)}`);
  await page.evaluate(() => App.itemDetails("mv7"));
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(text.includes("Already subscribed") && text.includes("Open subscribed content") && text.includes("Access desk"), "subscribed listing detail did not make re-entry obvious");
  await page.evaluate(() => App.openSubscriptionContent("mv7"));
  await page.waitForTimeout(160);
  text = await visibleText();
  state = await saved();
  assert(text.includes("Subscribed content") && text.includes("Access unlocked"), "open subscribed content flow did not show unlocked content");
  assert((state.subscriptionContentViews || []).some(row => row.vault === "mv7" && row.subscriber === "riley_artist"), "subscription content open did not save an access view");
});

await step("restricted media is web-only in Play Store launch and safety lab stays gated", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.subscribeVault("mv13");
  });
  await page.waitForTimeout(180);
  let text = await visibleText();
  assert(text.includes("Restricted media is web-only") && text.includes("Kenya Play Store pilot") && text.includes("No Android monetization"), "Play Store launch did not route restricted media to web-only");
  let state = await saved();
  assert(!(state.subscriptionsByAccount?.riley_artist || []).some(row => row.vault === "mv13"), "restricted media subscribed in Android launch profile");

  await page.evaluate(() => App.completeVerification("adult", "riley_artist"));
  await page.waitForTimeout(160);
  state = await saved();
  assert(state.identityAccounts?.riley_artist?.adult, "adult verification did not persist");
  await unlockFinance("riley_artist");
  await page.evaluate(() => {
    App.acceptAdultVaultWarning("mv13");
    App.confirmSubscribe("mv13");
    App.openAdultVaultViewer("mv13");
  });
  await page.waitForTimeout(220);
  text = await visibleText();
  state = await saved();
  assert(text.includes("Restricted media is web-only"), "adult verification still allowed Android restricted media flow");
  assert(!(state.subscriptionsByAccount?.riley_artist || []).some(row => row.vault === "mv13"), "restricted media subscription was created despite Android web-only boundary");
  assert(!(state.adultContentViews || []).some(row => row.vault === "mv13" && row.viewer === "riley_artist"), "restricted media viewer logged an Android content view");

  await page.evaluate(() => {
    App.setLaunchProfile("founder_lab");
    App.setAccount("riley_artist");
  });
  await unlockFinance("riley_artist");
  await page.evaluate(() => {
    App.acceptAdultVaultWarning("mv13");
    App.confirmSubscribe("mv13");
    App.openAdultVaultViewer("mv13");
  });
  await page.waitForTimeout(220);
  text = await visibleText();
  state = await saved();
  const sub = (state.subscriptionsByAccount?.riley_artist || []).find(row => row.vault === "mv13");
  assert(sub?.adultAccess && sub.watermark && sub.downloadsAllowed === false && sub.secureMode === true, "founder lab adult subscription missing protected access fields");
  assert(state.adultContentConsents?.["riley_artist:mv13"], "founder lab warning consent was not saved");
  assert((state.adultContentViews || []).some(row => row.vault === "mv13" && row.viewer === "riley_artist" && row.watermark), "founder lab protected viewer did not log watermark trail");
  assert(text.includes("Protected adult media preview") && text.includes("Download") && text.includes("Watermark") && text.includes("Report leak"), "founder lab protected viewer missing safety controls");
  const secure = await page.evaluate(() => document.documentElement.dataset.secureContent);
  assert(secure === "on", "founder lab protected viewer did not request secure content mode");
  await page.evaluate(() => App.reportAdultLeak("mv13"));
  await page.waitForTimeout(160);
  state = await saved();
  const adultLeakReport = (state.adultLeakReports || []).find(row => row.vault === "mv13" && row.status === "review_queue");
  assert(adultLeakReport && adultLeakReport.rawMediaStored === false && adultLeakReport.contentAction === "review_hold_recommended", "adult leak report was not queued as metadata-only restricted media safety");
  assert((state.supportIncidents || []).some(row => row.restrictedMediaReport === adultLeakReport.id && /metadata only/i.test(row.detail || "")), "adult leak support incident did not preserve metadata-only backend boundary");

  await page.evaluate(() => {
    App.setLaunchProfile("kenya_play_store");
    App.setAccount("riley_streamer");
    App.completeVerification("streamer", "riley_streamer");
    App.closeModal();
    App.createListing("vault");
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Restricted media is web-only") && !text.includes("18+ explicit/adult series"), "Android listing form exposed adult creator monetization");
  await page.evaluate(() => {
    document.getElementById("listingName").value = "Android Explicit Block";
    document.getElementById("listingPrice").value = "1500";
    document.getElementById("listingCategory").value = "Paid photos + videos";
    document.getElementById("listingDesc").value = "18+ explicit subscriber series with consent proof pending.";
    App.saveListing("vault");
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  state = await saved();
  assert(text.includes("Restricted media is web-only"), "Android explicit listing did not stop at web-only boundary");
  assert(!(state.customVaults || []).some(row => row.title === "Android Explicit Block"), "Android explicit listing was created");

  await page.evaluate(() => {
    App.setLaunchProfile("founder_lab");
    App.setAccount("riley_streamer");
    App.completeVerification("streamer", "riley_streamer");
    App.createListing("vault");
    document.getElementById("listingName").value = "Private Radius Lab";
    document.getElementById("listingPrice").value = "1500";
    document.getElementById("listingAudience").value = "adult";
    document.getElementById("listingCategory").value = "Paid photos + videos";
    document.getElementById("listingDesc").value = "18+ explicit subscriber series with consent proof pending.";
    App.saveListing("vault");
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  state = await saved();
  assert(text.includes("Full 18+ creator verification needed") && text.includes("Account-specific adult creator gate"), "adult creator gate did not require account-specific full verification");
  assert(!(state.customVaults || []).some(row => row.title === "Private Radius Lab"), "adult listing was created before full creator verification");

  await page.evaluate(() => {
    App.completeVerification("adult", "riley_streamer");
    App.createListing("vault");
    document.getElementById("listingName").value = "Private Radius Lab";
    document.getElementById("listingPrice").value = "1500";
    document.getElementById("listingAudience").value = "adult";
    document.getElementById("listingCategory").value = "Paid photos + videos";
    document.getElementById("listingDesc").value = "18+ explicit subscriber series with consent and watermark rules.";
    document.getElementById("adultLocalDiscovery").checked = false;
    document.getElementById("adultDiscoveryMode").value = "subscribers";
    document.getElementById("adultDiscoveryRadius").value = "12";
    document.getElementById("adultAllowedCities").value = "Nairobi, Lagos";
    document.getElementById("adultHiddenCities").value = "Adelaide";
    document.getElementById("adultDiscoveryNotes").value = "Direct subscribers only; no local discovery.";
    App.saveListing("vault");
  });
  await page.waitForTimeout(200);
  state = await saved();
  const adultCreated = (state.customVaults || []).find(row => row.title === "Private Radius Lab");
  assert(adultCreated?.adult && adultCreated.requiresAgeId && adultCreated.trustState === "review_hold", "verified adult creator listing did not save as protected review hold");
  assert(state.adultDiscoveryControls?.[adultCreated.id]?.localDiscovery === false && state.adultDiscoveryControls?.[adultCreated.id]?.mode === "subscribers", "adult discovery controls were not saved on the listing");

  await page.evaluate(id => App.subscriptionAccessDesk(id), adultCreated.id);
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(text.includes("Creator discovery controls") && text.includes("Local discovery off") && text.includes("12 km"), "owner access desk did not expose adult discovery radius controls");

  await page.evaluate(id => {
    App.setAccount("riley_artist");
    App.marketTab("vaults");
    App.go("market");
  }, adultCreated.id);
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(!text.includes("Private Radius Lab"), "local-off adult vault leaked into vault marketplace discovery for non-owner");

  await page.evaluate(() => {
    App.go("discover");
  });
  await page.waitForTimeout(180);
  let profileCards = await page.evaluate(() => [...document.querySelectorAll(".profile-card h3")].map(el => el.textContent || ""));
  assert(!profileCards.includes("Riley Live"), "adult creator profile leaked into local discovery after profile discovery was disabled");

  await page.evaluate(() => {
    App.setAccount("riley_streamer");
    App.go("discover");
  });
  await page.waitForTimeout(180);
  profileCards = await page.evaluate(() => [...document.querySelectorAll(".profile-card h3")].map(el => el.textContent || ""));
  assert(profileCards.includes("Riley Live"), "adult creator could not see their own profile after local discovery was disabled");
  await page.evaluate(() => {
    App.setLaunchProfile("kenya_play_store");
    App.closeModal();
  });
});

await step("theme modes and phone fit", async () => {
  await page.evaluate(() => {
    App.setMood("ocean");
    App.setMajorTheme("light");
    App.setMajorTheme("dark");
    App.deviceFitSettings();
  });
  await page.waitForTimeout(150);
  const state = await saved();
  assert(state.mood === "ocean", "ocean theme did not persist");
  assert(state.themeMode === "dark", "dark mode did not persist");
  assert((await visibleText()).includes("Phone fit"), "phone fit settings did not open");
  await page.evaluate(() => App.closeModal());
});

await step("moods switch full interface editions and motion", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  const inspectMood = async (mood) => {
    await page.evaluate((mood) => {
      App.closeModal();
      App.setAccount("riley_biz");
      App.setMood(mood);
      App.go("more");
    }, mood);
    await page.waitForTimeout(260);
    return page.evaluate(() => {
      document.querySelectorAll("details.tool-accordion").forEach(node => { node.open = true; });
      const read = (selector) => {
        const el = document.querySelector(selector);
        if(!el) return null;
        const style = getComputedStyle(el);
        return {
          radius: style.borderRadius,
          shadow: style.boxShadow,
          bg: style.backgroundImage,
          color: style.color,
          transform: style.transform,
          animation: style.animationName,
          borderWidth: style.borderTopWidth,
        };
      };
      const first = document.querySelector(".main > *");
      return {
        ui: document.documentElement.dataset.ui,
        mood: document.documentElement.dataset.mood,
        themeMode: document.documentElement.dataset.themeMode,
        top: read(".top.artbar") || read(".top"),
        dock: read(".flow-dock"),
        activeTab: read(".flow-dock .flow-tab.on") || read(".flow-dock .flow-tab.stroke"),
        first: first ? read(".main > *") : null,
        card: read(".menu-command-hero") || read(".more-action") || read(".theme-card"),
        text: document.body.innerText,
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      };
    });
  };
  const prism = await inspectMood("ocean");
  const canvas = await inspectMood("solar");
  const studio = await inspectMood("noir");
  assert(prism.ui === "prism", `ocean mood should use Prism UI, got ${prism.ui}`);
  assert(canvas.ui === "canvas", `solar mood should use Canvas UI, got ${canvas.ui}`);
  assert(studio.ui === "studio", `noir mood should use Studio UI, got ${studio.ui}`);
  assert(/Prism UI|Canvas UI|Studio UI/.test(canvas.text) && /Studio UI/.test(studio.text), "appearance cards do not explain the interface edition behind each theme");
  const fingerprints = [prism, canvas, studio].map(row => [row.top?.bg, row.dock?.bg, row.card?.shadow, row.card?.radius, row.card?.borderWidth, row.first?.animation].join("|"));
  assert(new Set(fingerprints).size === 3, `theme editions are still behaving like recolors: ${JSON.stringify(fingerprints)}`);
  assert(/prismRise/i.test(prism.first?.animation || ""), `Prism UI did not use its own entry motion: ${JSON.stringify(prism.first)}`);
  assert(/canvasPop/i.test(canvas.first?.animation || ""), `Canvas UI did not use its own entry motion: ${JSON.stringify(canvas.first)}`);
  assert(/studioSlide/i.test(studio.first?.animation || ""), `Studio UI did not use its own entry motion: ${JSON.stringify(studio.first)}`);
  assert(!/Dribbble/i.test(`${prism.text} ${canvas.text} ${studio.text}`), "product UI should not expose Dribbble as copied branding");
  assert(prism.overflow <= 2 && canvas.overflow <= 2 && studio.overflow <= 2, `interface edition switch introduced horizontal overflow: ${JSON.stringify({ prism: prism.overflow, canvas: canvas.overflow, studio: studio.overflow })}`);
  await page.evaluate(() => {
    App.setMood("ocean");
    App.setMajorTheme("dark");
    App.setUiEdition("prism");
    App.closeModal();
  });
});

await step("Reference OS is the default ground-up shell", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(key => localStorage.removeItem(key), KEY);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });
  const home = await page.evaluate(() => {
    const read = selector => {
      const el = document.querySelector(selector);
      if(!el) return null;
      const style = getComputedStyle(el);
      return {
        radius: style.borderRadius,
        bg: style.backgroundImage || style.backgroundColor,
        shadow: style.boxShadow,
        animation: style.animationName,
        width: Math.round(el.getBoundingClientRect().width),
        height: Math.round(el.getBoundingClientRect().height),
      };
    };
    return {
      ui: document.documentElement.dataset.ui,
      mood: document.documentElement.dataset.mood,
      themeMode: document.documentElement.dataset.themeMode,
      text: document.body.innerText,
      top: read(".top.artbar"),
      brand: read(".brand-home"),
      context: read(".top-context"),
      dock: read(".flow-dock"),
      selected: read(".flow-dock .flow-tab.on"),
      create: read(".flow-dock .flow-tab.stroke"),
      fab: read(".quick-pay-fab"),
      ai: read(".artguide-fab"),
      hero: read(".day-hero,.business-day-top,.visual-hero,.prism-v2-hero,.artist-os-hero"),
      first: read(".main > *"),
      statusCount: document.querySelectorAll(".prism-status-pill").length,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
  });
  assert(home.ui === "reference" && home.mood === "reference", `fresh app should boot into Reference OS, got ${JSON.stringify(home)}`);
  assert(!/Atlas/i.test(home.text), "old Atlas UI name is still visible in Reference OS");
  assert(parseFloat(home.brand?.radius || "0") >= 18 && parseFloat(home.context?.radius || "0") >= 18, `Reference top menu is not a modern command shell: ${JSON.stringify(home)}`);
  assert(parseFloat(home.dock?.radius || "0") >= 24 && /linear-gradient/i.test(home.dock?.bg || ""), `Reference bottom dock is not a modern floating dock: ${JSON.stringify(home)}`);
  assert(parseFloat(home.selected?.radius || "0") >= 16 && /linear-gradient/i.test(home.selected?.bg || ""), `Reference selected bottom tab is not visually clear: ${JSON.stringify(home)}`);
  assert(parseFloat(home.create?.radius || "0") >= 20 && /linear-gradient/i.test(home.create?.bg || ""), `Reference create action is not elevated: ${JSON.stringify(home)}`);
  assert(parseFloat(home.hero?.radius || "0") >= 28 && /referenceLift/i.test(home.first?.animation || ""), `Reference hero did not get the new layout/motion: ${JSON.stringify({ hero: home.hero, first: home.first })}`);
  assert(home.statusCount === 3, `Reference status context rail should stay concise: ${JSON.stringify(home)}`);
  assert(/linear-gradient/i.test(`${home.fab?.bg} ${home.ai?.bg}`) && home.fab?.bg !== home.ai?.bg, `Quick Pay and AI actions should have distinct roles: ${JSON.stringify({ fab: home.fab, ai: home.ai })}`);
  assert(home.overflow <= 2, `Reference OS home overflowed phone width: ${JSON.stringify(home)}`);

  await page.evaluate(() => {
    App.playAlbum("alb1");
    App.go("home");
  });
  await page.waitForSelector(".mini-player", { state: "visible", timeout: 5000 });
  const playerPayLens = await page.evaluate(() => {
    const fab = document.querySelector(".quick-pay-fab");
    const span = fab?.querySelector("span");
    const mini = document.querySelector(".mini-player");
    const dock = document.querySelector(".flow-dock");
    const fabRect = fab?.getBoundingClientRect();
    const miniRect = mini?.getBoundingClientRect();
    const dockRect = dock?.getBoundingClientRect();
    const fabStyle = fab ? getComputedStyle(fab) : null;
    const spanStyle = span ? getComputedStyle(span) : null;
    const overlapsMini = !!(fabRect && miniRect && fabRect.left < miniRect.right + 6 && fabRect.right > miniRect.left - 6 && fabRect.top < miniRect.bottom + 6 && fabRect.bottom > miniRect.top - 6);
    const overlapsDock = !!(fabRect && dockRect && fabRect.left < dockRect.right + 6 && fabRect.right > dockRect.left - 6 && fabRect.top < dockRect.bottom + 6 && fabRect.bottom > dockRect.top - 6);
    return {
      exists: !!fab,
      width: Math.round(fabRect?.width || 0),
      height: Math.round(fabRect?.height || 0),
      radius: fabStyle?.borderRadius || "",
      labelHidden: spanStyle?.display === "none",
      aria: fab?.getAttribute("aria-label") || "",
      miniVisible: !!mini,
      overlapsMini,
      overlapsDock,
      bottomGapToMini: miniRect && fabRect ? Math.round(miniRect.top - fabRect.bottom) : null,
    };
  });
  assert(playerPayLens.exists && playerPayLens.miniVisible && playerPayLens.width <= 64 && playerPayLens.height <= 64 && parseFloat(playerPayLens.radius || "0") >= 18 && playerPayLens.labelHidden && /Pay Lens/i.test(playerPayLens.aria) && !playerPayLens.overlapsMini && !playerPayLens.overlapsDock && playerPayLens.bottomGapToMini >= 6, `Pay Lens should collapse to a compact player-safe control: ${JSON.stringify(playerPayLens)}`);
  await page.evaluate(() => App.clearPlayer());
  await page.waitForTimeout(140);

  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.go("more");
  });
  await page.waitForTimeout(220);
  const menu = await page.evaluate(() => {
    document.querySelectorAll("details.tool-accordion").forEach(node => { node.open = true; });
    const card = document.querySelector(".more-action,.start-card,.menu-command-action");
    const grid = document.querySelector(".more-action-grid,.start-here-grid,.menu-command-actions");
    return {
      ui: document.documentElement.dataset.ui,
      text: document.body.innerText,
      cardRadius: card ? getComputedStyle(card).borderRadius : "",
      cardBg: card ? getComputedStyle(card).backgroundImage || getComputedStyle(card).backgroundColor : "",
      gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : "",
      refRows: document.querySelectorAll("[data-design-reference]").length,
      payLens: (() => {
        const fab = document.querySelector(".quick-pay-fab");
        const fabStyle = fab ? getComputedStyle(fab) : null;
        const fabRect = fab?.getBoundingClientRect();
        const action = document.querySelector("[data-pay-lens-menu-action]");
        const actionRect = action?.getBoundingClientRect();
        const actionStyle = action ? getComputedStyle(action) : null;
        const dock = document.querySelector(".flow-dock")?.getBoundingClientRect();
        return {
          fixedExists: !!fab,
          fixedHidden: !fab || fabStyle?.display === "none" || (fabRect?.width || 0) <= 1 || (fabRect?.height || 0) <= 1,
          actionExists: !!action,
          actionLabel: action?.textContent?.trim() || "",
          actionVisible: !!action && actionStyle?.display !== "none" && (actionRect?.width || 0) > 20 && (actionRect?.height || 0) > 20,
          actionTop: Math.round(actionRect?.top || 0),
          actionBottom: Math.round(actionRect?.bottom || 0),
          dockTop: Math.round(dock?.top || 0),
          dockClear: actionRect && dock ? actionRect.bottom <= dock.top - 8 : true,
        };
      })(),
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
  });
  assert(menu.ui === "reference" && menu.refRows >= 8 && /Reference OS|Tile OS|license clearly allows direct reuse/i.test(menu.text), `Reference design map is incomplete: ${JSON.stringify(menu)}`);
  assert(parseFloat(menu.cardRadius || "0") >= 20 && /linear-gradient|rgba/i.test(menu.cardBg), `Reference menu cards did not rebuild as bento surfaces: ${JSON.stringify(menu)}`);
  assert(/ /i.test(menu.gridColumns), `Reference menu grids did not become multi-column bento layouts: ${JSON.stringify(menu)}`);
  assert(menu.payLens.fixedHidden && menu.payLens.actionExists && menu.payLens.actionVisible && /Pay Lens/i.test(menu.payLens.actionLabel) && /Review first/i.test(menu.payLens.actionLabel) && /money stays blocked/i.test(menu.payLens.actionLabel) && menu.payLens.dockClear, `Reference menu Pay Lens action should be an in-flow safety card instead of an overlapping floating pill: ${JSON.stringify(menu.payLens)}`);
  assert(menu.overflow <= 2, `Reference OS menu overflowed phone width: ${JSON.stringify(menu)}`);

  await page.evaluate(() => {
    App.go("wallet");
    App.openPayLens();
  });
  await page.waitForSelector("#modal.on .quick-pay-sheet", { state: "visible", timeout: 5000 });
  const pay = await page.evaluate(() => {
    const sheet = document.querySelector("#modal.on .quick-pay-sheet");
    const hero = document.querySelector("#modal.on .quick-pay-hero");
    const option = document.querySelector("#modal.on .quick-pay-option");
    return {
      text: sheet?.innerText || "",
      heroBg: hero ? getComputedStyle(hero).backgroundImage || getComputedStyle(hero).backgroundColor : "",
      optionRadius: option ? getComputedStyle(option).borderRadius : "",
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
  });
  assert(/Pay in seconds|Upload an invoice|Choose a screenshot|Scan a QR code/i.test(pay.text), `Reference Quick Pay flow lost payment helper copy: ${JSON.stringify(pay)}`);
  assert(/linear-gradient/i.test(pay.heroBg) && parseFloat(pay.optionRadius || "0") >= 20, `Reference Quick Pay sheet did not use the new dark payment language: ${JSON.stringify(pay)}`);
  assert(pay.overflow <= 2, `Reference Quick Pay overflowed phone width: ${JSON.stringify(pay)}`);
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => {
    App.go("calendar");
    App.liveAiRoom("help me plan today's bookings");
  });
  await page.waitForSelector("#modal.on .live-ai-sheet", { state: "visible", timeout: 5000 });
  const ai = await page.evaluate(() => {
    const sheet = document.querySelector("#modal.on .live-ai-sheet");
    const hero = sheet?.querySelector(".ai-chat-top,.ai-control-hero,.live-ai-hero");
    return {
      text: sheet?.innerText || "",
      sheetBg: sheet ? getComputedStyle(sheet).backgroundImage || getComputedStyle(sheet).backgroundColor : "",
      heroRadius: hero ? getComputedStyle(hero).borderRadius : "",
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
  });
  assert(/Artguide Chat|Speak|Float|Control|Guide/i.test(ai.text), `Reference AI room lost its chat-first controls: ${JSON.stringify(ai)}`);
  assert(/linear-gradient/i.test(ai.sheetBg) && parseFloat(ai.heroRadius || "0") >= 22, `Reference AI surface did not use the new assistant language: ${JSON.stringify(ai)}`);
  assert(ai.overflow <= 2, `Reference AI sheet overflowed phone width: ${JSON.stringify(ai)}`);
  await page.evaluate(() => {
    App.closeModal();
    App.setMood("ocean");
    App.setMajorTheme("dark");
    App.setUiEdition("prism");
    App.go("home");
  });
});

await step("Tile OS maps Figma Community references into distinct app layouts", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.setMood("skyline");
    App.setMajorTheme("light");
    App.go("more");
  });
  await page.waitForTimeout(260);
  const appearance = await page.evaluate(() => {
    document.querySelectorAll("details.tool-accordion").forEach(node => { node.open = true; });
    const read = (selector) => {
      const el = document.querySelector(selector);
      if(!el) return null;
      const style = getComputedStyle(el);
      return {
        radius: style.borderRadius,
        minHeight: style.minHeight,
        bg: style.backgroundImage || style.backgroundColor,
        shadow: style.boxShadow,
        columns: style.gridTemplateColumns,
        animation: style.animationName
      };
    };
    return {
      ui: document.documentElement.dataset.ui,
      mood: document.documentElement.dataset.mood,
      text: document.body.innerText,
      themeCards: document.querySelectorAll(".theme-card").length,
      refRows: document.querySelectorAll("[data-design-reference]").length,
      action: read(".more-action"),
      navGrid: read(".more-nav-grid"),
      themeCard: read(".theme-card"),
      refGrid: read(".design-ref-grid"),
      first: read(".main > *"),
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
  });
  assert(appearance.ui === "tile" && appearance.mood === "skyline", `Sky Tile mood did not switch to Tile OS: ${JSON.stringify(appearance)}`);
  assert(/Tile OS UI/i.test(appearance.text), "Appearance theme cards do not expose Tile OS as a layout family");
  assert(appearance.refRows >= 8 && /Weather App UI Design|Calendar Mobile App|Preview-only E-wallet|EventHub event booking|Online Bike Shopping App|Social Media Templates|Interactive Journey Map|Dashboard templates|license clearly allows direct reuse/i.test(appearance.text), `Figma reference map is incomplete: ${appearance.text.slice(0, 700)}`);
  assert(parseFloat(appearance.action?.radius || "0") >= 28 && parseFloat(appearance.themeCard?.radius || "0") >= 28, `Tile OS cards are not using large button tiles: ${JSON.stringify(appearance)}`);
  assert(/tileFloat/i.test(appearance.first?.animation || ""), `Tile OS did not use its own motion: ${JSON.stringify(appearance.first)}`);
  assert(/ /i.test(appearance.navGrid?.columns || "") && / /i.test(appearance.refGrid?.columns || ""), `Tile OS reference/action grids did not become tiled grids: ${JSON.stringify(appearance)}`);
  assert(appearance.overflow <= 2, `Tile OS Appearance overflowed phone width: ${JSON.stringify(appearance)}`);

  await page.evaluate(() => App.go("calendar"));
  await page.waitForTimeout(180);
  const calendar = await page.evaluate(() => {
    const hero = document.querySelector(".booking-hero,.booking-command-panel,.prism-v2-hero");
    const surface = document.querySelector(".booking-kpi,.booking-panel,.tool-accordion");
    return {
      ui: document.documentElement.dataset.ui,
      heroRadius: hero ? getComputedStyle(hero).borderRadius : "",
      surfaceRadius: surface ? getComputedStyle(surface).borderRadius : "",
      text: document.body.innerText,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
  });
  assert(calendar.ui === "tile" && parseFloat(calendar.heroRadius) >= 34 && parseFloat(calendar.surfaceRadius) >= 26 && /Calendar|Booking|Schedule|Ticket/i.test(calendar.text), `Tile OS did not reshape the calendar/booking surface: ${JSON.stringify(calendar)}`);
  assert(calendar.overflow <= 2, `Tile OS calendar overflowed phone width: ${JSON.stringify(calendar)}`);

  await page.evaluate(() => App.go("wallet"));
  await page.waitForTimeout(180);
  const wallet = await page.evaluate(() => {
    const hero = document.querySelector(".pay-hero");
    const actions = document.querySelector(".pay-action-grid");
    return {
      ui: document.documentElement.dataset.ui,
      heroRadius: hero ? getComputedStyle(hero).borderRadius : "",
      columns: actions ? getComputedStyle(actions).gridTemplateColumns : "",
      text: document.body.innerText,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
  });
  assert(wallet.ui === "tile" && parseFloat(wallet.heroRadius) >= 34 && /Provider-led Pay|Finance locked|Pay Lens/i.test(wallet.text), `Tile OS did not reshape wallet finance: ${JSON.stringify(wallet)}`);
  assert(wallet.overflow <= 2, `Tile OS wallet overflowed phone width: ${JSON.stringify(wallet)}`);

  await page.evaluate(() => {
    App.setMood("ocean");
    App.setMajorTheme("dark");
    App.setUiEdition("prism");
    App.go("home");
    App.closeModal();
  });
});

await step("Prism theme keeps one brand while using modern shell navigation", async () => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.setMajorTheme("dark");
    App.setUiEdition("prism");
    App.go("calendar");
  });
  await page.waitForTimeout(220);
  const booking = await page.evaluate(() => {
    const cs = el => el ? getComputedStyle(el) : null;
    const body = cs(document.body);
    const app = cs(document.querySelector(".app.artbook-prism"));
    const top = cs(document.querySelector(".top.artbar"));
    const dock = cs(document.querySelector(".flow-dock"));
    const brand = cs(document.querySelector(".brand-home"));
    const context = cs(document.querySelector(".top-context"));
    const statusPill = cs(document.querySelector(".prism-status-pill"));
    const activeTab = cs(document.querySelector(".flow-dock .flow-tab.on")) || cs(document.querySelector(".flow-dock .flow-tab.stroke"));
    const createTab = cs(document.querySelector(".flow-dock .flow-tab.stroke"));
    const payFab = cs(document.querySelector(".quick-pay-fab"));
    const aiFab = cs(document.querySelector(".artguide-fab"));
    const rootStyle = getComputedStyle(document.documentElement);
    const primarySurface = document.querySelector(".booking-hero,.booking-panel,.tool-accordion");
    const guidedLayout = document.querySelector(".booking-layout,.booking-policy-grid,.booking-kpi-grid");
    const surface = cs(primarySurface);
    const layout = cs(guidedLayout);
    return {
      ui: document.documentElement.dataset.ui,
      appMounted: !!document.querySelector(".app.artbook-prism"),
      text: document.body.textContent || "",
      bodyBg: body?.backgroundImage || "",
      appBg: app?.backgroundImage || "",
      topBg: top?.backgroundColor || "",
      dockBg: dock?.backgroundColor || "",
      dockRadius: dock?.borderRadius || "",
      dockShadow: dock?.boxShadow || "",
      brandRadius: brand?.borderRadius || "",
      contextRadius: context?.borderRadius || "",
      statusPills: document.querySelectorAll(".prism-status-pill").length,
      statusRadius: statusPill?.borderRadius || "",
      activeTabBg: activeTab?.backgroundImage || "",
      activeTabColor: activeTab?.color || "",
      activeAria: document.querySelector(".flow-dock .flow-tab.on")?.getAttribute("aria-current") || "",
      palette: ["--ab-blue","--ab-teal","--ab-sun","--ab-coral","--ab-violet","--ab-leaf"].map(name => rootStyle.getPropertyValue(name).trim()),
      createBg: createTab?.backgroundImage || "",
      payBg: payFab?.backgroundImage || "",
      aiBg: aiFab?.backgroundImage || "",
      surfaceBg: surface?.backgroundColor || "",
      surfaceRadius: surface?.borderRadius || "",
      bookingCards: document.querySelectorAll(".booking-hero,.booking-panel,.booking-kpi,.booking-service-card,.tool-accordion").length,
      layoutColumns: layout?.gridTemplateColumns || "",
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
  });
  assert(booking.ui === "prism" && booking.appMounted, `Prism shell did not mount: ${JSON.stringify(booking)}`);
  assert(!/Atlas/i.test(booking.text), "old Atlas UI name is still visible in the app");
  assert(booking.bodyBg === "none" && booking.appBg === "none", `Prism shell should keep the deep background clean: ${JSON.stringify(booking)}`);
  assert(parseFloat(booking.brandRadius) >= 20 && parseFloat(booking.contextRadius) >= 20, `Prism top menu is not using the modern capsule shell: ${JSON.stringify(booking)}`);
  assert(parseFloat(booking.dockRadius) >= 28 && /rgba|rgb|color|linear-gradient/i.test(`${booking.dockBg} ${booking.dockShadow} ${booking.activeTabBg}`), `Prism bottom menu is not using the modern floating dock: ${JSON.stringify(booking)}`);
  assert(booking.statusPills === 3 && parseFloat(booking.statusRadius) >= 18, `Prism status rail lost its three compact context pills: ${JSON.stringify(booking)}`);
  assert(!booking.activeAria || /page/i.test(booking.activeAria), `active bottom tab uses an invalid aria-current value: ${JSON.stringify(booking)}`);
  assert(/rgb\(255,\s*255,\s*255\)/.test(booking.activeTabColor), `primary/active bottom tab is not visually clear: ${JSON.stringify(booking)}`);
  assert(new Set(booking.palette).size >= 6 && booking.palette.every(Boolean), `Prism palette roles are missing or too similar: ${JSON.stringify(booking.palette)}`);
  assert(/linear-gradient/i.test(`${booking.createBg} ${booking.payBg} ${booking.aiBg}`) && booking.createBg !== booking.payBg && booking.aiBg !== booking.payBg, `Prism color roles are not differentiated across create, finance and AI: ${JSON.stringify({create:booking.createBg,pay:booking.payBg,ai:booking.aiBg})}`);
  assert(parseFloat(booking.surfaceRadius) >= 20 && booking.bookingCards >= 2 && /Booking Desk|Schedule|Policy|Booking day command/i.test(booking.text), `booking surface did not get the guided Prism layout: ${JSON.stringify(booking)}`);
  assert(booking.overflow <= 2, `Prism booking layout overflowed phone width: ${JSON.stringify(booking)}`);

  await page.evaluate(() => App.openPayLens());
  await page.waitForSelector("#modal.on .quick-pay-sheet", { state: "visible", timeout: 5000 });
  const finance = await page.evaluate(() => {
    const sheet = document.querySelector("#modal.on .quick-pay-sheet");
    const option = document.querySelector("#modal.on .quick-pay-option");
    return {
      options: document.querySelectorAll("#modal.on .quick-pay-option").length,
      optionRadius: option ? getComputedStyle(option).borderRadius : "",
      text: sheet?.innerText || ""
    };
  });
  assert(finance.options >= 3 && parseFloat(finance.optionRadius) >= 24 && /Pay in seconds|Upload an invoice|Scan a QR code/.test(finance.text), `Pay Lens did not keep the finance helper layout: ${JSON.stringify(finance)}`);

  await page.evaluate(() => { App.closeModal(); App.go("delivery"); });
  await page.waitForTimeout(180);
  const courier = await page.evaluate(() => {
    const hero = document.querySelector(".courier-hero") || document.querySelector(".delivery-stage");
    const route = document.querySelector(".courier-route");
    return {
      heroRadius: hero ? getComputedStyle(hero).borderRadius : "",
      routeColumns: route ? getComputedStyle(route).gridTemplateColumns : "",
      text: document.body.textContent || ""
    };
  });
  assert(parseFloat(courier.heroRadius) >= 30 && /Package|Pickup|Delivery|Route/i.test(courier.text), `courier surface did not get the operational layout: ${JSON.stringify(courier)}`);

  await page.evaluate(() => { App.liveAiRoom(); App.minimizeLiveAi("test"); });
  await page.waitForSelector("[data-ai-assistant-ui='floating-chat'],[data-live-ai-dot]", { state: "visible", timeout: 5000 });
  const ai = await page.evaluate(() => {
    const float = document.querySelector("[data-ai-assistant-ui='floating-chat']");
    const dot = document.querySelector("[data-live-ai-dot]");
    const target = float || dot;
    return {
      floating: !!target,
      radius: target ? getComputedStyle(target).borderRadius : "",
      text: target?.innerText || ""
    };
  });
  assert(ai.floating && parseFloat(ai.radius) >= 29 && /AI|Artguide|Chat/i.test(ai.text), `Prism AI did not render as a movable assistant surface: ${JSON.stringify(ai)}`);
  await page.evaluate(() => { App.closeModal(); App.hideLiveAiFloat(); });
});

await step("Android wrapper allows user auto-rotate", async () => {
  assert(!/android:screenOrientation="portrait"/.test(nativeBuildScript), "native Android wrapper still locks the app to portrait");
  assert(/android:screenOrientation="fullUser"/.test(nativeBuildScript), "native Android wrapper should honor the user's auto-rotate setting");
  assert(/orientation\|screenSize\|smallestScreenSize\|screenLayout/.test(nativeBuildScript), "native Android wrapper should deliver orientation and screen-size changes to the WebView");
  assert(/android\.permission\.RECORD_AUDIO/.test(nativeBuildScript), "native Android wrapper should request microphone permission for Live AI voice chat");
  assert(/onPermissionRequest/.test(nativeBuildScript) && /RESOURCE_AUDIO_CAPTURE/.test(nativeBuildScript), "native Android wrapper should grant WebView audio capture only through runtime permission");
  assert(/TextToSpeech/.test(nativeBuildScript) && /public void speak/.test(nativeBuildScript), "native Android wrapper should provide Live AI talkback when WebView speech synthesis is missing");
});

await step("global backdrop stays clean glass without grid lines", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.go("home");
  });
  await page.waitForTimeout(160);
  const samples = await page.evaluate(() => {
    const html = document.documentElement;
    const originalUi = html.dataset.ui || "";
    const readBackdrop = (ui) => {
      html.dataset.ui = ui;
      const app = document.querySelector(".app");
      const main = document.querySelector(".main");
      const probeCard = document.createElement("div");
      const probeSheet = document.createElement("div");
      probeCard.className = "card";
      probeSheet.className = "sheet";
      probeCard.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:120px;height:80px;pointer-events:none";
      probeSheet.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:120px;height:80px;pointer-events:none";
      document.body.append(probeCard, probeSheet);
      const statusStrip = document.querySelector(".prism-status-strip");
      const statusStyle = statusStrip ? getComputedStyle(statusStrip) : null;
      const appStyle = app ? getComputedStyle(app) : null;
      const beforeStyle = app ? getComputedStyle(app, "::before") : null;
      const sample = {
        ui,
        appBg: appStyle ? appStyle.backgroundImage : "",
        appBgColor: appStyle ? appStyle.backgroundColor : "",
        mainBg: main ? getComputedStyle(main).backgroundImage : "",
        bodyBg: getComputedStyle(document.body).backgroundImage,
        bodyBgColor: getComputedStyle(document.body).backgroundColor,
        appBeforeBg: beforeStyle ? beforeStyle.backgroundImage : "",
        appBeforeDisplay: beforeStyle ? beforeStyle.display : "",
        probeCardBg: getComputedStyle(probeCard).backgroundImage,
        probeSheetBg: getComputedStyle(probeSheet).backgroundImage,
        appBorderLeft: appStyle ? appStyle.borderLeftWidth : "",
        appBorderRight: appStyle ? appStyle.borderRightWidth : "",
        statusStripBg: statusStyle ? statusStyle.backgroundImage : "",
        statusStripBorderBottom: statusStyle ? statusStyle.borderBottomWidth : "",
        prismGrid: getComputedStyle(html).getPropertyValue("--prism-grid").trim(),
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      };
      probeCard.remove();
      probeSheet.remove();
      return sample;
    };
    const modes = Array.from(new Set([originalUi || "prism", "prism", "studio", "canvas", "classic"]));
    const rows = modes.map(readBackdrop);
    if(originalUi) html.dataset.ui = originalUi;
    else delete html.dataset.ui;
    return rows;
  });
  for(const backdrop of samples){
    const joined = `${backdrop.appBg} ${backdrop.mainBg} ${backdrop.bodyBg} ${backdrop.appBeforeBg} ${backdrop.probeCardBg} ${backdrop.probeSheetBg} ${backdrop.prismGrid}`;
    assert(!/repeating-linear-gradient/.test(joined), `${backdrop.ui} deep backdrop still contains line/grid pattern`);
    assert(!/1px,\s*transparent 1px|0 1px,\s*transparent 1px|0px,\s*rgba\([^)]+\)\s*1px/.test(joined), `${backdrop.ui} deep backdrop still contains one-pixel grid stops`);
    assert(backdrop.appBg === "none", `${backdrop.ui} deepest app backdrop should be a flat matte glass color, not a banding-prone image: ${backdrop.appBg}`);
    assert(backdrop.bodyBg === "none", `${backdrop.ui} body backdrop should be flat and free of banding images: ${backdrop.bodyBg}`);
    assert(!/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/i.test(backdrop.appBgColor), `${backdrop.ui} clean glass app backdrop color is transparent`);
    assert(!/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/i.test(backdrop.bodyBgColor), `${backdrop.ui} clean glass body backdrop color is transparent`);
    assert(backdrop.mainBg === "none" || !/repeating-linear-gradient|1px/.test(backdrop.mainBg), `${backdrop.ui} main background is not smooth: ${backdrop.mainBg}`);
    assert((parseFloat(backdrop.appBorderLeft) || 0) <= 0 && (parseFloat(backdrop.appBorderRight) || 0) <= 0, `${backdrop.ui} app shell still has visible side edge lines`);
    if(backdrop.statusStripBg) assert(!/repeating-linear-gradient|1px/.test(backdrop.statusStripBg), `${backdrop.ui} status strip is drawing a lined backplate`);
    if(backdrop.ui === "prism") assert((parseFloat(backdrop.statusStripBorderBottom) || 0) <= 0, "prism launch strip still draws a horizontal background line");
    assert(backdrop.overflow <= 2, `${backdrop.ui} clean glass backdrop introduced horizontal overflow`);
  }
});

await step("automatic screen fit responds to size changes", async () => {
  await page.setViewportSize({ width: 360, height: 720 });
  await page.waitForTimeout(260);
  let fit = await page.evaluate(() => ({
    fit: document.documentElement.dataset.fit,
    orientation: document.documentElement.dataset.orientation,
    cardMin: getComputedStyle(document.documentElement).getPropertyValue("--fit-card-min").trim(),
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    app: (() => {
      const rect = document.querySelector(".app")?.getBoundingClientRect();
      return rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), height: Math.round(rect.height) } : null;
    })(),
    dock: (() => {
      const rect = document.querySelector(".flow-dock")?.getBoundingClientRect();
      return rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), height: Math.round(rect.height) } : null;
    })(),
  }));
  assert(fit.fit === "compact", `expected compact phone fit, got ${fit.fit}`);
  assert(fit.orientation === "portrait", "compact viewport should be portrait");
  assert(fit.cardMin.endsWith("px"), "fit card min CSS variable missing");
  assert(fit.overflow <= 2, "compact fit introduced horizontal overflow");
  assert(fit.app && fit.app.left >= -1 && fit.app.right <= fit.viewportWidth + 1 && fit.app.height <= fit.viewportHeight + 1, `compact app shell does not fit viewport: ${JSON.stringify(fit.app)}`);
  assert(fit.dock && fit.dock.left >= -1 && fit.dock.right <= fit.viewportWidth + 1, `compact dock does not fit viewport: ${JSON.stringify(fit.dock)}`);

  await page.evaluate(() => App.deviceFitSettings());
  await page.waitForTimeout(160);
  let sheetFit = await page.evaluate(() => {
    const sheet = document.querySelector("#modal.on .sheet");
    const rect = sheet?.getBoundingClientRect();
    return {
      open: Boolean(sheet),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      rect: rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), height: Math.round(rect.height), bottom: Math.round(rect.bottom) } : null,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  });
  assert(sheetFit.open, "phone fit sheet did not open");
  assert(sheetFit.rect.left >= -1 && sheetFit.rect.right <= sheetFit.viewportWidth + 1, `phone fit sheet is wider than viewport: ${JSON.stringify(sheetFit.rect)}`);
  assert(sheetFit.rect.height <= sheetFit.viewportHeight + 1 && sheetFit.rect.bottom <= sheetFit.viewportHeight + 1, `phone fit sheet is taller than viewport: ${JSON.stringify(sheetFit.rect)}`);
  assert(sheetFit.overflow <= 2, "phone fit sheet introduced horizontal overflow");
  await page.evaluate(() => App.closeModal());

  await page.setViewportSize({ width: 320, height: 640 });
  await page.waitForTimeout(280);
  fit = await page.evaluate(() => ({
    fit: document.documentElement.dataset.fit,
    density: document.documentElement.dataset.fitDensity,
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    viewportWidth: window.innerWidth,
    app: (() => {
      const rect = document.querySelector(".app")?.getBoundingClientRect();
      return rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) } : null;
    })(),
    dock: (() => {
      const rect = document.querySelector(".flow-dock")?.getBoundingClientRect();
      return rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) } : null;
    })(),
    overflowRepair: document.documentElement.dataset.fitOverflow,
  }));
  assert(fit.fit === "compact", `expected very narrow phone to stay compact, got ${fit.fit}`);
  assert(fit.density === "very-narrow", `expected very narrow density marker, got ${fit.density}`);
  assert(fit.app && fit.app.left >= -1 && fit.app.right <= fit.viewportWidth + 1, `very narrow app shell does not fit viewport: ${JSON.stringify(fit.app)}`);
  assert(fit.dock && fit.dock.left >= -1 && fit.dock.right <= fit.viewportWidth + 1, `very narrow dock does not fit viewport: ${JSON.stringify(fit.dock)}`);
  assert(fit.overflow <= 2, `very narrow fit introduced horizontal overflow (${fit.overflow}, repair ${fit.overflowRepair})`);

  await page.setViewportSize({ width: 820, height: 620 });
  await page.waitForTimeout(260);
  fit = await page.evaluate(() => ({
    fit: document.documentElement.dataset.fit,
    orientation: document.documentElement.dataset.orientation,
    density: document.documentElement.dataset.fitDensity,
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    viewportWidth: window.innerWidth,
    app: (() => {
      const rect = document.querySelector(".app")?.getBoundingClientRect();
      return rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) } : null;
    })(),
    dock: (() => {
      const rect = document.querySelector(".flow-dock")?.getBoundingClientRect();
      return rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) } : null;
    })(),
  }));
  assert(fit.fit === "tablet", `expected tablet/landscape fit, got ${fit.fit}`);
  assert(fit.orientation === "landscape", "wide viewport should be landscape");
  assert(/tablet|large-phone|phone/.test(fit.density || ""), "fit density marker missing");
  assert(fit.overflow <= 2, "landscape fit introduced horizontal overflow");
  assert(fit.app && fit.app.left >= -1 && fit.app.right <= fit.viewportWidth + 1, `tablet app shell does not fit viewport: ${JSON.stringify(fit.app)}`);
  assert(fit.dock && fit.dock.left >= -1 && fit.dock.right <= fit.viewportWidth + 1, `tablet dock does not fit viewport: ${JSON.stringify(fit.dock)}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(180);
});

await step("landscape business artist and delivery surfaces stay inside phone shell", async () => {
  await page.setViewportSize({ width: 820, height: 430 });
  await page.waitForTimeout(260);
  const inspect = async (label, setup) => {
    await page.evaluate(setup);
    await page.waitForTimeout(260);
    return page.evaluate(label => {
      const rectOf = selector => {
        const el = document.querySelector(selector);
        if(!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          overflowX: getComputedStyle(el).overflowX,
          overflowY: getComputedStyle(el).overflowY,
        };
      };
      return {
        label,
        fit: document.documentElement.dataset.fit,
        orientation: document.documentElement.dataset.orientation,
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        app: rectOf(".app"),
        main: rectOf(".main"),
        dock: rectOf(".flow-dock"),
        sheet: rectOf("#modal.on .sheet"),
        frameWrap: rectOf(".frame-strip-wrap"),
        frameStrip: rectOf(".frame-strip"),
        storyFrame: rectOf(".story-frame-view"),
      };
    }, label);
  };
  const rows = [
    await inspect("business landscape", () => { App.setAccount("riley_biz"); App.go("home"); }),
    await inspect("business delivery sheet landscape", () => { App.setAccount("riley_biz"); App.deliverySheet(); }),
    await inspect("business package form landscape", () => { App.setAccount("riley_biz"); App.sendPackageDesk(); }),
    await inspect("artist landscape", () => { App.closeModal(); App.setAccount("riley_creator"); App.go("home"); }),
    await inspect("artist frame modal landscape", () => { App.followingDesk(); }),
  ];
  for(const row of rows){
    assert(row.fit === "tablet" && row.orientation === "landscape", `${row.label} did not use landscape tablet fit: ${JSON.stringify(row)}`);
    assert(row.overflow <= 2, `${row.label} introduced horizontal overflow: ${row.overflow}`);
    assert(row.app && row.app.left >= -1 && row.app.right <= row.viewportWidth + 1 && row.app.height <= row.viewportHeight + 1, `${row.label} app shell escaped viewport: ${JSON.stringify(row.app)}`);
    assert(row.dock && row.dock.left >= -1 && row.dock.right <= row.viewportWidth + 1, `${row.label} dock escaped viewport: ${JSON.stringify(row.dock)}`);
    if(row.sheet) assert(row.sheet.left >= -1 && row.sheet.right <= row.viewportWidth + 1 && row.sheet.height <= row.viewportHeight + 1, `${row.label} sheet escaped viewport: ${JSON.stringify(row.sheet)}`);
    if(row.frameWrap) assert(row.frameWrap.right <= row.app.right + 1 && row.frameWrap.overflowX === "hidden", `${row.label} frame rail wrapper does not clip inside app shell: ${JSON.stringify(row.frameWrap)}`);
    if(row.frameStrip) assert(row.frameStrip.right <= row.app.right + 1 && /auto|scroll/.test(row.frameStrip.overflowX || ""), `${row.label} frame rail is not contained as a horizontal scroller: ${JSON.stringify(row.frameStrip)}`);
    if(row.storyFrame) assert(row.storyFrame.height <= row.viewportHeight - 16, `${row.label} story frame is too tall for landscape: ${JSON.stringify(row.storyFrame)}`);
  }
  await page.evaluate(() => App.closeModal());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(180);
});

await step("freelancer jobs keep verified real names but isolate private content", async () => {
  const title = "QA creator studio safety repair";
  await page.evaluate(jobTitle => {
    App.setAccount("riley_creator");
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = jobTitle;
    document.getElementById("fundiJobCategory").value = "Photography";
    document.getElementById("fundiJobBudget").value = "3900";
    document.getElementById("fundiJobLocality").value = "Westlands studio area";
    document.getElementById("fundiJobDue").value = "Friday 10:00";
    document.getElementById("fundiJobUrgency").value = "Privacy";
    document.getElementById("fundiJobDetails").value = "Repair a creator studio light near subscriber media storage. No private content or profile media should be visible from this job.";
    App.saveFundiJob();
  }, title);
  await page.waitForTimeout(180);

  await page.evaluate(({ key, title }) => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiBid(job.id, "kariokor_threads");
    App.fundiSafetyDesk(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(180);
  let text = await visibleText();
  let state = await saved();
  let job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job?.privacy?.mode === "real_names_content_isolated", "freelancer privacy mode did not use real-name content isolation");
  assert(job.privacy.sensitive === true, "creator/privacy-sensitive freelancer job was not flagged");
  assert(text.includes("Riley Vibes") && text.includes("Kariokor Threads"), "freelancer safety view should keep profile/work names visible");
  assert(text.includes("verified legal-name layer") || text.includes("real name:"), "freelancer safety view did not explain verified real-name identity");
  assert(text.includes("content isolated") && text.includes("No content crossover"), "freelancer safety view did not explain private content isolation");
  assert(!text.includes("After Dark verified vault"), "freelancer job detail leaked adult/subscriber vault content");

  await page.evaluate(({ key, title }) => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const job = (stored.fundiJobs || []).find(row => row.title === title);
    App.consentFundiSiteReveal(job.id);
    App.setAccount("kariokor_threads");
    App.consentFundiSiteReveal(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(180);
  state = await saved();
  job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job.privacy.siteReveal.client && job.privacy.siteReveal.fundi, "both sides did not record site handoff consent");
  assert(!/Site handoff ready/.test((job.events || []).map(row => row.label).join(" ")), "site handoff became ready before agreement and escrow funding");
  text = await visibleText();
  assert(text.includes("still needs agreement and escrow") || text.includes("site gated"), "site handoff should remain gated before funding");
});

await step("freelancer jobs support remote pickup messenger and transporter modes", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.go("jobs");
  });
  await page.waitForTimeout(180);
  let text = await visibleText();
  let state = await saved();
  assert(/freelancer marketplace/i.test(text) && /remote/i.test(text) && /pickup/i.test(text) && /transporter/i.test(text), "freelancer desk did not show broadened work modes");
  const seeds = state.fundiJobs || [];
  assert(seeds.some(job => job.workMode === "remote" && /software/i.test(job.category || "")), "remote software freelancer seed missing");
  assert(seeds.some(job => job.workMode === "pickup" && /hardware/i.test(job.category || "")), "hardware pickup freelancer seed missing");
  assert(seeds.some(job => job.workMode === "transporter" && /Kisii to Nairobi/i.test(job.locality || "")), "intercity transporter seed missing");

  const title = "QA Kisii parcel transporter";
  await page.evaluate(jobTitle => {
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = jobTitle;
    document.getElementById("fundiJobCategory").value = "Transporter / long haul";
    document.getElementById("fundiJobMode").value = "transporter";
    document.getElementById("fundiJobBudget").value = "8700";
    document.getElementById("fundiJobLocality").value = "Kisii to Nairobi";
    document.getElementById("fundiJobPickup").value = "Kisii hardware depot";
    document.getElementById("fundiJobDropoff").value = "Nairobi workshop";
    document.getElementById("fundiJobDetails").value = "Transport boxed fittings with pickup photo, route update, drop-off PIN and customer approval.";
    App.saveFundiJob();
  }, title);
  await page.waitForTimeout(180);
  state = await saved();
  const job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job?.workMode === "transporter", "posted transporter job did not keep transporter mode");
  assert(job.route?.from === "Kisii hardware depot" && job.route?.to === "Nairobi workshop", "transporter job did not keep pickup/drop-off route");
  assert((job.proofRequired || []).some(row => /route update/i.test(row)) && (job.proofRequired || []).some(row => /drop-off PIN/i.test(row)), "transporter job did not require route and drop-off proof");
});

await step("AI stock intake can be disabled while manual intake still works", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.go("register", false, { registerTab: "ops" });
  });
  await page.waitForTimeout(180);
  let text = await visibleText();
  assert(text.includes("AI stock intake") && text.includes("Register operations"), "register ops did not expose AI stock intake");

  await page.evaluate(() => App.stockIntakeAssistant());
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(text.includes("AI stock intake assistant") && text.includes("AI stock privacy boundary") && text.includes("Manual intake"), "stock assistant missing AI/privacy/manual sections");
  const stockDeskLayout = await page.evaluate(() => {
    const q = selector => document.querySelector(selector);
    const rect = node => node ? node.getBoundingClientRect() : null;
    const hero = q('[data-ai-assistant-ui="stock-intake"]');
    const manual = q('[data-stock-manual-card]');
    const cameraDrawer = q('[data-stock-camera-drawer]');
    const reorderDrawer = q('[data-stock-reorder-drawer]');
    const privacyDrawer = q('[data-stock-privacy-drawer]');
    const auditDrawer = q('[data-stock-audit-drawer]');
    const brief = q('.stock-intake-brief');
    const sheet = q('#modal.on .sheet');
    const heroRect = rect(hero);
    const manualRect = rect(manual);
    return {
      compact: hero?.classList.contains("stock-intake-compact") || false,
      heroHeight: heroRect ? Math.round(heroRect.height) : 0,
      manualTop: manualRect ? Math.round(manualRect.top) : 9999,
      manualVisible: !!manual && manualRect && manualRect.top < window.innerHeight - 120,
      brief: !!brief,
      cameraClosed: !!cameraDrawer && !cameraDrawer.open,
      reorderClosed: !!reorderDrawer && !reorderDrawer.open,
      privacyClosed: !!privacyDrawer && !privacyDrawer.open,
      auditClosed: !!auditDrawer && !auditDrawer.open,
      sheetHeight: sheet ? Math.round(sheet.getBoundingClientRect().height) : 0,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  });
  assert(stockDeskLayout.compact && stockDeskLayout.brief && stockDeskLayout.heroHeight <= 220 && stockDeskLayout.manualVisible && stockDeskLayout.cameraClosed && stockDeskLayout.reorderClosed && stockDeskLayout.privacyClosed && stockDeskLayout.auditClosed && stockDeskLayout.overflow <= 2, `stock assistant did not open as a compact manual-first AI surface: ${JSON.stringify(stockDeskLayout)}`);

  await page.evaluate(() => App.scanStockIntakeDemo());
  await page.waitForTimeout(180);
  let state = await saved();
  const draftRow = state.stockIntakeDraft?.rows?.[0];
  assert(draftRow?.item && Number.isFinite(Number(draftRow.detectedQty)), "AI stock scan did not create a usable draft row");
  assert((state.stockIntakeAudits || []).some(row => row.source === "AI suggestion only" && row.privacy), "AI scan did not write a suggestion-only audit row");

  await page.evaluate(() => App.applyStockIntakeDraft(0));
  await page.waitForTimeout(180);
  state = await saved();
  assert(Number(state.inventory?.[draftRow.item]) === Number(draftRow.detectedQty), "AI-applied stock count did not update inventory");
  assert((state.stockIntakeAudits || []).some(row => row.item === draftRow.item && row.source === "AI camera count applied" && row.aiEnabled === true), "AI-applied stock count missing audit trail");

  const manualCount = Number(draftRow.detectedQty) + 2;
  await page.evaluate(({ item, count }) => {
    App.setAiAssist(false, "stock");
    document.getElementById("stockIntakeItem").value = item;
    document.getElementById("stockIntakeCount").value = String(count);
    document.getElementById("stockIntakeReason").value = "Opening count";
    document.getElementById("stockIntakeNote").value = "Manual count saved after turning AI off.";
    App.saveStockIntake();
  }, { item: draftRow.item, count: manualCount });
  await page.waitForTimeout(180);
  text = await visibleText();
  state = await saved();
  assert(state.settings?.aiAssist === false, "AI assistant did not stay disabled");
  assert(Number(state.inventory?.[draftRow.item]) === manualCount, "manual stock intake did not work while AI was disabled");
  assert(text.includes("AI is off") && text.includes("Manual intake"), "AI-off stock desk did not keep the manual workflow visible");
  assert((state.stockIntakeAudits || []).some(row => row.item === draftRow.item && row.source === "manual intake with AI off" && row.aiEnabled === false), "manual AI-off stock intake missing audit trail");

  await page.evaluate(item => App.inventoryDesk(item), draftRow.item);
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(text.includes("Movement history") && text.includes("manual intake with AI off"), "item stock desk did not expose movement history");
  assert(text.includes("Reorder plan") && text.includes("Create supplier PO"), "item stock desk did not expose supplier reorder controls");

  await page.evaluate(item => {
    document.getElementById("inventoryCount").value = "1";
    document.getElementById("inventoryReorderPoint").value = "3";
    document.getElementById("inventoryRestockTarget").value = "12";
    document.getElementById("inventorySupplier").value = "Kilimani Beauty Supply";
    document.getElementById("inventoryProofNote").value = "QA supplier invoice and delivery photo required.";
    App.createStockPurchaseOrder(item);
  }, draftRow.item);
  await page.waitForTimeout(180);
  state = await saved();
  const po = (state.stockPurchaseOrders || []).find(row => row.item === draftRow.item && row.status === "draft");
  assert(po?.supplier === "Kilimani Beauty Supply" && po.qty > 0, "supplier purchase order draft was not created from stock desk");
  assert((state.stockIntakeAudits || []).some(row => row.item === draftRow.item && row.po === po.id && row.source === "Supplier purchase order drafted"), "supplier PO draft missing stock audit row");
  text = await visibleText();
  assert(text.includes("Supplier orders") && text.includes("draft"), "stock desk did not show supplier PO draft");
  await page.evaluate(id => App.markStockPurchaseOrderOrdered(id), po.id);
  await page.waitForTimeout(140);
  await page.evaluate(id => App.stockPurchaseOrderReceiveDesk(id), po.id);
  await page.waitForTimeout(140);
  text = await visibleText();
  assert(text.includes("Receive supplier order") && text.includes("Only accepted units increase sellable stock") && text.includes("Damaged or missing units open a supplier exception"), "supplier receiving desk did not expose partial/damaged receiving rules");
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => App.setAiAssist(true, "stock"));
  await page.waitForTimeout(120);
});

await step("fundi jobs post bid agreement room escrow proof and seal", async () => {
  const title = "QA sink repair and repaint";
  await page.evaluate(() => {
    App.setAccount("riley_creator");
    App.go("jobs");
  });
  await page.waitForTimeout(160);
  let desk = await page.evaluate(() => ({
    text: document.body.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(/freelancer marketplace/i.test(desk.text) && desk.text.includes("Customer rooms"), "Freelancer Jobs desk did not render the marketplace and room language");
  assert(desk.overflow <= 2, "Freelancer Jobs desk introduced horizontal overflow");
  const roomsGate = await page.evaluate(() => {
    App.fundiJobTab("rooms");
    const cards = Array.from(document.querySelectorAll(".fundi-room-card"));
    return {
      count: cards.length,
      strips: cards.map(card => card.querySelector("[data-fundi-agreement-strip]")?.textContent?.trim().replace(/\s+/g, " ") || ""),
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  });
  assert(roomsGate.count >= 1, "Freelancer customer rooms tab did not show rooms");
  assert(roomsGate.strips.every(text => /Agreement strip/.test(text) && /Customer signature/.test(text) && /Freelancer signature/.test(text) && /Escrow/.test(text) && /Price/.test(text) && /Scope/.test(text) && /Proof/.test(text)), `Freelancer room cards did not put the agreement gate at the top: ${JSON.stringify(roomsGate.strips)}`);
  assert(roomsGate.overflow <= 2, "Freelancer customer rooms introduced horizontal overflow");

  await page.evaluate(jobTitle => {
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = jobTitle;
    document.getElementById("fundiJobCategory").value = "Repair";
    document.getElementById("fundiJobBudget").value = "4100";
    document.getElementById("fundiJobLocality").value = "Westlands";
    document.getElementById("fundiJobDue").value = "Tomorrow 11:00";
    document.getElementById("fundiJobDuration").value = "4";
    document.getElementById("fundiJobDetails").value = "Leak check, repaint corner, before and after photos, customer approval.";
    App.saveFundiJob();
  }, title);
  await page.waitForTimeout(180);

  await page.evaluate(({ key, title }) => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiBid(job.id, "kariokor_threads");
  }, { key: KEY, title });
  await page.waitForTimeout(160);

  await page.evaluate(({ key, title }) => {
    let stored = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (stored.fundiJobs || []).find(row => row.title === title);
    const bid = (job.bids || []).find(row => row.fundi === "kariokor_threads") || job.bids[0];
    App.acceptFundiBid(job.id, bid.id);
    App.fundiStartJob(job.id);
    const blocked = (JSON.parse(localStorage.getItem(key) || "{}").fundiJobs || []).find(row => row.title === title);
    if (blocked.status !== "terms_pending") throw new Error("fundi job started before both sides agreed terms");
    App.fundiJobDetail(job.id);
    const agreementText = document.body.textContent || "";
    if (!agreementText.includes("Agreement strip - Agreement needed") || !agreementText.includes("Before work starts") || !agreementText.includes("Price") || !agreementText.includes("Scope") || !agreementText.includes("Proof")) {
      throw new Error("fundi job detail did not pin agreement strip before work start");
    }
    const cockpitText = document.querySelector("[data-fundi-cockpit]")?.textContent || "";
    if (!/job cockpit/i.test(cockpitText) || !/customer room/i.test(cockpitText) || !/provider escrow preview/i.test(cockpitText) || !/private content isolated/i.test(cockpitText)) {
      throw new Error("fundi job detail did not render the premium job cockpit with room, privacy and escrow cues");
    }
    if (!document.querySelector(".fundi-room-card[id^='fundiRoom_']")) {
      throw new Error("fundi customer room is missing a scroll target anchor");
    }
    const roomStrip = document.querySelector(".fundi-room-card [data-fundi-agreement-strip]")?.textContent || "";
    if (!roomStrip.includes("Agreement strip") || !roomStrip.includes("Customer signature") || !roomStrip.includes("Freelancer signature") || !roomStrip.includes("Escrow")) {
      throw new Error("customer room did not keep the agreement strip visible");
    }
    App.setAccount("kariokor_threads");
    App.confirmFundiAgreement(job.id);
    App.fundiStartJob(job.id);
    const fundingBlocked = (JSON.parse(localStorage.getItem(key) || "{}").fundiJobs || []).find(row => row.title === title);
    if (fundingBlocked.status !== "funding_pending") throw new Error("fundi job started before escrow funding");
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    App.setAccount("kariokor_threads");
    App.fundiStartJob(job.id);
    App.fundiSubmitProof(job.id);
    App.setAccount("riley_creator");
    App.approveFundiJob(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(220);

  let state = await saved();
  let job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job, "posted fundi job missing from state");
  assert(job.status === "completed", `fundi job should complete, got ${job.status}`);
  assert(job.assigned === "kariokor_threads", "accepted fundi was not assigned");
  assert(job.agreement?.status === "agreed" && job.agreement?.clientAgreed && job.agreement?.fundiAgreed, "fundi agreement was not signed by both sides");
  assert(job.durationDays === 4 && job.agreement?.durationDays === 4, "fundi work window was not saved into the agreement");
  assert(job.startedAtMs && job.deadlineAtMs && Math.round((job.deadlineAtMs - job.startedAtMs) / (24 * 60 * 60 * 1000)) === 4, "fundi work clock did not create a four-day deadline");
  assert(job.deadlineStatus === "completed_on_time", "on-time fundi completion did not record deadline status");
  assert(job.escrow?.state === "released", "escrow did not release after approval");
  assert(job.escrow?.nonSettling === true && job.escrow?.providerVerified === false && job.escrow?.spendable === false && /no_provider_settlement/.test(job.escrow?.settlementStatus || ""), "completed fundi escrow should remain provider-led and non-spendable");
  assert((job.proof || []).includes("customer approval"), "customer approval proof missing");
  assert((state.fundiJobRooms?.[job.id]?.messages || []).length >= 5, "customer room did not collect job messages");
  assert(job.sealDecision === "pending", "fundi Seal should wait for customer decision after completion");
  assert(!(state.trustSeals || []).some(seal => seal.job === job.id && seal.to === "kariokor_threads"), "completion should not automatically create a Provenance Seal");
  assert((state.notifications || []).some(n => n.record?.type === "fundiJob" && n.record?.id === job.id), "fundi job notification did not route to exact record");
  await page.evaluate(({ key, title }) => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiJobDetail(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(120);
  const completedAgreementText = await visibleText();
  assert(completedAgreementText.includes("Agreement strip - Funded and agreed") && completedAgreementText.includes("Escrow funded"), "completed fundi job did not keep funded agreement strip visible");
  const completedCockpitText = await page.evaluate(() => document.querySelector("[data-fundi-cockpit]")?.textContent || "");
  assert(/job cockpit/i.test(completedCockpitText) && /completed job|completion/i.test(completedCockpitText) && /seal/i.test(completedCockpitText), "completed fundi job did not keep the cockpit focused on traceable completion and Seal decision");

  const releaseSettlementId = `local-settlement-audit:fundi:${job.id}:${job.escrow?.state || job.status}:${Number(job.escrow?.releasedAmount || job.escrow?.fundedAmount || job.escrow?.amount || job.agreement?.amount || job.budget || 0)}`;
  await page.evaluate(() => {
    App.setAccount("riley_creator");
    App.backendSyncDesk("freelancer payout release proof");
    App.setBackendSettlementExceptionFilter("freelancer");
  });
  await page.waitForTimeout(180);
  const releaseAuditReview = await page.evaluate(() => {
    const node = document.querySelector("[data-settlement-exception-review]");
    return {
      text: node?.textContent || "",
      packet: document.querySelector("#settlementEvidencePacket")?.value || ""
    };
  });
  assert(releaseAuditReview.text.includes("Payout release proof") && releaseAuditReview.text.includes("provider_receipt_required_no_payout"), "completed fundi payout release proof did not surface in settlement review");
  assert(releaseAuditReview.packet.includes("payoutProof provider_receipt_required_no_payout") && releaseAuditReview.packet.includes("Release pending"), "settlement evidence packet did not include payout release proof status");
  await page.evaluate(id => App.settlementExceptionDryRun(id), releaseSettlementId);
  await page.waitForTimeout(180);
  const releaseProofDetailText = await visibleText();
  assert(releaseProofDetailText.includes("Settlement dry-run") && releaseProofDetailText.includes("Local settlement evidence"), "completed payout release settlement detail did not open");
  assert(releaseProofDetailText.includes("Payout release proof") && releaseProofDetailText.includes("provider payout receipt") && releaseProofDetailText.includes("webhook/idempotency"), "completed payout release detail did not explain provider receipt proof requirements");
  assert(releaseProofDetailText.includes("no payout") && releaseProofDetailText.includes("spendable balance"), "completed payout release detail did not preserve no-payout and spendable-balance boundaries");
  await page.evaluate(() => {
    App.setBackendSettlementExceptionFilter("all");
    App.closeModal();
  });

  await page.evaluate(({ key, title }) => {
    App.setAccount("kariokor_threads");
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const job = (stored.fundiJobs || []).find(row => row.title === title);
    App.requestFundiSeal(job.id, "fundi");
    App.closeModal();
    const after = JSON.parse(localStorage.getItem(key) || "{}");
    const checked = (after.fundiJobs || []).find(row => row.title === title);
    if ((checked.sealRequests || []).some(row => row.target === "fundi")) throw new Error("fundi could request a Seal before the 24-hour cooling-off window");
  }, { key: KEY, title });

  await page.evaluate(({ key, title }) => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const job = (stored.fundiJobs || []).find(row => row.title === title);
    job.sealAvailableAtMs = Date.now() - 1000;
    localStorage.setItem(key, JSON.stringify(stored));
  }, { key: KEY, title });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(180);
  await page.evaluate(({ key, title }) => {
    App.setAccount("kariokor_threads");
    let stored = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (stored.fundiJobs || []).find(row => row.title === title);
    App.requestFundiSeal(job.id, "fundi");
    App.requestFundiSeal(job.id, "fundi");
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    if ((job.sealRequests || []).filter(row => row.target === "fundi").length !== 1) throw new Error("duplicate fundi Seal requests were allowed");
    App.setAccount("riley_creator");
    App.grantFundiSeal(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(160);
  state = await saved();
  job = (state.fundiJobs || []).find(row => row.title === title);
  assert((state.trustSeals || []).some(seal => seal.job === job.id && seal.to === "kariokor_threads" && seal.kind === "fundi_service"), "customer-approved fundi job did not create a Provenance Seal");
  await page.evaluate(() => App.closeModal());
});

await step("fundi deadline clock supports mutual extensions", async () => {
  const title = "QA timed wardrobe repair";
  await page.evaluate(jobTitle => {
    App.setAccount("riley_creator");
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = jobTitle;
    document.getElementById("fundiJobCategory").value = "Repair";
    document.getElementById("fundiJobBudget").value = "4300";
    document.getElementById("fundiJobLocality").value = "Westlands";
    document.getElementById("fundiJobDue").value = "Friday 14:00";
    document.getElementById("fundiJobDuration").value = "4";
    document.getElementById("fundiJobDetails").value = "Fix wardrobe rail, share before and after proof, customer approval.";
    App.saveFundiJob();
  }, title);
  await page.waitForTimeout(160);

  await page.evaluate(({ key, title }) => {
    let stored = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiBid(job.id, "kariokor_threads");
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    const bid = job.bids.find(row => row.fundi === "kariokor_threads");
    App.acceptFundiBid(job.id, bid.id);
    App.setAccount("kariokor_threads");
    App.confirmFundiAgreement(job.id);
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    App.setAccount("kariokor_threads");
    App.fundiStartJob(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(160);

  let state = await saved();
  let job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job?.status === "in_progress", "timed fundi job did not start");
  assert(job.startedAtMs && job.deadlineAtMs, "work clock did not start on fundi start");
  const fourDays = 4 * 24 * 60 * 60 * 1000;
  assert(Math.abs((job.deadlineAtMs - job.startedAtMs) - fourDays) < 2000, "deadline was not based on the agreed four-day window");
  assert(!job.proofSubmittedAtMs, "funding alone should not submit proof or close the clock");

  await page.evaluate(({ key, title }) => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const job = (stored.fundiJobs || []).find(row => row.title === title);
    job.deadlineAtMs = Date.now() - 60000;
    job.agreement.deadlineAtMs = job.deadlineAtMs;
    localStorage.setItem(key, JSON.stringify(stored));
  }, { key: KEY, title });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(180);

  await page.evaluate(({ key, title }) => {
    App.setAccount("kariokor_threads");
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const job = (stored.fundiJobs || []).find(row => row.title === title);
    const oldDeadline = job.deadlineAtMs;
    App.fundiJobDetail(job.id);
    const text = document.body.textContent || "";
    if (!/Freelancer late/.test(text)) throw new Error("expired deadline was not visible as freelancer late");
    App.closeModal();
    App.fundiExtensionDesk(job.id);
    document.getElementById("fundiExtensionDays").value = "2";
    document.getElementById("fundiExtensionReason").value = "Paint needs an extra dry day.";
    App.requestFundiExtension(job.id);
    let after = JSON.parse(localStorage.getItem(key) || "{}");
    let checked = (after.fundiJobs || []).find(row => row.title === title);
    const pending = (checked.extensionRequests || [])[0];
    if (!pending || pending.status !== "pending") throw new Error("extension request was not saved as pending");
    if (checked.deadlineAtMs !== oldDeadline) throw new Error("deadline moved before the other side approved the extension");
    App.approveFundiExtension(job.id, pending.id);
    after = JSON.parse(localStorage.getItem(key) || "{}");
    checked = (after.fundiJobs || []).find(row => row.title === title);
    if ((checked.extensionRequests || [])[0].status !== "pending") throw new Error("requester was able to self-approve an extension");
    App.setAccount("riley_creator");
    App.approveFundiExtension(job.id, pending.id);
  }, { key: KEY, title });
  await page.waitForTimeout(160);

  state = await saved();
  job = (state.fundiJobs || []).find(row => row.title === title);
  const ext = (job.extensionRequests || [])[0];
  assert(ext?.status === "approved", "other-side approval did not approve the extension");
  assert(job.deadlineAtMs > ext.previousDeadlineAtMs, "approved extension did not move the deadline");
  assert(!job.lateParty, "approved extension should clear the late-party marker");
  assert((state.fundiJobRooms?.[job.id]?.messages || []).some(msg => /Extension approved/.test(msg.text || "")), "extension approval was not recorded in the customer room");
  await page.evaluate(() => App.closeModal());
});

await step("fundi funded change order requires escrow top-up", async () => {
  const title = "QA funded topup cabinet repair";
  await page.evaluate(jobTitle => {
    App.setAccount("riley_creator");
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = jobTitle;
    document.getElementById("fundiJobCategory").value = "Repair";
    document.getElementById("fundiJobBudget").value = "4000";
    document.getElementById("fundiJobLocality").value = "Westlands";
    document.getElementById("fundiJobDue").value = "Tomorrow";
    document.getElementById("fundiJobDetails").value = "Repair cabinet rail, verify bracket, before and after proof.";
    App.saveFundiJob();
  }, title);
  await page.waitForTimeout(160);

  await page.evaluate(({ key, title }) => {
    let stored = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiBid(job.id, "kariokor_threads");
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    const bid = (job.bids || []).find(row => row.fundi === "kariokor_threads");
    App.acceptFundiBid(job.id, bid.id);
    App.setAccount("kariokor_threads");
    App.confirmFundiAgreement(job.id);
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiAgreementDesk(job.id);
    document.getElementById("fundiChangeAmount").value = "5200";
    document.getElementById("fundiChangeReason").value = "Customer added bracket replacement after inspection.";
    App.requestFundiChange(job.id);
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    const change = (job.changeOrders || []).find(row => row.status === "pending");
    App.setAccount("kariokor_threads");
    App.approveFundiChange(job.id, change.id);
    App.fundiStartJob(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(180);

  let state = await saved();
  let job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job?.status === "funding_pending", "funded price increase should block work until customer top-up");
  assert(job.escrow?.state === "topup pending", "price increase did not mark escrow as top-up pending");
  assert(Number(job.escrow?.fundedAmount || 0) === 3680, "original funded escrow amount was not preserved");
  assert(Number(job.escrow?.topupDue || 0) === 1520, "top-up due amount is wrong");
  assert((state.followUps || []).some(f => /Fund escrow top-up/.test(f.title || "")), "top-up follow-up was not scheduled");

  await page.evaluate(({ key, title }) => {
    let stored = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (stored.fundiJobs || []).find(row => row.title === title);
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    App.setAccount("kariokor_threads");
    App.fundiStartJob(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(180);

  state = await saved();
  job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job?.status === "in_progress", "fundi job did not start after top-up was funded");
  assert(job.escrow?.state === "funded" && Number(job.escrow?.fundedAmount || 0) === 5200, "top-up funding did not settle escrow to full revised amount");
  assert(job.escrow?.nonSettling === true && job.escrow?.providerVerified === false && /no_provider_settlement/.test(job.escrow?.settlementStatus || ""), "top-up funding should remain provider-unverified demo escrow");
  assert((job.events || []).some(e => /Escrow top-up funded/.test(e.label || "")), "top-up funding event missing from job trail");
  await page.evaluate(() => App.closeModal());
});

await step("fundi funded price decrease creates surplus credit trail", async () => {
  const title = "QA funded surplus paint repair";
  await page.evaluate(jobTitle => {
    App.setAccount("riley_creator");
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = jobTitle;
    document.getElementById("fundiJobCategory").value = "Repair";
    document.getElementById("fundiJobBudget").value = "5000";
    document.getElementById("fundiJobLocality").value = "Westlands";
    document.getElementById("fundiJobDue").value = "Tomorrow";
    document.getElementById("fundiJobDetails").value = "Repaint cabinet corner with before and after proof.";
    App.saveFundiJob();
  }, title);
  await page.waitForTimeout(160);

  await page.evaluate(({ key, title }) => {
    let stored = JSON.parse(localStorage.getItem(key) || "{}");
    let job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiBid(job.id, "kariokor_threads");
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    const bid = (job.bids || []).find(row => row.fundi === "kariokor_threads");
    App.acceptFundiBid(job.id, bid.id);
    App.setAccount("kariokor_threads");
    App.confirmFundiAgreement(job.id);
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    App.fundiAgreementDesk(job.id);
    document.getElementById("fundiChangeAmount").value = "4100";
    document.getElementById("fundiChangeReason").value = "Fewer materials needed after inspection.";
    App.requestFundiChange(job.id);
    stored = JSON.parse(localStorage.getItem(key) || "{}");
    job = (stored.fundiJobs || []).find(row => row.title === title);
    const change = (job.changeOrders || []).find(row => row.status === "pending");
    App.setAccount("kariokor_threads");
    App.approveFundiChange(job.id, change.id);
    App.fundiStartJob(job.id);
    App.fundiSubmitProof(job.id);
    App.setAccount("riley_creator");
    App.approveFundiJob(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(220);

  let state = await saved();
  let job = (state.fundiJobs || []).find(row => row.title === title);
  const credit = (state.fundiRefunds || []).find(row => row.job === job?.id && row.refundType === "surplus_credit");
  assert(job?.status === "completed", "price decrease job did not complete");
  assert(Number(job.escrow?.adjustmentCredit || 0) === 500, "surplus adjustment credit is wrong");
  assert(credit?.amount === 500 && credit.providerStatus === "provider pending", "surplus credit refund record missing provider-pending state");
  assert(credit?.nonSettling === true && credit.providerVerified === false && credit.spendable === false && /no_settlement/.test(credit?.settlementStatus || ""), "surplus credit should remain provider-led and non-spendable");
  assert((state.fundiJobRooms?.[job.id]?.messages || []).some(msg => /Escrow surplus credit recorded/.test(msg.text || "")), "customer room missing surplus credit event");
  assert((state.followUps || []).some(f => /surplus credit/i.test(f.title || "")), "surplus credit follow-up missing");

  await page.evaluate(id => {
    App.setAccount("riley_creator");
    App.refundOpsDesk(id);
  }, credit.id);
  await page.waitForTimeout(160);
  const text = await visibleText();
  assert(text.includes("Refund operations") && text.includes("Funded price decrease surplus credit") && text.includes("Provider pending"), "refund operations did not expose surplus credit");
  assert(text.includes("Refund/support launch command") && text.includes("Source record first") && text.includes("Provider status") && text.includes("Support owner") && text.includes("No balance edit") && text.includes("No live settlement"), "refund operations did not expose the launch command and money boundaries");
  await page.evaluate(() => App.closeModal());
});

await step("fundi cancellation refunds only before work starts", async () => {
  const refundTitle = "QA funded cancel before work";
  const supportTitle = "QA cancel after start review";
  await page.evaluate(({ key, refundTitle, supportTitle }) => {
    const setupFundedJob = title => {
      App.setAccount("riley_creator");
      App.postFundiJob();
      document.getElementById("fundiJobTitle").value = title;
      document.getElementById("fundiJobCategory").value = "Repair";
      document.getElementById("fundiJobBudget").value = "3600";
      document.getElementById("fundiJobLocality").value = "Westlands";
      document.getElementById("fundiJobDue").value = "Tomorrow";
      document.getElementById("fundiJobDetails").value = "Agree price, fund escrow, then capture before and after proof.";
      App.saveFundiJob();
      let job = JSON.parse(localStorage.getItem(key) || "{}").fundiJobs.find(row => row.title === title);
      App.fundiBid(job.id, "kariokor_threads");
      job = JSON.parse(localStorage.getItem(key) || "{}").fundiJobs.find(row => row.title === title);
      const bid = job.bids.find(row => row.fundi === "kariokor_threads");
      App.acceptFundiBid(job.id, bid.id);
      App.setAccount("kariokor_threads");
      App.confirmFundiAgreement(job.id);
      App.setAccount("riley_creator");
      App.fundFundiJob(job.id);
      return job.id;
    };
    const refundId = setupFundedJob(refundTitle);
    App.cancelFundiJob(refundId);
    const supportId = setupFundedJob(supportTitle);
    App.setAccount("kariokor_threads");
    App.fundiStartJob(supportId);
    App.setAccount("riley_creator");
    App.cancelFundiJob(supportId);
  }, { key: KEY, refundTitle, supportTitle });
  await page.waitForTimeout(220);
  const state = await saved();
  const refunded = (state.fundiJobs || []).find(row => row.title === refundTitle);
  const reviewed = (state.fundiJobs || []).find(row => row.title === supportTitle);
  assert(refunded?.status === "cancelled", "funded pre-start cancellation did not close the job");
  assert(refunded?.escrow?.state === "refunded", "funded pre-start cancellation did not refund escrow");
  assert((state.fundiRefunds || []).some(row => row.job === refunded.id && row.amount > 0 && row.providerStatus === "provider pending"), "fundi refund record missing provider boundary");
  assert((state.fundiRefunds || []).some(row => row.job === refunded.id && row.nonSettling === true && row.providerVerified === false && row.spendable === false && /no_settlement/.test(row.settlementStatus || "")), "fundi refund record should remain provider-led and non-spendable");
  assert((state.fundiJobRooms?.[refunded.id]?.messages || []).some(msg => /refund/i.test(msg.text || "")), "refund cancellation did not enter the customer room");
  assert(reviewed?.status === "disputed", "post-start cancellation should go to support review");
  assert(reviewed?.escrow?.state === "held", "post-start cancellation did not hold escrow");
  assert((state.supportIncidents || []).some(row => row.job === reviewed.id && row.type === "fundiJobCancellation"), "post-start cancellation support incident missing");
  assert(!(state.fundiRefunds || []).some(row => row.job === reviewed.id), "post-start cancellation should not auto-refund");
  const fundiRefund = (state.fundiRefunds || []).find(row => row.job === refunded.id);
  assert(fundiRefund?.id, "pre-start cancellation refund record missing for settlement audit review");
  const localSettlementId = `local-settlement-audit:fundi-refund:${fundiRefund.id}:${fundiRefund.providerStatus || fundiRefund.status || "recorded"}`;
  await page.evaluate(() => {
    App.setAccount("riley_creator");
    App.backendSyncDesk("freelancer settlement holds");
  });
  await page.waitForTimeout(180);
  let text = await visibleText();
  const settlementReview = await page.evaluate(() => {
    const node = document.querySelector("[data-settlement-exception-review]");
    return {
      exists: Boolean(node),
      filter: node?.getAttribute("data-settlement-exception-filter") || "",
      filteredCount: Number(node?.getAttribute("data-settlement-exception-filtered-count") || 0),
      localAuditCount: Number(node?.getAttribute("data-local-settlement-audit-count") || 0),
      text: node?.textContent || ""
    };
  });
  assert(settlementReview.exists && settlementReview.filter === "all" && settlementReview.filteredCount >= 1 && settlementReview.localAuditCount >= 1, "backend sync did not surface local freelancer settlement audit rows");
  assert(/Local settlement audit|backend_sync_required|Local freelancer audits/i.test(settlementReview.text), "backend settlement review did not expose freelancer local settlement audit details");
  assert(settlementReview.text.includes("Refunds") && settlementReview.text.includes("Freelancer") && settlementReview.text.includes("Urgent") && settlementReview.text.includes("Local"), "backend settlement review did not expose Review Ops filter rail");
  await page.evaluate(() => App.setBackendSettlementExceptionFilter("freelancer"));
  await page.waitForTimeout(160);
  const freelancerFilter = await page.evaluate(() => {
    const node = document.querySelector("[data-settlement-exception-review]");
    return {
      filter: node?.getAttribute("data-settlement-exception-filter") || "",
      filteredCount: Number(node?.getAttribute("data-settlement-exception-filtered-count") || 0),
      text: node?.textContent || "",
      packet: document.querySelector("#settlementEvidencePacket")?.value || ""
    };
  });
  assert(freelancerFilter.filter === "freelancer" && freelancerFilter.filteredCount >= 1, "freelancer settlement filter did not stay scoped to freelancer audit rows");
  assert(freelancerFilter.text.includes("Showing latest") && /Local settlement audit|Freelancer/i.test(freelancerFilter.text), "freelancer settlement filter did not keep operator summary and rows visible");
  assert(freelancerFilter.text.includes("Settlement evidence packet") && freelancerFilter.packet.includes("Artbook settlement evidence packet"), "settlement evidence packet was not exposed for Review Ops handoff");
  assert(freelancerFilter.text.includes("Review Ops triage") && freelancerFilter.text.includes("Provider fetch required") && freelancerFilter.text.includes("Founder finance blocked"), "freelancer settlement filter did not keep triage summary visible");
  assert(freelancerFilter.packet.includes("Filter: Freelancer") && freelancerFilter.packet.includes("local_freelancer_audit") && freelancerFilter.packet.includes("no payout") && freelancerFilter.packet.includes("spendable balance") && freelancerFilter.packet.includes("Triage: receipt candidates"), "settlement evidence packet did not capture filter scope, triage counts and no-settlement boundary");
  await page.evaluate(() => App.copySettlementEvidencePacket());
  await page.waitForTimeout(120);
  const copiedEvent = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const history = (state.backendReleaseEvidenceHistory || []).find(row => row.packetKind === "settlement" && row.settlementFilter === "freelancer");
    return {
      event: (state.backendEvents || []).some(row => row.label === "Settlement evidence packet copied" && row.handoffCopy === true && row.nonSettling === true),
      history: Boolean(history && history.packetText?.includes("Artbook settlement evidence packet") && history.moneyMovementEnabled === false)
    };
  }, KEY);
  assert(copiedEvent.event, "copying settlement evidence packet did not create a non-settling backend handoff event");
  assert(copiedEvent.history, "copying settlement evidence packet did not retain it in release evidence history");
  text = await visibleText();
  assert(text.includes("Settlement handoff history") && text.includes("Latest settlement packet"), "settlement evidence history did not render after copying packet");
  await page.evaluate(() => App.setBackendSettlementExceptionFilter("all"));
  await page.waitForTimeout(160);
  await page.evaluate(id => App.settlementExceptionDryRun(id), localSettlementId);
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Settlement dry-run") && text.includes("Local settlement evidence"), "local freelancer settlement audit detail did not open");
  assert(text.includes("no payout") && text.includes("refund completion") && text.includes("spendable balance"), "local freelancer settlement audit detail did not preserve no-settlement boundary");
  await page.evaluate(() => App.closeModal());
});

await step("founder revenue includes subscriptions freelancer escrow and anti-bypass hold", async () => {
  const title = "QA anti bypass escrow lane";
  await page.evaluate(({ key, title }) => {
    const stored = () => JSON.parse(localStorage.getItem(key) || "{}");
    const findJob = () => (stored().fundiJobs || []).find(row => row.title === title);
    App.setAccount("riley_creator");
    App.postFundiJob();
    document.getElementById("fundiJobTitle").value = title;
    document.getElementById("fundiJobCategory").value = "Repair";
    document.getElementById("fundiJobBudget").value = "4700";
    document.getElementById("fundiJobLocality").value = "Westlands";
    document.getElementById("fundiJobDue").value = "Tomorrow";
    document.getElementById("fundiJobDetails").value = "Repair studio shelf with price, proof and payment in the job room.";
    App.saveFundiJob();
    let job = findJob();
    App.fundiBid(job.id, "kariokor_threads");
    job = findJob();
    const bid = (job.bids || []).find(row => row.fundi === "kariokor_threads");
    App.acceptFundiBid(job.id, bid.id);
    App.setAccount("kariokor_threads");
    App.confirmFundiAgreement(job.id);
    App.setAccount("riley_creator");
    App.fundFundiJob(job.id);
    App.fundiJobDetail(job.id);
    document.getElementById(`fundiRoomText_${job.id}`).value = "Call me on +254 700 111 222 and I can pay cash outside app.";
    App.sendFundiJobRoom(job.id);
    App.setAccount("kariokor_threads");
    App.fundiStartJob(job.id);
  }, { key: KEY, title });
  await page.waitForTimeout(260);
  let state = await saved();
  let job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job?.status === "funded", "off-app warning did not hold the funded job before start");
  assert((job.bypassFlags || []).some(row => row.status === "open"), "off-app warning flag was not stored on the job");
  assert((state.supportIncidents || []).some(row => row.job === job.id && row.type === "fundiBypass"), "off-app warning did not create a support/compliance incident");
  assert((state.fundiJobRooms?.[job.id]?.messages || []).some(msg => /Off-app deal blocked/.test(msg.text || "")), "customer room missing off-app blocked note");

  await page.evaluate(id => App.fundiJobDetail(id), job.id);
  await page.waitForTimeout(160);
  let text = await visibleText();
  assert(text.includes("Anti-bypass protection") && text.includes("Review hold active"), "job detail did not expose anti-bypass hold");

  await page.evaluate(({ key, id }) => {
    const flagId = (JSON.parse(localStorage.getItem(key) || "{}").fundiJobs || []).find(row => row.id === id).bypassFlags[0].id;
    App.setAccount("riley_creator");
    App.resolveFundiBypassFlag(id, flagId);
    App.setAccount("kariokor_threads");
    App.resolveFundiBypassFlag(id, flagId);
    App.fundiStartJob(id);
  }, { key: KEY, id: job.id });
  await page.waitForTimeout(220);
  state = await saved();
  job = (state.fundiJobs || []).find(row => row.title === title);
  assert(job?.status === "in_progress", "acknowledged anti-bypass warning did not allow work to start");
  assert((job.bypassFlags || [])[0]?.status === "acknowledged", "off-app warning did not require/record both acknowledgements");

  await page.evaluate(() => App.founderRevenueDesk());
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(/Founder revenue cockpit/i.test(text) && /Fee preview/i.test(text) && /Provider review/i.test(text) && /Moto signals/i.test(text), "founder revenue cockpit did not summarize fee, provider and Moto signals");
  assert(/No hidden custody/i.test(text), "founder revenue cockpit did not make custody boundary visible");
  assert(text.includes("Subscribed content") && text.includes("Freelancer escrow"), "founder revenue desk missing subscription or freelancer escrow rows");
  assert(text.includes("15%") && text.includes("6% escrow"), "founder revenue desk missing subscription/escrow fee logic");
  assert(text.includes("Anti-bypass warnings"), "founder revenue desk did not explain anti-bypass protection");
  assert(text.includes("Provider-led money boundary") && text.includes("Demo ledger only") && text.includes("No custody"), "founder revenue desk did not expose the non-settling provider boundary");
  await page.evaluate(() => App.closeModal());
});

await step("simple mode calms home and can return to full mode", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.setSimplicityMode("simple");
    App.home();
  });
  await page.waitForTimeout(180);
  let state = await saved();
  let simple = await page.evaluate(() => ({
    artbookprism: Boolean(document.querySelector(".app.artbook-prism")),
    prismDecks: document.querySelectorAll(".prism-today-deck").length,
    prismStatus: document.querySelectorAll(".prism-status-pill").length,
    launchStrip: document.querySelectorAll(".prism-launch-strip .prism-launch-card").length,
    launchProfile: document.querySelector(".prism-today-deck")?.dataset.launchProfile || "",
    uiTone: document.querySelector(".prism-today-deck")?.dataset.uiTone || "",
    firstRunRunway: Boolean(document.querySelector("[data-first-run-runway]")),
    runwaySteps: document.querySelectorAll("[data-first-run-runway] [data-runway-step]").length,
    runwayChips: document.querySelectorAll("[data-first-run-runway] [data-runway-chip]").length,
    dataUi: document.documentElement.dataset.ui,
    dataSimple: document.documentElement.dataset.simple,
    focusPanels: document.querySelectorAll(".simple-focus-panel").length,
    foldedPanels: document.querySelectorAll(".simple-deep-tools").length,
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    text: document.body.textContent || "",
  }));
  assert(simple.artbookprism, "new Artbook Prism shell did not mount");
  assert(simple.dataUi === "prism", "document did not switch to the Prism UI edition");
  assert(simple.prismDecks >= 1 && simple.prismStatus >= 3, "prism command board or status strip did not render");
  assert(simple.launchStrip === 3 && simple.launchProfile === "kenya_play_store" && simple.uiTone === "premium", "premium Kenya launch strip did not render");
  assert(simple.firstRunRunway && simple.runwaySteps === 3 && /First 30 seconds/.test(simple.text), "fresh install runway did not render the first 30 seconds path");
  assert(simple.runwayChips === 3 && /1. Role/.test(simple.text) && /Hide for now/.test(simple.text), "fresh install runway did not render the compact progress strip");
  assert(state.simplicityMode === "simple", "simple mode did not persist");
  assert(simple.dataSimple === "on", "document did not mark simple mode on");
  assert(simple.focusPanels >= 1, "simple home focus panel did not render");
  assert(simple.foldedPanels >= 2, "business advanced panels were not folded");
  assert(simple.overflow <= 2, "simple mode introduced horizontal overflow");
  assert(/Today focus/.test(simple.text) && /Full mode/.test(simple.text), "simple mode did not explain the escape hatch");
  assert(/Premium launch/.test(simple.text) && /Partner-led payments/.test(simple.text) && /Restricted media web-only/.test(simple.text), "simple home did not show premium launch-safe guardrails");
  assert(/Start path/.test(simple.text) && /Choose role/.test(simple.text), "fresh install start path did not render on home");

  const dockLock = await page.evaluate(async () => {
    const main = document.querySelector(".main");
    const dock = document.querySelector(".flow-dock");
    if (!main || !dock) return { exists: false };
    const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const viewportHeight = () => window.visualViewport?.height || window.innerHeight;
    const snap = () => {
      const rect = dock.getBoundingClientRect();
      return {
        top: rect.top,
        bottomGap: Math.round((viewportHeight() - rect.bottom) * 10) / 10,
        position: getComputedStyle(dock).position,
      };
    };
    main.scrollTop = 0;
    await waitFrame();
    const before = snap();
    main.scrollTop = main.scrollHeight;
    await waitFrame();
    const after = snap();
    return {
      exists: true,
      scrollable: main.scrollHeight > main.clientHeight + 40,
      position: before.position,
      topDelta: Math.round(Math.abs(after.top - before.top) * 10) / 10,
      bottomBefore: before.bottomGap,
      bottomAfter: after.bottomGap,
    };
  });
  assert(dockLock.exists && dockLock.position === "fixed", "bottom dock is not fixed to the phone viewport");
  assert(dockLock.scrollable && dockLock.topDelta <= 1.5 && dockLock.bottomBefore <= 28 && dockLock.bottomAfter <= 28, "bottom dock moved or floated inside long Home content");

  await page.locator('[data-first-run-runway] [data-runway-step="primary"]').click();
  await page.waitForTimeout(180);
  state = await saved();
  assert(state.page === "register", "first-run primary business step did not open Sales Desk");
  assert(state.sessionRecoveryByAccount?.riley_biz?.page === "register", "first-run primary route was not remembered for returning session recovery");
  await page.evaluate(() => App.home());
  await page.waitForTimeout(180);

  await page.evaluate(() => App.completeStartPath());
  await page.waitForTimeout(140);
  state = await saved();
  const hiddenStartPath = await page.evaluate(() => ({
    count: document.querySelectorAll(".start-path-panel").length,
  }));
  assert(state.startPathDoneByAccount?.riley_biz === true, "start path dismissal did not persist for the current account");
  assert(hiddenStartPath.count === 0, "start path did not hide after dismissal");
  const recovery = await page.evaluate(() => ({
    count: document.querySelectorAll("[data-session-recovery]").length,
    actions: document.querySelectorAll("[data-session-recovery] [data-session-action]").length,
    text: document.querySelector("[data-session-recovery]")?.textContent || "",
  }));
  assert(recovery.count === 1 && recovery.actions === 4, "returning session recovery did not replace the first-run runway");
  assert(/Continue today/.test(recovery.text) && /Continue Sales Desk/.test(recovery.text) && /Reopen start/.test(recovery.text), "returning session recovery missing continue or reopen actions");
  await page.locator('[data-session-recovery] [data-session-action="continue"]').click();
  await page.waitForTimeout(140);
  state = await saved();
  assert(state.page === "register", "returning session recovery did not reopen the remembered Sales Desk");
  await page.evaluate(() => App.home());
  await page.waitForTimeout(140);
  await page.locator('[data-session-recovery] [data-session-action="reopen"]').click();
  await page.waitForTimeout(140);
  state = await saved();
  const restoredStartPath = await page.evaluate(() => document.querySelectorAll(".start-path-panel").length);
  assert(!state.startPathDoneByAccount?.riley_biz && restoredStartPath === 1, "start path did not restore for the current account");

  await page.evaluate(() => App.go("more"));
  await page.waitForTimeout(180);
  const menu = await page.evaluate(() => ({
    commandCards: document.querySelectorAll(".menu-command-hero .menu-command-action").length,
    statusChips: document.querySelectorAll(".menu-command-hero .menu-command-chip").length,
    pinnedCards: document.querySelectorAll(".pinned-work-panel .start-card").length,
    text: document.body.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(menu.commandCards >= 3 && menu.statusChips === 3, "menu command header did not render daily actions and status cues");
  assert(menu.pinnedCards >= 4, "pinned work strip did not render enough shortcuts");
  assert(/Pinned work/.test(menu.text) && /Start here/.test(menu.text), "menu did not keep pinned work and start-here layers visible");
  assert(menu.overflow <= 2, "pinned work menu introduced horizontal overflow");

  await page.evaluate(() => App.pinnedWorkSettings());
  await page.waitForTimeout(160);
  const editor = await page.evaluate(() => ({
    rows: document.querySelectorAll(".pin-choice-row").length,
    text: document.body.textContent || "",
    opacity: getComputedStyle(document.querySelector("#modal.on .sheet")).opacity,
  }));
  assert(editor.rows >= 6, "pinned work editor did not list enough candidate workflows");
  assert(editor.text.includes("pinned work") && editor.text.includes("Sales Desk"), "pinned work editor missing expected copy/actions");
  assert(editor.opacity === "1", "pinned work editor modal is not opaque");

  await page.evaluate(() => App.unpinWork("dailyClose"));
  await page.waitForTimeout(120);
  state = await saved();
  assert(!(state.pinnedWorkByAccount?.riley_biz || []).includes("dailyClose"), "unpinning a workflow did not persist");
  await page.evaluate(() => App.resetPinnedWork());
  await page.waitForTimeout(120);
  state = await saved();
  assert((state.pinnedWorkByAccount?.riley_biz || []).includes("dailyClose"), "resetting pinned work did not restore role defaults");
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => {
    App.setSimplicityMode("full");
    App.home();
  });
  await page.waitForTimeout(180);
  state = await saved();
  const full = await page.evaluate(() => ({
    dataSimple: document.documentElement.dataset.simple,
    focusPanels: document.querySelectorAll(".simple-focus-panel").length,
    foldedPanels: document.querySelectorAll(".simple-deep-tools").length,
    text: document.body.textContent || "",
  }));
  assert(state.simplicityMode === "full", "full mode did not persist");
  assert(full.dataSimple === "off", "document did not mark simple mode off");
  assert(full.focusPanels === 0, "full mode should not show the simple focus panel");
  assert(full.foldedPanels === 0, "full mode should unfold business panels");
  assert(/Business command desk/.test(full.text) && /Business command layer/.test(full.text), "full mode did not restore business command panels");
});

await step("equal tab sizing stays consistent across app tab bars", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.setSimplicityMode("simple");
    App.completeStartPath();
    App.home();
  });
  await page.waitForTimeout(180);
  const flow = await collectGeometry('.flow-guide[data-flow-guide="simple"]', ".flow-tier");
  assertEqualWidths(flow, "Simple flow Basic and More layers", 2);
  assertEqualHeights(flow, "Simple flow Basic and More layers", 2);
  assert(flow.labels.some(label => /Basic/.test(label)) && flow.labels.some(label => /More layers/.test(label)), "simple flow did not include Basic and More layers together");
  assert(flow.overflow <= 2, "equal Simple flow tabs introduced horizontal overflow");
  await page.evaluate(() => App.simplicitySettings());
  await page.waitForTimeout(120);
  assertEqualWidths(await collectGeometry(".simple-mode-toggle", "button"), "Simple/full mode toggle", 2);
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => App.go("calendar", false, { calendarTab: "booking" }));
  await page.waitForTimeout(160);
  assertEqualWidths(await collectGeometry(".booking-tabs", ".booking-tab"), "Booking desk", 6);

  await page.evaluate(() => App.go("register", false, { registerTab: "sale" }));
  await page.waitForTimeout(160);
  assertEqualWidths(await collectGeometry('.chiprow[data-equal-tabs="register"]', ".chip"), "Sales Desk", 6);
  assertEqualWidths(await collectGeometry('.chiprow[data-equal-tabs="pos-category"]', ".chip"), "Register item categories", 4);

  await page.evaluate(() => App.go("market"));
  await page.waitForTimeout(160);
  assertEqualWidths(await collectGeometry('.chiprow[data-equal-tabs="market"]', ".chip"), "Market", 4);

  await page.evaluate(() => App.go("podcasts"));
  await page.waitForTimeout(160);
  assertEqualWidths(await collectGeometry(".podcast-lens", ".chip"), "Podcast lens", 4);

  await page.evaluate(() => App.go("worlds"));
  await page.waitForTimeout(160);
  assertEqualWidths(await collectGeometry(".world-switch", ".world-pill"), "World switch", 4);

  await page.evaluate(() => App.go("discover"));
  await page.waitForTimeout(160);
  assertEqualWidths(await collectGeometry(".find-role-tabs", "button"), "Find role tabs", 5);
  await page.evaluate(() => App.findFilters());
  await page.waitForTimeout(120);
  assertEqualWidths(await collectGeometry('.chiprow[data-equal-tabs="discover-role-modal"]', ".chip"), "Find filter role tabs", 5);
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => App.openProfile("riley_biz"));
  await page.waitForTimeout(160);
  assertEqualWidths(await collectGeometry(".profile-palette", ".profile-lens"), "Profile palette tabs", 2);
});

await step("profile and shop actions stay premium touch targets", async () => {
  const readActions = async (selector) => page.evaluate((selector) => {
    return [...document.querySelectorAll(selector)].map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        label: (button.textContent || button.getAttribute("aria-label") || "").trim().replace(/\s+/g, " "),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scrollWidth: button.scrollWidth,
        clientWidth: button.clientWidth,
        scrollHeight: button.scrollHeight,
        clientHeight: button.clientHeight,
      };
    });
  }, selector);
  const assertPremiumControls = (controls, label, minCount) => {
    assert(controls.length >= minCount, `${label} rendered too few controls: ${controls.length}`);
    for (const control of controls) {
      assert(control.height >= 48, `${label} control is below premium touch target: ${JSON.stringify(control)}`);
      assert(control.scrollWidth <= control.clientWidth + 1 && control.scrollHeight <= control.clientHeight + 1, `${label} control clips text or icon: ${JSON.stringify(control)}`);
    }
  };

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.openProfile("riley_artist");
  });
  await page.waitForTimeout(180);
  assertPremiumControls(await readActions(".profile-action-strip .btn"), "own profile actions", 6);

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.openProfile("riley_biz");
  });
  await page.waitForTimeout(180);
  assertPremiumControls(await readActions(".profile-action-strip .btn"), "other profile actions", 3);

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.openShop("shop_gold");
  });
  await page.waitForTimeout(180);
  assertPremiumControls(await readActions(".shop-shelf-panel .split .btn"), "shop shelf actions", 2);
});

await step("account switchboard keeps role recovery specific", async () => {
  await page.evaluate(() => {
    App.setSimplicityMode("simple");
    const routes = {
      riley_artist: "audio",
      riley_streamer: "podcasts",
      riley_creator: "discover",
      riley_biz: "register",
      riley_courier: "delivery",
    };
    for (const [account, route] of Object.entries(routes)) {
      App.setAccount(account, { silent: true });
      App.go(route);
      App.completeStartPath();
    }
    App.setAccount("riley_artist", { silent: true });
    App.accountPicker();
  });
  await page.waitForTimeout(180);
  const picker = await page.evaluate(() => ({
    board: Boolean(document.querySelector("[data-role-switchboard]")),
    cards: document.querySelectorAll("[data-role-switch-card]").length,
    actions: document.querySelectorAll("[data-role-switch-card] [data-role-switch-action]").length,
    text: document.body.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(picker.board, "premium role switchboard did not render");
  assert(picker.cards === 5 && picker.actions >= 10, "role switchboard did not expose all owner accounts and actions");
  assert(picker.overflow <= 2, "role switchboard introduced horizontal overflow");
  assert(/Role switchboard/.test(picker.text) && /5\/5 ready/.test(picker.text), "role switchboard did not summarize account readiness");
  assert(/Continue Sound Room/.test(picker.text) && /Continue Sales Desk/.test(picker.text) && /Continue Podcast Studio/.test(picker.text) && /Continue Courier Board/.test(picker.text), "role switchboard did not show role-specific continue routes");

  await page.locator('[data-role-switch-card="riley_biz"] [data-role-switch-action="continue"]').click();
  await page.waitForTimeout(160);
  let state = await saved();
  assert(state.account === "riley_biz" && state.page === "register", "business switchboard continue did not reopen Sales Desk");

  await page.evaluate(() => App.accountPicker());
  await page.waitForTimeout(120);
  await page.locator('[data-role-switch-card="riley_courier"] [data-role-switch-action="continue"]').click();
  await page.waitForTimeout(160);
  state = await saved();
  assert(state.account === "riley_courier" && state.page === "delivery", "courier switchboard continue did not reopen Courier Board");

  await page.evaluate(() => {
    App.setSimplicityMode("full");
    App.setAccount("riley_biz", { silent: true });
    App.home();
  });
});

await step("backend sync desk renders offline-first state", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.backendSyncDesk();
  });
  await page.waitForTimeout(160);
  const state = await saved();
  const desk = await page.evaluate(() => ({
    text: document.body.textContent || "",
    hasMode: Boolean(document.querySelector("#backendMode")),
    hasBase: Boolean(document.querySelector("#backendBaseUrl")),
    opacity: getComputedStyle(document.querySelector("#modal.on .sheet")).opacity,
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(state.backendConfig?.mode === "offline", "backend desk should default to offline-first mode");
  assert(desk.hasMode && desk.hasBase, "backend sync controls did not render");
  assert(desk.text.includes("Backend sync") && desk.text.includes("Offline-first rule") && desk.text.includes("Sync plan"), "backend sync desk missing expected sections");
  assert(desk.text.includes("Backend AI contract") && desk.text.includes("AI launch gates"), "backend sync desk missing AI launch contract sections");
  assert(desk.text.includes("Server-only OpenAI key") && desk.text.includes("quota/billing"), "backend AI contract did not spell out server-only key and quota ownership");
  assert(desk.text.includes("Protected actions blocked") && desk.text.includes("identity/KYC/KYB") && desk.text.includes("Provenance Seals"), "backend AI contract did not keep protected actions blocked");
  assert(desk.text.includes("Kenya pilot launch gate") && desk.text.includes("Founder launch decision") && desk.text.includes("Live money: blocked"), "backend sync desk missing founder-readable Kenya pilot launch gate");
  assert(desk.text.includes("Android release signing and phone proof") && desk.text.includes("Provider rails and webhook proof") && desk.text.includes("KYC/KYB, country and wallet limits"), "Kenya pilot launch gate did not combine release signing, provider and KYC/KYB gates");
  assert(/restricted creator monetization stays web-only/i.test(desk.text) && /real wallet, escrow release, courier payout/i.test(desk.text), "Kenya pilot launch gate did not preserve Play Store-safe and live-money boundaries");
  assert(desk.text.includes("Founder action list") && desk.text.includes("Create release signing, install and foreground proof") && desk.text.includes("Finish provider rails before live money"), "Kenya pilot launch gate did not expose founder action list for release and provider blockers");
  assert(desk.text.includes("Approve KYC/KYB and country money rules") && desk.text.includes("Clear settlement exception rows") && desk.text.includes("Keep Play Store pilot compliant"), "Kenya pilot launch gate action list missed compliance, settlement or Play Store actions");
  assert(desk.text.includes("Founder action summary") && desk.text.includes("Copy a concise handoff"), "Kenya pilot launch gate did not expose copyable founder action summary");
  assert(desk.text.includes("Partner handoff briefs") && desk.text.includes("Payment/backend partner") && desk.text.includes("KYC/KYB compliance partner") && desk.text.includes("Play Store/legal partner") && desk.text.includes("Android release partner"), "Kenya pilot launch gate did not expose partner-specific handoff briefs");
  assert(desk.text.includes("Pay Lens parser worker") && desk.text.includes("Object-storage upload URL") && desk.text.includes("OCR/QR parser job") && desk.text.includes("Provider rail validation"), "backend sync desk missing Pay Lens parser-worker production gates");
  assert(desk.text.includes("Idempotency + signed webhook proof") && desk.text.includes("No raw files in APK") && desk.text.includes("No provider checkout") && desk.text.includes("Money blocked"), "Pay Lens parser-worker gate did not preserve webhook and money boundaries");
  assert(desk.text.includes("Pay Lens prepared proof") && desk.text.includes("Prepared draft evidence packet") && desk.text.includes("Masked details only") && desk.text.includes("No prepared rows") && desk.text.includes("Pay Lens proof ladder"), "backend sync desk missing Pay Lens prepared proof export empty state and proof ladder");
  assert(desk.text.includes("Pay Lens provider readiness") && desk.text.includes("Payment integration checklist") && desk.text.includes("Provider contract") && desk.text.includes("Token vault"), "backend sync desk missing Pay Lens provider-readiness checklist");
  assert(desk.text.includes("OCR worker") && desk.text.includes("QR parser") && desk.text.includes("Webhook replay") && desk.text.includes("Ledger reconciliation") && desk.text.includes("Compliance sign-off"), "Pay Lens provider-readiness checklist missed core integration tasks");
  const launchGate = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-kenya-pilot-launch-gate]")),
    decision: document.querySelector("[data-kenya-pilot-launch-gate]")?.getAttribute("data-launch-decision") || "",
    money: document.querySelector("[data-kenya-pilot-launch-gate]")?.getAttribute("data-live-money-enabled") || "",
    actionCount: Number(document.querySelector("[data-kenya-pilot-launch-gate]")?.getAttribute("data-founder-action-count") || 0),
    nowCount: Number(document.querySelector("[data-kenya-pilot-launch-gate]")?.getAttribute("data-founder-action-now-count") || 0),
    partnerCount: Number(document.querySelector("[data-kenya-pilot-launch-gate]")?.getAttribute("data-founder-partner-brief-count") || 0),
    partnerVisible: document.querySelectorAll("[data-founder-partner-brief]").length,
    partnerValues: Array.from(document.querySelectorAll("[id^='founderPartnerBrief_']")).map(row => row.value || ""),
    visibleActions: document.querySelectorAll("[data-founder-launch-action]").length,
    summary: document.querySelector("#founderActionSummary")?.value || "",
  }));
  assert(launchGate.exists && launchGate.decision === "kenya_live_money_launch_blocked" && launchGate.money === "false", "Kenya pilot launch gate should stay fail-closed without external proof");
  assert(launchGate.actionCount === 5 && launchGate.visibleActions === 5 && launchGate.nowCount >= 3, "Kenya pilot founder action list should expose five visible actions with launch blockers");
  assert(launchGate.partnerCount === 4 && launchGate.partnerVisible === 4 && launchGate.partnerValues.some(text => text.includes("Payment/backend partner")) && launchGate.partnerValues.some(text => text.includes("KYC/KYB compliance partner")), "Kenya pilot partner handoff briefs did not expose four copy-ready partner packets");
  assert(launchGate.partnerValues.every(text => text.includes("handoff only") && text.includes("no provider state") && !/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=/i.test(text)), "partner handoff briefs should stay redacted and non-settling");
  assert(launchGate.summary.includes("Artbook Kenya Pilot Founder Action Summary") && launchGate.summary.includes("Decision: kenya_live_money_launch_blocked") && launchGate.summary.includes("Boundary: summary is handoff evidence only"), "founder action summary did not capture blocked decision and boundary");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=/i.test(launchGate.summary), "founder action summary appears to leak sensitive values");
  const payLensParser = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-pay-lens-parser-worker-checklist]")),
    gateCount: document.querySelectorAll("[data-pay-lens-parser-gate]").length,
    statuses: Array.from(document.querySelectorAll("[data-pay-lens-parser-gate]")).map(row => row.getAttribute("data-pay-lens-parser-status") || ""),
    packet: document.querySelector("#payLensParserWorkerPacket")?.value || "",
  }));
  assert(payLensParser.exists && payLensParser.gateCount === 5 && payLensParser.statuses.includes("active") && payLensParser.statuses.filter(status => status === "blocked").length >= 4, "Pay Lens parser-worker checklist did not expose four blocked gates plus the review-only active boundary");
  assert(payLensParser.packet.includes("Artbook Pay Lens Parser Worker Launch Checklist") && payLensParser.packet.includes("no settlement") && !/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=/i.test(payLensParser.packet), "Pay Lens parser-worker packet should be copy-ready, non-settling and redacted");
  const payLensPreparedExport = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-pay-lens-prepared-export]")),
    packet: document.querySelector("#payLensPreparedEvidencePacket")?.value || "",
    ladderExists: Boolean(document.querySelector("[data-pay-lens-proof-ladder]")),
    ladderTotal: Number(document.querySelector("[data-pay-lens-proof-ladder]")?.getAttribute("data-pay-lens-proof-ladder-total") || 0),
    ladderLevels: Number(document.querySelector("[data-pay-lens-proof-ladder]")?.getAttribute("data-pay-lens-proof-ladder-levels") || 0),
    ladderStrongest: document.querySelector("[data-pay-lens-proof-ladder]")?.getAttribute("data-pay-lens-proof-ladder-strongest") || "",
    levelCards: document.querySelectorAll("[data-pay-lens-proof-level-card]").length,
  }));
  assert(payLensPreparedExport.exists && payLensPreparedExport.packet.includes("Artbook Pay Lens Prepared Draft Evidence Packet") && payLensPreparedExport.packet.includes("No prepared Pay Lens draft evidence") && !/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=/i.test(payLensPreparedExport.packet), "Pay Lens prepared proof export should be visible, empty-safe and redacted");
  assert(payLensPreparedExport.ladderExists && payLensPreparedExport.ladderTotal === 0 && payLensPreparedExport.ladderLevels === 4 && payLensPreparedExport.ladderStrongest === "none" && payLensPreparedExport.levelCards === 4 && payLensPreparedExport.packet.includes("Proof ladder next actions"), "Pay Lens prepared proof ladder should render an empty, copy-ready four-rung state");
  const payLensProviderReadiness = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-pay-lens-provider-readiness]")),
    taskCount: document.querySelectorAll("[data-pay-lens-provider-task]").length,
    statuses: Array.from(document.querySelectorAll("[data-pay-lens-provider-task]")).map(row => row.getAttribute("data-pay-lens-provider-status") || ""),
    packet: document.querySelector("#payLensProviderReadinessPacket")?.value || "",
  }));
  assert(payLensProviderReadiness.exists && payLensProviderReadiness.taskCount === 7 && payLensProviderReadiness.statuses.filter(status => status === "blocked").length >= 5, "Pay Lens provider-readiness checklist should expose seven mostly blocked tasks before external proof");
  assert(payLensProviderReadiness.packet.includes("Artbook Pay Lens Provider Readiness Checklist") && payLensProviderReadiness.packet.includes("Provider contract") && payLensProviderReadiness.packet.includes("Token vault") && payLensProviderReadiness.packet.includes("Money movement: false"), "Pay Lens provider-readiness packet missing launch task boundaries");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=/i.test(payLensProviderReadiness.packet), "Pay Lens provider-readiness packet appears to leak sensitive values");
  assert(desk.text.includes("Production backend activation") && desk.text.includes("Hosted HTTPS API proof") && desk.text.includes("Server-held secret vault"), "backend sync desk missing production backend activation proof plan");
  assert(desk.text.includes("Webhook signature and replay") && desk.text.includes("Provider sandbox callbacks") && desk.text.includes("Ledger migrations and worker queues") && desk.text.includes("Compliance provider signoff"), "production backend activation plan missed callback, sandbox, ledger or compliance gates");
  const productionBackendProof = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-production-backend-proof-plan]")),
    status: document.querySelector("[data-production-backend-proof-plan]")?.getAttribute("data-production-backend-proof-status") || "",
    steps: Number(document.querySelector("[data-production-backend-proof-plan]")?.getAttribute("data-production-backend-proof-steps") || 0),
    ready: Number(document.querySelector("[data-production-backend-proof-plan]")?.getAttribute("data-production-backend-proof-ready") || 0),
    blocked: Number(document.querySelector("[data-production-backend-proof-plan]")?.getAttribute("data-production-backend-proof-blocked") || 0),
    providerEnabled: document.querySelector("[data-production-backend-proof-plan]")?.getAttribute("data-production-backend-provider-enabled") || "",
    cardCount: document.querySelectorAll("[data-production-backend-proof-step]").length,
    statuses: Array.from(document.querySelectorAll("[data-production-backend-proof-step]")).map(row => row.getAttribute("data-production-backend-proof-status") || ""),
    packet: document.querySelector("#productionBackendActivationPacket")?.value || "",
    hostedExists: Boolean(document.querySelector("[data-production-hosted-backend-evidence]")),
    hostedReady: Number(document.querySelector("[data-production-hosted-backend-evidence]")?.getAttribute("data-production-hosted-backend-ready") || 0),
    hostedProbes: Number(document.querySelector("[data-production-hosted-backend-evidence]")?.getAttribute("data-production-hosted-backend-probes") || 0),
    hostedMoney: document.querySelector("[data-production-hosted-backend-evidence]")?.getAttribute("data-production-hosted-backend-money-enabled") || "",
    hostedProviderCalled: document.querySelector("[data-production-hosted-backend-evidence]")?.getAttribute("data-production-hosted-backend-provider-called") || "",
    hostedRowCount: document.querySelectorAll("[data-production-hosted-backend-evidence-row]").length,
    hostedStatuses: Array.from(document.querySelectorAll("[data-production-hosted-backend-evidence-row]")).map(row => row.getAttribute("data-production-hosted-backend-evidence-status") || ""),
    hostedActionCount: document.querySelectorAll("[data-production-hosted-backend-evidence-action]").length,
    hostedProofLanes: Array.from(document.querySelectorAll("[data-production-hosted-backend-evidence-row]")).map(row => row.getAttribute("data-production-hosted-backend-proof-lane") || ""),
    hostedPacket: document.querySelector("#productionHostedBackendEvidencePacket")?.value || "",
    hostedCommandExists: Boolean(document.querySelector("[data-production-hosted-backend-command-helper]")),
    hostedCommandCount: Number(document.querySelector("[data-production-hosted-backend-command-helper]")?.getAttribute("data-production-hosted-backend-command-count") || 0),
    hostedCommandProviderCalled: document.querySelector("[data-production-hosted-backend-command-helper]")?.getAttribute("data-production-hosted-backend-command-provider-called") || "",
    hostedCommandMoney: document.querySelector("[data-production-hosted-backend-command-helper]")?.getAttribute("data-production-hosted-backend-command-money-enabled") || "",
    hostedCommands: document.querySelector("#productionHostedBackendProbeCommands")?.value || "",
    hostedUrlHelperExists: Boolean(document.querySelector("[data-production-hosted-backend-url-helper]")),
    hostedUrlStatus: document.querySelector("[data-production-hosted-backend-url-helper]")?.getAttribute("data-production-hosted-backend-url-status") || "",
    hostedUrlPublicHttps: document.querySelector("[data-production-hosted-backend-url-helper]")?.getAttribute("data-production-hosted-backend-url-public-https") || "",
    hostedUrlMode: document.querySelector("[data-production-hosted-backend-url-helper]")?.getAttribute("data-production-hosted-backend-url-mode") || "",
    hostedUrlProviderCalled: document.querySelector("[data-production-hosted-backend-url-helper]")?.getAttribute("data-production-hosted-backend-url-provider-called") || "",
    hostedUrlMoney: document.querySelector("[data-production-hosted-backend-url-helper]")?.getAttribute("data-production-hosted-backend-url-money-enabled") || "",
    hostedUrlInput: document.querySelector("#productionHostedBackendUrlInput")?.value || "",
    localProofCaptureExists: Boolean(document.querySelector("[data-backend-deployment-proof-capture]")),
    localProofLaneOptions: Array.from(document.querySelectorAll("#backendDeploymentProofLane option")).map(row => row.value),
  }));
  assert(productionBackendProof.exists && productionBackendProof.status === "not_fetched" && productionBackendProof.steps === 6 && productionBackendProof.cardCount === 6, `Production backend proof plan should render six visible gates before provider fetch: ${JSON.stringify(productionBackendProof)}`);
  assert(productionBackendProof.providerEnabled === "false" && productionBackendProof.ready === 0 && productionBackendProof.blocked === 6 && productionBackendProof.statuses.every(status => status === "blocked"), "Production backend proof plan should fail closed before hosted/provider evidence");
  assert(productionBackendProof.packet.includes("Artbook Production Backend Activation Proof Plan") && productionBackendProof.packet.includes("Provider readiness fetched: no") && productionBackendProof.packet.includes("Live provider activation enabled: false") && productionBackendProof.packet.includes("Hosted HTTPS API proof"), "Production backend activation packet missing blocked production criteria");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|service-account\\s*\\{|private[_ -]?key/i.test(productionBackendProof.packet), "Production backend activation packet appears to leak sensitive values");
  assert(productionBackendProof.hostedExists && productionBackendProof.hostedProbes === 6 && productionBackendProof.hostedRowCount === 6 && productionBackendProof.hostedReady === 0 && productionBackendProof.hostedMoney === "false" && productionBackendProof.hostedProviderCalled === "false" && productionBackendProof.hostedStatuses.every(status => status === "blocked"), `Hosted backend evidence runbook should render six blocked probes before HTTPS proof: ${JSON.stringify(productionBackendProof)}`);
  assert(productionBackendProof.hostedActionCount === 6 && productionBackendProof.localProofCaptureExists && productionBackendProof.localProofLaneOptions.includes("production_host_selection_proof") && productionBackendProof.localProofLaneOptions.includes("provider_sandbox_hosted_https_callback") && productionBackendProof.hostedProofLanes.includes("server_secret_store_proof") && productionBackendProof.hostedProofLanes.includes("provider_allowlist_contract_proof"), `Hosted backend evidence should expose proof-note actions and fallback lanes: ${JSON.stringify(productionBackendProof)}`);
  assert(productionBackendProof.hostedPacket.includes("Artbook Hosted Backend Evidence Runbook") && productionBackendProof.hostedPacket.includes("/api/health") && productionBackendProof.hostedPacket.includes("/api/schema") && productionBackendProof.hostedPacket.includes("/api/providers/readiness") && productionBackendProof.hostedPacket.includes("Authorization: Bearer <review-ops-token>") && productionBackendProof.hostedPacket.includes("Credential material stored in APK: false") && productionBackendProof.hostedPacket.includes("Provider called: false") && productionBackendProof.hostedPacket.includes("Money movement enabled: false"), "Hosted backend evidence packet missed endpoint probes or fail-closed flags");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|service-account\\s*\\{|private[_ -]?key|raw id|selfie frame|full provider payload|\+254\\s?\\d{3,}/i.test(productionBackendProof.hostedPacket), "Hosted backend evidence packet appears to leak sensitive or unmasked provider data");
  assert(productionBackendProof.hostedUrlHelperExists && productionBackendProof.hostedUrlStatus === "local_blocked" && productionBackendProof.hostedUrlPublicHttps === "false" && productionBackendProof.hostedUrlMode === "offline" && productionBackendProof.hostedUrlProviderCalled === "false" && productionBackendProof.hostedUrlMoney === "false" && productionBackendProof.hostedUrlInput === "http://127.0.0.1:8787", `Hosted backend URL helper should render a fail-closed localhost state: ${JSON.stringify(productionBackendProof)}`);
  assert(productionBackendProof.hostedPacket.includes("Hosted HTTPS base configured: false") && productionBackendProof.hostedPacket.includes("Hosted URL status: local_blocked"), "Hosted backend evidence packet should call out local URL as non-production proof");
  assert(productionBackendProof.hostedCommandExists && productionBackendProof.hostedCommandCount === 6 && productionBackendProof.hostedCommandProviderCalled === "false" && productionBackendProof.hostedCommandMoney === "false", `Hosted backend command helper should render six fail-closed commands: ${JSON.stringify(productionBackendProof)}`);
  assert(productionBackendProof.hostedCommands.includes("Artbook Hosted Backend Probe Commands") && productionBackendProof.hostedCommands.includes("curl -fsS") && productionBackendProof.hostedCommands.includes("/api/health") && productionBackendProof.hostedCommands.includes("/api/schema") && productionBackendProof.hostedCommands.includes("/api/providers/readiness") && productionBackendProof.hostedCommands.includes("Authorization: Bearer <review-ops-token>") && productionBackendProof.hostedCommands.includes("Hosted HTTPS base configured: false") && productionBackendProof.hostedCommands.includes("Hosted URL status: local_blocked") && productionBackendProof.hostedCommands.includes("Provider activation enabled: false") && productionBackendProof.hostedCommands.includes("Money movement enabled: false"), "Hosted backend command helper missed probe commands or fail-closed flags");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|service-account\\s*\\{|private[_ -]?key|raw id|selfie frame|full provider payload|\+254\\s?\\d{3,}/i.test(productionBackendProof.hostedCommands), "Hosted backend command helper appears to leak sensitive or unmasked provider data");
  await page.evaluate(() => {
    document.querySelector("#productionHostedBackendUrlInput").value = "http://127.0.0.1:8787";
    App.setProductionHostedBackendUrl();
  });
  await page.waitForTimeout(140);
  let hostedUrlState = await saved();
  assert(hostedUrlState.backendConfig?.mode === "offline" && hostedUrlState.backendConfig?.baseUrl === "http://127.0.0.1:8787", "Rejecting a local production hosted URL should not change backend mode or base URL");
  assert((hostedUrlState.backendEvents || []).some(row => row.label === "Production hosted backend URL rejected" && row.productionHostedBackendUrlRejected === true && row.hostedHttps === false && row.providerCalled === false && row.moneyMovementEnabled === false), "Rejecting a local production hosted URL should record fail-closed audit evidence");
  await page.evaluate(() => {
    document.querySelector("#productionHostedBackendUrlInput").value = "https://api.artbook.example.com/";
    App.setProductionHostedBackendUrl();
  });
  await page.waitForTimeout(180);
  hostedUrlState = await saved();
  assert(hostedUrlState.backendConfig?.mode === "local" && hostedUrlState.backendConfig?.baseUrl === "https://api.artbook.example.com" && !hostedUrlState.backendConfig?.lastHealth && !hostedUrlState.backendConfig?.lastSchema, "Setting a public hosted URL should trim slashes and clear stale local health/schema proof");
  assert((hostedUrlState.backendEvents || []).some(row => row.label === "Production hosted backend URL set" && row.productionHostedBackendUrlSet === true && row.hostedHttps === true && row.backendNetworkProbeRun === false && row.providerCalled === false && row.moneyMovementEnabled === false), "Setting a public hosted URL should record non-settling audit evidence without probing providers");
  await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    snap.backendConfig = { ...(snap.backendConfig || {}), mode: "offline", baseUrl: "http://127.0.0.1:8787", lastHealth: null, lastSchema: null, lastError: "" };
    localStorage.setItem(key, JSON.stringify(snap));
  }, KEY);
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => App.backendSyncDesk("hosted url regression reset"));
  await page.waitForTimeout(160);
  await page.evaluate(() => document.querySelector('[data-production-hosted-backend-evidence-action="health"]')?.click());
  const hostedHealthPrefill = await page.evaluate(() => ({
    lane: document.querySelector("#backendDeploymentProofLane")?.value || "",
    type: document.querySelector("#backendDeploymentProofType")?.value || "",
    source: document.querySelector("#backendDeploymentProofSource")?.value || "",
    note: document.querySelector("#backendDeploymentProofNote")?.value || ""
  }));
  assert(hostedHealthPrefill.lane === "production_host_selection_proof" && hostedHealthPrefill.type.includes("Hosted HTTPS health check") && hostedHealthPrefill.source.includes("/api/health") && hostedHealthPrefill.note.includes("No credential material") && !/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|service-account\\s*\\{|private[_ -]?key|raw id|selfie frame|full provider payload|\+254\\s?\\d{3,}/i.test(`${hostedHealthPrefill.type} ${hostedHealthPrefill.source} ${hostedHealthPrefill.note}`), `Hosted health proof action should prefill a safe review-only proof lane: ${JSON.stringify(hostedHealthPrefill)}`);
  await page.evaluate(() => App.copyProductionBackendActivationPacket());
  const productionBackendCopyState = await saved();
  assert((productionBackendCopyState.backendEvents || []).some(row => row.label === "Production backend activation packet copied" && row.productionBackendActivation === true && row.nonSettling === true && row.moneyMovementEnabled === false && row.providerActivationEnabled === false), "copying the production backend activation packet did not create non-settling handoff evidence");
  await page.evaluate(() => App.copyProductionHostedBackendEvidencePacket());
  const productionHostedCopyState = await saved();
  assert((productionHostedCopyState.backendEvents || []).some(row => row.label === "Production hosted backend evidence copied" && row.productionHostedBackendEvidence === true && row.credentialMaterialExported === false && row.nonSettling === true && row.moneyMovementEnabled === false && row.providerActivationEnabled === false && row.providerCalled === false && row.walletCreditEnabled === false && row.dispatchEnabled === false && row.receiptCandidateCreated === false), "copying hosted backend evidence packet did not create non-settling handoff evidence");
  await page.evaluate(() => App.copyProductionHostedBackendProbeCommands());
  const productionHostedCommandsCopyState = await saved();
  assert((productionHostedCommandsCopyState.backendEvents || []).some(row => row.label === "Production hosted backend probe commands copied" && row.productionHostedBackendProbeCommands === true && row.credentialMaterialExported === false && row.nonSettling === true && row.moneyMovementEnabled === false && row.providerActivationEnabled === false && row.providerCalled === false && row.walletCreditEnabled === false && row.dispatchEnabled === false && row.receiptCandidateCreated === false), "copying hosted backend probe commands did not create non-settling handoff evidence");
  assert(desk.text.includes("Provider sandbox callback proof") && desk.text.includes("Kenya IDV sandbox session") && desk.text.includes("Daraja STK Push sandbox"), "backend sync desk missing provider sandbox callback proof lanes");
  assert(desk.text.includes("Signed raw-body replay") && desk.text.includes("Refund and payout replay") && desk.text.includes("Delivery dispatch callback"), "provider sandbox callback proof missed replay, refund/payout or delivery fixtures");
  const providerSandbox = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-provider-sandbox-callback-proof]")),
    status: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-callback-status") || "",
    count: Number(document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-callback-count") || 0),
    ready: Number(document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-callback-ready") || 0),
    blocked: Number(document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-callback-blocked") || 0),
    money: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-money-enabled") || "",
    providerCalled: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-provider-called") || "",
    live: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-live-enabled") || "",
    endpointStatus: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-endpoint-status") || "",
    fixturePlanFetched: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-fixture-plan-fetched") || "",
    capturedEvents: Number(document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-captured-events") || 0),
    testEnabled: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-test-enabled") || "",
    rowCount: document.querySelectorAll("[data-provider-sandbox-callback-row]").length,
    statuses: Array.from(document.querySelectorAll("[data-provider-sandbox-callback-row]")).map(row => row.getAttribute("data-provider-sandbox-callback-status") || ""),
    packet: document.querySelector("#providerSandboxCallbackPacket")?.value || "",
    curl: document.querySelector("#providerSandboxCallbackCurl")?.value || "",
    hostExists: Boolean(document.querySelector("[data-provider-sandbox-host-preflight]")),
    hostLanes: Number(document.querySelector("[data-provider-sandbox-host-preflight]")?.getAttribute("data-provider-sandbox-host-lanes") || 0),
    hostReady: Number(document.querySelector("[data-provider-sandbox-host-preflight]")?.getAttribute("data-provider-sandbox-host-ready") || 0),
    hostBlocked: Number(document.querySelector("[data-provider-sandbox-host-preflight]")?.getAttribute("data-provider-sandbox-host-blocked") || 0),
    hostMoney: document.querySelector("[data-provider-sandbox-host-preflight]")?.getAttribute("data-provider-sandbox-host-money-enabled") || "",
    hostLaneCount: document.querySelectorAll("[data-provider-sandbox-host-lane]").length,
    hostStatuses: Array.from(document.querySelectorAll("[data-provider-sandbox-host-lane]")).map(row => row.getAttribute("data-provider-sandbox-host-status") || ""),
    hostPacket: document.querySelector("#providerSandboxHostPreflightPacket")?.value || "",
    credentialExists: Boolean(document.querySelector("[data-provider-sandbox-credential-readiness]")),
    credentialLanes: Number(document.querySelector("[data-provider-sandbox-credential-readiness]")?.getAttribute("data-provider-sandbox-credential-lanes") || 0),
    credentialReady: Number(document.querySelector("[data-provider-sandbox-credential-readiness]")?.getAttribute("data-provider-sandbox-credential-ready") || 0),
    credentialProofNotes: Number(document.querySelector("[data-provider-sandbox-credential-readiness]")?.getAttribute("data-provider-sandbox-credential-proof-notes") || 0),
    credentialMoney: document.querySelector("[data-provider-sandbox-credential-readiness]")?.getAttribute("data-provider-sandbox-credential-money-enabled") || "",
    credentialProviderCalled: document.querySelector("[data-provider-sandbox-credential-readiness]")?.getAttribute("data-provider-sandbox-credential-provider-called") || "",
    credentialRowCount: document.querySelectorAll("[data-provider-sandbox-credential-row]").length,
    credentialStatuses: Array.from(document.querySelectorAll("[data-provider-sandbox-credential-row]")).map(row => row.getAttribute("data-provider-sandbox-credential-status") || ""),
    credentialPacket: document.querySelector("#providerSandboxCredentialReadinessPacket")?.value || "",
  }));
  assert(providerSandbox.exists && providerSandbox.status === "not_fetched" && providerSandbox.count === 6 && providerSandbox.rowCount === 6, `Provider sandbox callback proof should render six fixture lanes before provider fetch: ${JSON.stringify(providerSandbox)}`);
  assert(providerSandbox.money === "false" && providerSandbox.providerCalled === "false" && providerSandbox.live === "false", "Provider sandbox callback proof must not enable money, provider calls or live activation");
  assert(providerSandbox.endpointStatus === "not_fetched" && providerSandbox.fixturePlanFetched === "false" && providerSandbox.capturedEvents === 0 && providerSandbox.testEnabled === "false", `Provider sandbox callback proof should expose unfetched server-plan state before backend evidence: ${JSON.stringify(providerSandbox)}`);
  assert(providerSandbox.ready === 0 && providerSandbox.blocked === 6 && providerSandbox.statuses.every(status => status === "blocked"), "Provider sandbox callback proof should fail closed before callback evidence");
  assert(providerSandbox.packet.includes("Artbook Provider Sandbox Callback Proof Packet") && providerSandbox.packet.includes("Provider readiness fetched: no") && providerSandbox.packet.includes("Sandbox fixture endpoint: not_fetched") && providerSandbox.packet.includes("providerCalled=false") && providerSandbox.packet.includes("moneyMovement=false"), "Provider sandbox callback packet missing fail-closed fixture criteria");
  assert(providerSandbox.packet.includes("Kenya IDV sandbox session") && providerSandbox.packet.includes("Daraja STK Push sandbox") && providerSandbox.packet.includes("Signed raw-body replay") && providerSandbox.packet.includes("Delivery dispatch callback"), "Provider sandbox callback packet missed core fixture lanes");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|service-account\\s*\\{|private[_ -]?key|raw id|selfie frame|full provider payload/i.test(providerSandbox.packet), "Provider sandbox callback packet appears to leak sensitive values");
  assert(providerSandbox.curl.includes("Artbook Provider Sandbox Masked Callback cURL") && providerSandbox.curl.includes("/api/providers/sandbox-callbacks/daraja_stk_push_sandbox") && providerSandbox.curl.includes("Authorization: Bearer <review-ops-token>") && providerSandbox.curl.includes("moneyMovementEnabled=false") && providerSandbox.curl.includes("rawPayloadStored=false"), "Provider sandbox masked cURL handoff missing endpoint, placeholder token or fail-closed flags");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|service-account\\s*\\{|private[_ -]?key|raw id|selfie frame|full provider payload|\+254\\s?\\d{3,}/i.test(providerSandbox.curl), "Provider sandbox masked cURL appears to leak sensitive or unmasked provider data");
  assert(providerSandbox.hostExists && providerSandbox.hostLanes === 6 && providerSandbox.hostLaneCount === 6 && providerSandbox.hostMoney === "false" && providerSandbox.hostBlocked >= 4, `Provider sandbox host preflight should render six mostly blocked lanes before hosted evidence: ${JSON.stringify(providerSandbox)}`);
  assert(providerSandbox.hostPacket.includes("Artbook Provider Sandbox Hosted Callback Preflight") && providerSandbox.hostPacket.includes("Hosted HTTPS callback URL") && providerSandbox.hostPacket.includes("Raw-body signature proof") && providerSandbox.hostPacket.includes("Replay and idempotency store") && providerSandbox.hostPacket.includes("No-state-mutation guard") && providerSandbox.hostPacket.includes("Money movement enabled: false"), "Provider sandbox host preflight packet missed launch-readiness lanes or fail-closed money flag");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|service-account\\s*\\{|private[_ -]?key|raw id|selfie frame|full provider payload|\+254\\s?\\d{3,}/i.test(providerSandbox.hostPacket), "Provider sandbox host preflight packet appears to leak sensitive or unmasked provider data");
  assert(providerSandbox.credentialExists && providerSandbox.credentialLanes === 6 && providerSandbox.credentialRowCount === 6 && providerSandbox.credentialMoney === "false" && providerSandbox.credentialProviderCalled === "false" && providerSandbox.credentialStatuses.filter(status => status === "blocked").length >= 4, `Provider sandbox credential readiness should render six mostly blocked lanes before vault evidence: ${JSON.stringify(providerSandbox)}`);
  assert(providerSandbox.credentialPacket.includes("Artbook Provider Sandbox Credential Readiness Packet") && providerSandbox.credentialPacket.includes("Server vault names") && providerSandbox.credentialPacket.includes("Sandbox credential proof note") && providerSandbox.credentialPacket.includes("Credential material stored in APK: false") && providerSandbox.credentialPacket.includes("Provider activation enabled: false") && providerSandbox.credentialPacket.includes("Money movement enabled: false"), "Provider sandbox credential readiness packet missed vault/proof-note lanes or fail-closed flags");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|service-account\\s*\\{|private[_ -]?key|raw id|selfie frame|full provider payload|\+254\\s?\\d{3,}/i.test(providerSandbox.credentialPacket), "Provider sandbox credential readiness packet appears to leak sensitive or unmasked provider data");
  await page.evaluate(() => App.copyProviderSandboxCallbackPacket());
  const providerSandboxCopyState = await saved();
  assert((providerSandboxCopyState.backendEvents || []).some(row => row.label === "Provider sandbox callback proof packet copied" && row.providerSandboxCallbackProof === true && row.nonSettling === true && row.moneyMovementEnabled === false && row.providerActivationEnabled === false && row.providerCalled === false), "copying the provider sandbox callback packet did not create non-settling handoff evidence");
  await page.evaluate(() => App.copyProviderSandboxCallbackCurl());
  const providerSandboxCurlCopyState = await saved();
  assert((providerSandboxCurlCopyState.backendEvents || []).some(row => row.label === "Provider sandbox masked cURL copied" && row.providerSandboxMaskedCurl === true && row.providerSandboxTestCallback === true && row.nonSettling === true && row.moneyMovementEnabled === false && row.providerActivationEnabled === false && row.providerCalled === false && row.walletCreditEnabled === false && row.dispatchEnabled === false && row.receiptCandidateCreated === false), "copying the provider sandbox masked cURL did not create fail-closed handoff evidence");
  await page.evaluate(() => App.copyProviderSandboxHostPreflightPacket());
  const providerSandboxHostCopyState = await saved();
  assert((providerSandboxHostCopyState.backendEvents || []).some(row => row.label === "Provider sandbox host preflight copied" && row.providerSandboxHostPreflight === true && row.nonSettling === true && row.moneyMovementEnabled === false && row.providerActivationEnabled === false && row.providerCalled === false && row.walletCreditEnabled === false && row.dispatchEnabled === false && row.receiptCandidateCreated === false), "copying the provider sandbox host preflight packet did not create fail-closed handoff evidence");
  await page.evaluate(() => App.copyProviderSandboxCredentialReadinessPacket());
  const providerSandboxCredentialCopyState = await saved();
  assert((providerSandboxCredentialCopyState.backendEvents || []).some(row => row.label === "Provider sandbox credential readiness copied" && row.providerSandboxCredentialReadiness === true && row.rawCredentialStored === false && row.credentialMaterialExported === false && row.nonSettling === true && row.moneyMovementEnabled === false && row.providerActivationEnabled === false && row.providerCalled === false && row.walletCreditEnabled === false && row.dispatchEnabled === false && row.receiptCandidateCreated === false), "copying the provider sandbox credential readiness packet did not create fail-closed handoff evidence");

  await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const fixturePlan = {
      status: "sandbox_callback_fixtures_captured_review_only",
      fixtureCount: 6,
      capturedEventCount: 2,
      capturedByFixture: { daraja_stk_push_sandbox: 2 },
      providerCalled: false,
      providerActivationEnabled: false,
      liveProviderActivation: false,
      moneyMovementEnabled: false,
      fixtures: [
        { id: "kenya_idv_sandbox", label: "Kenya IDV sandbox session", providerGroup: "identity", endpoint: "POST /api/providers/sandbox-callbacks/kenya_idv_sandbox", status: "blocked_until_fixture_received", acceptedEvidence: ["payloadDigest", "payloadShape"], boundary: "identity_status_replay_only_no_identity_approval", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false },
        { id: "daraja_stk_push_sandbox", label: "Daraja STK Push sandbox", providerGroup: "payments", endpoint: "POST /api/providers/sandbox-callbacks/daraja_stk_push_sandbox", status: "captured_review_only", acceptedEvidence: ["payloadDigest", "payloadShape", "idempotencyDecision"], boundary: "mpesa_callback_replay_only_no_wallet_credit", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false },
        { id: "invoice_qr_parser_callback", label: "Invoice and QR parser callback", providerGroup: "pay_lens", endpoint: "POST /api/providers/sandbox-callbacks/invoice_qr_parser_callback", status: "blocked_until_fixture_received", acceptedEvidence: ["payloadDigest", "payloadShape"], boundary: "parser_result_replay_only_no_checkout", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false },
        { id: "signed_raw_body_replay", label: "Signed raw-body replay", providerGroup: "security", endpoint: "POST /api/providers/sandbox-callbacks/signed_raw_body_replay", status: "blocked_until_fixture_received", acceptedEvidence: ["payloadDigest", "signatureStatus"], boundary: "signature_replay_only_no_provider_success", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false },
        { id: "refund_payout_replay", label: "Refund and payout replay", providerGroup: "settlement", endpoint: "POST /api/providers/sandbox-callbacks/refund_payout_replay", status: "blocked_until_fixture_received", acceptedEvidence: ["payloadDigest", "supportOwner"], boundary: "refund_payout_replay_only_no_refund_or_payout", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false },
        { id: "delivery_dispatch_callback", label: "Delivery dispatch callback", providerGroup: "delivery", endpoint: "POST /api/providers/sandbox-callbacks/delivery_dispatch_callback", status: "blocked_until_fixture_received", acceptedEvidence: ["payloadDigest", "supportOwner"], boundary: "dispatch_replay_only_no_live_dispatch_or_payout", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false }
      ]
    };
    snap.account = "artbook_ops";
    snap.backendConfig = { ...(snap.backendConfig || {}), mode: "local", lastSchema: { name: "Artbook Prototype API", endpoints: { providers: ["GET /api/providers/readiness", "GET /api/providers/sandbox-callbacks/fixture-plan", "POST /api/providers/sandbox-callbacks/:fixture"] } } };
    snap.backendAuthByAccount = {};
    snap.backendProviderReadiness = {
      ...(snap.backendProviderReadiness || {}),
      status: "fetched",
      lastFetch: "QA server plan",
      lastError: "",
      readiness: { summary: {}, runtimeDeploymentReadiness: {}, replayStoreReadiness: {}, sandboxCallbackFixturePlan: fixturePlan },
      sandboxFixturePlan: fixturePlan,
      sandboxFixturePlanStatus: "fetched",
      sandboxFixtureLastFetch: "QA server plan",
      sandboxFixtureLastError: ""
    };
    localStorage.setItem(key, JSON.stringify(snap));
  }, KEY);
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => App.backendSyncDesk("server sandbox fixture plan"));
  await page.waitForTimeout(180);
  const fetchedProviderSandbox = await page.evaluate(() => ({
    status: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-callback-status") || "",
    endpointStatus: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-endpoint-status") || "",
    fixturePlanFetched: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-fixture-plan-fetched") || "",
    capturedEvents: Number(document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-captured-events") || 0),
    ready: Number(document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-callback-ready") || 0),
    blocked: Number(document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-callback-blocked") || 0),
    money: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-money-enabled") || "",
    providerCalled: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-provider-called") || "",
    testEnabled: document.querySelector("[data-provider-sandbox-callback-proof]")?.getAttribute("data-provider-sandbox-test-enabled") || "",
    darajaStatus: document.querySelector('[data-provider-sandbox-callback-row="daraja_stk_push_sandbox"]')?.getAttribute("data-provider-sandbox-callback-status") || "",
    darajaCaptured: Number(document.querySelector('[data-provider-sandbox-callback-row="daraja_stk_push_sandbox"]')?.getAttribute("data-provider-sandbox-captured-events") || 0),
    packet: document.querySelector("#providerSandboxCallbackPacket")?.value || "",
    text: document.body.textContent || ""
  }));
  assert(fetchedProviderSandbox.endpointStatus === "fetched" && fetchedProviderSandbox.fixturePlanFetched === "true" && fetchedProviderSandbox.capturedEvents === 2, `Provider sandbox proof did not render fetched server fixture counts: ${JSON.stringify(fetchedProviderSandbox)}`);
  assert(fetchedProviderSandbox.ready === 1 && fetchedProviderSandbox.blocked === 5 && fetchedProviderSandbox.darajaStatus === "review" && fetchedProviderSandbox.darajaCaptured === 2, "Provider sandbox proof did not promote captured Daraja fixture evidence while leaving other lanes blocked");
  assert(fetchedProviderSandbox.money === "false" && fetchedProviderSandbox.providerCalled === "false" && fetchedProviderSandbox.testEnabled === "true", "Fetched provider sandbox plan must still block provider calls and money movement while enabling masked Review Ops tests");
  assert(fetchedProviderSandbox.packet.includes("Sandbox fixture endpoint: fetched") && fetchedProviderSandbox.packet.includes("Sandbox fixture plan fetched: yes") && fetchedProviderSandbox.packet.includes("Captured by fixture:") && fetchedProviderSandbox.packet.includes("daraja_stk_push_sandbox=2"), "Fetched provider sandbox packet did not include endpoint and captured-count evidence");
  assert(/Server fixture endpoint is live|server sandbox callback/i.test(fetchedProviderSandbox.text), "Fetched provider sandbox UI did not describe the server endpoint state");

  const providerSandboxProofIntake = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-backend-deployment-proof-capture]")),
    options: Array.from(document.querySelectorAll("#backendDeploymentProofLane option")).map(row => row.value),
    packet: document.querySelector("#backendDeploymentProofPacket")?.value || "",
  }));
  assert(providerSandboxProofIntake.exists && providerSandboxProofIntake.options.includes("provider_sandbox_hosted_https_callback") && providerSandboxProofIntake.options.includes("provider_sandbox_raw_body_signature") && providerSandboxProofIntake.options.includes("provider_sandbox_mutation_guard_contract"), "Production proof intake should include provider sandbox hosted callback lanes");
  assert(providerSandboxProofIntake.packet.includes("Evidence lanes: 6") || providerSandboxProofIntake.packet.includes("Evidence lanes: 14"), "Production proof intake packet should include deployment evidence lane count");
  await page.evaluate(async () => {
    document.querySelector("#backendDeploymentProofLane").value = "provider_sandbox_hosted_https_callback";
    document.querySelector("#backendDeploymentProofType").value = "Hosted sandbox callback proof";
    document.querySelector("#backendDeploymentProofSource").value = "Provider host dashboard redacted";
    document.querySelector("#backendDeploymentProofNote").value = "Public HTTPS callback accepted masked Daraja sandbox replay and returned no-state-change flags.";
    await App.saveBackendDeploymentProofNote();
  });
  await page.waitForTimeout(220);
  const providerSandboxProofNote = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const note = (snap.backendDeploymentProofNotes || []).find(row => row.laneId === "provider_sandbox_hosted_https_callback") || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Deployment proof note recorded" && row.deploymentProofNote === true && /provider_sandbox_hosted_https_callback/.test(row.detail || "")) || null;
    return {
      note,
      event,
      cardExists: Boolean(document.querySelector('[data-backend-deployment-proof-lane="provider_sandbox_hosted_https_callback"]')),
      packet: document.querySelector("#backendDeploymentProofPacket")?.value || ""
    };
  }, KEY);
  assert(providerSandboxProofNote.note?.laneId === "provider_sandbox_hosted_https_callback" && providerSandboxProofNote.cardExists, "Provider sandbox hosted callback proof note should save and render in proof intake");
  assert(providerSandboxProofNote.note.productionHostReady === false && providerSandboxProofNote.note.providerActivationEnabled === false && providerSandboxProofNote.note.walletCreditEnabled === false && providerSandboxProofNote.note.dispatchEnabled === false && providerSandboxProofNote.note.receiptCandidateCreated !== true && providerSandboxProofNote.note.moneyMovementEnabled === false, "Provider sandbox hosted callback proof note must stay fail-closed");
  assert(providerSandboxProofNote.event?.deploymentProofNote === true && providerSandboxProofNote.event.nonSettling === true, "Provider sandbox hosted callback proof note should record non-settling backend audit evidence");
  assert(providerSandboxProofNote.packet.includes("provider_sandbox_hosted_https_callback") && providerSandboxProofNote.packet.includes("approval blocked") && providerSandboxProofNote.packet.includes("money movement false") && !/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|service-account\\s*\\{|private[_ -]?key|raw id|selfie frame|full provider payload|\+254\\s?\\d{3,}/i.test(providerSandboxProofNote.packet), "Provider sandbox hosted callback proof intake packet should include redacted fail-closed proof note");
  await page.evaluate(async () => {
    document.querySelector("#backendDeploymentProofLane").value = "raw_body_gateway_proof";
    document.querySelector("#backendDeploymentProofType").value = "api_key=abc123 private_key=BEGIN account number 987654321";
    document.querySelector("#backendDeploymentProofSource").value = "Bearer sk_live_example +254712345678 service-account {private}";
    document.querySelector("#backendDeploymentProofNote").value = "DARAJA_CONSUMER_SECRET=supersecret raw id ABC-123 full provider payload: {phone:+254712345678}";
    await App.saveBackendDeploymentProofNote();
  });
  await page.waitForFunction(() => (document.querySelector("#backendDeploymentProofPacket")?.value || "").includes("redaction applied"), null, { timeout: 5000 });
  const deploymentProofRedaction = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const note = (snap.backendDeploymentProofNotes || []).find(row => row.laneId === "raw_body_gateway_proof") || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Deployment proof note recorded" && row.redactionApplied === true && row.deploymentProofNote === true) || null;
    return {
      note,
      event,
      redactedCard: Boolean(document.querySelector('[data-backend-deployment-proof-lane="raw_body_gateway_proof"][data-backend-deployment-proof-redaction="applied"]')),
      packet: document.querySelector("#backendDeploymentProofPacket")?.value || ""
    };
  }, KEY);
  const redactedText = `${deploymentProofRedaction.note?.artifactType || ""} ${deploymentProofRedaction.note?.source || ""} ${deploymentProofRedaction.note?.note || ""} ${deploymentProofRedaction.packet || ""}`;
  assert(deploymentProofRedaction.note?.redactionApplied === true && deploymentProofRedaction.note?.sensitiveMaterialStored === false && deploymentProofRedaction.note?.rawCredentialStored === false && deploymentProofRedaction.note?.rawProviderPayloadStored === false && deploymentProofRedaction.redactedCard, "Deployment proof note should flag redaction and render redaction status");
  assert(deploymentProofRedaction.event?.redactionApplied === true && deploymentProofRedaction.event?.sensitiveMaterialStored === false && deploymentProofRedaction.event?.rawCredentialStored === false && deploymentProofRedaction.event?.rawProviderPayloadStored === false && deploymentProofRedaction.event?.nonSettling === true, "Deployment proof redaction should be recorded as non-settling backend evidence");
  assert(deploymentProofRedaction.packet.includes("redaction applied") && deploymentProofRedaction.packet.includes("sensitive material stored false") && !/abc123|sk_live_example|supersecret|987654321|service-account\s*\{|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=|private[_ -]?key|raw id|selfie frame|full provider payload|\+254\s?\d{3,}/i.test(redactedText), "Deployment proof redaction should remove sensitive-looking material from saved note and packet");

  await page.evaluate(() => {
    const callbackEvent = {
      id: "provider_sandbox_callback_ui_qa",
      fixtureId: "daraja_stk_push_sandbox",
      providerGroup: "payments",
      providerEventId: "ws_CO_UI_SANDBOX_QA",
      replayKey: "artbook-ui-sandbox-qa",
      idempotencyDecision: "first_seen_unverified_no_state_change",
      payloadDigest: "sha256:provider-sandbox-ui-qa",
      payloadShape: ["amount", "currency", "provider", "signatureStatus", "status"],
      rawPayloadStored: false,
      providerCalled: false,
      providerActivationEnabled: false,
      liveProviderActivation: false,
      identityApproved: false,
      kybApproved: false,
      walletCreditEnabled: false,
      escrowReleaseEnabled: false,
      dispatchEnabled: false,
      refundCompletionEnabled: false,
      payoutReleaseEnabled: false,
      receiptCandidateCreated: false,
      founderRevenueRecognized: false,
      moneyMovementEnabled: false,
      nonSettling: true,
      receivedAt: "QA server callback"
    };
    const fixturePlan = {
      status: "sandbox_callback_fixtures_captured_review_only",
      fixtureCount: 6,
      capturedEventCount: 3,
      capturedByFixture: { daraja_stk_push_sandbox: 3 },
      providerCalled: false,
      providerActivationEnabled: false,
      liveProviderActivation: false,
      moneyMovementEnabled: false,
      latestEvents: [callbackEvent],
      fixtures: [
        { id: "kenya_idv_sandbox", label: "Kenya IDV sandbox session", providerGroup: "identity", endpoint: "POST /api/providers/sandbox-callbacks/kenya_idv_sandbox", status: "blocked_until_fixture_received", acceptedEvidence: ["payloadDigest", "payloadShape"], boundary: "identity_status_replay_only_no_identity_approval", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false },
        { id: "daraja_stk_push_sandbox", label: "Daraja STK Push sandbox", providerGroup: "payments", endpoint: "POST /api/providers/sandbox-callbacks/daraja_stk_push_sandbox", status: "captured_review_only", acceptedEvidence: ["payloadDigest", "payloadShape", "idempotencyDecision"], boundary: "mpesa_callback_replay_only_no_wallet_credit", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false },
        { id: "invoice_qr_parser_callback", label: "Invoice and QR parser callback", providerGroup: "pay_lens", endpoint: "POST /api/providers/sandbox-callbacks/invoice_qr_parser_callback", status: "blocked_until_fixture_received", acceptedEvidence: ["payloadDigest", "payloadShape"], boundary: "parser_result_replay_only_no_checkout", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false },
        { id: "signed_raw_body_replay", label: "Signed raw-body replay", providerGroup: "security", endpoint: "POST /api/providers/sandbox-callbacks/signed_raw_body_replay", status: "blocked_until_fixture_received", acceptedEvidence: ["payloadDigest", "signatureStatus"], boundary: "signature_replay_only_no_provider_success", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false },
        { id: "refund_payout_replay", label: "Refund and payout replay", providerGroup: "settlement", endpoint: "POST /api/providers/sandbox-callbacks/refund_payout_replay", status: "blocked_until_fixture_received", acceptedEvidence: ["payloadDigest", "supportOwner"], boundary: "refund_payout_replay_only_no_refund_or_payout", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false },
        { id: "delivery_dispatch_callback", label: "Delivery dispatch callback", providerGroup: "delivery", endpoint: "POST /api/providers/sandbox-callbacks/delivery_dispatch_callback", status: "blocked_until_fixture_received", acceptedEvidence: ["payloadDigest", "supportOwner"], boundary: "dispatch_replay_only_no_live_dispatch_or_payout", providerCalled: false, moneyMovementEnabled: false, liveProviderActivation: false }
      ]
    };
    window.__providerSandboxCallbackBody = null;
    window.__providerSandboxCallbackHeaders = null;
    window.__providerSandboxOriginalFetch = window.fetch;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (url, options = {}) => {
      const path = String(url);
      if(path.includes("/api/auth/login") || path.includes("/api/auth/register")){
        return new Response(JSON.stringify({ token: "qa-token", user: { id: "qa-user", profileId: "artbook_ops" } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if(path.includes("/api/me")){
        return new Response(JSON.stringify({ user: { id: "qa-user", profileId: "artbook_ops" } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if(path.includes("/api/providers/sandbox-callbacks/daraja_stk_push_sandbox")){
        window.__providerSandboxCallbackBody = JSON.parse(options.body || "{}");
        window.__providerSandboxCallbackHeaders = Object.fromEntries(new Headers(options.headers || {}).entries());
        return new Response(JSON.stringify({
          callbackEvent,
          fixturePlan,
          settlementStatus: "provider_sandbox_callback_replay_only_no_settlement",
          providerStatus: "provider_not_configured",
          providerCalled: false,
          providerActivationEnabled: false,
          liveProviderActivation: false,
          moneyMovementEnabled: false
        }), { status: 202, headers: { "content-type": "application/json" } });
      }
      if(path.includes("/api/providers/sandbox-callbacks/fixture-plan")){
        return new Response(JSON.stringify({
          fixturePlan,
          settlementStatus: "provider_sandbox_callback_plan_only_no_settlement",
          providerStatus: "provider_not_configured",
          providerCalled: false,
          providerActivationEnabled: false,
          liveProviderActivation: false,
          moneyMovementEnabled: false
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return originalFetch(url, options);
    };
  });
  await page.evaluate(() => App.submitProviderSandboxCallbackTest());
  await page.waitForTimeout(180);
  const submittedProviderSandbox = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const latest = snap.backendProviderReadiness?.sandboxLatestCallbackEvent || null;
    const body = window.__providerSandboxCallbackBody || {};
    const bodyText = JSON.stringify(body);
    const audit = (snap.backendEvents || []).find(row => row.label === "Provider sandbox test callback captured");
    const proof = document.querySelector("[data-provider-sandbox-callback-proof]");
    return {
      latest,
      latestStripExists: Boolean(document.querySelector("[data-provider-sandbox-latest-event]")),
      latestFixture: document.querySelector("[data-provider-sandbox-latest-event]")?.getAttribute("data-provider-sandbox-latest-fixture") || "",
      latestIdempotency: document.querySelector("[data-provider-sandbox-latest-event]")?.getAttribute("data-provider-sandbox-latest-idempotency") || "",
      latestRawPayload: document.querySelector("[data-provider-sandbox-latest-event]")?.getAttribute("data-provider-sandbox-latest-raw-payload") || "",
      latestMoney: document.querySelector("[data-provider-sandbox-latest-event]")?.getAttribute("data-provider-sandbox-latest-money-enabled") || "",
      capturedEvents: Number(proof?.getAttribute("data-provider-sandbox-captured-events") || 0),
      money: proof?.getAttribute("data-provider-sandbox-money-enabled") || "",
      providerCalled: proof?.getAttribute("data-provider-sandbox-provider-called") || "",
      packet: document.querySelector("#providerSandboxCallbackPacket")?.value || "",
      body,
      bodyText,
      headers: window.__providerSandboxCallbackHeaders || {},
      audit
    };
  }, KEY);
  assert(submittedProviderSandbox.latest?.id === "provider_sandbox_callback_ui_qa" && submittedProviderSandbox.latestStripExists && submittedProviderSandbox.latestFixture === "daraja_stk_push_sandbox", `Provider sandbox masked submit did not surface latest event: ${JSON.stringify(submittedProviderSandbox)}`);
  assert(submittedProviderSandbox.capturedEvents === 3 && submittedProviderSandbox.latestIdempotency === "first_seen_unverified_no_state_change" && submittedProviderSandbox.latestRawPayload === "false" && submittedProviderSandbox.latestMoney === "false", "Submitted provider sandbox callback should surface digest-only latest-event metadata");
  assert(submittedProviderSandbox.money === "false" && submittedProviderSandbox.providerCalled === "false" && submittedProviderSandbox.latest.moneyMovementEnabled === false && submittedProviderSandbox.latest.providerCalled === false && submittedProviderSandbox.latest.walletCreditEnabled === false && submittedProviderSandbox.latest.dispatchEnabled === false && submittedProviderSandbox.latest.receiptCandidateCreated === false, "Submitted provider sandbox callback must remain non-settling and non-operational");
  assert(submittedProviderSandbox.packet.includes("Latest callback event: provider_sandbox_callback_ui_qa") && submittedProviderSandbox.packet.includes("Latest callback idempotency: first_seen_unverified_no_state_change") && submittedProviderSandbox.packet.includes("Latest raw payload stored: false"), "Provider sandbox packet did not include latest callback proof metadata");
  assert(submittedProviderSandbox.body.source === "artbook_backend_sync_masked_test" && submittedProviderSandbox.headers["idempotency-key"] && !/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|raw id|selfie frame|full provider payload|\+254\\s?\\d{3,}/i.test(submittedProviderSandbox.bodyText), "Provider sandbox masked callback request leaked sensitive or unmasked provider data");
  assert(submittedProviderSandbox.audit?.providerSandboxTestCallback === true && submittedProviderSandbox.audit.nonSettling === true && submittedProviderSandbox.audit.moneyMovementEnabled === false && submittedProviderSandbox.audit.providerActivationEnabled === false && submittedProviderSandbox.audit.providerCalled === false && submittedProviderSandbox.audit.walletCreditEnabled === false && submittedProviderSandbox.audit.identityApprovalEnabled === false && submittedProviderSandbox.audit.dispatchEnabled === false && submittedProviderSandbox.audit.receiptCandidateCreated === false, "Provider sandbox masked callback did not create fail-closed backend audit evidence");
  await page.evaluate(() => {
    if(window.__providerSandboxOriginalFetch) window.fetch = window.__providerSandboxOriginalFetch;
  });

  await page.evaluate(({ key, snapshot }) => {
    const restored = { ...snapshot, account: "riley_biz" };
    restored.backendConfig = { ...(restored.backendConfig || {}), mode: "offline" };
    restored.backendProviderReadiness = {
      ...(restored.backendProviderReadiness || {}),
      status: "idle",
      readiness: null,
      sandboxFixturePlan: null,
      sandboxFixturePlanStatus: "idle",
      sandboxFixtureLastFetch: "",
      sandboxFixtureLastError: ""
    };
    localStorage.setItem(key, JSON.stringify(restored));
  }, { key: KEY, snapshot: providerSandboxCopyState });
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.backendSyncDesk();
  });
  await page.waitForTimeout(180);
  assert(desk.text.includes("KYC money clearance") && desk.text.includes("Original ID capture") && desk.text.includes("Selfie/liveness match") && desk.text.includes("Country proof and wallet tier"), "backend sync desk missing founder-readable KYC clearance ladder");
  assert(desk.text.includes("Source-of-funds triggers") && desk.text.includes("Settlement exceptions clear") && desk.text.includes("Manual Review Ops approval"), "KYC clearance ladder missed source-of-funds, settlement or manual approval gates");
  const kycClearance = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-kyc-money-clearance]")),
    status: document.querySelector("[data-kyc-money-clearance]")?.getAttribute("data-kyc-clearance-status") || "",
    steps: Number(document.querySelector("[data-kyc-money-clearance]")?.getAttribute("data-kyc-clearance-steps") || 0),
    ready: Number(document.querySelector("[data-kyc-money-clearance]")?.getAttribute("data-kyc-clearance-ready") || 0),
    blocked: Number(document.querySelector("[data-kyc-money-clearance]")?.getAttribute("data-kyc-clearance-blocked") || 0),
    liveMoney: document.querySelector("[data-kyc-money-clearance]")?.getAttribute("data-kyc-live-money-enabled") || "",
    cardCount: document.querySelectorAll("[data-kyc-clearance-step]").length,
    statuses: Array.from(document.querySelectorAll("[data-kyc-clearance-step]")).map(row => row.getAttribute("data-kyc-clearance-step-status") || ""),
    packet: document.querySelector("#kycMoneyClearancePacket")?.value || "",
  }));
  assert(kycClearance.exists && kycClearance.status === "not_fetched" && kycClearance.steps === 7 && kycClearance.cardCount === 7, `KYC clearance ladder should render seven visible launch gates before backend fetch: ${JSON.stringify(kycClearance)}`);
  assert(kycClearance.liveMoney === "false" && kycClearance.ready === 0 && kycClearance.blocked >= 5 && kycClearance.statuses.includes("blocked"), "KYC clearance ladder should fail closed before provider/compliance proof");
  assert(kycClearance.packet.includes("Artbook KYC Money Clearance Ladder") && kycClearance.packet.includes("Runbook fetched: no") && kycClearance.packet.includes("Live money enabled: false") && kycClearance.packet.includes("Manual Review Ops approval"), "KYC clearance packet missing blocked live-money criteria");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|raw id|selfie frame/i.test(kycClearance.packet), "KYC clearance packet appears to leak sensitive values");
  await page.evaluate(() => App.copyKycMoneyClearancePacket());
  const kycCopyState = await saved();
  assert((kycCopyState.backendEvents || []).some(row => row.label === "KYC money clearance packet copied" && row.kycMoneyClearance === true && row.nonSettling === true && row.moneyMovementEnabled === false), "copying the KYC clearance packet did not create non-settling handoff evidence");
  assert(desk.text.includes("Verification provider decision") && desk.text.includes("Kenya-first identity provider") && desk.text.includes("Entrust/Onfido global fallback"), "backend sync desk missing verification provider decision matrix");
  assert(desk.text.includes("Sumsub global KYC/KYB comparator") && desk.text.includes("Manual Review Ops fallback") && desk.text.includes("M-Pesa/Daraja stays payment-only"), "verification provider matrix missed comparator, manual review or payment-only boundary");
  const verificationProvider = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-verification-provider-decision]")),
    status: document.querySelector("[data-verification-provider-decision]")?.getAttribute("data-verification-provider-status") || "",
    recommendation: document.querySelector("[data-verification-provider-decision]")?.getAttribute("data-verification-provider-recommendation") || "",
    steps: Number(document.querySelector("[data-verification-provider-decision]")?.getAttribute("data-verification-provider-steps") || 0),
    money: document.querySelector("[data-verification-provider-decision]")?.getAttribute("data-verification-provider-money-enabled") || "",
    activation: document.querySelector("[data-verification-provider-decision]")?.getAttribute("data-verification-provider-activation-enabled") || "",
    optionCount: document.querySelectorAll("[data-verification-provider-option]").length,
    statuses: Array.from(document.querySelectorAll("[data-verification-provider-option]")).map(row => row.getAttribute("data-verification-provider-status") || ""),
    packet: document.querySelector("#verificationProviderDecisionPacket")?.value || "",
  }));
  assert(verificationProvider.exists && verificationProvider.status === "decision_required" && verificationProvider.recommendation === "kenya_first_identity_provider_primary", `Verification provider decision should make a Kenya-first recommendation: ${JSON.stringify(verificationProvider)}`);
  assert(verificationProvider.steps === 6 && verificationProvider.optionCount === 6 && verificationProvider.statuses.includes("recommended") && verificationProvider.statuses.includes("payment_only") && verificationProvider.statuses.includes("required"), "Verification provider matrix should expose six visible lanes with recommendation, payment-only and manual-review states");
  assert(verificationProvider.money === "false" && verificationProvider.activation === "false", "Verification provider decision must not enable provider activation or money movement");
  assert(verificationProvider.packet.includes("Artbook Verification Provider Decision Packet") && verificationProvider.packet.includes("Recommendation: Kenya-first identity provider primary") && verificationProvider.packet.includes("Entrust/Onfido") && verificationProvider.packet.includes("M-Pesa/Daraja payment rail"), "Verification provider decision packet missing provider recommendation or payment-only rail");
  assert(verificationProvider.packet.includes("providerActivation=false") && verificationProvider.packet.includes("moneyMovement=false") && verificationProvider.packet.includes("Manual Review Ops"), "Verification provider decision packet must stay fail-closed and human/provider-reviewed");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|private[_ -]?key|raw id|selfie frame/i.test(verificationProvider.packet), "Verification provider decision packet appears to leak sensitive values");
  await page.evaluate(() => App.copyVerificationProviderDecisionPacket());
  const verificationProviderCopyState = await saved();
  assert((verificationProviderCopyState.backendEvents || []).some(row => row.label === "Verification provider decision packet copied" && row.verificationProviderDecision === true && row.nonSettling === true && row.moneyMovementEnabled === false && row.providerActivationEnabled === false), "copying the verification provider decision packet did not create non-settling handoff evidence");
  assert(desk.text.includes("Kenya partner shortlist") && desk.text.includes("Smile ID or Kenya-first IDV") && desk.text.includes("Safaricom Daraja / M-Pesa"), "backend sync desk missing Kenya launch partner shortlist");
  assert(desk.text.includes("Backend secret vault and webhook partner") && desk.text.includes("Kenya data, AML and Play Store counsel"), "Kenya partner shortlist missed backend vault or legal/data lanes");
  const partnerShortlist = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-kenya-partner-shortlist]")),
    count: Number(document.querySelector("[data-kenya-partner-shortlist]")?.getAttribute("data-kenya-partner-shortlist-count") || 0),
    outreach: Number(document.querySelector("[data-kenya-partner-shortlist]")?.getAttribute("data-kenya-partner-shortlist-outreach") || 0),
    money: document.querySelector("[data-kenya-partner-shortlist]")?.getAttribute("data-kenya-partner-shortlist-money-enabled") || "",
    contracts: document.querySelector("[data-kenya-partner-shortlist]")?.getAttribute("data-kenya-partner-shortlist-contracts-ready") || "",
    rowCount: document.querySelectorAll("[data-kenya-partner-shortlist-row]").length,
    statuses: Array.from(document.querySelectorAll("[data-kenya-partner-shortlist-row]")).map(row => row.getAttribute("data-kenya-partner-shortlist-status") || ""),
    packet: document.querySelector("#kenyaPartnerShortlistPacket")?.value || "",
  }));
  assert(partnerShortlist.exists && partnerShortlist.count === 6 && partnerShortlist.rowCount === 6 && partnerShortlist.outreach === 1, `Kenya partner shortlist should expose six partner lanes and one start-now lane: ${JSON.stringify(partnerShortlist)}`);
  assert(partnerShortlist.money === "false" && partnerShortlist.contracts === "false", "Kenya partner shortlist must not mark contracts or money as ready");
  assert(partnerShortlist.statuses.includes("outreach_now") && partnerShortlist.statuses.includes("payment_only") && partnerShortlist.statuses.includes("required"), "Kenya partner shortlist should include outreach, payment-only and legal-required states");
  assert(partnerShortlist.packet.includes("Artbook Kenya Launch Partner Shortlist Packet") && partnerShortlist.packet.includes("Smile ID or Kenya-first IDV") && partnerShortlist.packet.includes("Safaricom Daraja / M-Pesa") && partnerShortlist.packet.includes("Contracts ready: false"), "Kenya partner shortlist packet missing launch questions or fail-closed contract state");
  assert(partnerShortlist.packet.includes("Money movement: false") && partnerShortlist.packet.includes("Identity approval: false") && partnerShortlist.packet.includes("Backend secret vault and webhook partner"), "Kenya partner shortlist packet must preserve money, identity and backend-vault boundaries");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|private[_ -]?key|raw id|selfie frame|full phone/i.test(partnerShortlist.packet), "Kenya partner shortlist packet appears to leak sensitive values");
  await page.evaluate(() => App.copyKenyaPartnerShortlistPacket());
  const partnerShortlistCopyState = await saved();
  assert((partnerShortlistCopyState.backendEvents || []).some(row => row.label === "Kenya launch partner shortlist packet copied" && row.kenyaPartnerShortlist === true && row.nonSettling === true && row.moneyMovementEnabled === false && row.providerActivationEnabled === false && row.contractsReady === false), "copying the Kenya partner shortlist did not create non-settling handoff evidence");
  assert(desk.opacity === "1", "backend sync modal is not opaque");
  assert(desk.overflow <= 2, "backend sync desk introduced horizontal overflow");
  await page.evaluate(() => App.closeModal());
});

await step("android release handoff separates install from foreground proof", async () => {
  const original = await saved();
  await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    snap.account = "artbook_ops";
    snap.backendProviderReadiness = {
      ...(snap.backendProviderReadiness || {}),
      status: "fetched",
      lastFetch: "QA android foreground proof",
      readiness: {
        summary: { missingSecretCount: 1, blockedPlayStoreCount: 1 },
        releaseEvidencePacket: {
          text: "QA release evidence packet",
          settlementStatus: "release_evidence_packet_review_only_no_settlement",
          moneyMovementEnabled: false,
          apk: {
            packageName: "com.steward.artbook",
            versionName: "1.181",
            versionCode: 181,
            sha256: "527D7F2D74AE00C557DF75C4EB59886A15B5B3BDE23E9BBCDEAF375C4B337737",
            bytes: 12345678,
            signingSummary: "release upload key configured; Play App Signing record attached",
            releaseSigningConfigured: true,
            permissions: ["INTERNET", "ACCESS_FINE_LOCATION", "RECORD_AUDIO"]
          },
          latestProgress: {
            latestSectionTitle: "Deployment Proof Redaction Guard Pass",
            phoneInstallStatus: "in-place install succeeded; package versionName=1.181; pid 16559 running; mCurrentFocus=NotificationShade; mDreamingLockscreen=true; final foreground focus proof lockscreen-blocked; crash buffer clean"
          }
        },
        releaseChecklist: {
          ownerGroups: [
            {
              owner: "android",
              label: "Android",
              items: [
                { id: "release_build", title: "Release build" },
                { id: "phone_install", title: "Phone install" },
                { id: "foreground_focus", title: "Foreground focus" }
              ]
            }
          ]
        },
        playStoreReleaseBlockers: [
          { id: "data_safety", copy: "Data Safety and Play Console evidence still required." }
        ]
      }
    };
    localStorage.setItem(key, JSON.stringify(snap));
  }, KEY);
  await page.reload({ waitUntil: "load" });
  await page.evaluate(() => App.backendSyncDesk("android foreground proof qa"));
  await page.waitForTimeout(180);
  const androidRelease = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-android-release-handoff]")),
    installProof: document.querySelector("[data-android-release-handoff]")?.getAttribute("data-phone-install-proof") || "",
    foregroundProof: document.querySelector("[data-android-release-handoff]")?.getAttribute("data-phone-foreground-proof") || "",
    lockscreen: document.querySelector("[data-android-release-handoff]")?.getAttribute("data-phone-lockscreen-blocked") || "",
    money: document.querySelector("[data-android-release-handoff]")?.getAttribute("data-money-movement-enabled") || "",
    phoneSteps: Boolean(document.querySelector("[data-android-phone-proof-next-steps]")),
    phoneStepsAccepted: document.querySelector("[data-android-phone-proof-next-steps]")?.getAttribute("data-phone-proof-accepted") || "",
    phoneStepsNoSecret: document.querySelector("[data-android-phone-proof-next-steps]")?.getAttribute("data-phone-proof-no-unlock-secret") || "",
    phoneStepsAdbRequired: document.querySelector("[data-android-phone-proof-next-steps]")?.getAttribute("data-phone-proof-adb-device-required") || "",
    phoneStepsTargetFocus: document.querySelector("[data-android-phone-proof-next-steps]")?.getAttribute("data-phone-proof-target-focus") || "",
    phoneCommandHelper: Boolean(document.querySelector("[data-android-phone-proof-command-helper]")),
    phoneCommandNoSecret: document.querySelector("[data-android-phone-proof-command-helper]")?.getAttribute("data-phone-proof-command-no-unlock-secret") || "",
    phoneCommandTargetFocus: document.querySelector("[data-android-phone-proof-command-helper]")?.getAttribute("data-phone-proof-command-target-focus") || "",
    phoneCommandProviderCalled: document.querySelector("[data-android-phone-proof-command-helper]")?.getAttribute("data-phone-proof-command-provider-called") || "",
    phoneCommandMoney: document.querySelector("[data-android-phone-proof-command-helper]")?.getAttribute("data-phone-proof-command-money-enabled") || "",
    phoneCommands: document.querySelector("#androidPhoneProofCommands")?.value || "",
    phoneProofOutputIntake: Boolean(document.querySelector("[data-android-phone-proof-output-intake]")),
    phoneProofOutputStatus: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-status") || "",
    phoneProofOutputForeground: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-foreground") || "",
    phoneProofOutputRawStored: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-raw-stored") || "",
    phoneProofOutputNoSecret: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-no-unlock-secret") || "",
    phoneProofOutputLaunchApproved: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-launch-approved") || "",
    phoneProofOutputProviderCalled: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-provider-called") || "",
    phoneProofOutputMoney: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-money-enabled") || "",
    signingProofIntake: Boolean(document.querySelector("[data-android-signing-proof-intake]")),
    signingProofStatus: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-status") || "",
    signingProofReviewReady: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-review-ready") || "",
    signingProofRawStored: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-raw-stored") || "",
    signingProofKeystoreStored: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-keystore-material-stored") || "",
    signingProofStoreApproval: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-store-approval") || "",
    signingProofProviderCalled: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-provider-called") || "",
    signingProofMoney: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-money-enabled") || "",
    playProofIntake: Boolean(document.querySelector("[data-play-store-proof-intake]")),
    playProofStatus: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-status") || "",
    playProofReviewReady: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-review-ready") || "",
    playProofRawStored: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-raw-stored") || "",
    playProofDataSafetySubmitted: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-data-safety-submitted") || "",
    playProofStoreApproval: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-store-approval") || "",
    playProofBillingEnabled: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-billing-enabled") || "",
    playProofRestrictedPublished: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-restricted-media-published") || "",
    playProofProviderCalled: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-provider-called") || "",
    playProofMoney: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-money-enabled") || "",
    billingProofIntake: Boolean(document.querySelector("[data-play-billing-proof-intake]")),
    billingProofStatus: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-status") || "",
    billingProofReviewReady: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-review-ready") || "",
    billingProofRawStored: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-raw-stored") || "",
    billingProofTokenStored: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-token-stored") || "",
    billingProofProductCreated: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-product-created") || "",
    billingProofBillingEnabled: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-billing-enabled") || "",
    billingProofEntitlementGranted: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-entitlement-granted") || "",
    billingProofRtdnActivated: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-rtdn-activated") || "",
    billingProofStoreApproval: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-store-approval") || "",
    billingProofMoney: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-money-enabled") || "",
    billingProofRevenue: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-revenue-recognized") || "",
    reviewerProofIntake: Boolean(document.querySelector("[data-play-reviewer-proof-intake]")),
    reviewerProofStatus: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-status") || "",
    reviewerProofReviewReady: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-review-ready") || "",
    reviewerProofRawStored: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-raw-stored") || "",
    reviewerProofCredentialsStored: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-credentials-stored") || "",
    reviewerProofAppAccessSubmitted: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-app-access-submitted") || "",
    reviewerProofPrivacyPublished: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-privacy-published") || "",
    reviewerProofDeletionVerified: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-deletion-verified") || "",
    reviewerProofStoreApproval: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-store-approval") || "",
    reviewerProofMoney: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-money-enabled") || "",
    backendGate: Boolean(document.querySelector("[data-android-release-backend-provider-gate]")),
    backendProviderEnabled: document.querySelector("[data-android-release-backend-provider-gate]")?.getAttribute("data-android-backend-provider-enabled") || "",
    backendHostedReady: document.querySelector("[data-android-release-backend-provider-gate]")?.getAttribute("data-android-backend-hosted-ready") || "",
    backendHostedProbeReady: Number(document.querySelector("[data-android-release-backend-provider-gate]")?.getAttribute("data-android-backend-hosted-probes-ready") || 0),
    backendHostedProbes: Number(document.querySelector("[data-android-release-backend-provider-gate]")?.getAttribute("data-android-backend-hosted-probes") || 0),
    backendProofReady: Number(document.querySelector("[data-android-release-backend-provider-gate]")?.getAttribute("data-android-backend-proof-ready") || 0),
    backendProofBlocked: Number(document.querySelector("[data-android-release-backend-provider-gate]")?.getAttribute("data-android-backend-proof-blocked") || 0),
    backendCredentialApk: document.querySelector("[data-android-release-backend-provider-gate]")?.getAttribute("data-android-backend-credential-material-apk") || "",
    backendMoney: document.querySelector("[data-android-release-backend-provider-gate]")?.getAttribute("data-android-backend-money-enabled") || "",
    lanes: Object.fromEntries(Array.from(document.querySelectorAll("[data-android-release-lane]")).map(row => [row.getAttribute("data-android-release-lane") || "", row.getAttribute("data-android-release-status") || ""])),
    packet: document.querySelector("#androidReleaseHandoffPacket")?.value || "",
    playStorePacket: document.querySelector("#playStoreSafetyPacket")?.value || "",
    billingPacket: document.querySelector("#playBillingHandoffPacket")?.value || "",
    reviewerPacket: document.querySelector("#playReviewerAccessPacket")?.value || "",
    text: document.querySelector("#modal.on")?.innerText || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(androidRelease.exists && androidRelease.installProof === "captured" && androidRelease.foregroundProof === "blocked" && androidRelease.lockscreen === "true" && androidRelease.money === "false", `Android release handoff should block foreground proof while allowing install evidence: ${JSON.stringify(androidRelease)}`);
  assert(androidRelease.phoneSteps && androidRelease.phoneStepsAccepted === "blocked" && androidRelease.phoneStepsNoSecret === "true" && androidRelease.phoneStepsAdbRequired === "true" && androidRelease.phoneStepsTargetFocus === "com.steward.artbook/.MainActivity", `Android phone-proof next steps should be visible and fail-closed: ${JSON.stringify(androidRelease)}`);
  assert(androidRelease.phoneCommandHelper && androidRelease.phoneCommandNoSecret === "true" && androidRelease.phoneCommandTargetFocus === "com.steward.artbook/.MainActivity" && androidRelease.phoneCommandProviderCalled === "false" && androidRelease.phoneCommandMoney === "false", `Android phone-proof command helper should be visible and fail-closed: ${JSON.stringify(androidRelease)}`);
  assert(androidRelease.phoneCommands.includes("Artbook Android Phone Proof Commands") && androidRelease.phoneCommands.includes("adb devices -l") && androidRelease.phoneCommands.includes("adb install -r -d") && androidRelease.phoneCommands.includes("adb shell monkey -p com.steward.artbook") && androidRelease.phoneCommands.includes("mCurrentFocus mFocusedApp") && androidRelease.phoneCommands.includes("FATAL EXCEPTION com.steward.artbook") && androidRelease.phoneCommands.includes("Manual unlock required before launch: true") && androidRelease.phoneCommands.includes("No unlock secret stored/exported: true") && androidRelease.phoneCommands.includes("Money movement enabled: false"), "Android phone-proof commands should include device/install/foreground/crash evidence steps and fail-closed flags");
  assert(!/140915|adb shell input text|password|pin|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=|private[_ -]?key|service-account\s*\{|full provider payload|\+254\s?\d{3,}/i.test(androidRelease.phoneCommands), "Android phone-proof commands appear to leak unlock or sensitive material");
  assert(androidRelease.phoneProofOutputIntake && androidRelease.phoneProofOutputStatus === "not_captured" && androidRelease.phoneProofOutputForeground === "false" && androidRelease.phoneProofOutputRawStored === "false" && androidRelease.phoneProofOutputNoSecret === "true" && androidRelease.phoneProofOutputLaunchApproved === "false" && androidRelease.phoneProofOutputProviderCalled === "false" && androidRelease.phoneProofOutputMoney === "false", `Android phone-proof output intake should start empty and fail-closed: ${JSON.stringify(androidRelease)}`);
  assert(androidRelease.signingProofIntake && androidRelease.signingProofStatus === "not_captured" && androidRelease.signingProofReviewReady === "false" && androidRelease.signingProofRawStored === "false" && androidRelease.signingProofKeystoreStored === "false" && androidRelease.signingProofStoreApproval === "false" && androidRelease.signingProofProviderCalled === "false" && androidRelease.signingProofMoney === "false", `Android signing proof intake should start empty and fail-closed: ${JSON.stringify(androidRelease)}`);
  assert(androidRelease.playProofIntake && androidRelease.playProofStatus === "not_captured" && androidRelease.playProofReviewReady === "false" && androidRelease.playProofRawStored === "false" && androidRelease.playProofDataSafetySubmitted === "false" && androidRelease.playProofStoreApproval === "false" && androidRelease.playProofBillingEnabled === "false" && androidRelease.playProofRestrictedPublished === "false" && androidRelease.playProofProviderCalled === "false" && androidRelease.playProofMoney === "false", `Play Store proof intake should start empty and fail-closed: ${JSON.stringify(androidRelease)}`);
  assert(androidRelease.billingProofIntake && androidRelease.billingProofStatus === "not_captured" && androidRelease.billingProofReviewReady === "false" && androidRelease.billingProofRawStored === "false" && androidRelease.billingProofTokenStored === "false" && androidRelease.billingProofProductCreated === "false" && androidRelease.billingProofBillingEnabled === "false" && androidRelease.billingProofEntitlementGranted === "false" && androidRelease.billingProofRtdnActivated === "false" && androidRelease.billingProofStoreApproval === "false" && androidRelease.billingProofMoney === "false" && androidRelease.billingProofRevenue === "false", `Play Billing proof intake should start empty and fail-closed: ${JSON.stringify(androidRelease)}`);
  assert(androidRelease.reviewerProofIntake && androidRelease.reviewerProofStatus === "not_captured" && androidRelease.reviewerProofReviewReady === "false" && androidRelease.reviewerProofRawStored === "false" && androidRelease.reviewerProofCredentialsStored === "false" && androidRelease.reviewerProofAppAccessSubmitted === "false" && androidRelease.reviewerProofPrivacyPublished === "false" && androidRelease.reviewerProofDeletionVerified === "false" && androidRelease.reviewerProofStoreApproval === "false" && androidRelease.reviewerProofMoney === "false", `Play reviewer proof intake should start empty and fail-closed: ${JSON.stringify(androidRelease)}`);
  assert(androidRelease.backendGate && androidRelease.backendProviderEnabled === "false" && androidRelease.backendHostedReady === "false" && androidRelease.backendHostedProbeReady === 0 && androidRelease.backendHostedProbes === 6 && androidRelease.backendProofReady === 0 && androidRelease.backendProofBlocked === 6 && androidRelease.backendCredentialApk === "false" && androidRelease.backendMoney === "false", `Android release backend/provider gate should fail closed before hosted proof: ${JSON.stringify(androidRelease)}`);
  assert(androidRelease.lanes.phone_install === "captured" && androidRelease.lanes.phone_foreground === "blocked", "Android release lanes should split phone install proof from foreground focus proof");
  assert(androidRelease.text.includes("Foreground focus proof") && androidRelease.text.includes("NotificationShade") && androidRelease.text.includes("mCurrentFocus=com.steward.artbook/.MainActivity") && androidRelease.text.includes("ADB: device required") && androidRelease.text.includes("No unlock secret stored") && androidRelease.text.includes("Backend/provider launch gate") && androidRelease.text.includes("Credentials: server-only"), "Android release UI did not explain the lockscreen/ADB and backend/provider blockers");
  assert(androidRelease.packet.includes("Phone install proof: captured") && androidRelease.packet.includes("Phone foreground proof: blocked") && androidRelease.packet.includes("Running behind lockscreen counts as launch verification: false") && androidRelease.packet.includes("ADB offline or unauthorized counts as launch verification: false") && androidRelease.packet.includes("Phone proof next steps:") && androidRelease.packet.includes("ADB target must appear as device"), "Android release packet did not separate installed/running from foreground and ADB verification");
  assert(androidRelease.packet.includes("ADB proof command helper available: true") && androidRelease.packet.includes("ADB proof command helper stores unlock secret: false"), "Android release packet should expose the safe ADB proof command helper boundary");
  assert(androidRelease.packet.includes("Signing proof intake available: true") && androidRelease.packet.includes("Signing proof raw output stored: false") && androidRelease.packet.includes("Keystore material stored/exported: false") && androidRelease.packet.includes("Signing proof grants Play/store approval: false"), "Android release packet should expose the safe signing proof intake boundary");
  assert(androidRelease.playStorePacket.includes("Play Console proof intake available: true") && androidRelease.playStorePacket.includes("Play Console proof raw output stored: false") && androidRelease.playStorePacket.includes("Data Safety submitted from app: false") && androidRelease.playStorePacket.includes("Store approval enabled from app: false") && androidRelease.playStorePacket.includes("Play Billing enabled from app: false") && androidRelease.playStorePacket.includes("Restricted media published from app: false"), "Play Store safety packet should expose the safe Play Console proof intake boundary");
  assert(androidRelease.billingPacket.includes("Play Billing proof intake available: true") && androidRelease.billingPacket.includes("Play Billing proof raw output stored: false") && androidRelease.billingPacket.includes("Purchase token stored/exported: false") && androidRelease.billingPacket.includes("Play Console products created from app: false") && androidRelease.billingPacket.includes("Google Play Billing enabled from app: false") && androidRelease.billingPacket.includes("Entitlement grant enabled from app: false") && androidRelease.billingPacket.includes("RTDN activated from app: false") && androidRelease.billingPacket.includes("Founder revenue recognized from app: false"), "Play Billing packet should expose the safe billing proof intake boundary");
  assert(androidRelease.reviewerPacket.includes("Reviewer access proof intake available: true") && androidRelease.reviewerPacket.includes("Reviewer proof raw output stored: false") && androidRelease.reviewerPacket.includes("Reviewer credentials stored/exported: false") && androidRelease.reviewerPacket.includes("App access submitted from app: false") && androidRelease.reviewerPacket.includes("Privacy policy published from app: false") && androidRelease.reviewerPacket.includes("Account deletion verified from app: false") && androidRelease.reviewerPacket.includes("Store approval enabled from app: false"), "Play reviewer access packet should expose the safe reviewer proof intake boundary");
  assert(androidRelease.packet.includes("Backend provider activation proof: blocked") && androidRelease.packet.includes("Hosted backend evidence probes: 0/6") && androidRelease.packet.includes("Production backend proof lanes: 0/6") && androidRelease.packet.includes("Credential material stored in APK: false") && androidRelease.packet.includes("Provider called from Android release handoff: false") && androidRelease.packet.includes("Backend/provider proof next steps:"), "Android release packet missed hosted backend/provider proof gates");
  assert(androidRelease.packet.includes("No unlock secret stored/exported: true") && androidRelease.packet.includes("Provider activation enabled: false") && androidRelease.packet.includes("Money movement enabled: false") && androidRelease.packet.includes("Store approval enabled: false"), "Android release packet missed fail-closed launch authority flags");
  assert(!/140915|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=|private[_ -]?key|service-account\s*\{|full provider payload|\+254\s?\d{3,}/i.test(androidRelease.packet), "Android release packet appears to leak phone unlock or sensitive material");
  assert(androidRelease.overflow <= 2, "Android release handoff introduced horizontal overflow");
  await page.evaluate(() => App.copyAndroidPhoneProofCommands());
  const commandCopied = await saved();
  assert((commandCopied.backendEvents || []).some(row => row.label === "Android phone proof commands copied" && row.androidPhoneProofCommands === true && row.manualUnlockRequired === true && row.noUnlockSecretStored === true && row.androidTargetFocus === "com.steward.artbook/.MainActivity" && row.runningBehindLockscreenAccepted === false && row.providerCalled === false && row.providerActivationEnabled === false && row.moneyMovementEnabled === false && row.nonSettling === true), "copying Android phone proof commands did not record manual-unlock fail-closed evidence");
  await page.evaluate(() => {
    document.querySelector("#androidSigningProofInput").value = [
      "apksigner verify --print-certs artbook-phone-install.apk",
      "Verified using v1 scheme (JAR signing): true",
      "Verified using v2 scheme (APK Signature Scheme v2): true",
      "Number of signers: 1",
      "Signer #1 certificate DN: CN=Android Debug, O=Android, C=US",
      "storePassword=hunter2"
    ].join("\n");
    App.saveAndroidSigningProofOutput();
  });
  await page.waitForTimeout(180);
  const debugSigningProof = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const latest = (snap.androidSigningProofIntakes || [])[0] || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Android signing proof classified" && row.androidSigningProofStatus === "debug_blocked") || null;
    return {
      latest,
      event,
      statusAttr: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-status") || "",
      reviewAttr: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-review-ready") || "",
      latestCardStatus: document.querySelector("[data-android-signing-proof-latest]")?.getAttribute("data-android-signing-proof-latest-status") || ""
    };
  }, KEY);
  assert(debugSigningProof.latest?.status === "debug_blocked" && debugSigningProof.latest?.signatureProof === true && debugSigningProof.latest?.debugDetected === true && debugSigningProof.latest?.releaseSigningReviewReady === false && debugSigningProof.latest?.rawOutputStored === false && debugSigningProof.latest?.keystoreMaterialStored === false && debugSigningProof.latest?.storeApprovalEnabled === false && debugSigningProof.latest?.moneyMovementEnabled === false, `Debug signing proof should remain blocked and redacted: ${JSON.stringify(debugSigningProof)}`);
  assert(debugSigningProof.statusAttr === "debug_blocked" && debugSigningProof.reviewAttr === "false" && debugSigningProof.latestCardStatus === "debug_blocked", "Signing proof intake should render the debug-blocked classification");
  assert(debugSigningProof.event?.androidSigningProofClassified === true && debugSigningProof.event?.androidSigningProofRawOutputStored === false && debugSigningProof.event?.keystoreMaterialStored === false && debugSigningProof.event?.storeApprovalEnabled === false && debugSigningProof.event?.providerActivationEnabled === false && debugSigningProof.event?.moneyMovementEnabled === false && debugSigningProof.event?.nonSettling === true, "Classifying debug signing proof did not create fail-closed audit evidence");
  assert(!/hunter2|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=|private[_ -]?key|service-account\s*\{|full provider payload|\+254\s?\d{3,}/i.test(debugSigningProof.latest?.outputPreview || ""), "Debug signing proof preview appears to retain sensitive material");
  await page.evaluate(() => {
    document.querySelector("#androidSigningProofInput").value = [
      "apksigner verify --print-certs artbook-release.aab",
      "Verified using v2 scheme (APK Signature Scheme v2): true",
      "Verified using v3 scheme (APK Signature Scheme v3): true",
      "Number of signers: 1",
      "Signer #1 certificate SHA-256 digest: AA:BB:CC:DD:EE:FF",
      "Play App Signing enabled in Play Console",
      "release upload key certificate attached"
    ].join("\n");
    App.saveAndroidSigningProofOutput();
  });
  await page.waitForTimeout(180);
  const releaseSigningProof = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const latest = (snap.androidSigningProofIntakes || [])[0] || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Android signing proof classified" && row.androidSigningProofStatus === "release_signing_review_ready") || null;
    return {
      latest,
      event,
      statusAttr: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-status") || "",
      reviewAttr: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-review-ready") || "",
      rawStoredAttr: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-raw-stored") || "",
      storeApprovalAttr: document.querySelector("[data-android-signing-proof-intake]")?.getAttribute("data-android-signing-proof-store-approval") || ""
    };
  }, KEY);
  assert(releaseSigningProof.latest?.status === "release_signing_review_ready" && releaseSigningProof.latest?.releaseSigningReviewReady === true && releaseSigningProof.latest?.signatureProof === true && releaseSigningProof.latest?.debugDetected === false && releaseSigningProof.latest?.playSigningEvidence === true && releaseSigningProof.latest?.rawOutputStored === false && releaseSigningProof.latest?.keystoreMaterialStored === false && releaseSigningProof.latest?.storeApprovalEnabled === false && releaseSigningProof.latest?.moneyMovementEnabled === false, `Release signing proof should be review-ready without granting Play approval: ${JSON.stringify(releaseSigningProof)}`);
  assert(releaseSigningProof.statusAttr === "release_signing_review_ready" && releaseSigningProof.reviewAttr === "true" && releaseSigningProof.rawStoredAttr === "false" && releaseSigningProof.storeApprovalAttr === "false", "Signing proof intake should render release-signing review-ready while store approval remains false");
  assert(releaseSigningProof.event?.androidSigningProofClassified === true && releaseSigningProof.event?.androidSigningProofReviewReady === true && releaseSigningProof.event?.androidSigningProofRawOutputStored === false && releaseSigningProof.event?.keystoreMaterialStored === false && releaseSigningProof.event?.storeApprovalEnabled === false && releaseSigningProof.event?.providerCalled === false && releaseSigningProof.event?.moneyMovementEnabled === false && releaseSigningProof.event?.nonSettling === true, "Classifying release signing proof did not create non-settling audit evidence");
  await page.evaluate(() => {
    document.querySelector("#playStoreProofInput").value = [
      "Data Safety form drafted for account, messages, location and payment metadata",
      "App access reviewer notes describe Review Ops and demo account paths",
      "restricted media remains web-only; policy and permissions declaration included",
      "Google Play Billing subscriptions and base plan evidence attached",
      "internal testing track release notes captured",
      "service-account { private_key=abc123 }"
    ].join("\n");
    App.savePlayStoreProofOutput();
  });
  await page.waitForTimeout(180);
  const blockedPlayProof = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const latest = (snap.playStoreProofIntakes || [])[0] || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Play Store proof classified" && row.playStoreProofStatus === "credential_material_blocked") || null;
    return {
      latest,
      event,
      statusAttr: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-status") || "",
      reviewAttr: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-review-ready") || "",
      latestCardStatus: document.querySelector("[data-play-store-proof-latest]")?.getAttribute("data-play-store-proof-latest-status") || ""
    };
  }, KEY);
  assert(blockedPlayProof.latest?.status === "credential_material_blocked" && blockedPlayProof.latest?.credentialMaterial === true && blockedPlayProof.latest?.playConsoleReviewReady === false && blockedPlayProof.latest?.rawOutputStored === false && blockedPlayProof.latest?.dataSafetySubmitted === false && blockedPlayProof.latest?.storeApprovalEnabled === false && blockedPlayProof.latest?.playBillingEnabled === false && blockedPlayProof.latest?.moneyMovementEnabled === false, `Play Console proof with credential material should remain blocked and redacted: ${JSON.stringify(blockedPlayProof)}`);
  assert(blockedPlayProof.statusAttr === "credential_material_blocked" && blockedPlayProof.reviewAttr === "false" && blockedPlayProof.latestCardStatus === "credential_material_blocked", "Play proof intake should render the credential-material blocked classification");
  assert(blockedPlayProof.event?.playStoreProofClassified === true && blockedPlayProof.event?.playStoreProofRawOutputStored === false && blockedPlayProof.event?.dataSafetySubmitted === false && blockedPlayProof.event?.storeApprovalEnabled === false && blockedPlayProof.event?.playBillingEnabled === false && blockedPlayProof.event?.restrictedMediaPublished === false && blockedPlayProof.event?.providerActivationEnabled === false && blockedPlayProof.event?.moneyMovementEnabled === false && blockedPlayProof.event?.nonSettling === true, "Classifying blocked Play proof did not create fail-closed audit evidence");
  assert(!/abc123|private[_ -]?key\s*=|service-account\s*\{|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=|full provider payload|\+254\s?\d{3,}/i.test(blockedPlayProof.latest?.outputPreview || ""), "Blocked Play proof preview appears to retain sensitive material");
  await page.evaluate(() => {
    document.querySelector("#playStoreProofInput").value = [
      "Data Safety section completed for account/profile, messages, location, payment metadata and diagnostics",
      "privacy policy and account deletion URL are attached",
      "App access reviewer instructions include demo account, Review Ops route and offline/backend limitation notes",
      "restricted media web-only policy boundary, content rating and permissions declaration are included",
      "Google Play Billing subscriptions, in-app products, base plan and billing library notes are included",
      "internal testing track release notes and managed publishing rollout evidence captured"
    ].join("\n");
    App.savePlayStoreProofOutput();
  });
  await page.waitForTimeout(180);
  const readyPlayProof = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const latest = (snap.playStoreProofIntakes || [])[0] || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Play Store proof classified" && row.playStoreProofStatus === "play_console_review_ready") || null;
    return {
      latest,
      event,
      statusAttr: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-status") || "",
      reviewAttr: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-review-ready") || "",
      rawStoredAttr: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-raw-stored") || "",
      approvalAttr: document.querySelector("[data-play-store-proof-intake]")?.getAttribute("data-play-store-proof-store-approval") || ""
    };
  }, KEY);
  assert(readyPlayProof.latest?.status === "play_console_review_ready" && readyPlayProof.latest?.playConsoleReviewReady === true && readyPlayProof.latest?.dataSafetyEvidence === true && readyPlayProof.latest?.reviewerAccessEvidence === true && readyPlayProof.latest?.policyEvidence === true && readyPlayProof.latest?.billingEvidence === true && readyPlayProof.latest?.testingTrackEvidence === true && readyPlayProof.latest?.rawOutputStored === false && readyPlayProof.latest?.dataSafetySubmitted === false && readyPlayProof.latest?.storeApprovalEnabled === false && readyPlayProof.latest?.playBillingEnabled === false && readyPlayProof.latest?.moneyMovementEnabled === false, `Play Console proof should be review-ready without granting submission or approval: ${JSON.stringify(readyPlayProof)}`);
  assert(readyPlayProof.statusAttr === "play_console_review_ready" && readyPlayProof.reviewAttr === "true" && readyPlayProof.rawStoredAttr === "false" && readyPlayProof.approvalAttr === "false", "Play proof intake should render review-ready while store approval remains false");
  assert(readyPlayProof.event?.playStoreProofClassified === true && readyPlayProof.event?.playStoreProofReviewReady === true && readyPlayProof.event?.playStoreProofRawOutputStored === false && readyPlayProof.event?.dataSafetySubmitted === false && readyPlayProof.event?.storeApprovalEnabled === false && readyPlayProof.event?.playBillingEnabled === false && readyPlayProof.event?.restrictedMediaPublished === false && readyPlayProof.event?.providerCalled === false && readyPlayProof.event?.moneyMovementEnabled === false && readyPlayProof.event?.nonSettling === true, "Classifying ready Play proof did not create non-settling audit evidence");
  await page.evaluate(() => {
    document.querySelector("#playBillingProofInput").value = [
      "Play Console product catalog includes subscription product id artbook_pro_monthly, base plan monthly and offer trial",
      "Google Play Billing Library BillingClient queryProductDetails launchBillingFlow and acknowledgement flow attached",
      "server purchase-token verification uses package name, product id, base plan, expiry, account binding and sha256 digest-only storage",
      "RTDN Pub/Sub replay covers subscription state, renewal, grace, account hold, cancel and refund",
      "restore purchases entitlement map handles cancellation, revocation, account hold and refund states",
      "partner-led physical services, delivery, bookings, escrow, payout and wallet transfer boundary documented; restricted content stays web-only outside Play Billing",
      "purchaseToken=tok_SECRET_BILLING_VALUE"
    ].join("\n");
    App.savePlayBillingProofOutput();
  });
  await page.waitForTimeout(180);
  const blockedBillingProof = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const latest = (snap.playBillingProofIntakes || [])[0] || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Play Billing proof classified" && row.playBillingProofStatus === "credential_material_blocked") || null;
    return {
      latest,
      event,
      statusAttr: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-status") || "",
      reviewAttr: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-review-ready") || "",
      latestCardStatus: document.querySelector("[data-play-billing-proof-latest]")?.getAttribute("data-play-billing-proof-latest-status") || ""
    };
  }, KEY);
  assert(blockedBillingProof.latest?.status === "credential_material_blocked" && blockedBillingProof.latest?.credentialMaterial === true && blockedBillingProof.latest?.playBillingReviewReady === false && blockedBillingProof.latest?.rawOutputStored === false && blockedBillingProof.latest?.purchaseTokenStored === false && blockedBillingProof.latest?.productCreatedFromApp === false && blockedBillingProof.latest?.playBillingEnabled === false && blockedBillingProof.latest?.entitlementGrantEnabled === false && blockedBillingProof.latest?.rtdnActivated === false && blockedBillingProof.latest?.storeApprovalEnabled === false && blockedBillingProof.latest?.moneyMovementEnabled === false && blockedBillingProof.latest?.founderRevenueRecognized === false, `Play Billing proof with token material should remain blocked and redacted: ${JSON.stringify(blockedBillingProof)}`);
  assert(blockedBillingProof.statusAttr === "credential_material_blocked" && blockedBillingProof.reviewAttr === "false" && blockedBillingProof.latestCardStatus === "credential_material_blocked", "Play Billing proof intake should render the credential-material blocked classification");
  assert(blockedBillingProof.event?.playBillingProofClassified === true && blockedBillingProof.event?.playBillingProofRawOutputStored === false && blockedBillingProof.event?.purchaseTokenStored === false && blockedBillingProof.event?.productCreatedFromApp === false && blockedBillingProof.event?.playBillingEnabled === false && blockedBillingProof.event?.entitlementGrantEnabled === false && blockedBillingProof.event?.rtdnActivated === false && blockedBillingProof.event?.storeApprovalEnabled === false && blockedBillingProof.event?.moneyMovementEnabled === false && blockedBillingProof.event?.founderRevenueRecognized === false && blockedBillingProof.event?.nonSettling === true, "Classifying blocked Play Billing proof did not create fail-closed audit evidence");
  assert(!/tok_SECRET_BILLING_VALUE|purchaseToken=|license\s*key\s*=|service-account\s*\{|private[_ -]?key\s*=|api[_ -]?key\s*=|full provider payload|\+254\s?\d{3,}/i.test(blockedBillingProof.latest?.outputPreview || ""), "Blocked Play Billing proof preview appears to retain sensitive material");
  await page.evaluate(() => {
    document.querySelector("#playBillingProofInput").value = [
      "Play Console product catalog includes subscription product id artbook_pro_monthly, base plan monthly, offer trial and product catalog rows",
      "Google Play Billing Library BillingClient queryProductDetails launchBillingFlow and acknowledgement flow attached",
      "server purchase-token verification uses package name, product id, base plan, expiry, account binding and sha256 digest-only storage",
      "RTDN Pub/Sub replay covers subscription state, renewal, grace, account hold, cancel, refund and revocation",
      "restore purchases entitlement map handles cancellation, revocation, account hold, refund and restore states",
      "partner-led physical services, delivery, bookings, escrow, payout and wallet transfer boundary documented; restricted content stays web-only outside Play Billing"
    ].join("\n");
    App.savePlayBillingProofOutput();
  });
  await page.waitForTimeout(180);
  const readyBillingProof = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const latest = (snap.playBillingProofIntakes || [])[0] || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Play Billing proof classified" && row.playBillingProofStatus === "play_billing_review_ready") || null;
    return {
      latest,
      event,
      statusAttr: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-status") || "",
      reviewAttr: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-review-ready") || "",
      rawStoredAttr: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-raw-stored") || "",
      tokenStoredAttr: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-token-stored") || "",
      entitlementAttr: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-entitlement-granted") || "",
      revenueAttr: document.querySelector("[data-play-billing-proof-intake]")?.getAttribute("data-play-billing-proof-revenue-recognized") || ""
    };
  }, KEY);
  assert(readyBillingProof.latest?.status === "play_billing_review_ready" && readyBillingProof.latest?.playBillingReviewReady === true && readyBillingProof.latest?.productCatalogEvidence === true && readyBillingProof.latest?.billingLibraryEvidence === true && readyBillingProof.latest?.tokenVerificationEvidence === true && readyBillingProof.latest?.rtdnEvidence === true && readyBillingProof.latest?.restoreEvidence === true && readyBillingProof.latest?.boundaryEvidence === true && readyBillingProof.latest?.rawOutputStored === false && readyBillingProof.latest?.purchaseTokenStored === false && readyBillingProof.latest?.productCreatedFromApp === false && readyBillingProof.latest?.playBillingEnabled === false && readyBillingProof.latest?.entitlementGrantEnabled === false && readyBillingProof.latest?.rtdnActivated === false && readyBillingProof.latest?.storeApprovalEnabled === false && readyBillingProof.latest?.moneyMovementEnabled === false && readyBillingProof.latest?.founderRevenueRecognized === false, `Play Billing proof should be review-ready without granting entitlements or revenue: ${JSON.stringify(readyBillingProof)}`);
  assert(readyBillingProof.statusAttr === "play_billing_review_ready" && readyBillingProof.reviewAttr === "true" && readyBillingProof.rawStoredAttr === "false" && readyBillingProof.tokenStoredAttr === "false" && readyBillingProof.entitlementAttr === "false" && readyBillingProof.revenueAttr === "false", "Play Billing proof intake should render review-ready while token storage, entitlement and revenue stay false");
  assert(readyBillingProof.event?.playBillingProofClassified === true && readyBillingProof.event?.playBillingProofReviewReady === true && readyBillingProof.event?.playBillingProofRawOutputStored === false && readyBillingProof.event?.purchaseTokenStored === false && readyBillingProof.event?.productCreatedFromApp === false && readyBillingProof.event?.playBillingEnabled === false && readyBillingProof.event?.entitlementGrantEnabled === false && readyBillingProof.event?.rtdnActivated === false && readyBillingProof.event?.storeApprovalEnabled === false && readyBillingProof.event?.moneyMovementEnabled === false && readyBillingProof.event?.founderRevenueRecognized === false && readyBillingProof.event?.nonSettling === true, "Classifying ready Play Billing proof did not create non-settling audit evidence");
  await page.evaluate(() => {
    document.querySelector("#playReviewerProofInput").value = [
      "App access reviewer instructions include demo account, Review Ops route, offline prototype and backend limitation notes",
      "Role map covers customer, business owner, artist, courier and Review Ops paths",
      "privacy policy /privacy-policy has operator contact and Data Safety alignment",
      "account deletion /account-deletion and data export request path are attached",
      "support path covers refund dispute, safety report, provenance report and human escalation",
      "password=review-secret reviewer@example.com"
    ].join("\n");
    App.savePlayReviewerProofOutput();
  });
  await page.waitForTimeout(180);
  const blockedReviewerProof = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const latest = (snap.playReviewerProofIntakes || [])[0] || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Play reviewer proof classified" && row.playReviewerProofStatus === "credential_material_blocked") || null;
    return {
      latest,
      event,
      statusAttr: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-status") || "",
      reviewAttr: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-review-ready") || "",
      latestCardStatus: document.querySelector("[data-play-reviewer-proof-latest]")?.getAttribute("data-play-reviewer-proof-latest-status") || ""
    };
  }, KEY);
  assert(blockedReviewerProof.latest?.status === "credential_material_blocked" && blockedReviewerProof.latest?.credentialMaterial === true && blockedReviewerProof.latest?.reviewerAccessReviewReady === false && blockedReviewerProof.latest?.rawOutputStored === false && blockedReviewerProof.latest?.reviewerCredentialsStored === false && blockedReviewerProof.latest?.appAccessSubmitted === false && blockedReviewerProof.latest?.storeApprovalEnabled === false && blockedReviewerProof.latest?.moneyMovementEnabled === false, `Reviewer proof with credential material should remain blocked and redacted: ${JSON.stringify(blockedReviewerProof)}`);
  assert(blockedReviewerProof.statusAttr === "credential_material_blocked" && blockedReviewerProof.reviewAttr === "false" && blockedReviewerProof.latestCardStatus === "credential_material_blocked", "Reviewer proof intake should render the credential-material blocked classification");
  assert(blockedReviewerProof.event?.playReviewerProofClassified === true && blockedReviewerProof.event?.playReviewerProofRawOutputStored === false && blockedReviewerProof.event?.reviewerCredentialsStored === false && blockedReviewerProof.event?.appAccessSubmitted === false && blockedReviewerProof.event?.privacyPolicyPublished === false && blockedReviewerProof.event?.accountDeletionVerified === false && blockedReviewerProof.event?.storeApprovalEnabled === false && blockedReviewerProof.event?.moneyMovementEnabled === false && blockedReviewerProof.event?.nonSettling === true, "Classifying blocked reviewer proof did not create fail-closed audit evidence");
  assert(!/review-secret|reviewer@example\.com|password|api[_ -]?key\s*=|private[_ -]?key|service-account\s*\{|purchase\s*token|\+254\s?\d{3,}/i.test(blockedReviewerProof.latest?.outputPreview || ""), "Blocked reviewer proof preview appears to retain sensitive material");
  await page.evaluate(() => {
    document.querySelector("#playReviewerProofInput").value = [
      "App access reviewer instructions include demo account route, Review Ops path, offline prototype mode and backend limitation notes",
      "Reviewer role map covers customer, business owner, artist, courier transporter and Review Ops flows",
      "privacy policy /privacy-policy includes operator contact, legal review and Data Safety alignment",
      "account deletion /account-deletion, delete account, data export and deletion request path are attached",
      "support path covers refund dispute, safety report, provenance report, restricted-media report and human escalation"
    ].join("\n");
    App.savePlayReviewerProofOutput();
  });
  await page.waitForTimeout(180);
  const readyReviewerProof = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const latest = (snap.playReviewerProofIntakes || [])[0] || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Play reviewer proof classified" && row.playReviewerProofStatus === "reviewer_access_review_ready") || null;
    return {
      latest,
      event,
      statusAttr: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-status") || "",
      reviewAttr: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-review-ready") || "",
      rawStoredAttr: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-raw-stored") || "",
      appAccessAttr: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-app-access-submitted") || "",
      approvalAttr: document.querySelector("[data-play-reviewer-proof-intake]")?.getAttribute("data-play-reviewer-proof-store-approval") || ""
    };
  }, KEY);
  assert(readyReviewerProof.latest?.status === "reviewer_access_review_ready" && readyReviewerProof.latest?.reviewerAccessReviewReady === true && readyReviewerProof.latest?.appAccessEvidence === true && readyReviewerProof.latest?.roleMapEvidence === true && readyReviewerProof.latest?.privacyPolicyEvidence === true && readyReviewerProof.latest?.deletionEvidence === true && readyReviewerProof.latest?.supportEvidence === true && readyReviewerProof.latest?.rawOutputStored === false && readyReviewerProof.latest?.reviewerCredentialsStored === false && readyReviewerProof.latest?.appAccessSubmitted === false && readyReviewerProof.latest?.privacyPolicyPublished === false && readyReviewerProof.latest?.accountDeletionVerified === false && readyReviewerProof.latest?.storeApprovalEnabled === false && readyReviewerProof.latest?.moneyMovementEnabled === false, `Reviewer proof should be review-ready without submitting App access or approving store review: ${JSON.stringify(readyReviewerProof)}`);
  assert(readyReviewerProof.statusAttr === "reviewer_access_review_ready" && readyReviewerProof.reviewAttr === "true" && readyReviewerProof.rawStoredAttr === "false" && readyReviewerProof.appAccessAttr === "false" && readyReviewerProof.approvalAttr === "false", "Reviewer proof intake should render review-ready while App access and store approval remain false");
  assert(readyReviewerProof.event?.playReviewerProofClassified === true && readyReviewerProof.event?.playReviewerProofReviewReady === true && readyReviewerProof.event?.playReviewerProofRawOutputStored === false && readyReviewerProof.event?.reviewerCredentialsStored === false && readyReviewerProof.event?.appAccessSubmitted === false && readyReviewerProof.event?.privacyPolicyPublished === false && readyReviewerProof.event?.accountDeletionVerified === false && readyReviewerProof.event?.storeApprovalEnabled === false && readyReviewerProof.event?.moneyMovementEnabled === false && readyReviewerProof.event?.nonSettling === true, "Classifying ready reviewer proof did not create non-settling audit evidence");
  await page.evaluate(() => {
    document.querySelector("#androidPhoneProofOutputInput").value = [
      "List of devices attached",
      "ZY22TEST01 device usb:1-1 product:payton model:moto transport_id:7",
      "Success",
      "mCurrentFocus=Window{123 u0 NotificationShade}",
      "mDreamingLockscreen=true",
      "logcat: crash buffer clean no crash"
    ].join("\n");
    App.saveAndroidPhoneProofOutput();
  });
  await page.waitForTimeout(180);
  const blockedPhoneOutput = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const latest = (snap.androidPhoneProofIntakes || [])[0] || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Android phone proof output classified" && row.androidPhoneProofStatus === "lockscreen_blocked") || null;
    return {
      latest,
      event,
      statusAttr: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-status") || "",
      foregroundAttr: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-foreground") || "",
      latestCardStatus: document.querySelector("[data-android-phone-proof-intake-latest]")?.getAttribute("data-android-phone-proof-intake-latest-status") || ""
    };
  }, KEY);
  assert(blockedPhoneOutput.latest?.status === "lockscreen_blocked" && blockedPhoneOutput.latest?.rawOutputStored === false && blockedPhoneOutput.latest?.noUnlockSecretStored === true && blockedPhoneOutput.latest?.launchApproved === false && blockedPhoneOutput.latest?.providerCalled === false && blockedPhoneOutput.latest?.moneyMovementEnabled === false, `Lockscreen phone proof output should stay blocked and redacted: ${JSON.stringify(blockedPhoneOutput)}`);
  assert(blockedPhoneOutput.statusAttr === "lockscreen_blocked" && blockedPhoneOutput.foregroundAttr === "false" && blockedPhoneOutput.latestCardStatus === "lockscreen_blocked", "Phone proof intake should render the lockscreen-blocked classification");
  assert(blockedPhoneOutput.event?.androidPhoneProofOutputClassified === true && blockedPhoneOutput.event?.androidPhoneProofRawOutputStored === false && blockedPhoneOutput.event?.launchApproved === false && blockedPhoneOutput.event?.providerActivationEnabled === false && blockedPhoneOutput.event?.moneyMovementEnabled === false && blockedPhoneOutput.event?.nonSettling === true, "Classifying blocked phone proof output did not create fail-closed audit evidence");
  await page.evaluate(() => {
    document.querySelector("#androidPhoneProofOutputInput").value = [
      "List of devices attached",
      "ZY22TEST01 device usb:1-1 product:payton model:moto transport_id:7",
      "Success",
      "package versionName=1.181 lastUpdateTime=2026-06-02",
      "mCurrentFocus=Window{456 u0 com.steward.artbook/.MainActivity}",
      "ACTIVITY com.steward.artbook/.MainActivity",
      "logcat: crash buffer clean no crash"
    ].join("\n");
    App.saveAndroidPhoneProofOutput();
  });
  await page.waitForTimeout(180);
  const readyPhoneOutput = await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    const latest = (snap.androidPhoneProofIntakes || [])[0] || null;
    const event = (snap.backendEvents || []).find(row => row.label === "Android phone proof output classified" && row.androidPhoneProofStatus === "foreground_review_ready") || null;
    return {
      latest,
      event,
      statusAttr: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-status") || "",
      foregroundAttr: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-foreground") || "",
      rawStoredAttr: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-raw-stored") || "",
      launchAttr: document.querySelector("[data-android-phone-proof-output-intake]")?.getAttribute("data-android-phone-proof-output-launch-approved") || ""
    };
  }, KEY);
  assert(readyPhoneOutput.latest?.status === "foreground_review_ready" && readyPhoneOutput.latest?.foregroundReviewReady === true && readyPhoneOutput.latest?.rawOutputStored === false && readyPhoneOutput.latest?.noUnlockSecretStored === true && readyPhoneOutput.latest?.launchApproved === false && readyPhoneOutput.latest?.storeApprovalEnabled === false && readyPhoneOutput.latest?.providerCalled === false && readyPhoneOutput.latest?.moneyMovementEnabled === false, `Foreground phone proof output should be classified review-ready without granting launch approval: ${JSON.stringify(readyPhoneOutput)}`);
  assert(readyPhoneOutput.statusAttr === "foreground_review_ready" && readyPhoneOutput.foregroundAttr === "true" && readyPhoneOutput.rawStoredAttr === "false" && readyPhoneOutput.launchAttr === "false", "Phone proof intake should render foreground review-ready while launch approval remains false");
  assert(readyPhoneOutput.event?.androidPhoneProofOutputClassified === true && readyPhoneOutput.event?.androidPhoneProofForegroundReviewReady === true && readyPhoneOutput.event?.androidPhoneProofRawOutputStored === false && readyPhoneOutput.event?.launchApproved === false && readyPhoneOutput.event?.providerCalled === false && readyPhoneOutput.event?.moneyMovementEnabled === false && readyPhoneOutput.event?.nonSettling === true, "Classifying foreground phone proof output did not create non-settling audit evidence");
  assert(!/140915|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=|private[_ -]?key|service-account\s*\{|full provider payload|\+254\s?\d{3,}/i.test(readyPhoneOutput.latest?.outputPreview || ""), "Phone proof output preview appears to retain sensitive material");
  await page.evaluate(() => App.copyAndroidReleaseHandoffPacket());
  const copied = await saved();
  assert((copied.backendEvents || []).some(row => row.label === "Android release handoff copied" && row.androidReleaseHandoff === true && row.androidPhoneInstallCaptured === true && row.androidPhoneForegroundVerified === false && row.androidPhoneLockscreenBlocked === true && row.runningBehindLockscreenAccepted === false && row.noUnlockSecretStored === true && row.storeApprovalEnabled === false && row.providerActivationEnabled === false && row.moneyMovementEnabled === false && row.nonSettling === true), "copying Android release handoff did not record foreground-proof fail-closed evidence");
  await page.evaluate(({ key, snapshot }) => {
    localStorage.setItem(key, JSON.stringify(snapshot));
  }, { key: KEY, snapshot: original });
  await page.reload({ waitUntil: "load" });
});

await step("menu workflow finder routes exact business tasks", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.go("more");
    App.setWorkflowSearch("receipt");
  });
  await page.waitForSelector(".workflow-finder-panel", { state: "visible", timeout: 5000 });
  const finder = await page.evaluate(() => ({
    query: document.querySelector("#workflowSearchInput")?.value || "",
    text: document.querySelector(".workflow-finder-panel")?.innerText || "",
    first: document.querySelector(".workflow-result-card")?.innerText || "",
    resultCount: document.querySelectorAll(".workflow-result-card").length,
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(finder.query === "receipt", "workflow finder did not keep the search query");
  assert(finder.text.includes("Find a workflow"), "workflow finder did not render");
  assert(finder.first.includes("Receipts and invoices"), "receipt search did not prioritize the exact receipts workflow");
  assert(finder.resultCount >= 1, "workflow finder returned no results");
  assert(finder.overflow <= 2, "workflow finder introduced horizontal overflow");
  await page.click(".workflow-result-card");
  await page.waitForTimeout(180);
  const state = await saved();
  assert(state.page === "register" && state.registerTab === "receipts", "receipt workflow did not route to Sales Desk receipts");
});

await step("global search bridges into workflow routes", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.globalSearch();
  });
  await page.waitForSelector("[data-global-workflow-panel]", { state: "visible", timeout: 5000 });
  let modal = await page.evaluate(() => document.querySelector("#modal.on")?.innerText || "");
  assert(/Workflow routes/i.test(modal) && /Jobs/i.test(modal) && /Booking|Payments|Support/i.test(modal), "global search did not expose workflow routes");
  await page.fill("#globalSearchText", "support");
  await page.evaluate(() => App.openWorkflowMap(document.getElementById("globalSearchText")?.value || ""));
  await page.waitForSelector(".workflow-finder-panel", { state: "visible", timeout: 5000 });
  const finder = await page.evaluate(() => ({
    state: JSON.parse(localStorage.getItem("artbook.mobile.demo.v5") || "{}"),
    first: document.querySelector(".workflow-result-card")?.innerText || "",
    text: document.querySelector(".workflow-finder-panel")?.innerText || "",
  }));
  assert(finder.state.page === "more" && finder.state.menuWorkflowQuery === "support", "global workflow search did not land on Menu with support query");
  assert(/Support and cases/i.test(finder.first) && /exact records/i.test(finder.first), "support query did not prioritize the exact support workflow");
  await page.click(".workflow-result-card");
  await page.waitForTimeout(180);
  const routed = await saved();
  assert(routed.page === "inbox" && routed.commTab === "notifications", "support workflow did not route to Bell/support notifications");
});

await step("Artguide floats without covering controls", async () => {
  await page.evaluate(key => {
    App.go("circle");
    const target = document.querySelector(".day-actions")?.getBoundingClientRect();
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    snap.page = "circle";
    snap.artguideFab = target ? { x: target.right - 66, y: target.top + 8 } : { x: 310, y: 430 };
    localStorage.setItem(key, JSON.stringify(snap));
    location.reload();
  }, KEY);
  await page.waitForSelector(".artguide-fab", { state: "visible", timeout: 5000 });
  await page.waitForTimeout(450);
  const collision = await page.evaluate(() => {
    const fab = document.querySelector(".artguide-fab")?.getBoundingClientRect();
    if(!fab) return "missing fab";
    const avoid = Array.from(document.querySelectorAll(".top.artbar,.flow-dock,.day-actions,.cart-today-actions,.compose-bottom-bar,.following-orbit,.follow-strip,.subscription-lane"))
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width > 8 && r.height > 8);
    const hit = avoid.find(r => fab.left < r.right + 10 && fab.right > r.left - 10 && fab.top < r.bottom + 10 && fab.bottom > r.top - 10);
    return hit ? `overlap ${Math.round(hit.top)}-${Math.round(hit.bottom)}` : "";
  });
  assert(!collision, `Artguide still covers a key control: ${collision}`);
  await page.evaluate(key => {
    const target = document.querySelector(".following-orbit")?.getBoundingClientRect();
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    snap.page = "circle";
    snap.artguideFab = target ? { x: target.right - 64, y: target.bottom - 54 } : { x: 310, y: 620 };
    localStorage.setItem(key, JSON.stringify(snap));
    location.reload();
  }, KEY);
  await page.waitForSelector(".artguide-fab", { state: "visible", timeout: 5000 });
  await page.waitForTimeout(450);
  const laneCollision = await page.evaluate(() => {
    const fab = document.querySelector(".artguide-fab")?.getBoundingClientRect();
    if(!fab) return "missing fab";
    const avoid = Array.from(document.querySelectorAll(".following-orbit,.follow-strip,.subscription-lane,.flow-dock"))
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width > 8 && r.height > 8);
    const hit = avoid.find(r => fab.left < r.right + 10 && fab.right > r.left - 10 && fab.top < r.bottom + 10 && fab.bottom > r.top - 10);
    return hit ? `overlap ${Math.round(hit.top)}-${Math.round(hit.bottom)}` : "";
  });
  assert(!laneCollision, `Artguide still covers a content lane: ${laneCollision}`);
});

await step("Artguide gives contextual guidance and opens workflow sheets", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.go("register");
    App.artguide();
  });
  await page.waitForSelector("#modal.on .artguide-panel", { state: "visible", timeout: 5000 });
  const closeTarget = await page.evaluate(() => {
    const button = document.querySelector("#modal.on .sheet-head .icon-btn");
    const rect = button?.getBoundingClientRect();
    const svgRect = button?.querySelector("svg")?.getBoundingClientRect();
    return {
      width: Math.round(rect?.width || 0),
      height: Math.round(rect?.height || 0),
      svgWidth: Math.round(svgRect?.width || 0),
      svgHeight: Math.round(svgRect?.height || 0),
      label: button?.getAttribute("aria-label") || "",
    };
  });
  assert(closeTarget.width >= 46 && closeTarget.height >= 46 && closeTarget.svgWidth >= 18 && closeTarget.svgHeight >= 18, `Artguide close target is too tight: ${JSON.stringify(closeTarget)}`);
  assert(/close/i.test(closeTarget.label), "Artguide close target lost its accessible label");
  const context = await page.evaluate(() => {
    const modal = document.querySelector("#modal.on");
    return {
      text: modal?.innerText || "",
      chips: Array.from(modal?.querySelectorAll(".artguide-chip") || []).map(btn => btn.textContent.trim()),
      actions: Array.from(modal?.querySelectorAll(".artguide-actions .btn") || []).map(btn => btn.textContent.trim()),
      actionRects: Array.from(modal?.querySelectorAll(".artguide-panel .btn.small") || []).map(btn => {
        const rect = btn.getBoundingClientRect();
        return {
          label: btn.textContent.trim().replace(/\s+/g, " "),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollWidth: btn.scrollWidth,
          clientWidth: btn.clientWidth,
          scrollHeight: btn.scrollHeight,
          clientHeight: btn.clientHeight,
        };
      }).filter(row => row.width > 0 && row.height > 0),
      routes: Array.from(modal?.querySelectorAll(".artguide-route-card") || []).map(btn => btn.textContent.trim()),
      heroHeight: Math.round(document.querySelector("#modal.on .artguide-home-compact")?.getBoundingClientRect().height || 0),
      talkHeight: Math.round(document.querySelector("#modal.on [data-artguide-talk]")?.getBoundingClientRect().height || 0),
      drawerCount: document.querySelectorAll("#modal.on details").length,
      closedDrawers: Array.from(document.querySelectorAll("#modal.on details")).filter(item => !item.open).length,
    };
  });
  assert(context.text.includes("Artguide on Sales Desk"), "Artguide did not name the current Sales Desk screen");
  assert(context.text.includes("Sales Desk guide") && context.text.includes("seller counter"), "Artguide did not explain the current workflow");
  assert(context.text.includes("AI copilot") && context.text.includes("Task router") && context.text.includes("Business operations") && context.text.includes("Stock accountability"), "Artguide did not expose broad business copilot actions");
  assert(context.text.includes("AI operator coverage") && context.text.includes("Whole-app capability map") && context.text.includes("Action boundaries"), "Artguide did not expose the whole-app AI operator map");
  assert(context.routes.some(label => /Receipts and invoices/.test(label)) && context.routes.some(label => /Sales Desk/.test(label)), "Artguide task router did not prioritize business workflow routes");
  assert(context.chips.includes("How do I run a sale?"), "Artguide did not prioritize Sales Desk prompts");
  assert(context.actions.some(label => /Manual sale/.test(label)), "Artguide did not expose contextual workflow actions");
  assert(context.heroHeight > 0 && context.heroHeight <= 190 && context.talkHeight > 0 && context.talkHeight <= 380, `Artguide contextual home should stay compact above the fold: ${JSON.stringify(context)}`);
  assert(context.drawerCount >= 4 && context.closedDrawers >= 4, `Artguide deeper context should start collapsed: ${JSON.stringify(context)}`);
  assert(context.actionRects.length >= 2, "Artguide small action controls did not render");
  for (const action of context.actionRects) {
    assert(action.height >= 48, `Artguide small action is below premium touch target: ${JSON.stringify(action)}`);
    assert(action.scrollWidth <= action.clientWidth + 1 && action.scrollHeight <= action.clientHeight + 1, `Artguide small action clips text or icon: ${JSON.stringify(action)}`);
  }

  await page.evaluate(() => App.artguideAsk("What can AI do for me here?"));
  await page.waitForTimeout(180);
  let answer = await page.evaluate(() => document.querySelector("#modal.on")?.innerText || "");
  assert(answer.includes("Artguide AI copilot") && answer.includes("AI command center") && answer.includes("Workflow map"), "Artguide did not answer broad AI assistance questions");
  assert(answer.includes("AI operator coverage") && answer.includes("Can do now") && answer.includes("Needs user confirmation") && answer.includes("Never autonomous"), "Artguide did not explain app-wide AI capabilities and hard boundaries");

  await page.evaluate(() => App.artguideAsk("Where is my cart?"));
  await page.waitForTimeout(180);
  answer = await page.evaluate(() => document.querySelector("#modal.on")?.innerText || "");
  assert(answer.includes("Basket and checkout") && answer.includes("Open basket") && answer.includes("Task router") && answer.includes("Basket and purchases"), "Artguide topic answer did not render basket guidance and route cards");
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("#modal.on .artguide-route-card")).find(btn => /Basket and purchases/.test(btn.textContent || ""));
    if (!button) throw new Error("Basket task route missing");
    button.click();
  });
  await page.waitForTimeout(180);
  const basket = await page.evaluate(() => document.querySelector("#modal.on")?.innerText || "");
  assert(basket.includes("Basket and purchases"), "Artguide action did not open the target workflow sheet");

  await page.evaluate(() => App.artguideAsk("refund provider pending"));
  await page.waitForTimeout(180);
  answer = await page.evaluate(() => document.querySelector("#modal.on")?.innerText || "");
  assert(answer.includes("Refund and provider queue") && answer.includes("Refund operations") && answer.includes("Provider money states"), "Artguide did not route refund/provider language to the right operations desks");
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("#modal.on .artguide-route-card")).find(btn => /Refund operations/.test(btn.textContent || ""));
    if (!button) throw new Error("Refund operations route missing");
    button.click();
  });
  await page.waitForTimeout(180);
  assert((await page.evaluate(() => document.querySelector("#modal.on")?.innerText || "")).includes("Refund operations"), "Artguide refund route did not open refund operations");

  await page.evaluate(() => App.artguideAsk("booking setup staff hours"));
  await page.waitForTimeout(180);
  answer = await page.evaluate(() => document.querySelector("#modal.on")?.innerText || "");
  assert(answer.includes("Booking setup") && answer.includes("staff hours") && answer.includes("Booking forms"), "Artguide did not explain booking setup and forms");
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("#modal.on .artguide-route-card")).find(btn => /Booking setup/.test(btn.textContent || ""));
    if (!button) throw new Error("Booking setup route missing");
    button.click();
  });
  await page.waitForTimeout(220);
  let routedState = await saved();
  assert(routedState.page === "calendar" && routedState.calendarTab === "booking", "Artguide booking setup route did not open booking setup");

  await page.evaluate(() => App.artguideAsk("customer follow-up reminder"));
  await page.waitForTimeout(180);
  answer = await page.evaluate(() => document.querySelector("#modal.on")?.innerText || "");
  assert(answer.includes("Customer follow-up") && answer.includes("Follow-ups"), "Artguide did not route customer follow-up language");
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("#modal.on .artguide-route-card")).find(btn => /Customer follow-up/.test(btn.textContent || ""));
    if (!button) throw new Error("Customer follow-up route missing");
    button.click();
  });
  await page.waitForTimeout(220);
  routedState = await saved();
  assert(routedState.page === "inbox" && routedState.commTab === "followups", "Artguide customer follow-up route did not open Follow-ups");

  await page.evaluate(() => App.artguideAsk("provider money states"));
  await page.waitForTimeout(180);
  answer = await page.evaluate(() => document.querySelector("#modal.on")?.innerText || "");
  assert(answer.includes("Provider money states") && answer.includes("Provider readiness"), "Artguide did not explain provider money states");
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("#modal.on .artguide-route-card")).find(btn => /Provider money states/.test(btn.textContent || ""));
    if (!button) throw new Error("Provider money route missing");
    button.click();
  });
  await page.waitForTimeout(220);
  const backend = await page.evaluate(() => document.querySelector("#modal.on")?.innerText || "");
  assert(backend.includes("Backend sync") && backend.includes("Payment and delivery provider readiness"), "Artguide provider money route did not open backend provider readiness");
  await page.evaluate(() => App.closeModal());
});

await step("Artguide AI off falls back to manual workflow map", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.setAiAssist(false, "settings");
    App.artguide();
  });
  await page.waitForSelector("#modal.on .artguide-panel", { state: "visible", timeout: 5000 });
  let text = await page.evaluate(() => document.querySelector("#modal.on")?.innerText || "");
  assert(text.includes("AI assistant is off") && text.includes("Manual workflow map"), "Artguide did not show manual fallback when AI was off");
  assert(text.includes("Sales Desk") || text.includes("Receipts"), "manual fallback did not keep useful workflow routes");
  await page.evaluate(() => {
    App.closeModal();
    App.setAiAssist(true, "settings");
  });
  await page.waitForTimeout(120);
  const state = await saved();
  assert(state.settings?.aiAssist === true, "AI assistant was not restored after off-switch test");
});

await step("Artguide explains OpenAI quota fallback clearly", async () => {
  await page.evaluate(() => {
    App.closeModal();
    const key = "artbook.mobile.demo.v5";
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    state.backendConfig = { ...(state.backendConfig || {}), mode: "local", baseUrl: "http://127.0.0.1:8787" };
    state.artguideLive = {
      status: "preview",
      question: "Can AI answer live now?",
      reply: "Guarded backend fallback reply.",
      lastError: "OpenAI quota or billing needs attention; guarded backend fallback shown.",
      providerStatus: "provider_quota_or_billing_fail_closed",
      providerActionRequired: "OpenAI API quota or billing is blocking live replies. Add API credits, raise the project usage limit, or switch this backend to a funded OpenAI project.",
      modelGateway: { model: "gpt-4.1-mini", liveCallsEnabled: false, status: "model_gateway_provider_error_fail_closed" },
      guardrails: { moneyMovementEnabled: false, sensitiveActionsEnabled: false }
    };
    localStorage.setItem(key, JSON.stringify(state));
    location.reload();
  });
  await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });
  await page.evaluate(() => App.artguide("Can AI answer live now?"));
  await page.waitForSelector("#modal.on #artguideLiveCard", { state: "visible", timeout: 5000 });
  const card = await page.locator("#artguideLiveCard").innerText();
  assert(/OpenAI quota blocks live AI/.test(card), "Artguide did not name the OpenAI quota blocker");
  assert(/quota blocked/.test(card), "Artguide did not show quota blocked status chip");
  assert(/Add API credits|usage limit|funded OpenAI project/i.test(card), "Artguide did not show the quota/billing next action");
  await page.evaluate(() => App.closeModal());
});

await step("business operating system connects core owner systems", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.home();
  });
  await page.waitForTimeout(220);
  let text = await visibleText();
  const accountHome = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-business-account-home]")),
    start: Boolean(document.querySelector("[data-business-account-home] [data-business-start-here]")),
    startActions: document.querySelectorAll("[data-business-account-home] [data-business-start-action]").length,
    recommendedStart: document.querySelector("[data-business-account-home] [data-business-start-action='recommended']")?.textContent || "",
    quick: document.querySelectorAll("[data-business-account-home] .business-account-quick button").length,
    queue: document.querySelectorAll("[data-business-account-home] .business-account-today .cart-today-row").length,
    flow: Boolean(document.querySelector('[data-business-account-home] [data-business-owner-flow]')),
    moneyMap: Boolean(document.querySelector('[data-business-account-home] [data-provider-money-map][data-provider-money-map-context="home"]')),
    payoutChecklist: Boolean(document.querySelector('[data-business-account-home] [data-provider-payout-readiness][data-provider-payout-context="home"]')),
    payoutSteps: document.querySelectorAll('[data-business-account-home] [data-provider-payout-readiness] [data-provider-payout-step]').length,
    handoffSummary: Boolean(document.querySelector('[data-business-account-home] [data-review-ops-handoff][data-review-ops-context="home"]')),
    handoffSteps: document.querySelectorAll('[data-business-account-home] [data-review-ops-handoff] [data-review-ops-step]').length,
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(accountHome.exists && accountHome.quick === 8 && accountHome.queue === 4, "business account home did not render a simple owner action board");
  assert(accountHome.start && accountHome.startActions === 4, "business account home did not render the Start here owner path");
  assert(/invoice|pickup|stock|booking|orders|Sales Desk/i.test(accountHome.recommendedStart), "business Start here did not choose a useful recommended action");
  assert(accountHome.flow, "business account home did not render the unified owner flow rail");
  assert(accountHome.moneyMap, "business account home did not render the provider-led money map");
  assert(accountHome.payoutChecklist && accountHome.payoutSteps === 4, "business account home did not render the compact payout readiness checklist");
  assert(accountHome.handoffSummary && accountHome.handoffSteps === 3, "business account home did not render the owner-readable Review Ops handoff summary");
  assert(/Business account/i.test(text) && /Sell, book, message, deliver, reconcile/i.test(text), "business account home did not explain the owner flow");
  assert(/Start here/i.test(text) && /Take a sale/i.test(text) && /Book a customer/i.test(text) && /Close the day/i.test(text), "business account home did not show a simple first-time owner path");
  assert(/Owner flow/i.test(text) && /Capture/i.test(text) && /Confirm/i.test(text) && /Serve \/ deliver/i.test(text) && /Follow up/i.test(text), "business owner flow rail missing capture/confirm/serve/follow-up steps");
  assert(/Provider-led money map/i.test(text) && /No APK custody/i.test(text) && /Deposits/i.test(text) && /Refunds/i.test(text) && /Payouts/i.test(text) && /Founder revenue/i.test(text), "business account home did not explain provider-led deposits, refunds, payouts and founder revenue");
  assert(/Payout readiness checklist/i.test(text) && /Business identity/i.test(text) && /Country \+ tax passport/i.test(text) && /Provider rails/i.test(text) && /No live settlement/i.test(text), "business account home missing owner-friendly provider payout readiness");
  assert(/Review Ops handoff summary/i.test(text) && /Owner-readable launch packet/i.test(text) && /Launch decision/i.test(text) && /Money blocked/i.test(text), "business account home missing owner-readable Review Ops handoff summary");
  assert(/Sell now/i.test(text) && /Bookings/i.test(text) && /Customers/i.test(text) && /Orders/i.test(text) && /Public links/i.test(text) && /Close day/i.test(text), "business account home missing direct owner actions");
  assert(accountHome.overflow <= 2, "business account home introduced horizontal overflow");
  assert(/Business operating system/i.test(text) && /Ready systems/i.test(text), "business home did not render the Business OS owner board");
  assert(/Sell/.test(text) && /Serve/.test(text) && /Stock/.test(text) && /Customers/.test(text) && /Fulfil/.test(text) && /Money \/ reports/.test(text), "Business OS did not connect sell, serve, stock, customer, fulfilment and reporting lanes");
  assert(/World-standard owner checks/i.test(text) && /Daily close/i.test(text) && /Inventory counted/i.test(text) && /Receipts\/tax trail/i.test(text), "Business OS owner checks were missing");
  await page.evaluate(() => App.businessSystemDesk());
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(/Business operating system/i.test(text) && /Owner command/i.test(text) && /Production boundary/i.test(text), "Business OS modal did not expose owner command and production boundary");
  const staffAi = await page.evaluate(() => ({
    mentor: Boolean(document.querySelector('#modal.on [data-business-ai-mentor]')),
    staff: Boolean(document.querySelector('#modal.on [data-business-staff-access]')),
    staffRows: document.querySelectorAll('#modal.on [data-staff-access-row]').length,
    backendContract: Boolean(document.querySelector('#modal.on [data-staff-backend-contract]')),
    backendRows: document.querySelectorAll('#modal.on [data-staff-backend-row]').length,
  }));
  assert(staffAi.mentor && /AI business mentor/i.test(text) && /What I would do next/i.test(text) && /Owner approval/i.test(text), "Business OS did not expose the interactive AI mentor panel");
  assert(staffAi.staff && staffAi.staffRows >= 3 && /Business staff control/i.test(text) && /Account required/i.test(text) && /Linked account/i.test(text), "Business OS did not expose account-linked staff access controls");
  assert(staffAi.backendContract && staffAi.backendRows >= 5 && /Server permission contract/i.test(text) && /Role ACL/i.test(text) && /Staff audit log/i.test(text), "Business OS did not expose server-side staff permission contract");
  await page.evaluate(() => App.closeModal());
});

await step("business daily close ties sales bookings and provider states", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.go("register", false, { registerTab: "ops" });
  });
  await page.waitForTimeout(220);
  let text = await visibleText();
  const registerFlow = await page.evaluate(() => ({
    exists: Boolean(document.querySelector('[data-business-owner-flow][data-owner-flow-context="sales"]')),
    active: document.querySelector('[data-business-owner-flow][data-owner-flow-context="sales"] .owner-flow-step.on')?.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(registerFlow.exists && /Capture/.test(registerFlow.active), "Sales Desk did not keep the owner flow rail at the capture step");
  assert(registerFlow.overflow <= 2, "Sales Desk owner flow rail introduced horizontal overflow");
  assert(/Daily close command/i.test(text), "Sales Desk Ops did not render Daily close command");
  assert(/Expected drawer/i.test(text) && /Unpaid invoices/i.test(text) && /Provider states/i.test(text), "Daily close KPIs missing money-state coverage");
  assert(/Count drawer/i.test(text) && /Invoice reminders/i.test(text) && /Booking handoff/i.test(text) && /Customer after-care/i.test(text), "Daily close checklist missing key owner routes");
  assert(/Staff handoff/i.test(text) && /Bookings and fulfilment/i.test(text), "Daily close missing staff or fulfilment handoff");
  await page.evaluate(() => App.dailyCloseDesk());
  await page.waitForTimeout(180);
  text = await visibleText();
  const closeCoach = await page.evaluate(() => ({found:Boolean(document.querySelector('#modal.on [data-live-ai-destination-checklist="dailyClose"]')), sheetClass:document.querySelector("#modal.on .sheet")?.className || ""}));
  assert(closeCoach.found && closeCoach.sheetClass.includes("fit-scroll-sheet") && /Daily close copilot/i.test(text) && /Count drawer and unpaid invoices/i.test(text), "Daily close modal did not render the fitted guided Live AI destination checklist");
  assert(/Daily close command/i.test(text) && /Production boundary/i.test(text), "Daily close modal did not show production boundary");
  assert(/server-owned ledgers|payment-provider webhooks|M-Pesa/i.test(text), "Daily close modal did not preserve provider-led money boundary");
  await page.evaluate(() => {
    App.closeModal();
    App.home();
    App.businessSystemDesk();
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(/Close day/i.test(text) && /Daily close/i.test(text), "Business OS did not expose direct daily close command");
  await page.evaluate(() => {
    App.closeModal();
    App.artguide("end of day reconcile drawer");
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(/Daily close/i.test(text) && /Sales Desk Ops/i.test(text), "Artguide did not route end-of-day reconciliation to Daily close");
  await page.evaluate(() => App.closeModal());
});

await step("business staff accounts and AI mentor enforce owner lanes", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.businessStaffDesk();
  });
  await page.waitForTimeout(180);
  let text = await visibleText();
  const staffCoach = await page.evaluate(() => ({found:Boolean(document.querySelector('#modal.on [data-live-ai-destination-checklist="staffAccess"]')), sheetClass:document.querySelector("#modal.on .sheet")?.className || ""}));
  assert(staffCoach.found && staffCoach.sheetClass.includes("fit-scroll-sheet") && /Staff access copilot/i.test(text) && /Tag only an existing Artbook account/i.test(text), "business staff desk did not render the fitted guided Live AI staff checklist");
  assert(/Business staff control/i.test(text) && /Staff must have an Artbook account/i.test(text), "business staff desk did not explain account-linked staff");
  assert(/AI business mentor/i.test(text) && /Staff focus/i.test(text) && /Risk I will not cross/i.test(text), "business staff desk did not keep AI as a mentor/operator panel");
  assert(/Server permission contract/i.test(text) && /Role ACL/i.test(text) && /Money\/proof locks/i.test(text), "business staff desk did not show backend enforcement contract");
  await page.evaluate(() => App.tagBusinessStaff("musa", "Counter"));
  await page.waitForTimeout(220);
  let state = await saved();
  const tagged = (state.posStaff || []).find(row => row.account === "musa");
  assert(tagged && tagged.permissions.includes("invoice") && tagged.visibility === "counter_only", "tagging staff did not create a limited account-linked staff row");
  assert((state.bookingStaff || []).some(row => row.account === "musa" && row.business === "riley_biz"), "tagging staff did not create a booking worker row");
  assert((state.businessStaffEvents || []).some(row => row.type === "staff_tagged" && row.account === "musa"), "tagging staff did not write a staff audit event");
  assert((state.messages?.musa || []).some(msg => msg.type === "staff" && /tagged you/.test(msg.text || "")), "tagging staff did not notify the staff account");
  await page.evaluate(id => {
    App.posChooseStaff(id);
    App.posReportsDesk();
  }, tagged.id);
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(/Manager approval needed/i.test(text) && /linked account/i.test(text), "limited staff could open reports without manager approval");
  await page.evaluate(() => {
    App.closeModal();
    App.posChooseStaff("staff_owner");
  });
});

await step("business provider money map keeps payment custody provider-led", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.accountingReadoutDesk();
  });
  await page.waitForTimeout(180);
  const moneyMap = await page.evaluate(() => ({
    exists: Boolean(document.querySelector('#modal.on [data-provider-money-map][data-provider-money-map-context="accounting"]')),
    payoutChecklist: Boolean(document.querySelector('#modal.on [data-provider-payout-readiness][data-provider-payout-context="accounting"]')),
    payoutSteps: document.querySelectorAll('#modal.on [data-provider-payout-readiness] [data-provider-payout-step]').length,
    handoffSummary: Boolean(document.querySelector('#modal.on [data-review-ops-handoff][data-review-ops-context="accounting"]')),
    handoffSteps: document.querySelectorAll('#modal.on [data-review-ops-handoff] [data-review-ops-step]').length,
    growthDashboard: Boolean(document.querySelector('#modal.on [data-business-growth-dashboard]')),
    growthLine: Boolean(document.querySelector('#modal.on [data-business-growth-dashboard] [data-growth-line]')),
    growthBars: document.querySelectorAll('#modal.on [data-business-growth-dashboard] [data-growth-bar]').length,
    growthFunnelSteps: document.querySelectorAll('#modal.on [data-business-growth-dashboard] [data-growth-funnel-step]').length,
    ownerCockpit: Boolean(document.querySelector('#modal.on [data-business-growth-owner-cockpit]')),
    decisionRows: document.querySelectorAll('#modal.on [data-business-growth-decision]').length,
    stackSegments: document.querySelectorAll('#modal.on [data-business-growth-stack-segment]').length,
    riskBoard: Boolean(document.querySelector('#modal.on [data-business-growth-risk-board]')),
    riskRows: document.querySelectorAll('#modal.on [data-business-growth-risk-row]').length,
    templateStudio: Boolean(document.querySelector('#modal.on [data-business-growth-template-studio]')),
    templateCards: document.querySelectorAll('#modal.on [data-business-growth-template]').length,
    journeyMap: Boolean(document.querySelector('#modal.on [data-business-growth-journey-map]')),
    journeySteps: document.querySelectorAll('#modal.on [data-business-growth-journey]').length,
    text: document.querySelector('#modal.on [data-provider-money-map]')?.innerText || "",
    growthText: document.querySelector('#modal.on [data-business-growth-dashboard]')?.innerText || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(moneyMap.exists, "Accounting readout did not include the provider-led money map");
  assert(moneyMap.payoutChecklist && moneyMap.payoutSteps === 6, "Accounting readout did not include the full payout readiness checklist");
  assert(moneyMap.handoffSummary && moneyMap.handoffSteps === 5, "Accounting readout did not include the full Review Ops handoff summary");
  assert(moneyMap.growthDashboard && moneyMap.growthLine, "Accounting readout did not include the business growth graph dashboard");
  assert(moneyMap.growthBars >= 5 && moneyMap.growthFunnelSteps >= 4, "Business growth dashboard missing revenue bars or funnel steps");
  assert(/Business growth graphs/i.test(moneyMap.growthText) && /Revenue trend/i.test(moneyMap.growthText) && /Revenue mix/i.test(moneyMap.growthText) && /Growth funnel/i.test(moneyMap.growthText) && /Business growth levers/i.test(moneyMap.growthText), "Business growth dashboard missing core graph sections");
  assert(moneyMap.ownerCockpit && moneyMap.decisionRows >= 3 && moneyMap.stackSegments >= 5 && moneyMap.riskBoard && moneyMap.riskRows >= 1, "Business growth dashboard missing owner decision cockpit, channel stack or risk queue");
  assert(/Owner decision cockpit/i.test(moneyMap.growthText) && /Next best action/i.test(moneyMap.growthText) && /Channel stack/i.test(moneyMap.growthText) && /Risk and growth queue/i.test(moneyMap.growthText), "Business growth owner cockpit missing decision-ready language");
  assert(moneyMap.templateStudio && moneyMap.templateCards >= 3, "Business growth dashboard missing the template studio action cards");
  assert(/Growth template studio/i.test(moneyMap.growthText) && /Story sale prompt/i.test(moneyMap.growthText) && /Shop restock card/i.test(moneyMap.growthText) && /Booking fill push/i.test(moneyMap.growthText), "Business growth template studio missing social, shop or booking actions");
  assert(moneyMap.journeyMap && moneyMap.journeySteps >= 4, "Business growth dashboard missing the owner journey map");
  assert(/Owner journey map/i.test(moneyMap.growthText) && /Lead to Seal/i.test(moneyMap.growthText) && /Follow-up and Seal ready/i.test(moneyMap.growthText), "Business growth owner journey map missing launch-ready funnel language");
  assert(/Demo\/local ledger/i.test(moneyMap.growthText) && /server-owned ledgers/i.test(moneyMap.growthText) && /provider webhooks/i.test(moneyMap.growthText), "Business growth dashboard did not keep production accounting caveats visible");
  assert(/Provider-led money map/i.test(moneyMap.text), "provider money map missing title");
  assert(/Deposits/i.test(moneyMap.text) && /Refunds/i.test(moneyMap.text) && /Payouts/i.test(moneyMap.text) && /Founder revenue/i.test(moneyMap.text), "provider money map missing core money states");
  assert(/No APK custody/i.test(moneyMap.text) && /provider accounts/i.test(moneyMap.text) && /backend webhooks/i.test(moneyMap.text), "provider money map did not preserve Play Store-safe provider custody boundary");
  assert(/Payout readiness checklist/i.test(moneyMap.text) && /Business identity/i.test(moneyMap.text) && /Country \+ tax passport/i.test(moneyMap.text) && /Provider rails/i.test(moneyMap.text) && /Refund \+ support desk/i.test(moneyMap.text) && /Receipts \+ tax trail/i.test(moneyMap.text) && /Payout release rule/i.test(moneyMap.text), "provider money map missing guided payout setup steps");
  assert(/No secret values/i.test(moneyMap.text) && /Provider\/human review/i.test(moneyMap.text) && /No live settlement/i.test(moneyMap.text) && /Server ledger required/i.test(moneyMap.text), "payout readiness checklist did not preserve provider-led launch boundaries");
  assert(/Review Ops handoff summary/i.test(moneyMap.text) && /Owner-readable launch packet/i.test(moneyMap.text) && /Business payout readiness/i.test(moneyMap.text) && /Provider rails summary/i.test(moneyMap.text) && /Compliance runbook/i.test(moneyMap.text) && /Launch decision/i.test(moneyMap.text), "provider money map missing owner-readable Review Ops handoff rows");
  assert(/Money blocked/i.test(moneyMap.text) && /Review Ops\/human approval/i.test(moneyMap.text) && /Provider evidence required/i.test(moneyMap.text), "Review Ops handoff summary did not keep release and settlement blocked");
  assert(moneyMap.overflow <= 2, "provider money map introduced horizontal overflow");
  await page.evaluate(() => App.closeModal());
});

await step("business booking day command prepares staff customer handoff", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.go("calendar", false, { calendarTab: "booking" });
  });
  await page.waitForTimeout(220);
  let text = await visibleText();
  const calendarFlow = await page.evaluate(() => ({
    exists: Boolean(document.querySelector('[data-business-owner-flow][data-owner-flow-context="calendar"]')),
    active: document.querySelector('[data-business-owner-flow][data-owner-flow-context="calendar"] .owner-flow-step.on')?.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(calendarFlow.exists && /Confirm/.test(calendarFlow.active), "Calendar did not keep the owner flow rail at the confirm step");
  assert(calendarFlow.overflow <= 2, "Calendar owner flow rail introduced horizontal overflow");
  assert(/Booking day command/i.test(text), "Booking Desk did not render Booking day command");
  assert(/Availability live/i.test(text) && /Intake and private place/i.test(text) && /Payment policy shown/i.test(text), "Booking day command missing setup safety checks");
  assert(/Public booking links/i.test(text) && /WhatsApp \/ QR \/ SMS/i.test(text), "Booking day command did not surface public booking links");
  assert(/Customer handoff/i.test(text) && /After-care queue/i.test(text) && /Daily close link/i.test(text), "Booking day command missing customer handoff or close-day routes");
  assert(/Today booking handoff/i.test(text) && /Staff handoff/i.test(text), "Booking day command missing booking or staff handoff sections");
  await page.evaluate(() => App.bookingHandoffDesk());
  await page.waitForTimeout(180);
  text = await visibleText();
  const bookingCoach = await page.evaluate(() => ({found:Boolean(document.querySelector('#modal.on [data-live-ai-destination-checklist="bookingHandoff"]')), sheetClass:document.querySelector("#modal.on .sheet")?.className || ""}));
  assert(bookingCoach.found && bookingCoach.sheetClass.includes("fit-scroll-sheet") && /Booking day copilot/i.test(text) && /Message from the booking record/i.test(text), "Booking day command did not render the fitted guided Live AI destination checklist");
  assert(/Booking day command/i.test(text) && /Production boundary/i.test(text), "Booking day modal did not preserve production boundary");
  assert(/calendar locks|payment-provider deposits|private-address sharing|reminder consent/i.test(text), "Booking day modal missing backend/provider guardrails");
  await page.evaluate(() => {
    App.closeModal();
    App.artguide("booking handoff after-care");
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(/Booking day command/i.test(text) && /Care queue/i.test(text) && /Daily close/i.test(text), "Artguide did not route booking handoff language to Booking day command");
  await page.evaluate(() => App.closeModal());
});

await step("business booking links create tracked WhatsApp guest requests", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.publicShareSheet("sv1");
  });
  await page.waitForTimeout(180);
  let text = await visibleText();
  const share = await page.evaluate(() => ({
    pack: Boolean(document.querySelector("[data-booking-share-pack]")),
    whatsappHref: document.querySelector('#modal.on a[href^="https://wa.me"]')?.getAttribute("href") || "",
    message: document.querySelector("#openDoorShareMessage")?.value || "",
  }));
  assert(share.pack, "public booking share sheet did not render the booking channel pack");
  assert(share.whatsappHref.includes("https://wa.me/") && /Booking is only confirmed/.test(share.message), "WhatsApp booking message did not use a tracked confirmation guard");
  assert(/Open WhatsApp/.test(text) && /Guest booking/.test(text), "booking share sheet missing WhatsApp or guest booking actions");

  await page.evaluate(() => App.guestBookingDesk("sv1"));
  await page.waitForTimeout(140);
  text = await visibleText();
  assert(/Booking source/.test(text) && /Payment path/.test(text), "guest booking desk did not ask for source and payment path");
  await page.fill("#guestBookName", "QA WhatsApp guest");
  await page.fill("#guestBookContact", "+254700000001");
  await page.evaluate(() => {
    document.getElementById("guestBookingChannel").value = "WhatsApp link";
    document.getElementById("guestBookingPayment").value = "M-Pesa deposit pending";
    App.saveGuestBooking("sv1");
  });
  await page.waitForTimeout(180);
  const state = await saved();
  const guest = (state.guestBookings || []).find(row => row.guestName === "QA WhatsApp guest");
  const booking = (state.bookings || []).find(row => row.id === guest?.bookingId);
  assert(guest?.channel === "WhatsApp link" && guest.payment === "M-Pesa deposit pending", "guest booking did not persist channel and payment path");
  assert(booking?.sequence?.includes("public channel recorded") && booking.sourceLink?.includes("/booking/"), "tracked guest booking did not keep public link evidence");
  await page.evaluate(() => App.openDoorDesk());
  await page.waitForTimeout(140);
  text = await visibleText();
  const openDoorFlow = await page.evaluate(() => ({
    exists: Boolean(document.querySelector('#modal.on [data-business-owner-flow][data-owner-flow-context="openDoor"]')),
    active: document.querySelector('#modal.on [data-business-owner-flow][data-owner-flow-context="openDoor"] .owner-flow-step.on')?.textContent || "",
  }));
  assert(openDoorFlow.exists && /Capture/.test(openDoorFlow.active), "Open-door desk did not keep the owner flow rail visible");
  assert(/QA WhatsApp guest/.test(text) && /WhatsApp link/.test(text), "Open-door desk did not show the tracked WhatsApp guest booking");
  await page.evaluate(() => App.closeModal());
});

await step("business owner flow rail connects follow-up work", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.openComms("followups");
  });
  await page.waitForTimeout(180);
  const flow = await page.evaluate(() => ({
    exists: Boolean(document.querySelector('[data-business-owner-flow][data-owner-flow-context="followups"]')),
    active: document.querySelector('[data-business-owner-flow][data-owner-flow-context="followups"] .owner-flow-step.on')?.textContent || "",
    text: document.querySelector('[data-business-owner-flow][data-owner-flow-context="followups"]')?.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(flow.exists && /Follow up/.test(flow.active), "Follow-ups did not keep the owner flow rail at the care step");
  assert(/first request to payment status/i.test(flow.text), "Follow-up owner flow rail did not preserve the customer-thread promise");
  assert(flow.overflow <= 2, "Follow-up owner flow rail introduced horizontal overflow");
});

await step("business AI brief ranks operations and revenue safely", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAiAssist(true, "settings");
    App.setAccount("riley_biz");
    App.home();
  });
  await page.waitForTimeout(220);
  let text = await visibleText();
  assert(text.includes("Business AI brief") && text.includes("Next best actions") && text.includes("Money-safe revenue"), "business home did not render the AI owner brief");
  assert(text.includes("AI scans sales, bookings, stock, refunds") && text.includes("Owners still confirm charges"), "business AI brief did not state scope and final authority");
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button")).find(btn => /AI brief/.test(btn.textContent || ""));
    if (!button) throw new Error("Business AI brief button missing");
    button.click();
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Business operations copilot") && text.includes("Handle money-risk rows first"), "Business AI modal did not render operations copilot guidance");
  assert(text.includes("Founder and user trust rule") && text.includes("never hide it from receipts"), "Business AI modal did not preserve transparent monetization boundary");
  await page.evaluate(() => {
    App.closeModal();
    App.setAiAssist(false, "settings");
    App.closeModal();
    App.businessAiDesk();
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("AI is off") && text.includes("manual owner checklist") && text.includes("Business operations copilot"), "Business AI brief did not degrade to manual guidance when AI is off");
  await page.evaluate(() => {
    App.closeModal();
    App.setAiAssist(true, "settings");
  });
});

await step("workflow copilots guide checkout wallet and freelancer agreements", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAiAssist(true, "settings");
    App.setAccount("riley_biz");
    App.go("register", false, { registerTab: "sale" });
    App.posAdd("p1");
  });
  await page.waitForTimeout(220);
  let text = await visibleText();
  assert(text.includes("Checkout copilot"), "Sales Desk did not render the checkout copilot");
  assert(text.includes("Confirm walk-in or saved customer") && text.includes("AI assist on"), "checkout copilot did not show AI-on sale guidance");
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll(".ai-workflow-coach .btn")).find(btn => /Payment desk/.test(btn.textContent || ""));
    if (!button) throw new Error("Payment desk copilot action missing");
    button.click();
  });
  await page.waitForTimeout(180);
  assert((await visibleText()).includes("Choose payment"), "checkout copilot Payment desk action did not open payment flow");

  await page.evaluate(() => {
    App.closeModal();
    App.setAiAssist(false, "settings");
    App.go("register", false, { registerTab: "sale" });
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Checkout copilot") && text.includes("Manual mode") && text.includes("manual checklist"), "checkout copilot did not become a manual checklist when AI was off");

  await page.evaluate(() => {
    App.setAiAssist(true, "settings");
    App.setAccount("riley_artist");
    App.lockFinance();
    App.go("wallet");
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Wallet copilot") && text.includes("Unlock finance only when") && text.includes("AI assist on"), "wallet copilot did not explain locked finance safely");

  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("maya_adl");
    App.fundiJobDetail("fj_home_clean_seed");
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Freelancer agreement copilot"), "Freelancer job did not render agreement copilot");
  assert(text.includes("Both customer and freelancer agree") && text.includes("AI cannot accept terms"), "Freelancer copilot did not state agreement and authority boundaries");
  await page.evaluate(() => {
    const modal = document.querySelector("#modal.on");
    const button = Array.from(modal?.querySelectorAll(".ai-workflow-coach .btn") || []).find(btn => /Safety/.test(btn.textContent || ""));
    if (!button) throw new Error("Freelancer safety copilot action missing");
    button.click();
  });
  await page.waitForTimeout(180);
  assert((await visibleText()).includes("Freelancer safety"), "Freelancer copilot Safety action did not open safety desk");
  await page.evaluate(() => {
    App.closeModal();
    App.setAiAssist(true, "settings");
  });
});

await step("workflow copilots guide setup requests receipts and support", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAiAssist(true, "settings");
    App.setAccount("riley_biz");
    App.go("calendar", false, { calendarTab: "booking" });
  });
  await page.waitForTimeout(220);
  let text = await visibleText();
  assert(text.includes("Booking setup copilot"), "booking setup did not render the setup copilot");
  assert(text.includes("Publish only slots") && text.includes("Show deposit"), "booking setup copilot did not guide setup rules");
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll(".ai-workflow-coach .btn")).find(btn => /Policy/.test(btn.textContent || ""));
    if (!button) throw new Error("Booking setup Policy action missing");
    button.click();
  });
  await page.waitForTimeout(180);
  assert(/Booking protocol/i.test(await visibleText()), "booking setup copilot Policy action did not open protocol settings");

  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.go("register", false, { registerTab: "receipts" });
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Receipts copilot"), "receipts tab did not render receipt copilot");
  assert(text.includes("Open the receipt before refunding") && text.includes("Refund Ops"), "receipt copilot did not explain refund/accounting routing");
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll(".ai-workflow-coach .btn")).find(btn => /Invoice maker/.test(btn.textContent || ""));
    if (!button) throw new Error("Receipt copilot Invoice maker action missing");
    button.click();
  });
  await page.waitForTimeout(180);
  assert((await visibleText()).includes("Invoice"), "receipt copilot Invoice maker action did not open invoice flow");

  await page.evaluate(() => {
    App.closeModal();
    App.go("register", false, { registerTab: "settings" });
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Sales settings copilot") && text.includes("Turn on only the automations"), "Sales settings copilot did not explain safe automation choices");

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.completeVerification("money", "riley_artist");
    App.closeModal();
  });
  await unlockFinance("riley_artist");
  await page.evaluate(() => App.moneyFlow("request"));
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Money request copilot"), "wallet request modal did not render money request copilot");
  assert(text.includes("payer must inspect") && text.includes("AI cannot pressure the payer"), "money request copilot did not preserve payer approval boundary");

  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("maya_adl");
    App.fundiAgreementDesk("fj_home_clean_seed");
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Change order copilot"), "Freelancer agreement desk did not render change order copilot");
  assert(text.includes("Pause work-impacting changes") && text.includes("only the other party can approve"), "change order copilot did not state mutual approval boundary");

  const supportId = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const row = (stored.supportIncidents || []).find(item => item.job || item.order || item.booking || item.refund) || (stored.supportIncidents || [])[0];
    if (!row) return "";
    const job = row.job ? (stored.fundiJobs || []).find(item => String(item.id) === String(row.job)) : null;
    const order = row.order ? (stored.orders || []).find(item => String(item.id) === String(row.order)) : null;
    const booking = row.booking ? (stored.bookings || []).find(item => String(item.id) === String(row.booking)) : null;
    const account = job?.client || job?.assigned || order?.buyer || order?.seller || booking?.booker || booking?.provider || row.actor || "riley_creator";
    App.closeModal();
    App.setAccount(account);
    App.openSupportCase(row.id);
    return row.id;
  }, KEY);
  assert(supportId, "missing support incident for support copilot test");
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Support review copilot"), "support case did not render support review copilot");
  assert(text.includes("Open the source record before resolving") && text.includes("cannot settle money"), "support review copilot did not explain source-record and authority boundaries");
  await page.evaluate(() => App.closeModal());
});

await step("create stroke and internal media", async () => {
  await page.evaluate(() => {
    App.go("circle");
    App.compose();
  });
  await page.waitForSelector("#composeText", { state: "visible", timeout: 5000 });
  await page.fill("#composeText", "QA stroke with Artbook-native music preview.");
  await page.click(".compose-bottom-bar .btn");
  await page.waitForTimeout(250);
  const state = await saved();
  assert(state.posts?.some(post => /QA stroke/.test(post.text || "")), "created stroke was not saved");
});

await step("music release assistant handles paid prep and country rules", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_artist");
    App.completeVerification("artist", "riley_artist");
  });
  await page.waitForTimeout(160);
  await page.evaluate(() => {
    App.closeModal();
    App.uploadMusic();
  });
  await page.waitForSelector("#songTitle", { state: "visible", timeout: 5000 });
  await page.fill("#songTitle", "QA Rights Passport");
  await page.fill("#rightsNote", "Original composition controlled by Riley Artist for QA release review.");
  await page.fill("#rightsProof", "Studio session note and collaborator draft split attached for QA.");
  await page.evaluate(() => App.submitMusic());
  await page.waitForTimeout(220);
  let state = await saved();
  const album = (state.customAlbums || [])[0];
  assert(album?.title === "QA Rights Passport", "music upload did not create QA album");
  let text = await visibleText();
  const releaseCoach = await page.evaluate(() => ({found:Boolean(document.querySelector('#modal.on [data-live-ai-destination-checklist="artistRelease"]')), sheetClass:document.querySelector("#modal.on .sheet")?.className || ""}));
  assert(releaseCoach.found && releaseCoach.sheetClass.includes("fit-scroll-sheet") && /Artist release copilot/i.test(text) && /Artist final approval/i.test(text), "music release desk did not render the fitted guided Live AI artist release checklist");

  await page.evaluate(id => {
    App.upgradeArtistLabelPlan("pro");
    App.autoDraftMusicReleasePacket(id);
  }, album.id);
  await page.waitForTimeout(220);
  state = await saved();
  let review = state.musicRightsReviews?.[album.id];
  assert(review?.releaseStatus === "Artist approval needed", "Artist Pro did not prepare packet for approval");
  assert(/Pending artist approval/.test(review?.artistApproval || ""), "prepared packet did not wait for artist approval");
  assert((state.musicReleaseServiceRequests || []).some(row => row.album === album.id), "label service request was not stored");

  await page.evaluate(id => App.artistApproveMusicPacket(id), album.id);
  await page.waitForTimeout(180);
  state = await saved();
  review = state.musicRightsReviews?.[album.id];
  assert(/approved/i.test(review?.artistApproval || ""), "artist approval was not recorded");
  assert(/Artist-approved memory|approval|admin|sample/i.test(review?.rightsMemory || ""), "artist release rights memory was not preserved");

  await page.evaluate(() => App.jurisdictionDesk("riley_artist"));
  await page.waitForSelector("#jurOperatingCountry", { state: "visible", timeout: 5000 });
  await page.selectOption("#jurIdCountry", "Kenya");
  await page.selectOption("#jurResidenceCountry", "Australia");
  await page.selectOption("#jurOperatingCountry", "Australia");
  await page.selectOption("#jurPayoutCountry", "Australia");
  await page.selectOption("#jurTaxCountry", "Australia");
  await page.fill("#jurResidencyProof", "Australian visa/residence evidence verified by provider.");
  await page.fill("#jurWorkPermission", "Artist can sell and receive royalties in Australia under reviewed permit.");
  await page.fill("#jurResidencyExpiry", "2029-12-31");
  await page.evaluate(() => App.saveJurisdiction("riley_artist"));
  await page.waitForTimeout(150);
  await page.evaluate(() => App.capturePhoneLocation("riley_artist"));
  await page.waitForTimeout(180);
  await page.evaluate(() => App.approveJurisdiction("riley_artist"));
  await page.waitForTimeout(180);
  state = await saved();
  assert(state.jurisdictionProfiles?.riley_artist?.operatingCountry === "Australia", "country passport did not set operating country");
  assert(/Approved/.test(state.jurisdictionProfiles?.riley_artist?.reviewStatus || ""), "country passport was not approved");
});

await step("artist account exposes premium OS across home profile and studio", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_artist");
    App.home();
  });
  await page.waitForTimeout(180);
  let artistUi = await page.evaluate(() => ({
    center: Boolean(document.querySelector('[data-artist-command-center][data-artist-context="home"]')),
    releaseBoard: Boolean(document.querySelector('[data-artist-release-board][data-artist-release-context="home"]')),
    growth: Boolean(document.querySelector('[data-artist-growth-panel]')),
    benchmark: Boolean(document.querySelector('[data-artist-benchmark-panel]')),
    readinessRows: document.querySelectorAll("[data-artist-readiness-row]").length,
    text: document.body.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(artistUi.center && artistUi.releaseBoard && artistUi.growth && artistUi.benchmark, "artist home did not expose the new command center, release board, growth or benchmark panels");
  assert(artistUi.readinessRows >= 6, "artist home did not show enough readiness rows");
  assert(/Artist account|artist command center|Release board|AI artist partner|World-standard artist account/i.test(artistUi.text), "artist home copy did not explain the new artist OS");
  assert(artistUi.overflow <= 2, "artist home introduced horizontal overflow");

  await page.evaluate(() => App.artistCommandDesk("riley_artist"));
  await page.waitForTimeout(180);
  artistUi = await page.evaluate(() => ({
    modal: Boolean(document.querySelector("#modal.on")),
    center: Boolean(document.querySelector('#modal [data-artist-command-center][data-artist-context="modal"]')),
    releaseCards: document.querySelectorAll("#modal [data-artist-release-card]").length,
    text: document.body.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(artistUi.modal && artistUi.center && artistUi.releaseCards >= 1, "artist command modal did not render release-backed OS");
  assert(/Artist approval boundary|official copyright filing|provider or human review/i.test(artistUi.text), "artist command modal did not preserve release/legal/provider boundaries");
  assert(artistUi.overflow <= 2, "artist command modal introduced horizontal overflow");

  await page.evaluate(() => {
    App.closeModal();
    App.artistAiDesk("riley_artist");
  });
  await page.waitForTimeout(180);
  artistUi = await page.evaluate(() => ({
    mentor: Boolean(document.querySelector("#modal [data-artist-ai-mentor]")),
    text: document.body.textContent || "",
  }));
  assert(artistUi.mentor && /AI artist partner|Risk I will not cross|Safe artist AI/i.test(artistUi.text), "artist AI partner did not show operating guidance and safety limits");

  await page.evaluate(() => {
    App.closeModal();
    App.openProfile("riley_artist");
  });
  await page.waitForTimeout(180);
  artistUi = await page.evaluate(() => ({
    front: Boolean(document.querySelector("[data-artist-profile-front]")),
    text: document.body.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(artistUi.front && /Artist front|Artist OS|Release/i.test(artistUi.text), "artist profile did not expose the redesigned artist front");
  assert(artistUi.overflow <= 2, "artist profile front introduced horizontal overflow");

  await page.evaluate(() => App.profileTab("works"));
  await page.waitForTimeout(140);
  artistUi = await page.evaluate(() => ({
    releaseBoard: Boolean(document.querySelector('[data-artist-release-board][data-artist-release-context="profile"]')),
    releaseCards: document.querySelectorAll("[data-artist-release-card]").length,
  }));
  assert(artistUi.releaseBoard && artistUi.releaseCards >= 1, "artist profile works tab did not use the release board");

  await page.evaluate(() => {
    App.closeModal();
    App.go("studio");
  });
  await page.waitForTimeout(180);
  artistUi = await page.evaluate(() => ({
    center: Boolean(document.querySelector('[data-artist-command-center][data-artist-context="studio"]')),
    growth: Boolean(document.querySelector('[data-artist-growth-panel][data-artist-growth-context="studio"]')),
    releaseBoard: Boolean(document.querySelector('[data-artist-release-board][data-artist-release-context="studio"]')),
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(artistUi.center && artistUi.growth && artistUi.releaseBoard, "artist studio did not surface OS, growth and release panels");
  assert(artistUi.overflow <= 2, "artist studio introduced horizontal overflow");
});

await step("AI verification copilot follows provider-review boundary", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_artist");
    App.verificationCenter("money", "riley_artist");
  });
  await page.waitForTimeout(160);
  await page.evaluate(() => App.runVerificationAiAudit("money", "riley_artist"));
  await page.waitForTimeout(180);
  const state = await saved();
  const audit = (state.verificationAiAudits || [])[0];
  assert(audit?.providerRequired === true, "AI verification audit did not require provider/human approval");
  assert(/AI draft|Needs evidence/.test(audit?.decision || ""), "AI verification audit did not store a draft decision");
  const text = await visibleText();
  assert(text.includes("Bank-grade verification benchmark") && text.includes("provider/human approval"), "verification UI did not show benchmark/provider boundary");
});

await step("role-aware Create launchpad routes by account", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_artist");
    App.home();
  });
  await page.waitForTimeout(160);
  await page.locator('.flow-dock [data-flow-id="stroke"]').click();
  await page.waitForTimeout(160);
  let launch = await page.evaluate(() => ({
    role: document.querySelector("[data-create-launchpad]")?.dataset.role || "",
    primary: document.querySelector("[data-create-primary]")?.dataset.createPrimary || "",
    actions: document.querySelectorAll("[data-create-action]").length,
    text: document.body.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(launch.role === "artist", "Create dock did not open the artist launchpad");
  assert(launch.primary === "stroke" && /Best next start/.test(launch.text), "artist Create launchpad did not expose a single best-start action");
  assert(launch.actions >= 5 && launch.overflow <= 2, "artist Create launchpad actions or phone fit failed");
  assert(/Create cockpit/.test(launch.text) && /Post stroke/.test(launch.text) && /Upload release/.test(launch.text), "artist Create launchpad missing stroke or release routes");
  await page.locator('[data-create-primary="stroke"]').click();
  await page.waitForSelector("#composeText", { state: "visible", timeout: 5000 });
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.createHub();
  });
  await page.waitForTimeout(160);
  launch = await page.evaluate(() => ({
    role: document.querySelector("[data-create-launchpad]")?.dataset.role || "",
    primary: document.querySelector("[data-create-primary]")?.dataset.createPrimary || "",
    text: document.body.textContent || "",
  }));
  assert(launch.role === "business", "business Create launchpad did not render");
  assert(launch.primary === "stroke", "business Create launchpad did not keep the customer-safe post update as the best start");
  assert(/Add listing/.test(launch.text) && /Booking setup/.test(launch.text) && /Sales Desk/.test(launch.text), "business Create launchpad missing selling, booking or Sales Desk routes");
  await page.locator('[data-create-action="salesDesk"]').click();
  await page.waitForTimeout(180);
  let state = await saved();
  assert(state.account === "riley_biz" && state.page === "register", "business Create Sales Desk route failed");

  await page.evaluate(() => {
    App.setAccount("riley_streamer");
    App.createHub();
  });
  await page.waitForTimeout(160);
  launch = await page.evaluate(() => ({
    role: document.querySelector("[data-create-launchpad]")?.dataset.role || "",
    primary: document.querySelector("[data-create-primary]")?.dataset.createPrimary || "",
    text: document.body.textContent || "",
  }));
  assert(launch.role === "streamer", "streamer Create launchpad did not render");
  assert(launch.primary === "live", "streamer Create launchpad did not keep Go live as the best start");
  assert(/Go live/.test(launch.text) && /New episode/.test(launch.text) && /Subscriber series/.test(launch.text), "streamer Create launchpad missing live, podcast or subscriber routes");
  await page.locator('[data-create-action="podcastEpisode"]').click();
  await page.waitForSelector("#podEpisodeTitle", { state: "visible", timeout: 5000 });
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => {
    App.setAccount("riley_courier");
    App.home();
  });
  await page.waitForTimeout(160);
  await page.locator('.flow-dock [data-flow-id="create"]').click();
  await page.waitForTimeout(160);
  launch = await page.evaluate(() => ({
    role: document.querySelector("[data-create-launchpad]")?.dataset.role || "",
    primary: document.querySelector("[data-create-primary]")?.dataset.createPrimary || "",
    text: document.body.textContent || "",
  }));
  assert(launch.role === "courier", "courier Create dock did not open the courier launchpad");
  assert(launch.primary === "routeProof", "courier Create launchpad did not keep route proof as the best start");
  assert(/Route proof/.test(launch.text) && /Payout/.test(launch.text) && /Incident/.test(launch.text), "courier Create launchpad missing proof, payout or incident routes");
  await page.locator('[data-create-action="routeProof"]').click();
  await page.waitForTimeout(240);
  const proofText = await visibleText();
  assert(/Proof desk|Rider run sheet|Route board/i.test(proofText), "courier Create proof route did not open proof or trip work");
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_artist");
  });
});

await step("Create composer asks only role-specific fields", async () => {
  const cases = [
    {
      account: "riley_artist",
      intent: "artistStroke",
      fields: ["composeWorkType", "composeReleaseProof"],
      copy: ["Artist stroke", "Rights / proof note", "Art / release signal"],
    },
    {
      account: "riley_biz",
      intent: "businessUpdate",
      fields: ["composeUpdateType", "composeCustomerAction", "composeFulfillmentWindow"],
      copy: ["Business update", "Customer action", "Window"],
    },
    {
      account: "riley_streamer",
      intent: "roomSignal",
      fields: ["composeRoomMode", "composeAccessLevel", "composeConsentNote"],
      copy: ["Room signal", "Consent / sponsor note", "Stage-safe"],
    },
    {
      account: "riley_creator",
      intent: "creatorStroke",
      fields: ["composeCreatorIntent", "composeVisibility", "composeLinkedNeed"],
      copy: ["Creator stroke", "Linked need", "Scout-safe"],
    },
  ];

  for (const row of cases) {
    await page.evaluate(account => {
      App.closeModal();
      App.setAccount(account);
      App.createHub();
    }, row.account);
    await page.waitForTimeout(150);
    await page.locator('[data-create-action="stroke"]').click();
    await page.waitForSelector(`[data-compose-intent="${row.intent}"]`, { state: "visible", timeout: 5000 });
    const composer = await page.evaluate(({ fields }) => ({
      intent: document.querySelector(".compose-flow")?.dataset.composeIntent || "",
      role: document.querySelector(".compose-flow")?.dataset.composeRole || "",
      fields: fields.map(id => Boolean(document.getElementById(id))),
      readiness: document.querySelectorAll("[data-compose-readiness] [data-compose-ready]").length,
      readinessText: document.querySelector("[data-compose-readiness]")?.textContent || "",
      genericListingFields: Boolean(document.getElementById("listingName") || document.getElementById("fundiJobTitle") || document.getElementById("podEpisodeTitle")),
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      text: document.querySelector("#modal.on")?.textContent || "",
    }), { fields: row.fields });
    assert(composer.intent === row.intent, `${row.account} composer opened ${composer.intent} instead of ${row.intent}`);
    assert(composer.fields.every(Boolean), `${row.account} composer missing one or more role-specific fields`);
    assert(composer.readiness === 3 && /Audience/.test(composer.readinessText) && /Media/.test(composer.readinessText) && /Proof/.test(composer.readinessText), `${row.account} composer did not expose audience/media/proof readiness`);
    assert(!composer.genericListingFields, `${row.account} stroke composer leaked unrelated listing/job/podcast fields`);
    assert(composer.overflow <= 2, `${row.account} role composer introduced horizontal overflow`);
    for (const phrase of row.copy) assert(composer.text.includes(phrase), `${row.account} composer missing ${phrase}`);
    if (row.account === "riley_artist") {
      const publishBar = await page.evaluate(async () => {
        const sheet = document.querySelector("#modal.on .sheet");
        const bar = document.querySelector(".compose-bottom-bar");
        const targets = [...document.querySelectorAll(".compose-tool,.compose-context-field,.compose-hint")];
        if (!sheet || !bar) return { exists: false };
        const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        sheet.scrollTop = 0;
        await waitFrame();
        const br = bar.getBoundingClientRect();
        const hits = targets.map((node, index) => {
          const rect = node.getBoundingClientRect();
          const overlap = Math.max(0, Math.min(rect.bottom, br.bottom) - Math.max(rect.top, br.top));
          return { index, overlap, visible: rect.width > 0 && rect.height > 0 };
        }).filter(row => row.visible && row.overlap > 2);
        return {
          exists: true,
          position: getComputedStyle(bar).position,
          hits: hits.length,
        };
      });
      assert(publishBar.exists && !["fixed", "sticky"].includes(publishBar.position) && publishBar.hits === 0, "composer publish bar overlapped visible tools or stayed sticky");
      await page.locator('[data-compose-ready="proof"]').click();
      await page.waitForTimeout(140);
      const activeProof = await page.evaluate(() => document.activeElement?.id || "");
      assert(activeProof === "composeReleaseProof", "composer proof readiness did not focus the first missing proof field");
      const keyboardFit = await page.evaluate(async () => {
        const root = document.documentElement;
        const modal = document.querySelector("#modal.on");
        const sheet = document.querySelector("#modal.on .sheet.compose-sheet");
        const field = document.querySelector("#composeReleaseProof");
        const bar = document.querySelector(".compose-bottom-bar");
        const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (!modal || !sheet || !field || !bar) return { exists: false };
        const prior = {
          keyboard: root.dataset.keyboard || "",
          fitVh: root.style.getPropertyValue("--fit-vh"),
          fitVw: root.style.getPropertyValue("--fit-vw"),
          fitTop: root.style.getPropertyValue("--fit-visual-top"),
          fitLeft: root.style.getPropertyValue("--fit-visual-left"),
        };
        root.dataset.keyboard = "open";
        root.style.setProperty("--fit-vh", "520px");
        root.style.setProperty("--fit-vw", "390px");
        root.style.setProperty("--fit-visual-top", "0px");
        root.style.setProperty("--fit-visual-left", "0px");
        field.focus();
        field.scrollIntoView({ block: "center", inline: "nearest" });
        await waitFrame();
        const modalRect = modal.getBoundingClientRect();
        const sheetRect = sheet.getBoundingClientRect();
        const fieldRect = field.getBoundingClientRect();
        bar.scrollIntoView({ block: "end", inline: "nearest" });
        await waitFrame();
        const barRect = bar.getBoundingClientRect();
        const result = {
          exists: true,
          keyboard: root.dataset.keyboard,
          modalHeight: Math.round(modalRect.height),
          sheetHeight: Math.round(sheetRect.height),
          sheetBottom: Math.round(sheetRect.bottom),
          modalBottom: Math.round(modalRect.bottom),
          fieldBottom: Math.round(fieldRect.bottom),
          publishBottom: Math.round(barRect.bottom),
          overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        };
        root.dataset.keyboard = prior.keyboard;
        root.style.setProperty("--fit-vh", prior.fitVh || "100dvh");
        root.style.setProperty("--fit-vw", prior.fitVw || "100vw");
        root.style.setProperty("--fit-visual-top", prior.fitTop || "0px");
        root.style.setProperty("--fit-visual-left", prior.fitLeft || "0px");
        return result;
      });
      assert(keyboardFit.exists, "composer keyboard-fit check could not find the open compose sheet");
      assert(keyboardFit.keyboard === "open" && keyboardFit.modalHeight <= 522, `keyboard sheet did not clamp modal height: ${JSON.stringify(keyboardFit)}`);
      assert(keyboardFit.sheetHeight <= 522 && keyboardFit.sheetBottom <= keyboardFit.modalBottom + 2, `keyboard sheet did not stay above the visual viewport: ${JSON.stringify(keyboardFit)}`);
      assert(keyboardFit.fieldBottom <= keyboardFit.modalBottom + 2 && keyboardFit.publishBottom <= keyboardFit.modalBottom + 2, `keyboard sheet could not reveal focused proof and publish controls: ${JSON.stringify(keyboardFit)}`);
      assert(keyboardFit.overflow <= 2, "keyboard-aware compose sheet introduced horizontal overflow");
    }
    await page.evaluate(() => App.closeModal());
    await page.waitForTimeout(80);
  }

  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.compose("businessUpdate");
  });
  await page.waitForSelector('[data-compose-intent="businessUpdate"]', { state: "visible", timeout: 5000 });
  await page.locator('[data-compose-ready="media"]').click();
  await page.waitForSelector("[data-compose-media-desk]", { state: "visible", timeout: 5000 });
  const mediaDesk = await page.evaluate(() => ({
    actions: document.querySelectorAll("[data-compose-media-action]").length,
    text: document.querySelector("[data-compose-media-desk]")?.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(mediaDesk.actions >= 3 && /Media boundary/.test(mediaDesk.text) && /Shop photo/.test(mediaDesk.text) && /Sound/.test(mediaDesk.text), "composer media readiness did not open the media setup desk");
  assert(mediaDesk.overflow <= 2, "composer media setup desk introduced horizontal overflow");
  await page.locator('[data-compose-media-action="sound"]').click();
  await page.waitForSelector("[data-sound-fast-lane]", { state: "visible", timeout: 5000 });
  const soundFastLane = await page.evaluate(() => ({
    quickButtons: document.querySelectorAll("[data-sound-quick]").length,
    rowUseButtons: document.querySelectorAll("[data-sound-use]").length,
    text: document.querySelector("#modal.on")?.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(soundFastLane.quickButtons >= 6 && soundFastLane.rowUseButtons >= 6, "sound picker did not expose direct 15s/30s fast-lane actions");
  assert(/Fast lane/.test(soundFastLane.text) && /Use 15s/.test(soundFastLane.text) && /Use 30s/.test(soundFastLane.text), "sound picker fast lane missing clear duration copy");
  assert(soundFastLane.overflow <= 2, "sound picker fast lane introduced horizontal overflow");
  await page.locator('[data-sound-quick-duration="15"]').first().click();
  await page.waitForSelector('[data-compose-intent="businessUpdate"]', { state: "visible", timeout: 5000 });
  let readiness = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5") || "{}");
    return {
      media: document.querySelector('[data-compose-ready="media"]')?.textContent || "",
      soundSticker: Boolean(document.querySelector(".sound-sticker")),
      duration: Number(state.composeSound?.duration || 0),
    };
  });
  assert(/15s|Media/.test(readiness.media) && readiness.soundSticker && readiness.duration === 15, "fast-lane sound selection did not return to composer with a 15s snippet");
  await page.locator('[data-compose-ready="media"]').click();
  await page.waitForSelector("[data-compose-media-desk]", { state: "visible", timeout: 5000 });
  await page.locator('[data-compose-media-action="sound"]').click();
  await page.waitForSelector("[data-sound-adjust-card]", { state: "visible", timeout: 5000 });
  let soundAdjust = await page.evaluate(() => ({
    durationButtons: document.querySelectorAll("[data-sound-duration]").length,
    presets: document.querySelectorAll("[data-sound-start-preset]").length,
    label: document.querySelector("#soundStartLabel")?.textContent || "",
    text: document.querySelector("[data-sound-adjust-card]")?.textContent || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(soundAdjust.durationButtons === 2 && soundAdjust.presets >= 4, "selected sound adjustment did not expose duration and start presets");
  assert(/Selected snippet/.test(soundAdjust.text) && /Length/.test(soundAdjust.text) && /Start point/.test(soundAdjust.text), "selected sound adjustment missing clear control labels");
  assert(soundAdjust.overflow <= 2, "selected sound adjustment introduced horizontal overflow");
  await page.locator('[data-sound-duration="30"]').click();
  await page.waitForSelector("[data-sound-adjust-card]", { state: "visible", timeout: 5000 });
  await page.locator('[data-sound-start-preset="hook"]').click();
  await page.waitForSelector("[data-sound-adjust-card]", { state: "visible", timeout: 5000 });
  soundAdjust = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5") || "{}");
    return {
      duration: Number(state.composeSound?.duration || 0),
      start: Number(state.composeSound?.start || 0),
      label: document.querySelector("#soundStartLabel")?.textContent || "",
      selectedPreset: document.querySelector("[data-sound-start-preset].on")?.getAttribute("data-sound-start-preset") || "",
    };
  });
  assert(soundAdjust.duration === 30 && soundAdjust.start > 0 && soundAdjust.selectedPreset === "hook", "selected sound adjustment did not persist 30s hook preset");
  assert(/to/.test(soundAdjust.label), "selected sound adjustment did not update the snippet range label");
  await page.locator("[data-sound-use-current]").click();
  await page.waitForSelector('[data-compose-intent="businessUpdate"]', { state: "visible", timeout: 5000 });
  readiness = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5") || "{}");
    return {
      media: document.querySelector('[data-compose-ready="media"]')?.textContent || "",
      duration: Number(state.composeSound?.duration || 0),
      start: Number(state.composeSound?.start || 0),
    };
  });
  assert(/30s/.test(readiness.media) && readiness.duration === 30 && readiness.start > 0, "composer readiness did not reflect adjusted 30s sound snippet");
  await page.evaluate(() => {
    App.removeComposeSound();
    App.compose("businessUpdate");
  });
  await page.waitForSelector('[data-compose-intent="businessUpdate"]', { state: "visible", timeout: 5000 });
  await page.locator('[data-compose-ready="media"]').click();
  await page.waitForSelector("[data-compose-media-desk]", { state: "visible", timeout: 5000 });
  await page.locator('[data-compose-media-action="image"]').click();
  await page.waitForSelector('[data-compose-intent="businessUpdate"]', { state: "visible", timeout: 5000 });
  readiness = await page.evaluate(() => ({
    media: document.querySelector('[data-compose-ready="media"]')?.textContent || "",
    count: document.querySelectorAll("[data-compose-readiness] [data-compose-ready]").length,
  }));
  assert(readiness.count === 3 && /Shop photo card|Media/.test(readiness.media), "composer media readiness did not reflect the selected attachment");
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.compose("artistStroke");
    App.chooseComposeSound("sound_alb1_0");
    App.compose("artistStroke");
  });
  await page.waitForSelector('[data-compose-intent="artistStroke"]', { state: "visible", timeout: 5000 });
  readiness = await page.evaluate(() => ({
    media: document.querySelector('[data-compose-ready="media"]')?.textContent || "",
    soundSticker: Boolean(document.querySelector(".sound-sticker")),
  }));
  assert(/Westlands at 2am|15s|Media/.test(readiness.media) && readiness.soundSticker, "composer media readiness did not reflect the selected sound ribbon");
  await page.evaluate(() => {
    App.removeComposeSound();
    App.removeComposeAttachment();
    App.setAccount("riley_biz");
    App.compose("businessUpdate");
  });
  await page.waitForSelector('[data-compose-intent="businessUpdate"]', { state: "visible", timeout: 5000 });
  await page.fill("#composeText", "Fresh manicure slots today.");
  await page.selectOption("#composeUpdateType", "Service slot");
  await page.selectOption("#composeCustomerAction", "Book appointment");
  await page.fill("#composeFulfillmentWindow", "Today 14:00-18:00");
  await page.locator("#modal.on .compose-bottom-bar .btn").click();
  await page.waitForTimeout(180);
  const state = await saved();
  const post = state.posts?.[0] || {};
  assert(post.author === "riley_biz" && post.composeIntent === "businessUpdate", "business composer post did not keep role intent");
  assert(post.composeContext?.updateType === "Service slot", "business composer did not save update type");
  assert(post.composeContext?.customerAction === "Book appointment", "business composer did not save customer action");
  assert(post.composeContext?.fulfillmentWindow === "Today 14:00-18:00", "business composer did not save fulfillment window");
});

await step("messages and chat send", async () => {
  await page.evaluate(() => App.openComms("messages"));
  await page.waitForSelector(".thread-list", { state: "visible", timeout: 5000 });
  await page.evaluate(() => App.openChat("zuri"));
  await page.waitForSelector("#chatText", { state: "visible", timeout: 5000 });
  const chatKeyboard = await probeKeyboardViewport({
    fieldSelector: "#chatText",
    actionSelector: ".chat-compose",
    surfaceSelector: ".chat-page",
  });
  assert(chatKeyboard.exists, `chat keyboard check missing elements: ${JSON.stringify(chatKeyboard)}`);
  assert(chatKeyboard.dockHidden, "bottom dock stayed visible while chat keyboard was open");
  assert(chatKeyboard.surfaceBottom <= 522 && chatKeyboard.fieldBottom <= 522 && chatKeyboard.actionBottom <= 522, `chat input was not kept above keyboard viewport: ${JSON.stringify(chatKeyboard)}`);
  assert(chatKeyboard.overflow <= 2, "chat keyboard fit introduced horizontal overflow");
  await page.fill("#chatText", "QA chat check with a clean full-screen thread.");
  await page.evaluate(() => App.sendChat("zuri"));
  await page.waitForTimeout(200);
  const state = await saved();
  assert(state.messages?.zuri?.some(msg => /QA chat check/.test(msg.text || "")), "chat message was not saved");
});

await step("sensitive thread previews stay shielded while normal previews work", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    const raw = JSON.parse(localStorage.getItem("artbook.mobile.demo.v5") || "{}");
    if(raw.settings?.privatePreviews) App.toggleSetting("privatePreviews");
    App.openComms("messages");
  });
  await page.waitForSelector(".thread-list", { state: "visible", timeout: 5000 });
  let text = await visibleText();
  assert(/Protected .*preview/i.test(text), "sensitive inbox previews were not shielded");
  assert(!/Please approve the repair ticket/i.test(text), "repair ticket text leaked into inbox preview");
  assert(!/Mobile nail appointment needs address/i.test(text), "address context leaked into inbox preview");
  await page.evaluate(() => App.demoAiWorldDesk());
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(/Archived fixes/i.test(text) && /Sensitive message previews are visible/i.test(text), "Moto World did not archive the private-preview fix");
  const state = await saved();
  assert((state.demoAiWorld?.resolvedIssues || []).some(row => row.sourceId === "private-previews"), "Moto World resolved private-preview item missing");
  assert(!(state.demoAiWorld?.issueLog || []).some(row => row.sourceId === "private-previews" && /open/i.test(row.status || "")), "Moto World reopened private-previews after shield");
  assert((state.demoAiWorld?.archive || []).some(row => row.type === "resolved-issue" && row.sourceId === "private-previews"), "Moto World archive did not preserve private-preview evidence");
});

await step("email and collab sheets stay keyboard reachable", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.emailFollowUp("zuri");
  });
  await page.waitForSelector("#emailBody", { state: "visible", timeout: 5000 });
  const emailFit = await probeKeyboardViewport({
    fieldSelector: "#emailBody",
    actionSelector: "#modal.on .sheet-entry-action",
    surfaceSelector: "#modal.on .sheet",
  });
  assert(emailFit.exists, `email keyboard check missing elements: ${JSON.stringify(emailFit)}`);
  assert(emailFit.dockHidden, "bottom dock stayed visible while email follow-up keyboard was open");
  assert(emailFit.surfaceBottom <= 522 && emailFit.fieldBottom <= 522 && emailFit.actionBottom <= 522, `email follow-up action was not reachable above keyboard: ${JSON.stringify(emailFit)}`);
  assert(emailFit.overflow <= 2, "email keyboard fit introduced horizontal overflow");
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.newCollab();
  });
  await page.waitForSelector("#collabText", { state: "visible", timeout: 5000 });
  const requestFit = await probeKeyboardViewport({
    fieldSelector: "#collabText",
    actionSelector: "#modal.on .sheet-entry-action",
    surfaceSelector: "#modal.on .sheet",
  });
  assert(requestFit.exists, `collab request keyboard check missing elements: ${JSON.stringify(requestFit)}`);
  assert(requestFit.dockHidden, "bottom dock stayed visible while collab request keyboard was open");
  assert(requestFit.surfaceBottom <= 522 && requestFit.fieldBottom <= 522 && requestFit.actionBottom <= 522, `collab request action was not reachable above keyboard: ${JSON.stringify(requestFit)}`);
  assert(requestFit.overflow <= 2, "collab request keyboard fit introduced horizontal overflow");
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.collab("cr1", "accepted");
    App.collabRoom("cr1");
  });
  await page.waitForSelector("#collabNote", { state: "visible", timeout: 5000 });
  const roomFit = await probeKeyboardViewport({
    fieldSelector: "#collabNote",
    actionSelector: "#modal.on .sheet-entry-action",
    surfaceSelector: "#modal.on .sheet",
  });
  assert(roomFit.exists, `collab room keyboard check missing elements: ${JSON.stringify(roomFit)}`);
  assert(roomFit.dockHidden, "bottom dock stayed visible while collab room keyboard was open");
  assert(roomFit.surfaceBottom <= 522 && roomFit.fieldBottom <= 522 && roomFit.actionBottom <= 522, `collab room save action was not reachable above keyboard: ${JSON.stringify(roomFit)}`);
  assert(roomFit.overflow <= 2, "collab room keyboard fit introduced horizontal overflow");
  await page.evaluate(() => App.closeModal());
});

await step("reminders create follow-up trail", async () => {
  const before = await saved();
  const followCount = (before.followUps || []).length;
  const noticeCount = (before.notifications || []).length;
  const emailCount = (before.emails || []).length;
  await page.evaluate(() => App.remind("QA listening party"));
  await page.waitForTimeout(200);
  const state = await saved();
  const follow = (state.followUps || []).find(row => /QA listening party/.test(row.title || ""));
  assert(Boolean(follow), "reminder did not create a follow-up");
  assert((state.followUps || []).length > followCount, "follow-up count did not increase");
  assert((state.notifications || []).length > noticeCount, "reminder did not create a bell notification");
  assert((state.emails || []).length > emailCount, "reminder did not create an email-style nudge");
  assert((state.notifications || []).some(n => n.record?.type === "followup" && n.record?.id === follow.id), "reminder notification did not link to exact follow-up");
  await page.evaluate(id => App.openFollowUp(id), follow.id);
  await page.waitForTimeout(150);
  assert((await visibleText()).includes("QA listening party"), "saved reminder follow-up did not open");
  await page.evaluate(() => {
    const originalNow = Date.now;
    Date.now = () => 4242424242424;
    try {
      App.remind("QA collision one");
      App.remind("QA collision two");
    } finally {
      Date.now = originalNow;
    }
  });
  await page.waitForTimeout(220);
  const collisionState = await saved();
  const collisionNotices = (collisionState.notifications || []).filter(n => /QA collision/.test(n.text || ""));
  const collisionFollows = (collisionState.followUps || []).filter(f => /QA collision/.test(f.title || ""));
  assert(collisionNotices.length >= 2, "collision reminder notices were not both saved");
  assert(new Set(collisionNotices.map(n => n.id)).size === collisionNotices.length, "bell notification ids collided under same-tick events");
  assert(new Set(collisionFollows.map(f => f.id)).size === collisionFollows.length, "follow-up ids collided under same-tick events");
});

await step("social actions create quiet trails", async () => {
  await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    snap.following = snap.following || {};
    delete snap.following.kojo;
    snap.liked = snap.liked || {};
    delete snap.liked.s2;
    snap.pollVotes = snap.pollVotes || {};
    delete snap.pollVotes.s2;
    snap.socialSignals = [];
    localStorage.setItem(key, JSON.stringify(snap));
  }, KEY);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });
  await page.evaluate(() => {
    App.follow("kojo");
    App.like("s2");
    App.vote("s2", 1);
  });
  await page.evaluate(() => App.comments("s2"));
  await page.waitForSelector("#commentText", { state: "visible", timeout: 5000 });
  await page.fill("#commentText", "QA comment trail");
  await page.evaluate(() => App.addComment("s2"));
  await page.waitForTimeout(120);
  const commentDetail = await page.evaluate(() => ({
    sheetClass: document.querySelector("#modal.on .sheet")?.className || "",
    detail: Boolean(document.querySelector('#modal.on [data-stroke-detail="s2"]')),
    hero: Boolean(document.querySelector("#modal.on [data-stroke-detail-hero]")),
    actions: document.querySelectorAll("#modal.on [data-stroke-action]").length,
    stats: document.querySelectorAll("#modal.on [data-stroke-detail-stat]").length,
    boundary: Boolean(document.querySelector("#modal.on [data-stroke-forward-boundary]")),
    composer: Boolean(document.querySelector("#modal.on #commentText")),
    text: document.querySelector("#modal.on")?.textContent || ""
  }));
  assert(commentDetail.sheetClass.includes("stroke-detail-sheet") && commentDetail.sheetClass.includes("fit-scroll-sheet"), `Stroke detail sheet is not fitted: ${JSON.stringify(commentDetail)}`);
  assert(commentDetail.detail && commentDetail.hero && commentDetail.actions >= 3 && commentDetail.stats >= 3 && commentDetail.boundary && commentDetail.composer, `Stroke comments did not render as a full detail surface: ${JSON.stringify(commentDetail)}`);
  assert(/Forwarding rule|Conversation|Next action/i.test(commentDetail.text), "Stroke detail did not keep action/comment/forwarding context visible");
  await page.evaluate(() => App.closeModal());
  await page.evaluate(() => App.comments("s10"));
  await page.waitForSelector('#modal.on [data-stroke-detail="s10"]', { state: "visible", timeout: 5000 });
  const socialShopDetail = await page.evaluate(() => {
    const box = document.querySelector("#modal.on .sheet")?.getBoundingClientRect();
    return {
      sheetClass: document.querySelector("#modal.on .sheet")?.className || "",
      shop: Boolean(document.querySelector("#modal.on [data-stroke-shop-context]")),
      shopRows: document.querySelectorAll("#modal.on [data-stroke-shop-row]").length,
      actions: document.querySelectorAll("#modal.on [data-stroke-action]").length,
      stats: document.querySelectorAll("#modal.on [data-stroke-detail-stat]").length,
      boundary: Boolean(document.querySelector("#modal.on [data-stroke-forward-boundary]")),
      text: document.querySelector("#modal.on")?.textContent || "",
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth),
      bottom: box?.bottom || 0,
      viewportHeight: window.innerHeight
    };
  });
  assert(socialShopDetail.shop && socialShopDetail.shopRows >= 2, `Shop-linked Stroke detail lost seller context: ${JSON.stringify(socialShopDetail)}`);
  assert(socialShopDetail.actions >= 4 && socialShopDetail.stats >= 3 && socialShopDetail.boundary, `Shop-linked Stroke detail lacks action/stat/boundary rails: ${JSON.stringify(socialShopDetail)}`);
  assert(/Shop context|provider-led checkout|review before any provider payment|Forwarding rule/i.test(socialShopDetail.text), "Shop-linked Stroke detail did not explain provider-led review-first commerce");
  assert(socialShopDetail.overflow <= 2 && socialShopDetail.bottom <= socialShopDetail.viewportHeight + 1, `Stroke detail overflows compact phone: ${JSON.stringify(socialShopDetail)}`);
  await page.evaluate(() => App.closeModal());
  await page.evaluate(() => App.comments("s_ai_2"));
  await page.waitForSelector('#modal.on [data-stroke-detail="s_ai_2"]', { state: "visible", timeout: 5000 });
  const aiStrokeDetail = await page.evaluate(() => ({
    aiDisclosure: Boolean(document.querySelector("#modal.on [data-stroke-ai-disclosure]")),
    text: document.querySelector("#modal.on")?.textContent || ""
  }));
  assert(aiStrokeDetail.aiDisclosure && /AI-labeled demo account|synthetic QA material/i.test(aiStrokeDetail.text), "AI demo Stroke detail lost visible AI disclosure");
  await page.evaluate(() => {
    App.closeModal();
    App.confirmForward("s4");
    App.requestForward("s3");
  });
  await page.waitForTimeout(250);
  const state = await saved();
  assert(state.following?.kojo === true, "follow did not persist");
  assert(state.liked?.s2 === true, "like did not persist");
  assert(state.pollVotes?.s2 === 1, "poll vote did not persist");
  assert((state.comments?.s2 || []).some(row => /QA comment trail/.test(row.text || "")), "comment did not persist");
  assert((state.forwarded || []).some(row => row.post === "s4" && row.by === state.account), "public forward was not recorded");
  assert((state.collabs || []).some(row => row.post === "s3" && row.content === "Forward request"), "permission forward request was not recorded");
  assert((state.socialSignals || []).filter(row => ["follow","like","poll","comment","forward","forward_request"].includes(row.type)).length >= 6, "social signals were not recorded");
  assert((state.notifications || []).some(n => n.record?.type === "profile" && n.record?.id === "kojo"), "follow notification did not link to profile");
  assert((state.notifications || []).some(n => n.record?.type === "stroke" && n.record?.id === "s2"), "like/vote notification did not link to Stroke");
  assert((state.notifications || []).some(n => n.record?.type === "stroke" && n.record?.id === "s4"), "forward notification did not link to Stroke");
  assert((state.messages?.thabo || []).some(m => m.type === "forwardRequest" && m.post === "s3"), "forward request did not create a message thread");
  await page.evaluate(() => App.followingDesk());
  await page.waitForTimeout(150);
  const text = await visibleText();
  assert(text.includes("Saved strokes") && text.includes("Recent signals"), "following desk did not expose saved/social trails");
  await page.evaluate(() => App.closeModal());
});

await step("finance gate", async () => {
  await page.evaluate(() => {
    App.lockFinance();
    App.go("wallet");
  });
  await page.waitForSelector("#financePin", { state: "visible", timeout: 5000 });
  let text = await visibleText();
  let lowerText = text.toLowerCase();
  assert(lowerText.includes("provider-led pay") && lowerText.includes("finance locked") && lowerText.includes("demo pin"), "locked Pay surface did not render the premium provider-led finance gate");
  const headerCopy = await page.evaluate(() => document.querySelector(".top-context")?.textContent || "");
  assert(/provider/i.test(headerCopy) && !/wallet, gifts and receipts/i.test(headerCopy) && !/provider wallet/i.test(headerCopy), "Pay header should use the compact Provider context");
  await unlockFinance();
  text = await visibleText();
  lowerText = text.toLowerCase();
  assert(lowerText.includes("provider-led pay") && lowerText.includes("demo balance") && lowerText.includes("founder revenue") && lowerText.includes("provider map"), "unlocked Pay surface did not expose the simplified premium wallet actions");
  assert(lowerText.includes("provider-led money boundary") && lowerText.includes("demo ledger only") && lowerText.includes("no custody"), "unlocked Pay surface did not keep the provider custody boundary visible");
});

await step("pay lens helper prepares payments without moving money", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.backendSyncDesk();
    const mode = document.getElementById("backendMode");
    if (mode) mode.value = "offline";
    App.saveBackendConfig();
    App.closeModal();
    App.go("wallet");
    App.openPayLens();
  });
  await page.waitForSelector("#modal.on .quick-pay-sheet", { state: "visible", timeout: 5000 });
  let text = await visibleText();
  assert(text.includes("Pay in seconds"), "Pay Lens modal title did not render");
  assert(text.includes("Upload, scan, or paste payment details") && text.includes("Upload an invoice") && text.includes("Choose a screenshot") && text.includes("Scan a QR code"), "Pay Lens entry modal missing expected helper choices");
  assert(text.includes("Local review") && text.includes("Backend offline") && text.includes("Local draft") && text.includes("Money blocked"), "Pay Lens entry sheet did not expose offline/local review status");
  const accepts = await page.evaluate(() => ({
    invoice: document.getElementById("payLensInvoiceFile")?.getAttribute("accept") || "",
    screenshot: document.getElementById("payLensScreenshotFile")?.getAttribute("accept") || "",
  }));
  assert(/pdf/i.test(accepts.invoice) && /image/i.test(accepts.invoice), "Pay Lens invoice picker should accept PDF and images");
  assert(/image/i.test(accepts.screenshot), "Pay Lens screenshot picker should accept images");

  await page.evaluate(() => App.openPayLensCode());
  await page.waitForSelector("#payLensCodeInput", { state: "visible", timeout: 5000 });
  let disabled = await page.locator("#payLensCodeContinue").isDisabled();
  assert(disabled, "Pay Lens continue should be disabled for an empty payment code");
  await page.fill("#payLensCodeInput", "to: Zuri Kora | KES 1200 | account: till 123456 | ref: QA Pay Lens");
  await page.evaluate(() => App.payLensCodeChanged());
  disabled = await page.locator("#payLensCodeContinue").isDisabled();
  assert(!disabled, "Pay Lens continue did not enable after entering a payment code");

  const before = await saved();
  const beforeBalance = before.walletBalancesByAccount?.riley_artist ?? before.balance;
  const beforeLedger = (before.walletLedger || []).length;
  await page.evaluate(() => App.continuePayLensCode());
  await page.waitForSelector("#payLensPayee", { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Review payment") && text.includes("Confirm payment") && text.includes("Cancel"), "Pay Lens did not force a review screen before confirmation");
  assert(text.includes("Provider validation required") && text.includes("Money: blocked") && text.includes("Settlement: disabled"), "Pay Lens review did not surface provider readiness and money blockers");
  assert(text.includes("Provider handoff contract") && text.includes("Masked draft payload") && text.includes("Human review consent") && text.includes("Server vault only") && text.includes("Checkout intent") && text.includes("Signed webhook + ledger"), "Pay Lens review did not expose the backend/provider handoff contract");
  const handoffContract = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-pay-lens-provider-handoff]")),
    rail: document.querySelector("[data-pay-lens-provider-handoff]")?.getAttribute("data-pay-lens-provider-handoff-rail") || "",
    ready: Number(document.querySelector("[data-pay-lens-provider-handoff]")?.getAttribute("data-pay-lens-provider-handoff-ready") || 0),
    steps: Number(document.querySelector("[data-pay-lens-provider-handoff]")?.getAttribute("data-pay-lens-provider-handoff-steps") || 0),
    validated: document.querySelector("[data-pay-lens-provider-handoff]")?.getAttribute("data-pay-lens-provider-handoff-validated") || "",
    statuses: Array.from(document.querySelectorAll("[data-pay-lens-handoff-step]")).map(row => row.getAttribute("data-pay-lens-handoff-status") || "")
  }));
  assert(handoffContract.exists && handoffContract.rail === "mpesa_till" && handoffContract.steps === 5 && handoffContract.ready === 0 && handoffContract.validated === "false", `Pay Lens offline handoff contract should be blocked before backend proof: ${JSON.stringify(handoffContract)}`);
  assert(handoffContract.statuses.includes("required") && handoffContract.statuses.filter(status => status === "blocked").length >= 4, "Pay Lens offline handoff contract should require human review and keep backend/provider steps blocked");
  assert(text.includes("Launch gates for this draft") && text.includes("Full provider task map") && text.includes("Provider contract") && text.includes("Token vault"), "Pay Lens review did not show compact provider-readiness launch gates");
  assert(text.includes("No provider checkout") && text.includes("OCR worker") && text.includes("QR parser") && text.includes("Webhook replay") && text.includes("Ledger reconciliation") && text.includes("Compliance sign-off"), "Pay Lens review readiness summary missed provider task map or money boundary");
  const reviewReadiness = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-pay-lens-review-readiness]")),
    blocked: Number(document.querySelector("[data-pay-lens-review-readiness]")?.getAttribute("data-pay-lens-review-blocked") || 0),
    taskCount: Number(document.querySelector("[data-pay-lens-review-readiness]")?.getAttribute("data-pay-lens-review-task-count") || 0),
    visibleGateCount: document.querySelectorAll("[data-pay-lens-review-gate]").length,
    fullGateCount: document.querySelectorAll("[data-pay-lens-review-gate-all]").length,
    statuses: Array.from(document.querySelectorAll("[data-pay-lens-review-gate-all]")).map(row => row.getAttribute("data-pay-lens-review-gate-status") || ""),
  }));
  assert(reviewReadiness.exists && reviewReadiness.taskCount === 7 && reviewReadiness.fullGateCount === 7 && reviewReadiness.visibleGateCount >= 4 && reviewReadiness.blocked >= 5, "Pay Lens review readiness summary should mirror seven Backend Sync provider gates and stay blocked");
  assert(reviewReadiness.statuses.filter(status => status === "blocked").length >= 5, "Pay Lens review readiness gates should remain mostly blocked before external provider proof");
  assert(text.includes("Server draft check") && text.includes("Backend: offline"), "Pay Lens review did not expose offline backend draft-check boundary");
  assert(text.includes("Expected proof on prepare") && text.includes("Offline local draft"), "Pay Lens review did not preview offline local proof before confirmation");
  const draft = await page.evaluate(() => ({
    payee: document.getElementById("payLensPayee")?.value || "",
    amount: document.getElementById("payLensAmount")?.value || "",
    currency: document.getElementById("payLensCurrency")?.value || "",
    details: document.getElementById("payLensDetails")?.value || "",
    reference: document.getElementById("payLensReference")?.value || "",
  }));
  assert(/Zuri Kora/i.test(draft.payee) && draft.amount === "1200" && draft.currency === "KES" && /ending/i.test(draft.details) && /QA Pay Lens/i.test(draft.reference), "Pay Lens code parser did not prefill editable review details");
  await page.evaluate(() => App.confirmPayLensPayment());
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Payment prepared successfully. Connect a payment provider to process real payments.") && text.includes("No money moved"), "Pay Lens confirmation did not show the safe provider placeholder");
  assert(text.includes("Proof level") && text.includes("Offline local draft") && text.includes("Backend offline"), "Pay Lens offline confirmation did not classify the prepared draft proof level");
  const after = await saved();
  assert((after.walletLedger || []).length === beforeLedger, "Pay Lens confirmation should not add wallet ledger rows");
  assert((after.walletBalancesByAccount?.riley_artist ?? after.balance) === beforeBalance, "Pay Lens confirmation should not change wallet balance");
  const offlinePrepared = (after.payLensPreparedDrafts || [])[0];
  assert(offlinePrepared?.proofKey === "offline_local_draft" && offlinePrepared.nonSettling === true && offlinePrepared.moneyMovementEnabled === false, "Pay Lens offline confirmation did not persist non-settling prepared proof metadata");
  assert((after.supportIncidents || []).some(row => row.payLens === offlinePrepared.id && row.proofKey === "offline_local_draft" && row.moneyMovementEnabled === false), "Pay Lens offline confirmation did not create linked support/receipt proof case");
  assert((after.notifications || []).some(row => row.support === offlinePrepared.support && row.record?.type === "support"), "Pay Lens offline confirmation did not create a routable support notification");
  await page.evaluate(() => { App.closeModal(); App.go("wallet"); });
  await page.waitForTimeout(160);
  if (await page.locator("#financePin").isVisible().catch(() => false)) {
    await page.fill("#financePin", "0000");
    await page.evaluate(() => App.unlockFinance());
    await page.waitForTimeout(160);
  }
  await page.waitForSelector("[data-pay-lens-prepared-trail]", { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Prepared Pay Lens drafts") && text.includes("Proof trail, not a balance") && text.includes("Offline local draft") && text.includes("Money blocked"), "Wallet did not expose the Pay Lens prepared proof trail");
  const walletTrail = await page.evaluate(() => ({
    rows: document.querySelectorAll("[data-pay-lens-prepared-row]").length,
    proof: document.querySelector("[data-pay-lens-prepared-row]")?.getAttribute("data-pay-lens-proof-key") || "",
    supportButton: !!document.querySelector("[data-pay-lens-prepared-row] button[onclick*='openSupportCase']")
  }));
  assert(walletTrail.rows >= 1 && walletTrail.proof === "offline_local_draft" && walletTrail.supportButton, "Wallet Pay Lens trail did not expose the latest prepared draft and support link");

  await page.evaluate(() => App.openPayLensQrScanner());
  text = await visibleText();
  assert(text.includes("QR codes") && text.includes("Scan a code to prepare a payment.") && text.includes("Upload QR image") && text.includes("Manual fallback"), "Pay Lens QR scanner did not present the scan-to-pay flow");
  await page.evaluate(() => { const fallback = document.querySelector(".quick-pay-fallback"); if(fallback) fallback.open = true; });
  await page.waitForSelector("#payLensQrData", { state: "visible", timeout: 5000 });
  await page.fill("#payLensQrData", "plain grocery note");
  await page.evaluate(() => App.handlePayLensQrData());
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Invalid QR code"), "Pay Lens QR flow did not show a graceful invalid QR error");
  await page.evaluate(() => { const fallback = document.querySelector(".quick-pay-fallback"); if(fallback) fallback.open = true; });
  await page.waitForSelector("#payLensQrData", { state: "visible", timeout: 5000 });
  await page.fill("#payLensQrData", "payee: Mama Amina Grill | amount KES 2400 | paybill 123456 | ref catering");
  await page.evaluate(() => App.handlePayLensQrData());
  await page.waitForSelector("#payLensPayee", { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Review payment") && text.includes("Provider validation required") && /Mama Amina Grill/i.test(await page.locator("#payLensPayee").inputValue()), "Pay Lens QR data did not land on review payment");
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => {
    const realFetch = window.fetch.bind(window);
    window.__payLensFetchCalls = [];
    window.__restorePayLensFetch = () => { window.fetch = realFetch; };
    window.fetch = async (url, options = {}) => {
      const parsed = new URL(String(url), window.location.href);
      window.__payLensFetchCalls.push({ path: parsed.pathname, body: options.body || "", authorization: options.headers?.authorization || options.headers?.Authorization || "" });
      const json = (status, payload) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
      if (parsed.pathname === "/api/auth/login") return json(200, { token: "qa-pay-lens-token", user: { id: "u_riley_artist", profileId: "riley_artist" } });
      if (parsed.pathname === "/api/me") return json(200, { user: { id: "u_riley_artist", profileId: "riley_artist" }, profile: { id: "riley_artist", role: "artist" } });
      if (parsed.pathname === "/api/pay-lens/extract-draft") {
        const request = JSON.parse(options.body || "{}");
        const qr = request.source === "qr_text";
        const validation = {
          status: "review_only_provider_validation_required",
          source: request.source || "invoice",
          draftSummary: { payee: qr ? "Backend QR Grill" : "Backend Mavuno Hardware", amount: qr ? 640 : 2450, currency: "KES", accountDetailsPreview: qr ? "Till ... / ending 3321" : "PayBill ... / ending 2333", detailFingerprint: "sha256:EXTRACT", rawPaymentDetailsStored: false, fullPaymentDetailsReturned: false },
          detectedRail: { id: qr ? "mpesa_till" : "mpesa_paybill", label: qr ? "M-Pesa Till" : "M-Pesa PayBill", boundaryRailId: "mpesa_customer_payments" },
          providerReadiness: { providerGroupId: "mpesa_daraja", readinessStatus: "missing_secrets", missingSecrets: ["DARAJA_CONSUMER_KEY"], providerActivationEnabled: false, settlementEnabled: false, providerCalled: false },
          checks: [{ id: "user_review", status: "required_before_payment" }],
          settlementStatus: "pay_lens_draft_validation_only_no_settlement",
          moneyMovementEnabled: false,
          walletCreditEnabled: false,
          escrowReleaseEnabled: false,
          founderRevenueRecognized: false,
          providerVerified: false,
          spendable: false
        };
        return json(202, {
          extraction: {
            id: "pay_lens_extraction_qa",
            source: request.source || "invoice",
            status: "extraction_handoff_review_only_no_settlement",
            extractedDraft: { payee: validation.draftSummary.payee, amount: validation.draftSummary.amount, currency: "KES", accountDetailsPreview: validation.draftSummary.accountDetailsPreview, reference: qr ? "QR-3321" : "INV-884", dueDate: qr ? "" : "2026-06-08", missingFields: [] },
            validation,
            security: { rawFileStored: false, rawOcrTextStored: false, providerCalled: false, moneyMovementEnabled: false },
            settlementStatus: "pay_lens_extraction_handoff_only_no_settlement",
            moneyMovementEnabled: false
          },
          validation,
          settlementStatus: "pay_lens_extraction_handoff_only_no_settlement",
          moneyMovementEnabled: false
        });
      }
      if (parsed.pathname === "/api/pay-lens/validate-draft") {
        return json(202, {
          validation: {
            status: "review_only_provider_validation_required",
            source: "Pasted payment code",
            draftSummary: { payee: "Backend Zuri", amount: 1200, currency: "KES", accountDetailsPreview: "till ... / ending 3456", detailFingerprint: "sha256:QA", rawPaymentDetailsStored: false, fullPaymentDetailsReturned: false },
            detectedRail: { id: "mpesa_till", label: "M-Pesa Till", boundaryRailId: "mpesa_customer_payments" },
            providerReadiness: { providerGroupId: "mpesa_daraja", readinessStatus: "missing_secrets", missingSecrets: ["DARAJA_CONSUMER_KEY"], providerActivationEnabled: false, settlementEnabled: false, providerCalled: false },
            checks: [{ id: "user_review", status: "required_before_payment" }],
            settlementStatus: "pay_lens_draft_validation_only_no_settlement",
            moneyMovementEnabled: false,
            walletCreditEnabled: false,
            escrowReleaseEnabled: false,
            founderRevenueRecognized: false,
            providerVerified: false,
            spendable: false
          },
          settlementStatus: "pay_lens_draft_validation_only_no_settlement",
          moneyMovementEnabled: false
        });
      }
      return realFetch(url, options);
    };
  });
  await page.evaluate(() => App.backendSyncDesk());
  await page.waitForSelector("#backendMode", { state: "visible", timeout: 5000 });
  await page.selectOption("#backendMode", "local");
  await page.fill("#backendBaseUrl", "http://127.0.0.1:8787");
  await page.evaluate(() => App.saveBackendConfig());

  await page.evaluate(() => App.openPayLens());
  text = await visibleText();
  assert(text.includes("Server check ready") && text.includes("Metadata only") && text.includes("Money blocked"), "Pay Lens connected entry sheet did not expose server extraction readiness");
  await page.waitForSelector("#payLensInvoiceFile", { state: "attached", timeout: 5000 });
  await page.setInputFiles("#payLensInvoiceFile", { name: "mavuno-invoice.pdf", mimeType: "application/pdf", buffer: Buffer.from("demo invoice metadata only") });
  await page.waitForSelector('[data-pay-lens-backend-status="validated"]', { state: "visible", timeout: 5000 });
  text = await visibleText();
  const extractionDraft = await page.evaluate(() => ({
    payee: document.getElementById("payLensPayee")?.value || "",
    amount: document.getElementById("payLensAmount")?.value || "",
    details: document.getElementById("payLensDetails")?.value || "",
  }));
  assert(/Backend Mavuno Hardware/i.test(extractionDraft.payee) && extractionDraft.amount === "2450" && /PayBill/i.test(extractionDraft.details) && text.includes("Server draft checked") && text.includes("Backend extraction handoff") && text.includes("raw file stored: no") && text.includes("OCR text stored: no"), "Pay Lens connected invoice extraction did not render backend handoff evidence safely");
  assert(text.includes("Expected proof on prepare") && text.includes("Server-extracted draft"), "Pay Lens review did not preview server-extracted proof before confirmation");
  const extractedHandoff = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-pay-lens-provider-handoff]")),
    rail: document.querySelector("[data-pay-lens-provider-handoff]")?.getAttribute("data-pay-lens-provider-handoff-rail") || "",
    ready: Number(document.querySelector("[data-pay-lens-provider-handoff]")?.getAttribute("data-pay-lens-provider-handoff-ready") || 0),
    steps: Number(document.querySelector("[data-pay-lens-provider-handoff]")?.getAttribute("data-pay-lens-provider-handoff-steps") || 0),
    validated: document.querySelector("[data-pay-lens-provider-handoff]")?.getAttribute("data-pay-lens-provider-handoff-validated") || "",
    text: document.querySelector("[data-pay-lens-provider-handoff]")?.textContent || ""
  }));
  assert(extractedHandoff.exists && extractedHandoff.rail === "mpesa_paybill" && extractedHandoff.steps === 5 && extractedHandoff.ready >= 1 && extractedHandoff.validated === "true", `Pay Lens server-extracted handoff contract should mark only the masked draft payload ready: ${JSON.stringify(extractedHandoff)}`);
  assert(extractedHandoff.text.includes("APK provider call: no") && extractedHandoff.text.includes("Checkout: backend only") && extractedHandoff.text.includes("Money blocked"), "Pay Lens server-extracted handoff contract did not preserve checkout/backend-only boundary");
  const extractionCall = await page.evaluate(() => {
    const call = (window.__payLensFetchCalls || []).find(row => row.path === "/api/pay-lens/extract-draft");
    return call ? { ...call, parsed: JSON.parse(call.body || "{}") } : null;
  });
  assert(extractionCall?.authorization === "Bearer qa-pay-lens-token", "Pay Lens extraction did not use the saved backend session token");
  assert(extractionCall?.parsed?.source === "invoice" && extractionCall?.parsed?.file?.name === "mavuno-invoice.pdf" && /Source: invoice/.test(extractionCall?.parsed?.redactedText || ""), "Pay Lens extraction payload did not carry invoice metadata and redacted text");
  assert(!("fileBase64" in (extractionCall?.parsed || {})) && !("rawFile" in (extractionCall?.parsed || {})) && !("imageData" in (extractionCall?.parsed || {})), "Pay Lens extraction payload should not send raw file data");
  await page.evaluate(() => App.confirmPayLensPayment());
  await page.waitForSelector('[data-pay-lens-proof-level="server_extracted_draft"]', { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Proof level") && text.includes("Server-extracted draft") && text.includes("Raw file stored: no") && text.includes("provider called: no"), "Pay Lens prepared screen did not classify server-extracted draft proof");
  let preparedState = await saved();
  assert((preparedState.payLensPreparedDrafts || [])[0]?.proofKey === "server_extracted_draft" && (preparedState.supportIncidents || []).some(row => row.payLens === (preparedState.payLensPreparedDrafts || [])[0].id && row.proofKey === "server_extracted_draft"), "Pay Lens server-extracted confirmation did not persist proof metadata into the support/receipt trail");
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => App.openPayLensCode());
  await page.waitForSelector("#payLensCodeInput", { state: "visible", timeout: 5000 });
  await page.fill("#payLensCodeInput", "to: Backend Zuri | KES 1200 | till 123456 | ref backend check");
  await page.evaluate(() => { App.payLensCodeChanged(); App.continuePayLensCode(); });
  await page.waitForSelector("[data-pay-lens-backend-validation]", { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Server draft check") && text.includes("Validate draft"), "Pay Lens connected-mode review did not expose backend validation action");
  assert(text.includes("Expected proof on prepare") && text.includes("Connected draft pending"), "Pay Lens review did not preview connected pending proof before validation");
  await page.evaluate(() => App.validatePayLensDraft());
  await page.waitForSelector('[data-pay-lens-backend-status="validated"]', { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Server draft checked") && text.includes("M-Pesa Till") && text.includes("Missing secrets: 1") && text.includes("Money: blocked"), "Pay Lens backend validation result did not render safely");
  assert(text.includes("Expected proof on prepare") && text.includes("Server-validated draft"), "Pay Lens review did not preview server-validated proof before confirmation");
  const backendCall = await page.evaluate(() => {
    const call = (window.__payLensFetchCalls || []).find(row => row.path === "/api/pay-lens/validate-draft");
    return call ? { ...call, parsed: JSON.parse(call.body || "{}") } : null;
  });
  assert(backendCall?.authorization === "Bearer qa-pay-lens-token", "Pay Lens backend validation did not use the saved backend session token");
  assert(backendCall?.parsed?.source === "Pasted payment code" && backendCall?.parsed?.draft?.payee === "Backend Zuri" && backendCall?.parsed?.draft?.amount === 1200, "Pay Lens backend validation payload did not carry the editable review draft");
  const backendCallCount = await page.evaluate(() => (window.__payLensFetchCalls || []).filter(row => row.path === "/api/pay-lens/validate-draft").length);
  await page.evaluate(() => App.confirmPayLensPayment());
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Payment prepared successfully") && text.includes("Server draft check") && text.includes("pay_lens_draft_validation_only_no_settlement"), "Pay Lens prepared screen did not preserve backend validation no-settlement evidence");
  assert(text.includes("Proof level") && text.includes("Server-validated draft") && text.includes("Server validated only"), "Pay Lens prepared screen did not classify server-validated-only proof");
  preparedState = await saved();
  assert((preparedState.payLensPreparedDrafts || [])[0]?.proofKey === "server_validated_draft" && (preparedState.supportIncidents || []).some(row => row.payLens === (preparedState.payLensPreparedDrafts || [])[0].id && row.proofKey === "server_validated_draft"), "Pay Lens server-validated confirmation did not persist proof metadata into the support/receipt trail");
  const backendCallCountAfterConfirm = await page.evaluate(() => (window.__payLensFetchCalls || []).filter(row => row.path === "/api/pay-lens/validate-draft").length);
  assert(backendCallCountAfterConfirm === backendCallCount, "Pay Lens confirm should reuse the checked draft instead of re-posting the same backend validation");
  await page.evaluate(key => {
    window.__restorePayLensFetch?.();
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    state.backendConfig = {
      ...(state.backendConfig || {}),
      mode: "local",
      baseUrl: "http://127.0.0.1:8787",
      lastSchema: { endpoints: { finance: ["POST /api/pay-lens/validate-draft"] } }
    };
    localStorage.setItem(key, JSON.stringify(state));
    location.reload();
  }, KEY);
  await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.go("wallet");
    App.openPayLens();
  });
  await page.waitForSelector("#modal.on .quick-pay-sheet", { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Server check missing") && text.includes("Endpoint missing") && text.includes("Local fallback"), "Pay Lens entry sheet did not explain connected-mode missing extraction endpoint");
  await page.waitForSelector("#payLensInvoiceFile", { state: "attached", timeout: 5000 });
  await page.setInputFiles("#payLensInvoiceFile", { name: "missing-parser-invoice.pdf", mimeType: "application/pdf", buffer: Buffer.from("local parser fallback") });
  await page.waitForSelector('[data-pay-lens-parser-review-status="endpoint_missing"]', { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Parser worker handoff") && text.includes("Parser worker: missing") && text.includes("Local draft only") && text.includes("No raw upload") && text.includes("Money blocked"), "Pay Lens review did not expose parser-worker missing local-draft boundary");
  assert(text.includes("POST /api/pay-lens/extract-draft") && text.includes("object-storage upload URLs") && text.includes("OCR/QR parsing"), "Pay Lens parser-worker card did not show the concrete backend handoff reason");
  assert(text.includes("Backend checklist") && text.includes("Copy packet"), "Pay Lens parser-worker card did not expose direct Review Ops actions");
  assert(text.includes("Expected proof on prepare") && text.includes("Local draft acceptance required"), "Pay Lens review did not preview acceptance-required local fallback proof");
  await page.evaluate(() => App.confirmPayLensPayment());
  await page.waitForSelector('[data-pay-lens-parser-review-status="endpoint_missing"][data-pay-lens-local-draft-accepted="false"]', { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Accept local-draft-only preparation first") && text.includes("Acceptance required") && !text.includes("Payment prepared successfully"), "Pay Lens connected-mode fallback should pause confirmation until local-draft acceptance");
  let localDraftEvents = await saved();
  assert((localDraftEvents.backendEvents || []).some(row => row.label === "Pay Lens confirmation paused" && row.localDraftAcceptanceRequired === true && row.nonSettling === true), "Pay Lens confirmation pause did not record non-settling acceptance-required evidence");
  await page.evaluate(() => App.acceptPayLensLocalDraft());
  await page.waitForSelector('[data-pay-lens-parser-review-status="endpoint_missing"][data-pay-lens-local-draft-accepted="true"]', { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Local draft accepted") && text.includes("Confirm payment"), "Pay Lens local-draft acceptance did not unlock preparation UI");
  assert(text.includes("Expected proof on prepare") && text.includes("Local draft accepted"), "Pay Lens review did not preview accepted local fallback proof");
  localDraftEvents = await saved();
  assert((localDraftEvents.backendEvents || []).some(row => row.label === "Pay Lens local draft accepted" && row.localDraftAccepted === true && row.nonSettling === true), "Pay Lens local-draft acceptance did not record non-settling audit evidence");
  await page.evaluate(() => App.copyPayLensParserWorkerPacket());
  const copyEventState = await saved();
  assert((copyEventState.backendEvents || []).some(row => row.label === "Pay Lens parser-worker packet copied" && row.payLensParserWorker === true && row.nonSettling === true && row.moneyMovementEnabled === false), "copying the Pay Lens parser-worker packet did not record a non-settling backend event");
  await page.evaluate(() => {
    const button = document.querySelector('[data-pay-lens-parser-review-status] button[onclick*="backendSyncDesk"]');
    button?.click();
  });
  await page.waitForSelector("#payLensParserWorkerPacket", { state: "visible", timeout: 5000 });
  const backendPacket = await page.evaluate(() => ({
    text: document.body.innerText || "",
    packet: document.querySelector("#payLensParserWorkerPacket")?.value || "",
  }));
  assert(backendPacket.text.includes("Pay Lens parser worker") && backendPacket.text.includes("Copy parser-worker packet"), "Pay Lens parser-worker backend checklist did not open from the review warning");
  assert(backendPacket.packet.includes("Artbook Pay Lens Parser Worker Launch Checklist") && backendPacket.packet.includes("Object-storage upload URL") && backendPacket.packet.includes("no settlement"), "Pay Lens parser-worker packet was not immediately inspectable in Backend Sync");
  await page.evaluate(() => {
    const realFetch = window.fetch.bind(window);
    window.__restorePayLensAcceptedDraftFetch = () => { window.fetch = realFetch; };
    window.fetch = async (url, options = {}) => {
      const parsed = new URL(String(url), window.location.href);
      const json = (status, payload) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
      if (parsed.pathname === "/api/auth/login") return json(200, { token: "qa-pay-lens-accepted-draft-token", user: { id: "u_riley_artist", profileId: "riley_artist" } });
      if (parsed.pathname === "/api/me") return json(200, { user: { id: "u_riley_artist", profileId: "riley_artist" }, profile: { id: "riley_artist", role: "artist" } });
      if (parsed.pathname === "/api/pay-lens/validate-draft") {
        return json(202, {
          validation: {
            status: "review_only_provider_validation_required",
            source: "Uploaded invoice",
            draftSummary: { payee: "Missing Parser Supplier", amount: 1200, currency: "KES", accountDetailsPreview: "local fallback ... / ending 7788", detailFingerprint: "sha256:ACCEPTED", rawPaymentDetailsStored: false, fullPaymentDetailsReturned: false },
            detectedRail: { id: "mpesa_paybill", label: "M-Pesa PayBill", boundaryRailId: "mpesa_customer_payments" },
            providerReadiness: { providerGroupId: "mpesa_daraja", readinessStatus: "missing_secrets", missingSecrets: ["DARAJA_CONSUMER_KEY"], providerActivationEnabled: false, settlementEnabled: false, providerCalled: false },
            checks: [{ id: "user_review", status: "required_before_payment" }],
            settlementStatus: "pay_lens_draft_validation_only_no_settlement",
            moneyMovementEnabled: false,
            walletCreditEnabled: false,
            escrowReleaseEnabled: false,
            founderRevenueRecognized: false,
            providerVerified: false,
            spendable: false
          },
          settlementStatus: "pay_lens_draft_validation_only_no_settlement",
          moneyMovementEnabled: false
        });
      }
      return realFetch(url, options);
    };
    App.closeModal();
    App.reviewPayLensPayment({
      payee: "Missing Parser Supplier",
      amount: 1200,
      currency: "KES",
      details: "local parser fallback details ending 7788",
      reference: "missing parser accepted",
      source: "Uploaded invoice",
      method: "invoice",
      parserWorkerStatus: "endpoint_missing",
      parserWorkerMessage: "Backend Sync is connected, but POST /api/pay-lens/extract-draft is missing; local placeholder extraction was accepted for review only.",
      localDraftAccepted: true
    });
  });
  await page.waitForSelector('[data-pay-lens-parser-review-status="endpoint_missing"][data-pay-lens-local-draft-accepted="true"]', { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Expected proof on prepare") && text.includes("Local draft accepted"), "Pay Lens recreated accepted local draft did not preview its proof level");
  await page.evaluate(() => App.confirmPayLensPayment());
  await page.waitForSelector('[data-pay-lens-proof-level="local_draft_accepted"]', { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(text.includes("Proof level") && text.includes("Local draft accepted") && text.includes("Draft checked") && text.includes("Server draft check"), "Pay Lens local-draft accepted confirmation did not preserve proof level and backend check evidence");
  preparedState = await saved();
  assert((preparedState.payLensPreparedDrafts || [])[0]?.proofKey === "local_draft_accepted" && (preparedState.supportIncidents || []).some(row => row.payLens === (preparedState.payLensPreparedDrafts || [])[0].id && row.proofKey === "local_draft_accepted" && row.nonSettling === true), "Pay Lens accepted local draft did not persist support/receipt proof metadata");
  await page.evaluate(() => window.__restorePayLensAcceptedDraftFetch?.());
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    state.backendConfig = { ...(state.backendConfig || {}), mode: "offline", lastSchema: {} };
    localStorage.setItem(key, JSON.stringify(state));
    App.closeModal();
  }, KEY);
  await page.evaluate(() => App.backendSyncDesk("pay lens prepared proof"));
  await page.waitForSelector("[data-pay-lens-prepared-export]", { state: "visible", timeout: 5000 });
  const preparedExport = await page.evaluate(() => ({
    text: document.body.textContent || "",
    rows: document.querySelectorAll("[data-pay-lens-prepared-export-row]").length,
    packet: document.querySelector("#payLensPreparedEvidencePacket")?.value || "",
    ladderExists: Boolean(document.querySelector("[data-pay-lens-proof-ladder]")),
    ladderTotal: Number(document.querySelector("[data-pay-lens-proof-ladder]")?.getAttribute("data-pay-lens-proof-ladder-total") || 0),
    ladderLevels: Number(document.querySelector("[data-pay-lens-proof-ladder]")?.getAttribute("data-pay-lens-proof-ladder-levels") || 0),
    ladderStrongest: document.querySelector("[data-pay-lens-proof-ladder]")?.getAttribute("data-pay-lens-proof-ladder-strongest") || "",
    ladderCounts: Object.fromEntries(Array.from(document.querySelectorAll("[data-pay-lens-proof-level-card]")).map(row => [row.getAttribute("data-pay-lens-proof-level-card") || "", Number(row.getAttribute("data-pay-lens-proof-level-count") || 0)])),
  }));
  assert(preparedExport.text.includes("Pay Lens prepared proof") && preparedExport.text.includes("Pay Lens proof ladder") && preparedExport.text.includes("Copy prepared draft packet") && preparedExport.rows >= 3, "Pay Lens prepared proof export did not surface populated prepared rows and proof ladder in Backend Sync");
  assert(preparedExport.ladderExists && preparedExport.ladderTotal >= 3 && preparedExport.ladderLevels === 4 && preparedExport.ladderStrongest === "server_validated_draft", `Pay Lens proof ladder did not summarize populated proof strength correctly: ${JSON.stringify(preparedExport)}`);
  assert(preparedExport.ladderCounts.local_draft_accepted >= 1 && preparedExport.ladderCounts.server_validated_draft >= 1 && preparedExport.ladderCounts.server_extracted_draft >= 1, "Pay Lens proof ladder missed prepared proof-level counts");
  assert(preparedExport.packet.includes("Artbook Pay Lens Prepared Draft Evidence Packet") && preparedExport.packet.includes("Proof ladder next actions") && preparedExport.packet.includes("Local draft accepted") && preparedExport.packet.includes("Server-validated draft") && preparedExport.packet.includes("Server-extracted draft") && preparedExport.packet.includes("local_draft_accepted") && preparedExport.packet.includes("server_validated_draft") && preparedExport.packet.includes("server_extracted_draft") && preparedExport.packet.includes("moneyMovement=false") && preparedExport.packet.includes("Full bank, till, PayBill, QR payload, raw files and OCR text are intentionally omitted"), "Pay Lens prepared evidence packet did not include proof ladder, masked proof levels and money boundaries");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|rawFile|fileBase64/i.test(preparedExport.packet), "Pay Lens prepared evidence packet appears to leak secret or raw payload language");
  const providerReadinessPacket = await page.evaluate(() => ({
    exists: Boolean(document.querySelector("[data-pay-lens-provider-readiness]")),
    rows: document.querySelector("[data-pay-lens-provider-readiness]")?.innerText || "",
    tasks: document.querySelectorAll("[data-pay-lens-provider-task]").length,
    blocked: document.querySelectorAll('[data-pay-lens-provider-task][data-pay-lens-provider-status="blocked"]').length,
    packet: document.querySelector("#payLensProviderReadinessPacket")?.value || "",
  }));
  assert(providerReadinessPacket.exists && providerReadinessPacket.tasks === 7 && providerReadinessPacket.blocked >= 5, "Pay Lens provider-readiness checklist should remain mostly blocked after prepared drafts until external provider proof exists");
  const providerPreparedRows = Number((providerReadinessPacket.packet.match(/Prepared proof rows:\s*(\d+)/) || [])[1] || 0);
  assert(providerPreparedRows >= 3 && providerReadinessPacket.packet.includes("local_draft_accepted") && providerReadinessPacket.packet.includes("server_validated_draft") && providerReadinessPacket.packet.includes("server_extracted_draft"), "Pay Lens provider-readiness packet did not summarize prepared proof rows");
  assert(providerReadinessPacket.packet.includes("Provider contract") && providerReadinessPacket.packet.includes("Token vault") && providerReadinessPacket.packet.includes("OCR worker") && providerReadinessPacket.packet.includes("QR parser") && providerReadinessPacket.packet.includes("Webhook replay") && providerReadinessPacket.packet.includes("Ledger reconciliation") && providerReadinessPacket.packet.includes("Compliance sign-off"), "Pay Lens provider-readiness packet missed concrete integration tasks");
  assert(providerReadinessPacket.packet.includes("Money movement: false") && providerReadinessPacket.packet.includes("Provider checkout: false") && providerReadinessPacket.packet.includes("Founder revenue recognition: false"), "Pay Lens provider-readiness packet did not keep money/provider state blocked");
  assert(!/secret value|password|api[_ -]?key\\s*=|DARAJA_CONSUMER_SECRET=|rawFile|fileBase64/i.test(providerReadinessPacket.packet), "Pay Lens provider-readiness packet appears to leak secret or raw payload language");
  await page.evaluate(() => App.copyPayLensPreparedEvidencePacket());
  await page.evaluate(() => App.copyPayLensProviderReadinessPacket());
  const preparedCopyState = await saved();
  assert((preparedCopyState.backendEvents || []).some(row => row.label === "Pay Lens prepared evidence packet copied" && row.payLensPreparedEvidence === true && row.nonSettling === true && row.moneyMovementEnabled === false), "copying Pay Lens prepared evidence packet did not create non-settling backend handoff evidence");
  assert((preparedCopyState.backendEvents || []).some(row => row.label === "Pay Lens provider readiness packet copied" && row.payLensProviderReadiness === true && row.nonSettling === true && row.moneyMovementEnabled === false && row.providerCalled === false), "copying Pay Lens provider-readiness packet did not create non-settling backend handoff evidence");
  await page.evaluate(() => App.closeModal());
});

await step("wallet sends and requests settle through scoped ledger", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.completeVerification("money", "riley_artist");
    App.closeModal();
  });
  await unlockFinance("riley_artist");
  await page.evaluate(() => App.moneyFlow("send"));
  await page.waitForSelector("#moneyAmount", { state: "visible", timeout: 5000 });
  await page.fill("#moneyAmount", "1200");
  await page.waitForTimeout(100);
  let text = await visibleText();
  assert(text.includes("Fee preview") && text.includes("External KES 23") && text.includes("Artbook KES 17") && text.includes("Saving KES 6"), "wallet fee preview did not show the corrected Kenya benchmark and Artbook saving");
  await page.evaluate(() => App.closeModal());
  let before = await saved();
  const artistBeforeSend = before.walletBalancesByAccount?.riley_artist ?? before.balance;
  const zuriBeforeSend = before.walletBalancesByAccount?.zuri ?? 24800;

  await page.evaluate(() => App.confirmMoney("send", {
    amount: 500,
    person: "zuri",
    note: "QA internal transfer",
  }));
  await page.waitForTimeout(220);
  let state = await saved();
  assert(state.walletBalancesByAccount?.riley_artist === artistBeforeSend - 505, "wallet send did not debit sender balance plus Artbook fee");
  assert(state.walletBalancesByAccount?.zuri === zuriBeforeSend + 500, "wallet send did not credit recipient balance");
  const sendLedger = (state.walletLedger || []).find(row => row.kind === "internal send" && row.from === "riley_artist" && row.to === "zuri" && row.fee === 5 && row.feeSaved === 2);
  assert(sendLedger, "wallet send ledger missing Artbook fee and fee-saved row");
  assert(sendLedger.nonSettling === true && sendLedger.providerVerified === false && sendLedger.spendable === false && /no_provider_settlement/.test(sendLedger.settlementStatus || ""), "wallet send ledger should be provider-led and non-spendable");
  assert((state.messages?.zuri || []).some(msg => msg.type === "money" && /QA internal transfer/.test(msg.text || "")), "wallet send did not enter the recipient thread");
  assert((state.notifications || []).some(n => n.record?.type === "wallet"), "wallet send notification did not link to exact wallet record");

  const artistBeforeRequest = state.walletBalancesByAccount.riley_artist;
  const zuriBeforeRequest = state.walletBalancesByAccount.zuri;
  await page.evaluate(() => App.confirmMoney("request", {
    amount: 300,
    person: "zuri",
    note: "QA request settlement",
  }));
  await page.waitForTimeout(180);
  state = await saved();
  const request = (state.walletRequests || []).find(row => row.note === "QA request settlement");
  assert(request?.status === "pending", "wallet request should stay pending until payer accepts");
  assert(request?.nonSettling === true && request.providerVerified === false && request.spendable === false && /no_provider_settlement/.test(request.settlementStatus || ""), "wallet request should remain provider-led and non-spendable before payer approval");
  assert(state.walletBalancesByAccount.riley_artist === artistBeforeRequest, "wallet request credited requester before payer acceptance");
  assert(state.walletBalancesByAccount.zuri === zuriBeforeRequest, "wallet request changed payer balance before payer acceptance");

  await page.evaluate(() => {
    App.setAccount("zuri");
    App.completeVerification("money", "zuri");
    App.closeModal();
  });
  await unlockFinance("zuri");
  await page.evaluate(id => App.settleWalletRequest(id, "paid"), request.id);
  await page.waitForTimeout(220);
  state = await saved();
  const paid = (state.walletRequests || []).find(row => row.id === request.id);
  assert(paid?.status === "paid", "wallet request did not close as paid");
  assert(state.walletBalancesByAccount.zuri === zuriBeforeRequest - 305, "paid request did not debit payer plus Artbook fee");
  assert(state.walletBalancesByAccount.riley_artist === artistBeforeRequest + 300, "paid request did not credit requester");
  const paidLedger = (state.walletLedger || []).find(row => row.request === request.id && row.kind === "request paid" && row.status === "paid" && row.fee === 5 && row.feeSaved === 2);
  assert(paidLedger, "paid request ledger row missing Artbook fee");
  assert(paidLedger.nonSettling === true && paidLedger.providerVerified === false && paidLedger.spendable === false && /no_provider_settlement/.test(paidLedger.settlementStatus || ""), "paid request ledger should remain provider-led and non-spendable");
  assert((state.messages?.riley_artist || []).some(msg => msg.walletRequest === request.id && msg.walletTransfer), "paid request did not notify requester thread");
});

await step("basket and checkout visibility", async () => {
  await page.evaluate(() => {
    App.go("market");
    App.addCart("p1");
    App.openCart();
  });
  await page.waitForTimeout(200);
  const state = await saved();
  assert((state.cart || []).includes("p1"), "cart item was not saved");
  assert((await visibleText()).match(/Basket|Cart|Checkout/i), "basket modal did not open");
  await page.evaluate(() => App.closeModal());
});

await step("market icon controls stay visible on light shelves", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.marketTab("products");
    App.go("market");
  });
  await page.waitForTimeout(180);
  const controls = await page.evaluate(() => {
    const parseRgb = (str) => {
      const match = String(str || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
    };
    const luminance = (rgb) => {
      const [r, g, b] = rgb.map((value) => {
        const scaled = value / 255;
        return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    return [...document.querySelectorAll(".market-command-row .icon-btn,.market-filter-panel .icon-btn")].map((button) => {
      const cs = getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      const svg = button.querySelector("svg");
      const svgRect = svg?.getBoundingClientRect();
      const foreground = parseRgb(cs.color);
      const background = parseRgb(cs.backgroundColor);
      const contrast = foreground && background
        ? (Math.max(luminance(foreground), luminance(background)) + 0.05) / (Math.min(luminance(foreground), luminance(background)) + 0.05)
        : 0;
      return {
        label: button.getAttribute("aria-label") || button.textContent.trim(),
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        svgWidth: Math.round(svgRect?.width || 0),
        svgHeight: Math.round(svgRect?.height || 0),
        contrast,
      };
    });
  });
  assert(controls.length >= 2, "market icon controls did not render");
  for (const control of controls) {
    assert(control.width >= 52 && control.height >= 52 && control.svgWidth >= 20 && control.svgHeight >= 20, `market icon control is undersized or missing its icon: ${JSON.stringify(control)}`);
    assert(control.contrast >= 4.5, `market icon control lacks visible contrast on the shelf: ${JSON.stringify(control)}`);
  }
});

await step("market details use purpose-built shop and event layouts", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_artist");
    App.itemDetails("p1");
  });
  await page.waitForTimeout(180);
  let detail = await page.evaluate(() => ({
    product: Boolean(document.querySelector('#modal.on [data-market-detail="product"]')),
    hero: Boolean(document.querySelector('#modal.on [data-market-detail-hero]')),
    actions: Boolean(document.querySelector('#modal.on [data-market-detail-actions]')),
    metrics: document.querySelectorAll('#modal.on [data-market-detail-metric]').length,
    checks: document.querySelectorAll('#modal.on [data-market-detail-check]').length,
    social: Boolean(document.querySelector('#modal.on [data-market-detail-social]')),
    boundary: Boolean(document.querySelector('#modal.on [data-market-detail-boundary]')),
    text: document.querySelector("#modal.on")?.innerText || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(detail.product && detail.hero && detail.actions, "product details did not render the market detail shell");
  assert(detail.metrics >= 4 && detail.checks >= 4 && detail.social && detail.boundary, "product details missing metrics, readiness, social or boundary panels");
  assert(/Add to cart/i.test(detail.text) && /Package route/i.test(detail.text) && /Readiness/i.test(detail.text) && /Social and trust actions/i.test(detail.text) && /Review before payment/i.test(detail.text), "product details missing buyer actions or review-first language");
  assert(/Provider-led settlement/i.test(detail.text) && /No instant money movement/i.test(detail.text), "product details did not keep provider-led payment boundaries visible");
  assert(detail.overflow <= 2, "product detail layout introduced horizontal overflow");

  await page.evaluate(() => {
    App.closeModal();
    App.itemDetails("ev1");
  });
  await page.waitForTimeout(180);
  detail = await page.evaluate(() => ({
    event: Boolean(document.querySelector('#modal.on [data-market-detail="event"]')),
    hero: Boolean(document.querySelector('#modal.on [data-market-detail-hero]')),
    metrics: document.querySelectorAll('#modal.on [data-market-detail-metric]').length,
    checks: document.querySelectorAll('#modal.on [data-market-detail-check]').length,
    text: document.querySelector("#modal.on")?.innerText || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(detail.event && detail.hero && detail.metrics >= 4 && detail.checks >= 4, "event details did not render the event-specific market detail shell");
  assert(/Door time/i.test(detail.text) && /Tickets/i.test(detail.text) && /Door status/i.test(detail.text) && /Resale/i.test(detail.text), "event details missing door, ticket or resale metrics");
  assert(/Ticket/i.test(detail.text) && /Hype/i.test(detail.text) && /Venue proof/i.test(detail.text) && /capacity/i.test(detail.text), "event details missing ticket actions or readiness checks");
  assert(/Organizer payout/i.test(detail.text) && /refund policy/i.test(detail.text), "event details did not preserve payout/refund boundary copy");
  assert(detail.overflow <= 2, "event detail layout introduced horizontal overflow");
  await page.evaluate(() => App.closeModal());
});

await step("event door command is role-scoped and provider-led", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("event_canvas_ke");
    App.eventOpsDesk("ev12");
  });
  await page.waitForTimeout(180);
  let command = await page.evaluate(() => {
    const modal = document.querySelector("#modal.on");
    const sheet = modal?.querySelector(".event-command-sheet");
    return {
      found: Boolean(sheet?.querySelector("[data-event-command]")),
      door: Boolean(sheet?.querySelector("[data-event-command-door]")),
      map: Boolean(sheet?.querySelector("[data-event-command-map]")),
      metrics: sheet?.querySelectorAll("[data-event-command-metric]").length || 0,
      checks: sheet?.querySelectorAll("[data-event-command-check]").length || 0,
      attendees: sheet?.querySelectorAll("[data-event-command-attendee]").length || 0,
      boundary: Boolean(sheet?.querySelector("[data-event-command-boundary]")),
      trail: Boolean(sheet?.querySelector("[data-event-command-trail]")),
      editor: Boolean(sheet?.querySelector("[data-event-command-editor]")),
      attendeeView: Boolean(sheet?.querySelector("[data-event-command-attendee-view]")),
      text: sheet?.textContent || "",
      overflow: Math.max(
        0,
        document.documentElement.scrollWidth - window.innerWidth,
        sheet ? sheet.scrollWidth - sheet.clientWidth : 0,
      ),
    };
  });
  assert(command.found && command.door && command.map, "organizer event command did not render the door command shell");
  assert(command.metrics >= 4 && command.checks >= 6 && command.attendees >= 1, `event command missing metrics, readiness or attendee rows: ${JSON.stringify(command)}`);
  assert(command.boundary && command.trail && command.editor && !command.attendeeView, "organizer event command missed boundary, trail or edit controls");
  assert(/Door command|Organizer controls|Venue proof|Refund policy|Capacity|Resale cap/i.test(command.text), "event command missed organizer operations copy");
  assert(/Provider-led event money boundary|No instant settlement|Organizer payout|Only organizer-owned controls/i.test(command.text), "event command missed provider-led money and role boundaries");
  assert(command.overflow <= 2, "organizer event command introduced horizontal overflow");

  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_creator");
    App.eventOpsDesk("ev12");
  });
  await page.waitForTimeout(180);
  command = await page.evaluate(() => {
    const sheet = document.querySelector("#modal.on .event-command-sheet");
    return {
      found: Boolean(sheet?.querySelector("[data-event-command]")),
      attendees: sheet?.querySelectorAll("[data-event-command-attendee]").length || 0,
      editor: Boolean(sheet?.querySelector("[data-event-command-editor]")),
      attendeeView: Boolean(sheet?.querySelector("[data-event-command-attendee-view]")),
      text: sheet?.textContent || "",
      overflow: Math.max(
        0,
        document.documentElement.scrollWidth - window.innerWidth,
        sheet ? sheet.scrollWidth - sheet.clientWidth : 0,
      ),
    };
  });
  assert(command.found && command.attendees >= 1, "attendee event command did not show their visible pass");
  assert(command.attendeeView && !command.editor, "attendee event command exposed organizer edit controls");
  assert(/Read-only attendee view|Only the organizer can change capacity|Attendee tools|My ticket/i.test(command.text), "attendee event command missed read-only role copy");
  assert(command.overflow <= 2, "attendee event command introduced horizontal overflow");
  await page.evaluate(() => App.closeModal());
});

await step("ticket pass wallet is role-scoped and review-first", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_creator");
    App.ticketDetail("tk_ke_market");
  });
  await page.waitForTimeout(180);
  let pass = await page.evaluate(() => {
    const shell = document.querySelector("[data-ticket-pass]");
    return {
      found: Boolean(shell),
      hero: Boolean(shell?.querySelector("[data-ticket-pass-hero]")),
      card: Boolean(shell?.querySelector("[data-ticket-pass-card]")),
      metrics: shell?.querySelectorAll("[data-ticket-pass-metric]").length || 0,
      actions: shell?.querySelectorAll(".ticket-pass-action").length || 0,
      boundary: Boolean(shell?.querySelector("[data-ticket-pass-boundary]")),
      trail: Boolean(shell?.querySelector("[data-ticket-pass-trail]")),
      text: shell?.textContent || "",
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  });
  assert(pass.found && pass.hero && pass.card, "ticket owner pass did not render the pass wallet shell");
  assert(pass.metrics >= 4 && pass.actions >= 5 && pass.boundary && pass.trail, `ticket owner pass missing metrics, actions, boundary or trail: ${JSON.stringify(pass)}`);
  assert(/Entry pass|Ticket owner view|Resell|Transfer|Support\/refund|Door command|Review-first/i.test(pass.text), "ticket owner pass missed owner actions or review-first language");
  assert(/No instant refund|wallet debit|escrow movement|provider\/backend-led/i.test(pass.text), "ticket owner pass missed money boundary copy");
  assert(pass.overflow <= 2, "ticket owner pass introduced horizontal overflow");

  await page.evaluate(() => {
    App.setAccount("event_canvas_ke");
    App.ticketDetail("tk_ke_market");
  });
  await page.waitForTimeout(180);
  pass = await page.evaluate(() => {
    const shell = document.querySelector("[data-ticket-pass]");
    return {
      found: Boolean(shell),
      actions: shell?.querySelectorAll(".ticket-pass-action").length || 0,
      text: shell?.textContent || "",
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  });
  assert(pass.found && pass.actions >= 4, "organizer ticket pass did not render with actions");
  assert(/Organizer door view|Door check-in|Organizer actions|Support\/refund|Door command/i.test(pass.text), "organizer ticket pass missed check-in or organizer action copy");
  assert(!/TransferMove the pass/i.test(pass.text) && !/ResellList this pass/i.test(pass.text), "organizer ticket pass exposed owner-only transfer or resale actions");
  assert(pass.overflow <= 2, "organizer ticket pass introduced horizontal overflow");
});

await step("shop buttons open exact seller shelves", async () => {
  await page.evaluate(() => App.openShop("shop_gold"));
  await page.waitForTimeout(200);
  let state = await saved();
  let text = await visibleText();
  assert(state.page === "market", "shop link should land in the market");
  assert(state.marketShop === "shop_gold", "shop shelf id did not persist");
  assert(text.includes("Golden Threads shelf"), "specific shop shelf banner did not render");
  assert(text.includes("Lagos Skyline tee"), "shop product did not appear on the seller shelf");
  await page.evaluate(() => App.marketTab("services"));
  await page.waitForTimeout(120);
  state = await saved();
  text = await visibleText();
  assert(state.marketShop === "shop_gold", "market tabs should keep the active shelf while inside market");
  assert(text.includes("Business consultation"), "shop services did not stay scoped to the seller shelf");
  await page.evaluate(() => App.clearShopShelf());
  await page.waitForTimeout(120);
  state = await saved();
  assert(!state.marketShop, "whole-market action did not clear the shop shelf");
  await page.evaluate(() => {
    App.openShop("shop_gold");
    App.go("market");
  });
  await page.waitForTimeout(160);
  state = await saved();
  text = await visibleText();
  assert(!state.marketShop, "generic market navigation should clear the seller shelf");
  assert(!text.includes("Golden Threads shelf"), "generic market navigation still showed seller shelf");
  await page.evaluate(() => {
    App.openShop("shop_gold");
    App.openCart();
  });
  await page.waitForTimeout(160);
  state = await saved();
  text = await visibleText();
  assert(state.marketTab === "cart", "cart navigation should land on the cart tab");
  assert(!state.marketShop, "cart navigation should clear the seller shelf");
  await page.evaluate(() => App.marketTab("products"));
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(!text.includes("Golden Threads shelf"), "products tab after cart should not reopen a stale seller shelf");
});

await step("business POS and invoice document", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.go("register");
    App.posAdd("p1");
    App.posPaymentDesk();
  });
  await page.waitForTimeout(200);
  assert((await visibleText()).includes("Choose payment"), "payment desk did not open");
  await page.evaluate(() => App.invoiceMaker());
  await page.waitForTimeout(300);
  const state = await saved();
  assert(state.account === "riley_biz", "business account was not active");
  assert((state.posCart || []).some(item => item.id === "p1"), "POS cart did not keep product");
  assert(Boolean(await page.$(".invoice-preview")), "invoice preview did not render");
  await page.evaluate(() => App.closeModal());

  await page.evaluate(() => App.posRefundDesk("sale_demo_receipt"));
  await page.waitForTimeout(180);
  let refundText = await visibleText();
  assert(refundText.includes("Provider refund state"), "POS refund desk did not show provider refund state");
  assert(refundText.includes("Provider-led money boundary"), "POS refund desk did not expose provider money boundary");
  assert(refundText.includes("Source receipt first") && refundText.includes("Provider pending after record") && refundText.includes("No spendable balance") && refundText.includes("Support handles exceptions"), "POS refund desk did not expose the refund state guardrails");
  assert(refundText.includes("provider webhooks") && refundText.includes("backend reconciliation"), "POS refund desk did not explain production provider reconciliation");
  await page.fill("#refundAmount", "640");
  await page.evaluate(() => {
    document.getElementById("refundReason").value = "Service recovery";
    document.getElementById("refundNote").value = "QA provider-pending refund boundary.";
  });
  await page.evaluate(() => App.confirmPosRefund("sale_demo_receipt"));
  await page.waitForTimeout(220);
  const refundState = await saved();
  const posRefund = (refundState.posRefunds || []).find(row => row.sale === "sale_demo_receipt" && row.note === "QA provider-pending refund boundary.");
  assert(posRefund?.amount === 640, "POS refund did not record the expected partial amount");
  assert(posRefund?.providerStatus === "provider pending", "POS refund did not stay provider-pending");
  assert(posRefund?.nonSettling === true && posRefund?.providerVerified === false && posRefund?.spendable === false && posRefund?.moneyMovementEnabled === false, "POS refund should remain provider-led and non-spendable");
  assert(/pos_refund_provider_pending_no_settlement/.test(posRefund?.settlementStatus || ""), "POS refund settlement status did not mark no provider settlement");
  await page.evaluate(id => App.refundOpsDesk(id), posRefund.id);
  await page.waitForTimeout(180);
  refundText = await visibleText();
  assert(refundText.includes("Refund operations") && refundText.includes("Service recovery") && refundText.includes("Provider pending"), "POS refund did not appear in refund operations");
  assert(refundText.includes("Refund/support launch command") && refundText.includes("No balance edit") && refundText.includes("No live settlement"), "POS refund operations did not expose support/accounting guardrails");
  assert(refundText.includes("Webhook dry-run"), "POS refund operations did not expose webhook dry-run rehearsal");
  await page.evaluate(id => App.refundProviderWebhookDesk("pos", id), posRefund.id);
  await page.waitForSelector("#refundWebhookStatus", { state: "visible", timeout: 5000 });
  refundText = await visibleText();
  assert(refundText.includes("Provider webhook dry-run") && refundText.includes("No wallet or balance mutation"), "POS webhook dry-run did not state no-balance-mutation boundary");
  await page.selectOption("#refundWebhookStatus", "provider failed");
  await page.fill("#refundWebhookReceipt", "evt_qa_failed_refund");
  await page.fill("#refundWebhookIdempotency", "qa-idempotency-refund-failed");
  await page.fill("#refundWebhookNote", "QA failed webhook replay for support owner queue.");
  await page.evaluate(id => App.refundProviderWebhookDryRun("pos", id), posRefund.id);
  await page.waitForTimeout(220);
  const webhookState = await saved();
  const webhookEvent = (webhookState.refundProviderWebhookEvents || []).find(row => row.refund === posRefund.id && row.providerEventId === "evt_qa_failed_refund");
  const webhookRefund = (webhookState.posRefunds || []).find(row => row.id === posRefund.id);
  const webhookSupport = (webhookState.supportIncidents || []).find(row => row.refund === posRefund.id && row.providerEvent === webhookEvent?.id);
  assert(webhookEvent?.decision === "support_required" && webhookEvent.noSettlementMutation === true && webhookEvent.moneyMovementEnabled === false, "webhook dry-run did not stay non-settling and support-owned");
  assert(webhookRefund?.providerStatus === "provider pending" && webhookRefund?.providerWebhookStatus === "provider failed", "webhook dry-run should record mapped status without changing provider status");
  assert(webhookSupport?.type === "refundWebhookDryRun" && /Dry-run only/.test(webhookSupport.detail || ""), "webhook dry-run did not create a support-owner queue item");
  assert((webhookState.backendEvents || []).some(event => /Refund webhook dry-run/.test(event.label || "") && /no settlement mutation/i.test(event.detail || "")), "webhook dry-run did not enter backend audit trail");
  await page.evaluate(id => App.refundOpsDesk(id), posRefund.id);
  await page.waitForTimeout(180);
  refundText = await visibleText();
  assert(refundText.includes("Webhook dry-run trail") && refundText.includes("evt_qa_failed_refund") && refundText.includes("support_required"), "refund ops did not show webhook dry-run trail");
  assert(refundText.includes("Linked support cases") && refundText.includes("Refund webhook dry-run review"), "refund ops did not surface webhook support queue item");
  assert(refundText.includes("Kenya refund rail readiness") && refundText.includes("M-Pesa reversal callback") && refundText.includes("Card refund webhook"), "refund ops did not expose Kenya provider rail readiness");
  assert(refundText.includes("Idempotency replay store") && refundText.includes("Support owner SLA") && refundText.includes("Fail-closed settlement") && refundText.includes("Accounting export proof"), "refund rail readiness did not expose launch gates");
  const railReadinessScore = await page.evaluate(() => Number((document.querySelector("[data-refund-rail-readiness] .provider-payout-score strong")?.textContent || "0").trim()));
  assert(railReadinessScore >= 1 && /dry-run\s+events/i.test(refundText), "refund rail readiness did not count webhook dry-run events");
  await page.evaluate(() => App.backendSyncDesk("provider money states"));
  await page.waitForTimeout(180);
  refundText = await visibleText();
  const settlementReview = await page.evaluate(() => {
    const node = document.querySelector("[data-settlement-exception-review]");
    const triage = document.querySelector("[data-settlement-triage]");
    return {
      exists: Boolean(node),
      localCount: Number(node?.getAttribute("data-local-dry-run-count") || 0),
      text: node?.textContent || "",
      triage: Boolean(triage),
      receiptCandidates: Number(triage?.getAttribute("data-settlement-receipt-candidates") || 0),
      providerFetchRequired: Number(triage?.getAttribute("data-settlement-provider-fetch-required") || 0),
      supportRequired: Number(triage?.getAttribute("data-settlement-support-required") || 0),
      localHandoffs: Number(triage?.getAttribute("data-settlement-local-handoffs") || 0),
      packet: document.querySelector("#settlementEvidencePacket")?.value || ""
    };
  });
  assert(settlementReview.exists && settlementReview.localCount >= 1 && settlementReview.text.includes("Settlement exception review"), "backend sync did not surface local refund webhook exception evidence");
  assert(settlementReview.triage && settlementReview.receiptCandidates >= 1 && settlementReview.providerFetchRequired >= 1 && settlementReview.supportRequired >= 1 && settlementReview.localHandoffs >= 1, `settlement triage did not classify local refund webhook evidence: ${JSON.stringify(settlementReview)}`);
  assert(settlementReview.text.includes("Review Ops triage") && settlementReview.text.includes("Provider receipt candidates") && settlementReview.text.includes("Provider fetch required") && settlementReview.text.includes("Founder finance blocked"), "settlement review did not show Review Ops triage summary");
  assert(settlementReview.packet.includes("Triage: receipt candidates") && settlementReview.packet.includes("founder finance blocked"), "settlement evidence packet did not include triage counts");
  assert(refundText.includes("Local refund webhook dry-runs") || refundText.includes("Local refund webhook"), "backend settlement review did not explain local refund webhook handoff");
  assert(refundText.includes("evt_qa_failed_refund") && refundText.includes("refund_webhook_dry_run_only_no_settlement"), "backend settlement review did not show refund webhook dry-run details");
  await page.evaluate(eventId => App.settlementExceptionDryRun(`local-refund-webhook:${eventId}`), webhookEvent.id);
  await page.waitForTimeout(180);
  refundText = await visibleText();
  assert(refundText.includes("Settlement dry-run") && refundText.includes("Local dry-run evidence"), "local refund webhook settlement dry-run did not open");
  assert(refundText.includes("no payout") && refundText.includes("refund completion") && refundText.includes("spendable balance"), "local settlement dry-run did not preserve no-settlement boundary");
  await page.evaluate(() => App.closeModal());
});

await step("open-door guest order and QR desk", async () => {
  const before = await saved();
  const orderCount = (before.guestOrders || []).length;
  await page.evaluate(() => App.guestCheckoutDesk("p1"));
  await page.waitForSelector("#guestContact", { state: "visible", timeout: 5000 });
  await page.fill("#guestContact", "+254700000000");
  await page.fill("#guestNote", "QA walk-in checkout with receipt email trail.");
  await page.evaluate(() => App.saveGuestCheckout("p1"));
  await page.waitForTimeout(250);
  const after = await saved();
  assert((after.guestOrders || []).length > orderCount, "guest order was not created");
  await page.evaluate(() => App.openDoorDesk());
  assert((await visibleText()).includes("Open-door"), "open-door desk did not open");
  await page.evaluate(() => App.openQrQueue());
  assert((await visibleText()).match(/QR|queue|Prompt/i), "QR queue did not open");
  await page.evaluate(() => App.closeModal());
});

await step("booking appears on both sides", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.confirmBooking("sv1", "Tue 11:00", "wk_owner", {
      slot: "Tue 11:00",
      staffId: "wk_owner",
      place: "seller",
      placeNote: "QA booking place note",
    });
  });
  await page.waitForSelector("#financePin", { state: "visible", timeout: 5000 });
  await page.fill("#financePin", "0000");
  await page.evaluate(() => App.unlockFinance());
  await page.waitForTimeout(300);
  const state = await saved();
  const booking = (state.bookings || []).find(item => item.service === "sv1" && item.booker === "riley_artist" && item.provider === "riley_biz");
  assert(Boolean(booking), "booking was not saved for booker and provider");
  assert(state.page === "home", "booking should land on Today/Home after confirmation");
});

await step("booking protocol reschedule and cancel", async () => {
  const state = await saved();
  const booking = (state.bookings || []).find(item => item.service === "sv1" && item.booker === "riley_artist");
  assert(Boolean(booking), "missing booking to inspect protocol");
  await page.evaluate(id => {
    App.setAccount("musa");
    App.confirmReschedule(id, "Fri 10:00", "wk_owner");
    App.cancelBooking(id);
    App.setAccount("riley_artist");
  }, booking.id);
  await page.waitForTimeout(120);
  let guarded = await saved();
  let guardedBooking = (guarded.bookings || []).find(item => String(item.id) === String(booking.id));
  assert(guardedBooking?.slot === booking.slot && guardedBooking?.status === booking.status, "unrelated account could mutate booking protocol");
  await page.evaluate(id => App.bookingProtocol(id), booking.id);
  assert((await visibleText()).includes("Booking protocol"), "booking protocol did not open");
  const protocolUi = await page.evaluate(() => {
    const shell = document.querySelector("[data-booking-protocol-command]");
    const sheet = document.querySelector(".booking-protocol-sheet");
    return {
      shell: !!shell,
      fitted: !!sheet?.classList.contains("fit-scroll-sheet"),
      hero: !!document.querySelector("[data-booking-protocol-hero]"),
      rules: document.querySelectorAll("[data-booking-protocol-rule]").length,
      metrics: document.querySelectorAll("[data-booking-protocol-metric]").length,
      actions: !!document.querySelector("[data-booking-protocol-actions]"),
      boundary: !!document.querySelector("[data-booking-protocol-boundary]"),
      trail: !!document.querySelector("[data-booking-protocol-trail]"),
      overflow: !!shell && (document.documentElement.scrollWidth > window.innerWidth + 2 || shell.scrollWidth > shell.clientWidth + 2),
      text: document.querySelector("#modal.on")?.innerText || ""
    };
  });
  assert(protocolUi.shell && protocolUi.fitted && protocolUi.hero && protocolUi.actions && protocolUi.boundary && protocolUi.trail, `booking protocol sheet missed modern command sections: ${JSON.stringify(protocolUi)}`);
  assert(protocolUi.metrics >= 4 && protocolUi.rules >= 5, `booking protocol sheet missed metrics or policy rules: ${JSON.stringify(protocolUi)}`);
  assert(!protocolUi.overflow, "booking protocol sheet overflowed the phone width");
  for (const phrase of ["Party-scoped changes", "No-show provider-only", "Refund provider pending", "Both calendars update"]) {
    assert(protocolUi.text.includes(phrase), `booking protocol sheet missed ${phrase} guardrail copy`);
  }
  await page.evaluate(id => App.rescheduleBooking(id), booking.id);
  await page.waitForTimeout(120);
  assert((await visibleText()).includes("Reschedule"), "reschedule panel did not open");
  const rescheduleUi = await page.evaluate(() => ({
    shell: !!document.querySelector("[data-booking-protocol-reschedule]"),
    slots: document.querySelectorAll("[data-booking-protocol-slot]").length,
    boundary: !!document.querySelector("[data-booking-protocol-boundary]"),
    overflow: document.documentElement.scrollWidth > window.innerWidth + 2
  }));
  assert(rescheduleUi.shell && rescheduleUi.slots >= 1 && rescheduleUi.boundary && !rescheduleUi.overflow, `booking reschedule sheet is not compact or complete: ${JSON.stringify(rescheduleUi)}`);
  await page.evaluate(id => App.confirmReschedule(id, "Wed 14:00", "wk_owner"), booking.id);
  await page.waitForTimeout(150);
  let updated = await saved();
  let moved = (updated.bookings || []).find(item => String(item.id) === String(booking.id));
  assert(moved?.slot === "Wed 14:00", "booking did not reschedule");
  assert(moved?.rescheduleCount === 1, "booking reschedule count did not increment");
  assert((updated.messages?.riley_biz || []).some(msg => msg.type === "booking" && String(msg.booking) === String(booking.id) && /Booking rescheduled/.test(msg.text || "")), "reschedule did not write provider booking thread");
  assert((updated.emails || []).some(email => email.to === "riley_biz" && /Booking rescheduled/.test(email.subject || "")), "reschedule email did not target provider");

  await page.evaluate(id => {
    App.setAccount("riley_artist");
    App.rescheduleBooking(id);
  }, booking.id);
  await page.waitForTimeout(120);
  assert((await visibleText()).includes("Reschedule limit reached"), "booker could exceed the included reschedule limit");

  await page.evaluate(id => App.bookingProtocol(id), booking.id);
  await page.waitForTimeout(120);
  await page.fill("#bookingNote", "QA cancellation from booking protocol");
  await page.evaluate(id => App.cancelBooking(id), booking.id);
  await page.waitForTimeout(160);
  updated = await saved();
  moved = (updated.bookings || []).find(item => String(item.id) === String(booking.id));
  assert(moved?.status === "cancelled", "booking did not cancel under protocol");
  assert((updated.messages?.riley_biz || []).some(msg => msg.type === "booking" && String(msg.booking) === String(booking.id) && /Booking cancelled/.test(msg.text || "")), "cancellation did not write provider booking thread");
  assert((updated.emails || []).some(email => email.to === "riley_biz" && /Booking cancelled/.test(email.subject || "")), "cancellation email did not target provider");
  assert((updated.followUps || []).some(f => /Review cancelled booking/.test(f.title || "") && f.audience === "riley_biz"), "cancellation did not create provider review follow-up");
  const refund = (updated.bookingRefunds || []).find(row => String(row.booking) === String(booking.id));
  assert(refund?.amount > 0 && refund.providerStatus === "provider pending", "booking cancellation refund did not stay provider-pending");
  assert((updated.notifications || []).some(n => n.kind === "refund" && n.refund === refund.id), "booking refund notification missing");
  await page.evaluate(id => App.refundOpsDesk(id), refund.id);
  await page.waitForTimeout(160);
  const text = await visibleText();
  assert(text.includes("Refund operations") && text.includes("Booking deposit") && text.includes("Provider pending"), "refund operations did not expose booking deposit refund");
  assert(text.includes("View only"), "customer-facing booking refund row should be view-only");
  const bookingRefundResolution = await page.evaluate(() => {
    const node = document.querySelector("[data-booking-refund-resolution]");
    const sheet = document.querySelector("#modal.on .sheet");
    return {
      exists: !!node,
      status: node?.getAttribute("data-booking-refund-status") || "",
      ready: Number(node?.getAttribute("data-booking-refund-ready") || 0),
      steps: node?.querySelectorAll("[data-booking-refund-step]").length || 0,
      bodyOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      sheetOverflow: sheet ? Math.max(0, sheet.scrollWidth - sheet.clientWidth) : 0,
      text: node?.innerText || ""
    };
  });
  assert(bookingRefundResolution.exists && bookingRefundResolution.steps >= 6 && bookingRefundResolution.status === "pending", `booking refund resolution command missing or wrong state: ${JSON.stringify(bookingRefundResolution)}`);
  assert(bookingRefundResolution.bodyOverflow <= 2 && bookingRefundResolution.sheetOverflow <= 2, `booking refund resolution command overflowed phone width: ${JSON.stringify(bookingRefundResolution)}`);
  assert(/Booking refund resolution|Provider receipt required|No instant refund|No spendable balance|Support case|Accounting\/export proof|Backend settlement only/i.test(bookingRefundResolution.text), "booking refund resolution command missed review-first/provider boundary copy");
  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.refundProviderUpdate("booking", id, "provider succeeded");
  }, refund.id);
  await page.waitForTimeout(160);
  updated = await saved();
  const succeededRefund = (updated.bookingRefunds || []).find(row => String(row.id) === String(refund.id));
  moved = (updated.bookings || []).find(item => String(item.id) === String(booking.id));
  assert(succeededRefund?.providerStatus === "provider succeeded", "booking refund provider succeeded status did not persist");
  assert(succeededRefund?.nonSettling === true && succeededRefund?.providerVerified === false && succeededRefund?.spendable === false && succeededRefund?.moneyMovementEnabled === false && succeededRefund?.noWalletCredit === true, "booking refund provider success should remain non-settling and non-spendable in the APK");
  assert(/receipt_candidate|no_wallet_credit|no_settlement/i.test(`${succeededRefund?.refundResolutionStatus || ""} ${succeededRefund?.settlementStatus || ""}`), "booking refund provider success did not stay backend-review/no-wallet-credit");
  assert(/provider succeeded/i.test(moved?.refundStatus || ""), "booking refund status did not reflect provider receipt candidate");
  await page.evaluate(id => App.refundOpsDesk(id), refund.id);
  await page.waitForTimeout(160);
  const succeededResolution = await page.evaluate(() => {
    const node = document.querySelector("[data-booking-refund-resolution]");
    return { status: node?.getAttribute("data-booking-refund-status") || "", text: node?.innerText || "" };
  });
  assert(succeededResolution.status === "succeeded" && /Provider receipt candidate|Backend settlement only|No spendable balance/i.test(succeededResolution.text), "booking refund succeeded state did not remain receipt-candidate/backend-review in Refund Ops");

  const noShowBooking = await page.evaluate(key => {
    App.closeModal();
    App.setAccount("zuri");
    const qaNoShowSlot = "Sat 12:00";
    App.confirmBooking("sv1", qaNoShowSlot, "wk_owner", { slot:qaNoShowSlot, staffId:"wk_owner", place:"seller", placeNote:"QA no-show review appointment" });
    const pin = document.querySelector("#financePin");
    if (pin) {
      pin.value = "0000";
      App.unlockFinance();
    }
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const rows = (stored.bookings || []).filter(item => item.service === "sv1" && item.booker === "zuri" && item.provider === "riley_biz" && item.slot === qaNoShowSlot);
    return { id: rows[0]?.id || "", slot: qaNoShowSlot, modal: document.querySelector("#modal.on")?.innerText || "" };
  }, KEY);
  assert(noShowBooking.id, `missing fresh booking for provider no-show review: ${JSON.stringify(noShowBooking)}`);
  const noShowReview = await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.bookingProtocol(id);
    const protocolText = document.querySelector("#modal.on")?.innerText || "";
    App.bookingNoShowReview(id);
    const modal = document.querySelector("#modal");
    const sheet = modal?.querySelector(".sheet");
    return {
      protocolAction: /No-show/.test(protocolText),
      review: !!modal?.querySelector("[data-booking-noshow-review]"),
      hero: !!modal?.querySelector("[data-booking-noshow-hero]"),
      boundary: !!modal?.querySelector("[data-booking-noshow-boundary]"),
      actions: !!modal?.querySelector("[data-booking-noshow-actions]"),
      metrics: modal?.querySelectorAll("[data-booking-protocol-metric]").length || 0,
      rules: modal?.querySelectorAll("[data-booking-protocol-rule]").length || 0,
      bodyOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      sheetOverflow: sheet ? Math.max(0, sheet.scrollWidth - sheet.clientWidth) : 0,
      text: modal?.textContent || ""
    };
  }, noShowBooking.id);
  assert(noShowReview.protocolAction && noShowReview.review && noShowReview.hero && noShowReview.boundary && noShowReview.actions, `no-show review sheet did not render complete command UI: ${JSON.stringify(noShowReview)}`);
  assert(noShowReview.metrics >= 4 && noShowReview.rules >= 3, `no-show review sheet missed metrics or rules: ${JSON.stringify(noShowReview)}`);
  assert(noShowReview.bodyOverflow <= 2 && noShowReview.sheetOverflow <= 2, `no-show review sheet has horizontal overflow: ${JSON.stringify(noShowReview)}`);
  assert(/Review before closing|Provider-only record|Customer dispute path|Refund provider pending|No instant refund|Support owner case|No balance edit/i.test(noShowReview.text), "no-show review sheet missed review-first refund/support boundary copy");
  await page.evaluate(id => {
    document.querySelector("#bookingNote").value = "QA provider waited, messaged customer, and held the staff slot before no-show review.";
    App.markBookingNoShow(id);
  }, noShowBooking.id);
  await page.waitForTimeout(160);
  const noShowState = await saved();
  const noShowRecord = (noShowState.bookings || []).find(item => String(item.id) === String(noShowBooking.id));
  const noShowRefund = (noShowState.bookingRefunds || []).find(row => String(row.booking) === String(noShowBooking.id) && row.refundType === "booking_no_show");
  const noShowSupport = (noShowState.supportIncidents || []).find(row => String(row.booking) === String(noShowBooking.id) && row.type === "bookingNoShowReview");
  const zuriRule = noShowState.bookingClientRules?.zuri || {};
  assert(noShowRecord?.status === "no-show" && noShowRecord.noShow === true, "provider no-show did not close the booking as no-show");
  assert(zuriRule.fullPay === true && Number(zuriRule.noShowCount || 0) >= 1, "provider no-show did not make future bookings full-pay for the client");
  assert(noShowRefund?.providerStatus === "provider pending" && noShowRefund.nonSettling === true && noShowRefund.moneyMovementEnabled === false, "no-show refund did not stay provider-pending and non-settling");
  assert(noShowSupport?.refund === noShowRefund.id && noShowSupport.noSettlementMutation === true && /provider-led/i.test(noShowSupport.detail || ""), "no-show did not create provider-led support evidence");
  assert((noShowState.messages?.zuri || []).some(msg => msg.type === "booking" && String(msg.booking) === String(noShowBooking.id) && /no-show recorded/i.test(msg.text || "")), "no-show did not write the exact customer booking thread");
  assert((noShowState.emails || []).some(email => email.to === "zuri" && /Booking no-show recorded/.test(email.subject || "")), "no-show did not email the customer");
  assert((noShowState.followUps || []).some(f => /Resolve booking no-show support/.test(f.title || "") && f.audience?.includes?.("riley_biz")), "no-show did not create a provider support follow-up");
  await page.evaluate(id => App.refundOpsDesk(id), noShowRefund.id);
  await page.waitForTimeout(160);
  const noShowRefundText = await visibleText();
  assert(noShowRefundText.includes("Refund operations") && noShowRefundText.includes("Booking no-show") && noShowRefundText.includes("Provider pending"), "refund operations did not expose provider-pending no-show refund");
  assert(noShowRefundText.includes("Linked support cases") && noShowRefundText.includes("Booking no-show review"), "refund operations did not surface the no-show support handoff");
  await page.evaluate(() => App.closeModal());
});

await step("booking and refund copilots preserve exact work records", async () => {
  const ids = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const booking = (stored.bookings || []).find(item => item.service === "sv1" && item.booker === "riley_artist" && item.provider === "riley_biz");
    const refund = (stored.bookingRefunds || []).find(row => String(row.booking) === String(booking?.id));
    return { bookingId: booking?.id || "", refundId: refund?.id || "" };
  }, KEY);
  assert(ids.bookingId, "missing booking for booking copilot test");
  assert(ids.refundId, "missing refund for refund copilot test");

  await page.evaluate(id => {
    App.closeModal();
    App.setAiAssist(true, "settings");
    App.setAccount("riley_biz");
    App.bookingDetail(id);
  }, ids.bookingId);
  await page.waitForTimeout(180);
  let text = await visibleText();
  assert(text.includes("Booking copilot"), "booking detail did not render the booking copilot");
  assert(text.includes("Use Protocol") && text.includes("Message from the booking record"), "booking copilot did not keep protocol and messaging tied to the booking");
  const bookingCommand = await page.evaluate(() => {
    const shell = document.querySelector("[data-booking-command]");
    return {
      found:!!shell,
      hero:!!document.querySelector("[data-booking-command-hero]"),
      readiness:!!document.querySelector("[data-booking-command-readiness]"),
      boundary:!!document.querySelector("[data-booking-command-boundary]"),
      actions:!!document.querySelector("[data-booking-command-actions]"),
      trail:!!document.querySelector("[data-booking-command-trail]"),
      metrics:document.querySelectorAll("[data-booking-command-metric]").length,
      checks:document.querySelectorAll("[data-booking-command-check]").length,
      bodyOverflow:Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      shellOverflow:shell ? Math.max(0, shell.scrollWidth - shell.clientWidth) : 0,
      text:document.body.textContent || ""
    };
  });
  assert(bookingCommand.found && bookingCommand.hero && bookingCommand.readiness && bookingCommand.boundary && bookingCommand.actions && bookingCommand.trail, `booking detail did not render Appointment command layout: ${JSON.stringify(bookingCommand)}`);
  assert(bookingCommand.metrics >= 4 && bookingCommand.checks >= 6, `booking detail missed metrics or readiness checks: ${JSON.stringify(bookingCommand)}`);
  assert(bookingCommand.bodyOverflow <= 2 && bookingCommand.shellOverflow <= 2, `booking detail has horizontal overflow: ${JSON.stringify(bookingCommand)}`);
  assert(/Appointment command|Party-scoped changes|No-show provider-only|Refund provider pending|Both calendars update/i.test(bookingCommand.text), "booking detail missed command/protocol boundary language");
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll(".ai-workflow-coach .btn")).find(btn => /Protocol/.test(btn.textContent || ""));
    if (!button) throw new Error("Booking protocol copilot action missing");
    button.click();
  });
  await page.waitForTimeout(180);
  assert((await visibleText()).includes("Booking protocol"), "booking copilot Protocol action did not open the protocol sheet");

  await page.evaluate(id => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.refundOpsDesk(id);
  }, ids.refundId);
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Refund copilot"), "refund operations did not render the refund copilot");
  assert(text.includes("Keep provider-pending rows visible") && text.includes("provider confirmation"), "refund copilot did not explain provider-owned settlement");
  assert(text.includes("Refund/support launch command") && text.includes("Backend sync") && text.includes("Export preview") && text.includes("Support inbox"), "refund operations did not expose operator actions for support/accounting/backend handoff");
  await page.evaluate(() => {
    const modal = document.querySelector("#modal.on");
    const button = Array.from(modal?.querySelectorAll(".ai-workflow-coach .btn") || []).find(btn => /Accounting/.test(btn.textContent || ""));
    if (!button) throw new Error("Refund accounting copilot action missing");
    button.click();
  });
  await page.waitForTimeout(180);
  assert(/Accounting|Ledger lines|Money in/.test(await visibleText()), "refund copilot Accounting action did not open accounting readout");
  await page.evaluate(() => App.closeModal());
});

await step("booking Message opens exact customer provider thread", async () => {
  let state = await saved();
  const booking = (state.bookings || []).find(item => item.service === "sv1" && item.booker === "riley_artist" && item.provider === "riley_biz");
  assert(Boolean(booking), "missing booking to test exact message route");
  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.bookingDetail(id);
  }, booking.id);
  await page.waitForTimeout(160);
  assert((await visibleText()).includes("Message Riley"), "booking detail did not name the exact customer message target");
  await page.evaluate(id => App.bookingMessages(id), booking.id);
  await page.waitForTimeout(180);
  let route = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      page: stored.page,
      tab: stored.commTab,
      activeChat: stored.activeChat,
      activeBookingChat: stored.activeBookingChat,
      text: document.body.textContent || "",
    };
  }, KEY);
  assert(route.page === "inbox" && route.tab === "messages", "booking Message did not open Messages");
  assert(route.activeChat === "riley_artist", "provider booking Message did not open the customer thread");
  assert(String(route.activeBookingChat) === String(booking.id), "provider booking Message lost booking context");
  assert(route.text.includes(booking.name) && route.text.includes(booking.slot), "booking chat did not show booking context");
  await page.fill("#chatText", "QA booking thread route");
  await page.evaluate(() => App.sendChat("riley_artist"));
  await page.waitForTimeout(160);
  state = await saved();
  assert((state.messages?.riley_artist || []).some(msg => msg.type === "booking" && String(msg.booking) === String(booking.id) && /QA booking thread route/.test(msg.text || "")), "booking-specific message was not tagged with the booking id");

  await page.evaluate(id => {
    App.setAccount("riley_artist");
    App.bookingMessages(id);
  }, booking.id);
  await page.waitForTimeout(180);
  route = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      activeChat: stored.activeChat,
      activeBookingChat: stored.activeBookingChat,
      text: document.body.textContent || "",
    };
  }, KEY);
  assert(route.activeChat === "riley_biz", "booker booking Message did not open the provider thread");
  assert(String(route.activeBookingChat) === String(booking.id), "booker booking Message lost booking context");
  assert(route.text.includes("QA booking thread route"), "booker booking thread did not show provider message");

  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.openComms("messages");
  });
  await page.waitForSelector(".thread-list", { state: "visible", timeout: 5000 });
  await page.locator(".thread-row.clean").filter({ hasText: "Riley" }).first().click();
  await page.waitForTimeout(180);
  route = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      page: stored.page,
      tab: stored.commTab,
      activeChat: stored.activeChat,
      activeBookingChat: stored.activeBookingChat,
      activeWorkChat: stored.activeWorkChat,
      text: document.body.textContent || "",
    };
  }, KEY);
  assert(route.page === "inbox" && route.tab === "messages", "customer thread row did not stay in Messages");
  assert(route.activeChat === "riley_artist", "customer thread row with work records did not open the exact direct chat");
  assert(!route.activeBookingChat && !route.activeWorkChat, "plain message row should not force a booking/work filter");
  assert(route.text.includes("QA booking thread route"), "direct customer thread did not show the existing booking conversation");
  assert(/\d+ record/.test(route.text), "direct customer thread did not keep a shortcut to work records");
});

await step("order Message opens exact buyer seller work thread", async () => {
  let state = await saved();
  const order = (state.orders || []).find(item => item.buyer === "riley_artist" && item.seller === "riley_biz");
  assert(Boolean(order), "missing seller-buyer order to test exact work message route");
  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.orderDetail(id);
  }, order.id);
  await page.waitForTimeout(160);
  assert((await visibleText()).includes("Buyer thread"), "seller order detail did not expose buyer message route");
  await page.evaluate(id => App.openWorkChat("order", id, "riley_artist"), order.id);
  await page.waitForTimeout(180);
  let route = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      page: stored.page,
      tab: stored.commTab,
      activeChat: stored.activeChat,
      activeWorkChat: stored.activeWorkChat,
      text: document.body.textContent || "",
    };
  }, KEY);
  assert(route.page === "inbox" && route.tab === "messages", "order Message did not open Messages");
  assert(route.activeChat === "riley_artist", "seller order Message did not open the buyer thread");
  assert(String(route.activeWorkChat) === `order:${order.id}`, "order Message lost exact order context");
  assert(route.text.includes(order.items[0]) && route.text.includes(order.status), "order chat did not show order context");
  await page.fill("#chatText", "QA order work thread route");
  await page.evaluate(() => App.sendChat("riley_artist"));
  await page.waitForTimeout(160);
  state = await saved();
  assert((state.messages?.riley_artist || []).some(msg => msg.type === "order" && String(msg.order) === String(order.id) && /QA order work thread route/.test(msg.text || "")), "order-specific message was not tagged with the order id");
  await page.evaluate(() => App.setAccount("riley_artist"));
});

await step("work chats and calls isolate profile content", async () => {
  let state = await saved();
  const order = (state.orders || []).find(item => item.buyer === "riley_artist" && item.seller === "riley_biz");
  assert(Boolean(order), "missing seller-buyer order for work chat boundary test");
  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.openWorkChat("order", id, "riley_artist");
  }, order.id);
  await page.waitForTimeout(180);
  let text = await visibleText();
  assert(/Contact passport/i.test(text) && /Exact work record/i.test(text) && /No direct numbers/i.test(text) && /Profile isolated/i.test(text), "work chat did not surface the contact privacy passport");
  assert(text.includes("Work context") && text.includes("Private profile content"), "work chat did not show content-isolation boundary");
  assert(text.includes("real name") || text.includes("verified"), "work chat did not mention verified real-name layer");

  await page.evaluate(() => App.chatOptions("riley_artist"));
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(text.includes("Work boundary") && text.includes("Customer record"), "work chat options did not expose boundary and customer record actions");
  assert(!text.includes("Open their full profile"), "work chat options still exposed full profile browsing");

  await page.evaluate(() => {
    App.closeModal();
    App.startCall("riley_artist", "audio");
  });
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("work-context call") && text.includes("Work boundary"), "work call did not stay inside work boundary");
  assert(text.includes("Call privacy") && text.includes("No real numbers") && text.includes("Artbook Relay"), "work call did not show masked relay privacy rules");
  assert(!text.includes("Background uses their profile artwork"), "work call still used profile artwork language");
  assert(!text.includes("Open their full profile"), "work call exposed full profile action");

  await page.evaluate(() => App.requestMaskedPhoneRelay("riley_artist", "audio"));
  await page.waitForTimeout(180);
  text = await visibleText();
  assert(text.includes("Provider not configured") && text.includes("Real numbers exposed") && text.includes("No"), "masked phone fallback did not fail closed without exposing numbers");
  state = await saved();
  const relaySession = (state.maskedCallSessions || []).find(row => row.with === "riley_artist" && row.channel === "masked_phone_relay" && row.context?.key === `order:${order.id}`);
  assert(relaySession && relaySession.realNumbersExposed === false && relaySession.providerStatus === "telephony_provider_not_configured", "masked relay session did not persist provider fail-closed number privacy");

  await page.evaluate(() => App.endCall("riley_artist"));
  await page.waitForTimeout(180);
  let route = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return { activeChat: stored.activeChat, activeWorkChat: stored.activeWorkChat };
  }, KEY);
  assert(route.activeChat === "riley_artist" && String(route.activeWorkChat) === `order:${order.id}`, "ending work call did not return to scoped work chat");

  await page.evaluate(() => {
    App.closeActiveChat();
    App.openChat("riley_artist");
    App.callOptions("riley_artist");
  });
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(/Contact passport/i.test(text) && /Direct chat/i.test(text) && /Phone fallback/i.test(text), "direct call options did not surface the contact privacy passport");
  assert(text.includes("App call only") && text.includes("Phone fallback needs an active"), "direct chat did not keep phone relay locked outside work context");
  await page.evaluate(() => App.requestMaskedPhoneRelay("riley_artist", "audio"));
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(text.includes("Relay locked") && text.includes("no active call-safe work context"), "direct phone relay was not blocked without a scoped work record");
  state = await saved();
  const blockedRelay = (state.maskedCallSessions || []).find(row => row.with === "riley_artist" && row.channel === "masked_phone_relay" && row.context?.key === "direct" && row.providerStatus === "blocked_no_active_work_context");
  assert(blockedRelay && blockedRelay.realNumbersExposed === false, "blocked direct relay did not preserve no-number-exposure state");

  await page.evaluate(() => {
    App.closeModal();
    App.chatOptions("riley_artist");
  });
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(text.includes("Open their full profile"), "plain direct chat should still expose normal profile action");
  await page.evaluate(() => App.closeModal());
});

await step("privacy center exposes account deletion and export rights", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.privacySettings("riley_biz");
  });
  await page.waitForTimeout(180);
  let privacy = await page.evaluate(() => ({
    text: document.querySelector("#modal .modal-body")?.innerText || "",
    lanes: Array.from(document.querySelectorAll("[data-account-rights-lane]")).map(row => ({
      id: row.getAttribute("data-account-rights-lane"),
      status: row.querySelector("[data-account-rights-status]")?.getAttribute("data-account-rights-status") || "",
      text: row.textContent || "",
    })),
    packet: document.querySelector("#accountRightsPacket")?.value || "",
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
  assert(privacy.text.includes("Play account data rights") && privacy.text.includes("Account data controls"), "privacy center did not expose Play account data rights panel");
  assert(["in_app_delete","web_delete","data_export","retention_review","support_owner"].every(id => privacy.lanes.some(row => row.id === id)), "privacy center did not expose all account rights lanes");
  assert(privacy.lanes.some(row => row.id === "web_delete" && row.status === "blocked"), "privacy center did not keep the web deletion blocker visible");
  assert(privacy.packet.includes("Artbook Account Data Rights Packet") && privacy.packet.includes("In-app path") && privacy.packet.includes("Web request status: blocked") && privacy.packet.includes("Boundary: local demo account-rights packet only"), "account rights packet was not copy-ready or policy-aware");
  assert(!/secret value|password|api[_ -]?key\s*=|DARAJA_CONSUMER_SECRET=/i.test(privacy.packet), "account rights packet exposed sensitive-looking material");
  assert(privacy.overflow <= 4, "privacy account rights panel caused horizontal overflow");

  await page.evaluate(() => App.requestDataExport("riley_biz"));
  await page.waitForTimeout(160);
  await page.evaluate(() => App.requestAccountDeletion("riley_biz"));
  await page.waitForTimeout(160);
  privacy = await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      packet: document.querySelector("#accountRightsPacket")?.value || "",
      latest: document.querySelector("#modal .modal-body")?.innerText || "",
      exports: (stored.privacyExports || []).filter(row => row.account === "riley_biz"),
      deletions: (stored.accountDeletionRequests || []).filter(row => row.account === "riley_biz"),
    };
  }, KEY);
  assert(privacy.exports.length && privacy.deletions.length, "privacy center did not persist export and deletion requests");
  assert(privacy.deletions[0].webRequestRequired === true, "deletion request did not preserve the web deletion blocker flag");
  assert(privacy.packet.includes("Latest export: Ready local demo archive") && privacy.packet.includes("Latest deletion: Deletion review requested"), "account rights packet did not refresh after export/deletion actions");
  assert(privacy.latest.includes("Latest requests") && privacy.latest.includes("Deletion review requested"), "privacy center did not show latest export/deletion state");

  const copied = await page.evaluate(async key => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.__accountRightsCopied = text; } } });
    App.copyAccountRightsPacket("riley_biz");
    await new Promise(resolve => setTimeout(resolve, 30));
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      copied: window.__accountRightsCopied || "",
      events: stored.privacyEvents || [],
      text: document.querySelector("#modal .modal-body")?.innerText || "",
    };
  }, KEY);
  assert(copied.copied.includes("Artbook Account Data Rights Packet") && copied.copied.includes("Web request status: blocked"), "copy account rights packet did not use the current packet text");
  assert(copied.events.some(row => row.account === "riley_biz" && row.label === "Account data rights packet copied"), "copy account rights packet did not write a privacy audit event");
  assert(copied.text.includes("data rights packet"), "privacy center did not reopen on the copied packet focus");
  await page.evaluate(() => App.closeModal());
});

await step("provenance seals require completed evidence", async () => {
  let state = await saved();
  const order = (state.orders || []).find(item => item.buyer === "riley_artist" && item.seller === "riley_biz");
  assert(Boolean(order), "missing seller-buyer order for evidence-backed Seal test");
  await page.evaluate(({ key, orderId }) => {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    const row = (stored.orders || []).find(item => String(item.id) === String(orderId));
    row.stage = "delivered";
    row.status = "Delivered with proof";
    row.proof = { ...(row.proof || {}), dropoff: true, photo: true, pin: true };
    localStorage.setItem(key, JSON.stringify(stored));
  }, { key: KEY, orderId: order.id });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(180);
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.giveSeal("nyota_poet");
  });
  await page.waitForTimeout(160);
  assert((await visibleText()).includes("Evidence needed"), "loose Seal path did not require completed proof");
  state = await saved();
  assert(!(state.trustSeals || []).some(row => row.from === "riley_artist" && row.to === "nyota_poet"), "evidence-free Provenance Seal was written");

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.giveSeal("riley_biz");
  });
  await page.waitForSelector("#sealEvidence", { state: "visible", timeout: 5000 });
  await page.fill("#sealText", "QA evidence-backed Seal from delivered order proof.");
  await page.evaluate(() => App.saveSeal("riley_biz"));
  await page.waitForTimeout(160);
  state = await saved();
  const evidenceId = `order:${order.id}`;
  assert((state.trustSeals || []).some(row => row.from === "riley_artist" && row.to === "riley_biz" && row.evidenceId === evidenceId && row.record?.type === "order"), "evidence-backed Provenance Seal missing record metadata");
});

await step("trust reports require linked evidence before scoring", async () => {
  let state = await saved();
  const order = (state.orders || []).find(item => item.buyer === "riley_artist" && item.seller === "riley_biz");
  assert(Boolean(order), "missing seller-buyer order for report evidence test");

  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.reportSeller("london_amina");
  });
  await page.waitForTimeout(160);
  assert((await visibleText()).includes("Intake only"), "evidence-free report did not explain intake-only handling");
  assert((await page.locator("#reportEvidence").count()) === 0, "evidence-free report unexpectedly exposed linked evidence");
  await page.fill("#reportText", "QA loose report should not change public trust scoring.");
  await page.evaluate(() => App.submitReport("london_amina"));
  await page.waitForTimeout(160);
  state = await saved();
  const intake = (state.trustReports || []).find(row => row.from === "riley_artist" && row.to === "london_amina" && /QA loose report/.test(row.text || ""));
  assert(intake?.status === "intake", "evidence-free report did not become intake");
  await page.evaluate(() => App.trustDesk("london_amina"));
  await page.waitForTimeout(120);
  let text = await page.evaluate(() => document.querySelector("#modal .modal-body")?.textContent || document.body.textContent || "");
  assert(text.includes("Report intake"), "reporter could not see non-scoring intake report");
  assert(!text.includes("Active report review"), "intake report affected trust scoring");

  await page.evaluate(() => App.reportSeller("riley_biz"));
  await page.waitForSelector("#reportEvidence", { state: "visible", timeout: 5000 });
  await page.fill("#reportText", "QA linked report should stay attached to the delivered order.");
  await page.evaluate(() => App.submitReport("riley_biz"));
  await page.waitForTimeout(160);
  state = await saved();
  const active = (state.trustReports || []).find(row => row.from === "riley_artist" && row.to === "riley_biz" && /QA linked report/.test(row.text || ""));
  assert(active?.status === "open", "evidence-backed report did not open active review");
  assert(active.evidenceId && active.record?.type === "order" && active.order === order.id, "evidence-backed report missing order metadata");
  assert((state.notifications || []).some(n => n.kind === "trust" && n.report === active.id), "evidence-backed report notification missing");
});

await step("ride request and courier message", async () => {
  const before = await saved();
  const rideCount = (before.rideRequests || []).length;
  await page.evaluate(() => App.requestRideDesk());
  await page.waitForSelector("#rideDropoff", { state: "visible", timeout: 5000 });
  await page.fill("#rideDropoff", "Kilimani event pickup");
  await page.evaluate(() => {
    App.estimateRide();
    App.confirmRide();
  });
  await page.waitForTimeout(300);
  const state = await saved();
  assert((state.rideRequests || []).length > rideCount, "ride request was not created");
  assert(state.messages?.riley_courier?.some(msg => msg.type === "ride"), "courier ride message was not created");
});

await step("delivery route quote", async () => {
  await page.evaluate(() => App.deliveryQuoteDesk());
  await page.waitForSelector("#quotePackage", { state: "visible", timeout: 5000 });
  await page.evaluate(() => App.confirmDeliveryQuote());
  await page.waitForTimeout(150);
  assert((await visibleText()).match(/Quote ready|Route blocked/i), "delivery quote did not resolve");
  await page.evaluate(() => App.closeModal());
});

await step("package delivery is distinct from passenger pickup", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.go("delivery");
  });
  await page.waitForTimeout(160);
  let text = await visibleText();
  assert(/Rides and packages, clearly separate/i.test(text), "delivery board did not explain rides versus packages");
  assert(/Send package/i.test(text) && /Request passenger ride/i.test(text), "delivery board missed package or passenger actions");

  await page.evaluate(() => App.requestRideDesk());
  await page.waitForSelector("#rideDropoff", { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(/Move yourself, not a package/i.test(text), "ride desk did not warn that passenger pickup is separate");
  assert(/Share trip/i.test(text) && /Plate \+ PIN/i.test(text), "ride desk missed passenger safety checks");

  await page.evaluate(() => App.sendPackageDesk());
  await page.waitForSelector("#packageDropoff", { state: "visible", timeout: 5000 });
  text = await visibleText();
  assert(/Package delivery rules/i.test(text) && /No passenger/i.test(text), "package desk missed package-only standards");
  await page.fill("#packagePickup", "QA sender counter");
  await page.fill("#packageDropoff", "QA recipient stage");
  await page.fill("#packageRecipient", "QA recipient");
  const orderCountBeforeReview = ((await saved()).orders || []).length;
  await page.evaluate(() => App.confirmPackageDelivery());
  await page.waitForSelector("#modal.on [data-package-review]", { state: "visible", timeout: 5000 });
  const packageReview = await page.evaluate(key => {
    const modal = document.querySelector("#modal");
    const shell = modal?.querySelector("[data-package-review]");
    const sheet = modal?.querySelector(".sheet");
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      found:!!shell,
      metrics:shell?.querySelectorAll("[data-package-review-metric]").length || 0,
      checks:shell?.querySelectorAll("[data-package-review-check]").length || 0,
      boundary:!!shell?.querySelector("[data-package-review-boundary]"),
      draft:!!stored.packageDeliveryDraft,
      orderCount:(stored.orders || []).length,
      bodyOverflow:Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      sheetOverflow:sheet ? Math.max(0, sheet.scrollWidth - sheet.clientWidth) : 0,
      text:modal?.textContent || ""
    };
  }, KEY);
  assert(packageReview.found && packageReview.metrics >= 4 && packageReview.checks >= 4 && packageReview.boundary && packageReview.draft, `package review step did not render before route creation: ${JSON.stringify(packageReview)}`);
  assert(packageReview.orderCount === orderCountBeforeReview, `package review created an order before confirmation: ${JSON.stringify(packageReview)}`);
  assert(packageReview.bodyOverflow <= 2 && packageReview.sheetOverflow <= 2, `package review has horizontal overflow: ${JSON.stringify(packageReview)}`);
  assert(/Review package route|Confirm before dispatch|Provider-led payment boundary|No live dispatch|Proof before payout/i.test(packageReview.text), "package review missed quote/payment/proof boundary language");
  await page.evaluate(() => App.finalizePackageDelivery());
  await page.waitForTimeout(240);
  const state = await saved();
  const pkg = (state.orders || []).find(o => o.serviceType === "package_delivery" && o.package?.dropoff === "QA recipient stage");
  assert(pkg?.transportMode === "package" && pkg?.fulfillment === "Package delivery", "package request did not save package transport mode");
  assert(pkg.package?.noPassenger === true && pkg.package?.masked === true, "package request did not keep no-passenger and masked-contact flags");
  assert(state.messages?.riley_courier?.some(msg => msg.type === "delivery" && msg.order === pkg.id), "package request did not notify courier thread");

  await page.evaluate(id => App.orderDetail(id), pkg.id);
  await page.waitForSelector("[data-package-proof-command]", { state: "visible", timeout: 5000 });
  const packageDetail = await page.evaluate(() => {
    const shell = document.querySelector("[data-package-proof-command]");
    return {
      found:!!shell,
      hero:!!shell?.querySelector("[data-package-proof-hero]"),
      route:!!shell?.querySelector("[data-package-proof-route]"),
      checks:shell?.querySelectorAll("[data-package-proof-check]").length || 0,
      metrics:shell?.querySelectorAll("[data-package-proof-metric]").length || 0,
      boundary:!!shell?.querySelector("[data-package-proof-boundary]"),
      actions:!!shell?.querySelector("[data-package-proof-actions]"),
      trail:!!shell?.querySelector("[data-package-proof-trail]"),
      bodyOverflow:Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      shellOverflow:shell ? Math.max(0, shell.scrollWidth - shell.clientWidth) : 0,
      text:shell?.textContent || ""
    };
  });
  assert(packageDetail.found && packageDetail.hero && packageDetail.route && packageDetail.boundary && packageDetail.actions && packageDetail.trail, `package detail did not render the proof command shell: ${JSON.stringify(packageDetail)}`);
  assert(packageDetail.metrics >= 4 && packageDetail.checks >= 5, `package proof command missed metrics or checks: ${JSON.stringify(packageDetail)}`);
  assert(packageDetail.bodyOverflow <= 2 && packageDetail.shellOverflow <= 2, `package proof command has horizontal overflow: ${JSON.stringify(packageDetail)}`);
  assert(/Package proof command|Handoff proof before payout|Recipient handoff|Provider-led package boundary|No passenger ride|Proof before payout|Masked contact/i.test(packageDetail.text), "package proof command missed package-only proof and provider boundary language");

  await page.evaluate(id => App.deliveryProofDesk(id), pkg.id);
  await page.waitForSelector("#modal.on [data-delivery-proof-command][data-package-proof-capture]", { state: "visible", timeout: 5000 });
  const proofDesk = await page.evaluate(() => {
    const modal = document.querySelector("#modal");
    const shell = modal?.querySelector("[data-delivery-proof-command]");
    const sheet = modal?.querySelector(".sheet");
    return {
      found:!!shell,
      sheetClass:sheet?.className || "",
      route:!!shell?.querySelector("[data-delivery-proof-route]"),
      progress:!!shell?.querySelector("[data-delivery-proof-progress]"),
      metrics:shell?.querySelectorAll("[data-delivery-proof-metric]").length || 0,
      actions:shell?.querySelectorAll("[data-delivery-proof-action]").length || 0,
      boundary:!!shell?.querySelector("[data-delivery-proof-boundary]"),
      trail:!!shell?.querySelector("[data-delivery-proof-trail]"),
      bodyOverflow:Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      sheetOverflow:sheet ? Math.max(0, sheet.scrollWidth - sheet.clientWidth) : 0,
      text:shell?.textContent || ""
    };
  });
  assert(proofDesk.found && proofDesk.sheetClass.includes("delivery-proof-sheet") && proofDesk.route && proofDesk.progress && proofDesk.boundary && proofDesk.trail, `package proof capture desk did not render expected shell: ${JSON.stringify(proofDesk)}`);
  assert(proofDesk.metrics >= 4 && proofDesk.actions >= 5, `package proof capture desk missed metrics or capture actions: ${JSON.stringify(proofDesk)}`);
  assert(proofDesk.bodyOverflow <= 2 && proofDesk.sheetOverflow <= 2, `package proof capture desk has horizontal overflow: ${JSON.stringify(proofDesk)}`);
  assert(/Package proof desk|Capture, then review|Demo capture only|no passenger ride|no live dispatch|no client charge|Proof before payout|Provider-led payment/i.test(proofDesk.text), "package proof capture desk missed demo/provider package boundary language");
  await page.evaluate(() => document.querySelector('#modal.on [data-delivery-proof-action="pickup"]')?.click());
  await page.waitForTimeout(180);
  const proofCaptured = await saved();
  const capturedPkg = (proofCaptured.orders || []).find(o => o.id === pkg.id);
  assert(capturedPkg?.proof?.pickup === true && capturedPkg?.events?.some(e => /Captured pickup/i.test(e.label || "")), "package proof capture did not update pickup evidence and trail");

  await page.evaluate(() => {
    App.go("market");
    App.marketTab("products");
  });
  await page.waitForTimeout(160);
  text = await visibleText();
  assert(/Package/i.test(text), "market product rows did not expose package delivery");
});

await step("business package delivery can bill the client", async () => {
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.deliverySheet();
  });
  await page.waitForTimeout(180);
  let text = await visibleText();
  assert(/Business package workflow/i.test(text) && /Bill client/i.test(text) && /Prepare package/i.test(text), "business delivery sheet did not expose package workflow and client billing");
  const opened = await page.evaluate(() => {
    const button = document.querySelector("#sheetDeliveryCourier")?.closest(".mini-check") || [...document.querySelectorAll("#modal.on .more-action,#modal.on .btn")].find(node => /Bill client|Prepare package/i.test(node.textContent || ""));
    if(!button) return false;
    button.click();
    return true;
  });
  assert(opened, "delivery sheet did not have a tappable package workflow trigger");
  await page.waitForSelector("#packagePayer", { state: "visible", timeout: 5000 });
  text = await visibleText();
  const packageCoach = await page.evaluate(() => ({found:Boolean(document.querySelector('#modal.on [data-live-ai-destination-checklist="packageDelivery"]')), sheetClass:document.querySelector("#modal.on .sheet")?.className || ""}));
  assert(packageCoach.found && packageCoach.sheetClass.includes("fit-scroll-sheet") && /Package delivery copilot/i.test(text) && /Confirm sealed allowed goods/i.test(text), "package desk did not render the fitted guided Live AI package checklist");
  assert(/Business client billing/i.test(text) && /Send delivery bill to client/i.test(text), "package desk did not show business client billing controls");
  await page.selectOption("#packageClientId", "zuri");
  await page.selectOption("#packagePayer", "client_request");
  await page.fill("#packagePickup", "QA business sender shelf");
  await page.fill("#packageDropoff", "QA client delivery drop");
  await page.fill("#packageRecipient", "Zuri receiver");
  await page.evaluate(() => App.confirmPackageDelivery());
  await page.waitForSelector("#modal.on [data-package-review]", { state: "visible", timeout: 5000 });
  const review = await page.evaluate(key => {
    const modal = document.querySelector("#modal");
    const shell = modal?.querySelector("[data-package-review]");
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      found:!!shell,
      checks:shell?.querySelectorAll("[data-package-review-check]").length || 0,
      boundary:!!shell?.querySelector("[data-package-review-boundary]"),
      text:modal?.textContent || "",
      client:stored.packageDeliveryDraft?.clientId || "",
      payer:stored.packageDeliveryDraft?.payerMode || ""
    };
  }, KEY);
  assert(review.found && review.checks >= 4 && review.boundary && review.client === "zuri" && review.payer === "client_request", `business package review did not preserve client billing draft: ${JSON.stringify(review)}`);
  assert(/delivery bill request|Zuri|Provider-led payment boundary|No live dispatch/i.test(review.text), "business package review missed client/provider billing language");
  await page.evaluate(() => App.finalizePackageDelivery());
  await page.waitForTimeout(260);
  const state = await saved();
  const pkg = (state.orders || []).find(o => o.serviceType === "package_delivery" && o.package?.dropoff === "QA client delivery drop");
  assert(pkg && pkg.sender === "riley_biz" && pkg.buyer === "zuri" && pkg.billing?.payerMode === "client_request", "business package order did not store sender/client billing context");
  const request = (state.walletRequests || []).find(row => row.kind === "delivery_bill" && row.order === pkg.id && row.to === "zuri");
  assert(request && request.status === "pending" && request.nonSettling === true, "business package delivery did not create a provider-led client bill request");
  assert((state.walletLedger || []).some(row => row.request === request.id && /delivery bill/i.test(row.kind || row.label || "")), "delivery bill request did not write wallet ledger evidence");
  assert((state.messages?.zuri || []).some(msg => msg.type === "moneyRequest" && msg.order === pkg.id && msg.walletRequest === request.id), "delivery bill request did not reach the client thread");
});

await step("package delivery surfaces provider readiness gates", async () => {
  const sheet = await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_biz");
    App.deliverySheet();
    const modal = document.querySelector("#modal");
    const panel = modal?.querySelector('[data-delivery-partner-readiness][data-delivery-readiness-context="sheet"]');
    const details = panel?.querySelector(".delivery-readiness-details");
    return {found:!!panel, rows:panel?.querySelectorAll("[data-delivery-partner-row]").length || 0, strip:!!panel?.querySelector("[data-delivery-readiness-strip]"), collapsed:details ? !details.open : false, text:modal?.textContent || ""};
  });
  assert(sheet.found && sheet.rows >= 4, "delivery sheet did not expose provider readiness gates");
  assert(sheet.strip && sheet.collapsed, "delivery sheet readiness gate was not compact and collapsible");
  assert(/No live dispatch/i.test(sheet.text) && /Provider-led money/i.test(sheet.text) && /Support hold/i.test(sheet.text), "delivery sheet missed launch boundary tags");

  const packageDesk = await page.evaluate(() => {
    App.sendPackageDesk();
    const modal = document.querySelector("#modal");
    const sheet = modal?.querySelector(".sheet");
    const command = modal?.querySelector("[data-package-command]");
    const panel = document.querySelector('#modal [data-delivery-partner-readiness][data-delivery-readiness-context="package"]');
    const details = panel?.querySelector(".delivery-readiness-details");
    return {
      found:!!panel,
      rows:panel?.querySelectorAll("[data-delivery-partner-row]").length || 0,
      strip:!!panel?.querySelector("[data-delivery-readiness-strip]"),
      collapsed:details ? !details.open : false,
      command:!!command,
      route:!!modal?.querySelector("[data-package-command-route]"),
      proof:!!modal?.querySelector("[data-package-command-proof]"),
      boundary:!!modal?.querySelector("[data-package-command-boundary]"),
      metrics:modal?.querySelectorAll("[data-package-command-metric]").length || 0,
      bodyOverflow:Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      sheetOverflow:sheet ? Math.max(0, sheet.scrollWidth - sheet.clientWidth) : 0,
      text:modal?.textContent || ""
    };
  });
  assert(packageDesk.found && packageDesk.rows >= 4, "package form did not show delivery/payment partner onboarding");
  assert(packageDesk.strip && packageDesk.collapsed, "package form readiness gate should stay compact before the form fields");
  assert(/Courier KYB\/KYC/i.test(packageDesk.text) && /Payment provider/i.test(packageDesk.text), "package form missed courier and payment provider gates");
  assert(packageDesk.command && packageDesk.route && packageDesk.proof && packageDesk.boundary && packageDesk.metrics >= 4, `package command did not render the sender command layout: ${JSON.stringify(packageDesk)}`);
  assert(packageDesk.bodyOverflow <= 2 && packageDesk.sheetOverflow <= 2, `package command has horizontal overflow: ${JSON.stringify(packageDesk)}`);
  assert(/Package command|Sender pickup|Recipient drop-off|Quote before payment|Provider-led payment|No passenger ride|Support hold/i.test(packageDesk.text), "package command missed sender route, payment or package-only boundary language");

  const quoteDesk = await page.evaluate(() => {
    App.deliveryQuoteDesk();
    const panel = document.querySelector('#modal [data-delivery-partner-readiness][data-delivery-readiness-context="quote"]');
    return {found:!!panel, text:document.querySelector("#modal")?.textContent || ""};
  });
  assert(quoteDesk.found && /Quote before payment/i.test(quoteDesk.text), "quote desk did not show readiness before taking money");

  const courierPortal = await page.evaluate(() => {
    App.courierPortal();
    const panel = document.querySelector('#modal [data-delivery-partner-readiness][data-delivery-readiness-context="courier"]');
    return {found:!!panel, text:document.querySelector("#modal")?.textContent || ""};
  });
  assert(courierPortal.found && /Courier portal/i.test(courierPortal.text), "courier portal did not expose provider readiness");

  const routeCommand = await page.evaluate(() => {
    App.setAccount("riley_courier");
    App.courierTripDesk("or_zuru_canvas_1");
    const modal = document.querySelector("#modal");
    const command = modal?.querySelector("[data-courier-command]");
    const map = modal?.querySelector("[data-courier-command-map]");
    const proofs = modal?.querySelectorAll("[data-courier-command-proof] .courier-command-proof").length || 0;
    const metrics = modal?.querySelectorAll(".courier-command-card").length || 0;
    const boundary = modal?.querySelector("[data-courier-command-boundary]");
    const timeline = modal?.querySelector("[data-courier-command-timeline]");
    return {found:!!command,map:!!map,proofs,metrics,boundary:!!boundary,timeline:!!timeline,text:modal?.textContent || ""};
  });
  assert(routeCommand.found && routeCommand.map && routeCommand.proofs >= 4 && routeCommand.metrics >= 4, `courier route command did not render the command layout: ${JSON.stringify(routeCommand)}`);
  assert(routeCommand.boundary && routeCommand.timeline && /Route command|Provider boundary|No live dispatch|Provider-led payout|Masked contact|Support hold/i.test(routeCommand.text), "courier route command missed proof, provider or safety boundaries");

  const courierIncident = await page.evaluate(() => {
    App.courierIncident("or_zuru_canvas_1");
    const modal = document.querySelector("#modal");
    const sheet = modal?.querySelector(".sheet");
    const command = modal?.querySelector("[data-courier-incident-command]");
    return {
      found:!!command,
      boundary:!!modal?.querySelector("[data-courier-incident-boundary]"),
      type:!!modal?.querySelector("[data-courier-incident-type]"),
      metrics:modal?.querySelectorAll("[data-courier-exception-metric]").length || 0,
      bodyOverflow:Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      sheetOverflow:sheet ? Math.max(0, sheet.scrollWidth - sheet.clientWidth) : 0,
      text:modal?.textContent || ""
    };
  });
  assert(courierIncident.found && courierIncident.boundary && courierIncident.type && courierIncident.metrics >= 2, `courier incident desk did not render: ${JSON.stringify(courierIncident)}`);
  assert(courierIncident.bodyOverflow <= 2 && courierIncident.sheetOverflow <= 2, `courier incident desk has horizontal overflow: ${JSON.stringify(courierIncident)}`);
  assert(/Exception desk|No payout release|Masked contact|Support hold|does not unmask contacts|settle courier money/i.test(courierIncident.text), "courier incident desk missed launch-safe boundary copy");

  const courierCash = await page.evaluate(() => {
    App.courierCashDesk("or_zuru_canvas_1");
    const modal = document.querySelector("#modal");
    const sheet = modal?.querySelector(".sheet");
    const command = modal?.querySelector("[data-courier-cash-command]");
    return {
      found:!!command,
      boundary:!!modal?.querySelector("[data-courier-cash-boundary]"),
      fields:modal?.querySelectorAll("[data-courier-cash-field] input").length || 0,
      metrics:modal?.querySelectorAll("[data-courier-exception-metric]").length || 0,
      bodyOverflow:Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      sheetOverflow:sheet ? Math.max(0, sheet.scrollWidth - sheet.clientWidth) : 0,
      text:modal?.textContent || ""
    };
  });
  assert(courierCash.found && courierCash.boundary && courierCash.fields >= 2 && courierCash.metrics >= 4, `courier cash desk did not render: ${JSON.stringify(courierCash)}`);
  assert(courierCash.bodyOverflow <= 2 && courierCash.sheetOverflow <= 2, `courier cash desk has horizontal overflow: ${JSON.stringify(courierCash)}`);
  assert(/Cash exception desk|Provider-led reconciliation|No wallet mutation|No in-app settlement|Cash mismatch case/i.test(courierCash.text), "courier cash desk missed provider-led reconciliation copy");

  await page.evaluate(() => {
    document.querySelector("#cashExpected").value = "1200";
    document.querySelector("#cashCollected").value = "950";
    document.querySelector("#cashNote").value = "QA mismatch evidence, support should reconcile before payout.";
    App.saveCourierCash("or_zuru_canvas_1");
  });
  const cashState = await saved();
  const ledger = (cashState.courierLedger || []).find(row => row.order === "or_zuru_canvas_1");
  const mismatchCase = (cashState.supportIncidents || []).find(row => row.order === "or_zuru_canvas_1" && /cash mismatch/i.test(row.reason || "") && !/closed|resolved/i.test(row.status || ""));
  const mismatchOrder = (cashState.orders || []).find(row => row.id === "or_zuru_canvas_1");
  assert(ledger && ledger.cashStatus === "mismatch" && ledger.status === "cash review" && ledger.nonSettling === true, "courier cash mismatch did not stay non-settling in the ledger");
  assert(mismatchCase && /Provider-led cash reconciliation/i.test(mismatchCase.request || ""), "courier cash mismatch did not create a provider-led support case");
  assert(/cash reconciliation/i.test(mismatchOrder?.payoutHold || ""), "courier cash mismatch did not hold payout release");

  const payoutDesk = await page.evaluate(() => {
    App.courierPayoutDesk();
    const modal = document.querySelector("#modal");
    const sheet = modal?.querySelector(".sheet");
    const command = modal?.querySelector("[data-courier-payout-command]");
    return {
      found:!!command,
      boundary:!!modal?.querySelector("[data-courier-payout-boundary]"),
      steps:modal?.querySelectorAll("[data-courier-payout-step]").length || 0,
      rows:modal?.querySelectorAll("[data-courier-payout-row]").length || 0,
      bodyOverflow:Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      sheetOverflow:sheet ? Math.max(0, sheet.scrollWidth - sheet.clientWidth) : 0,
      text:modal?.textContent || ""
    };
  });
  assert(payoutDesk.found && payoutDesk.boundary && payoutDesk.steps >= 6 && payoutDesk.rows >= 1, `courier payout command did not render provider readiness UI: ${JSON.stringify(payoutDesk)}`);
  assert(payoutDesk.bodyOverflow <= 2 && payoutDesk.sheetOverflow <= 2, `courier payout command has horizontal overflow: ${JSON.stringify(payoutDesk)}`);
  assert(/Courier payout command|Provider payout boundary|No live payout|Provider receipt required|No wallet credit|No settlement|M-Pesa provider review/i.test(payoutDesk.text), "courier payout command missed provider-led no-disbursement boundary copy");

  await page.evaluate(() => App.requestCourierPayout("or_zuru_canvas_1"));
  await page.waitForTimeout(160);
  const payoutState = await saved();
  const payoutLedger = (payoutState.courierLedger || []).find(row => row.order === "or_zuru_canvas_1");
  assert(payoutLedger?.nonSettling === true && payoutLedger.moneyMovementEnabled === false && payoutLedger.payoutReleaseProofRequired === true && payoutLedger.providerVerified === false, "courier payout request did not stay non-settling/provider-unverified");
  assert(/cash review|incident|support|proof pending/i.test(payoutLedger.status || "") && /no_disbursement/i.test(payoutLedger.settlementStatus || ""), "courier payout request overwrote a hold or implied disbursement");

  await page.evaluate(() => App.backendSyncDesk("delivery provider readiness"));
  await page.waitForTimeout(140);
  const backend = await visibleText();
  assert(/Payment and delivery provider readiness/i.test(backend) && /settlement stays disabled/i.test(backend), "backend sync did not keep delivery readiness/provider boundary visible");
  await page.evaluate(() => App.closeModal());
});

await step("QR pickup code waits for customer at counter", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_artist");
    App.saveQrPrompt("p1");
  });
  await page.waitForTimeout(180);
  let state = await saved();
  let prompt = (state.qrPrompts || []).find(row => row.item === "p1" && row.customer === "riley_artist" && row.seller === "riley_biz");
  assert(prompt && prompt.status === "queued" && !prompt.code, "QR prompt did not start queued without code");

  await page.evaluate(id => {
    App.setAccount("riley_biz");
    App.acceptQrPrompt(id);
    App.releaseQrPromptCode(id);
  }, prompt.id);
  await page.waitForTimeout(220);
  state = await saved();
  prompt = (state.qrPrompts || []).find(row => row.id === prompt.id);
  assert(prompt?.status === "reserved" && !prompt.code, "seller released pickup code before customer marked counter arrival");

  await page.evaluate(id => {
    App.setAccount("riley_artist");
    App.customerAtCounter(id);
    App.setAccount("riley_biz");
    App.releaseQrPromptCode(id);
  }, prompt.id);
  await page.waitForTimeout(220);
  state = await saved();
  prompt = (state.qrPrompts || []).find(row => row.id === prompt.id);
  assert(prompt?.status === "released" && /^\d{6}$/.test(prompt.code || ""), "pickup code was not released after counter arrival");
});

await step("media player and live preview", async () => {
  await page.evaluate(() => {
    App.playAlbum("alb1");
    App.expandPlayer();
  });
  await page.waitForTimeout(200);
  assert((await visibleText()).match(/Now playing|Queue|Album|Player/i), "expanded player did not open");
  await page.evaluate(() => App.closeModal());
  await page.evaluate(() => {
    App.go("live");
    const first = document.querySelector("[onclick*='enterLive']");
    first?.click();
  });
  await page.waitForTimeout(250);
  assert((await visibleText()).match(/live|room|watching/i), "live room preview did not open");
});

await step("role boundaries stay specific", async () => {
  await page.evaluate(key => {
    const snap = JSON.parse(localStorage.getItem(key) || "{}");
    snap.following = snap.following || {};
    delete snap.following.zuri;
    localStorage.setItem(key, JSON.stringify(snap));
  }, KEY);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".flow-dock", { state: "visible", timeout: 5000 });
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.follow("zuri");
  });
  await page.waitForTimeout(120);
  const bizState = await saved();
  const bizFollowed = bizState.account === "riley_biz" && bizState.following?.zuri === true;
  assert(bizFollowed, "business account could not follow another account");
  await page.evaluate(() => App.rolePassport());
  await page.waitForTimeout(120);
  let text = await visibleText();
  assert(text.includes("Role guide") && text.includes("Use POS") && text.includes("Follow anyone"), "business role guide did not explain business powers");
  await page.evaluate(() => {
    App.closeModal();
    App.wishlistDesk();
  });
  await page.waitForTimeout(120);
  assert((await visibleText()).match(/not for this account|Switch account|Wishes/i), "business wishlist boundary was unclear");
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_artist");
    App.newPodcastShow();
  });
  await page.waitForTimeout(120);
  assert((await visibleText()).match(/Streamer|podcast/i), "podcast role boundary was unclear");
  await page.evaluate(() => {
    App.closeModal();
    App.setAccount("riley_courier");
    App.rolePassport();
  });
  await page.waitForTimeout(120);
  text = await visibleText();
  assert(text.includes("Courier") && text.includes("route vouches") && text.includes("No business POS"), "courier role guide did not keep route work separate");
  await page.evaluate(() => App.closeModal());
});

await step("Moto World stays owner controlled and archives audit memory", async () => {
  await page.evaluate(() => {
    App.setAccount("riley_biz");
    App.demoAiWorldDesk();
  });
  await page.waitForTimeout(160);
  let text = await visibleText();
  assert(text.includes("not date-limited") && text.includes("archive stays"), "Moto World desk did not explain indefinite owner-controlled retention");
  assert(/Operator signal board/i.test(text) && /AI-labeled QA/i.test(text) && /Change requests/i.test(text) && /Phone issues/i.test(text), "Moto World desk did not surface the operator signal board");
  assert(text.includes("700 generated lives") && text.includes("100 customer lives"), "Moto World desk did not expose generated society counts");
  assert(text.includes("Money report"), "Moto World desk did not expose the synthetic money report");

  await page.evaluate(() => App.runMotoWorldActivity());
  await page.waitForTimeout(180);
  let state = await saved();
  assert(state.demoAiWorld?.enabled !== false, "Moto World activity disabled the world");
  assert((state.demoAiWorld?.activityLog || []).length >= 1, "Moto World activity log was not written");
  assert((state.demoAiWorld?.interactions || []).length >= 1, "Moto World bot-to-bot interaction was not written");
  assert((state.demoAiWorld?.changeRequests || []).length >= 1 || (state.demoAiWorld?.resolvedIssues || []).length >= 1, "Moto World did not write change-request or archived-fix memory");
  assert((state.demoAiWorld?.archive || []).length >= 1, "Moto World archive was not written");
  assert((state.demoAiWorld?.resolvedIssues || []).some(row => row.sourceId === "subscription-reentry-path" || /Open content|subscribed content/i.test(`${row.title || ""} ${row.copy || row.detail || ""}`)), "Moto World did not archive the subscribed-content re-entry fix");
  assert(!(state.demoAiWorld?.issueLog || []).some(row => row.sourceId === "subscription-reentry-path" && /open/i.test(row.status || "")), "Moto World reopened the archived subscribed-content issue");
  assert((state.demoAiWorld?.archive || []).some(row => row.type === "resolved-issue" && (row.sourceId === "subscription-reentry-path" || /Open content|subscribed content/i.test(`${row.title || ""} ${row.copy || row.detail || ""}`))), "Moto World archive did not preserve the subscribed-content fix evidence");
  assert((state.demoAiWorld?.resolvedIssues || []).some(row => row.sourceId === "job-agreement-clarity" || /Job start rule|agreement strip/i.test(`${row.title || ""} ${row.copy || row.detail || ""}`)), "Moto World did not archive the job-agreement clarity fix");
  assert(!(state.demoAiWorld?.issueLog || []).some(row => row.sourceId === "job-agreement-clarity" && /open/i.test(row.status || "")), "Moto World reopened the archived job-agreement issue");
  assert((state.demoAiWorld?.archive || []).some(row => row.type === "resolved-issue" && (row.sourceId === "job-agreement-clarity" || /Job start rule|agreement strip/i.test(`${row.title || ""} ${row.copy || row.detail || ""}`))), "Moto World archive did not preserve the job-agreement fix evidence");
  assert(Object.keys(state.messages || {}).some(key => /^moto_/.test(key) || /^demo_/.test(key)), "Moto World bots did not create message activity");
  await page.evaluate(() => App.motoWorldMoneyDesk());
  await page.waitForTimeout(140);
  text = await visibleText();
  assert(/Moto World money report/i.test(text) && /Real money moved/i.test(text) && /Freelancer escrow share/i.test(text), "Moto World money report did not summarize synthetic transactions and founder escrow share");

  await page.evaluate(() => App.clearDemoAiWorld());
  await page.waitForTimeout(180);
  state = await saved();
  const demoKeys = Object.keys(state.messages || {}).filter(key => /^demo_/.test(key));
  assert(state.demoAiWorld?.enabled === false, "Moto World removal did not hide the world");
  assert((state.demoAiWorld?.archive || []).length >= 1, "Moto World archive was not preserved after removal");
  assert((state.demoAiWorld?.activityLog || []).length >= 1, "Moto World activity memory was not preserved after removal");
  assert((state.demoAiWorld?.interactions || []).length >= 1, "Moto World interaction memory was not preserved after removal");
  assert(!(state.posts || []).some(post => post.demoAi || /^demo_/.test(post.author || "")), "Moto World posts remained after removal");
  assert(!demoKeys.length, `Moto World message keys remained after removal: ${demoKeys.join(", ")}`);

  await page.evaluate(() => App.enableDemoAiWorld());
  await page.waitForTimeout(180);
  state = await saved();
  assert(state.demoAiWorld?.enabled !== false, "Moto World did not re-enable");
  assert((state.posts || []).some(post => post.demoAi), "Moto World posts did not reseed after enable");
  assert((state.demoAiWorld?.archive || []).length >= 1, "Moto World archive was lost after re-enable");
});

let screenshotError = "";
try {
  await page.screenshot({ path: screenshotPath, fullPage: true });
} catch (error) {
  screenshotError = error?.message || String(error);
}

try {
  await browser.close();
} catch {
  // Browser cleanup can race with a page crash/close after the checks finish.
}

const result = {
  checks,
  failures,
  pageErrors,
  consoleErrors,
  screenshot: screenshotPath,
  screenshotError,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length || pageErrors.length || consoleErrors.length) {
  process.exitCode = 1;
}
