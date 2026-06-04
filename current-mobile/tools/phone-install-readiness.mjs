import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const androidHome = process.env.ANDROID_HOME || "C:\\Users\\brown\\AppData\\Local\\Android\\Sdk";
const buildTools = path.join(androidHome, "build-tools", "37.0.0");
const javaHome = process.env.JAVA_HOME || "C:\\Program Files\\Android\\Android Studio\\jbr";
const adb = process.env.ADB || path.join(androidHome, "platform-tools", "adb.exe");
const aapt2 = process.env.AAPT2 || path.join(buildTools, "aapt2.exe");
const apksigner = process.env.APKSIGNER || path.join(buildTools, "apksigner.bat");
const packageName = process.env.ARTBOOK_PACKAGE || "com.steward.artbook";
const apkPath = path.resolve(process.env.ARTBOOK_APK || process.env.ARTBOOK_APK_OUT || process.argv[2] || path.join(root, "artbook-phone-install-local-debug.apk"));
const envKeystorePath = (process.env.ARTBOOK_KEYSTORE_PATH || "").trim();

function run(command, args, options = {}) {
  if (!fs.existsSync(command) && !options.allowMissing) {
    return { status: 127, stdout: "", stderr: `${command} not found` };
  }
  const isBatch = command.toLowerCase().endsWith(".bat");
  const result = spawnSync(isBatch ? "cmd.exe" : command, isBatch ? ["/c", command, ...args] : args, {
    cwd: options.cwd || root,
    stdio: "pipe",
    encoding: "utf8",
    env: {
      ...process.env,
      JAVA_HOME: javaHome,
      PATH: `${path.join(javaHome, "bin")};${process.env.PATH || ""}`
    }
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || ""
  };
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

function firstMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

function listDevices() {
  const result = run(adb, ["devices"], { allowMissing: true });
  const devices = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\tdevice$/.test(line))
    .map((line) => line.split(/\s+/)[0]);
  return { devices, error: result.status === 0 ? "" : result.stderr.trim() };
}

function inspectInstalled(serial) {
  if (!serial) return { connected: false, installed: false };
  const result = run(adb, ["-s", serial, "shell", "dumpsys", "package", packageName], { allowMissing: true });
  const output = `${result.stdout}\n${result.stderr}`;
  const installed = result.status === 0 && output.includes(`Package [${packageName}]`);
  return {
    connected: true,
    installed,
    versionName: firstMatch(output, /versionName=([^\r\n]+)/),
    versionCode: firstMatch(output, /versionCode=([0-9]+)/),
    firstInstallTime: firstMatch(output, /firstInstallTime=([^\r\n]+)/),
    lastUpdateTime: firstMatch(output, /lastUpdateTime=([^\r\n]+)/),
    installedSignatureShort: firstMatch(output, /signatures:\[([^\]]+)/),
    rawError: installed ? "" : output.trim().slice(0, 500)
  };
}

function inspectApkFile(filePath) {
  const exists = fs.existsSync(filePath);
  if (!exists) return { path: filePath, exists: false };
  const badging = run(aapt2, ["dump", "badging", filePath], { allowMissing: true });
  const verify = run(apksigner, ["verify", "--verbose", "--print-certs", filePath], { allowMissing: true });
  const signerText = `${verify.stdout}\n${verify.stderr}`;
  const packageLine = firstMatch(badging.stdout, /(package: [^\r\n]+)/);
  return {
    path: filePath,
    exists,
    bytes: fs.statSync(filePath).size,
    sha256: sha256(filePath),
    packageName: firstMatch(packageLine, /name='([^']+)'/),
    versionCode: firstMatch(packageLine, /versionCode='([^']+)'/),
    versionName: firstMatch(packageLine, /versionName='([^']+)'/),
    verified: verify.status === 0,
    schemes: {
      v1: firstMatch(signerText, /Verified using v1 scheme \(JAR signing\):\s*(true|false)/i),
      v2: firstMatch(signerText, /Verified using v2 scheme \(APK Signature Scheme v2\):\s*(true|false)/i),
      v3: firstMatch(signerText, /Verified using v3 scheme \(APK Signature Scheme v3\):\s*(true|false)/i)
    },
    cert: {
      sha256: firstMatch(signerText, /(?:Signer #1|V[0-9.]+ Signer): certificate SHA-256 digest:\s*([A-Fa-f0-9:]+)/),
      sha1: firstMatch(signerText, /(?:Signer #1|V[0-9.]+ Signer): certificate SHA-1 digest:\s*([A-Fa-f0-9:]+)/),
      dn: firstMatch(signerText, /(?:Signer #1|V[0-9.]+ Signer): certificate DN:\s*([^\r\n]+)/)
    },
    toolErrors: {
      aapt2: badging.status === 0 ? "" : badging.stderr.trim(),
      apksigner: verify.status === 0 ? "" : verify.stderr.trim()
    }
  };
}

function inspectApk() {
  return inspectApkFile(apkPath);
}

function inspectInstalledApk(serial, installed) {
  if (!serial || !installed?.installed) return { available: false, reason: "package_not_installed" };
  const pathResult = run(adb, ["-s", serial, "shell", "pm", "path", packageName], { allowMissing: true });
  const remotePath = pathResult.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("package:"))
    ?.replace(/^package:/, "")
    .trim();
  if (!remotePath) {
    return { available: false, reason: "installed_apk_path_not_found", error: `${pathResult.stdout}\n${pathResult.stderr}`.trim() };
  }
  const pullDir = path.join(root, "build", "install-readiness");
  fs.mkdirSync(pullDir, { recursive: true });
  const localPath = path.join(pullDir, `${packageName}-installed.apk`);
  const pull = run(adb, ["-s", serial, "pull", remotePath, localPath], { allowMissing: true });
  if (pull.status !== 0 || !fs.existsSync(localPath)) {
    return { available: false, reason: "installed_apk_pull_failed", remotePath, error: `${pull.stdout}\n${pull.stderr}`.trim() };
  }
  return {
    available: true,
    remotePath,
    ...inspectApkFile(localPath)
  };
}

function sameCert(left, right) {
  const a = String(left?.cert?.sha256 || "").replace(/:/g, "").toLowerCase();
  const b = String(right?.cert?.sha256 || "").replace(/:/g, "").toLowerCase();
  return !!a && !!b && a === b;
}

function readiness(device, apk, keystore, installedApk) {
  const reasons = [];
  const nextSteps = [];
  let status = "ready";
  let canInstallInPlace = null;

  if (!apk.exists) {
    status = "blocked_missing_apk";
    canInstallInPlace = false;
    reasons.push("The target APK does not exist.");
    nextSteps.push("Run tools/build-native-artbook-apk.mjs first.");
  } else if (!device.connected) {
    status = "no_device_connected";
    reasons.push("No ADB device is connected.");
    nextSteps.push("Connect the phone over USB and enable file transfer/debugging.");
  } else if (!device.installed) {
    status = "fresh_install_possible";
    canInstallInPlace = true;
    reasons.push("The package is not currently installed on the connected phone.");
    nextSteps.push("A normal adb install can be used if this is the intended phone state.");
  } else if (sameCert(installedApk, apk)) {
    status = "ready_in_place_signature_matches";
    canInstallInPlace = true;
    reasons.push("The installed APK certificate matches the target APK certificate.");
    nextSteps.push("adb install -r can update this phone as long as future builds use the same keystore.");
  } else if (installedApk?.available && apk.cert?.sha256 && installedApk.cert?.sha256) {
    status = "blocked_signature_mismatch";
    canInstallInPlace = false;
    reasons.push("The installed APK certificate does not match the target APK certificate.");
    nextSteps.push("Rebuild with the matching keystore, or uninstall/reset the phone app before installing this APK.");
  } else if (!keystore.envPathSet) {
    status = "blocked_needs_matching_keystore_or_app_reset";
    canInstallInPlace = false;
    reasons.push("The phone already has com.steward.artbook installed, and this build uses this laptop's default debug keystore.");
    reasons.push("Android update installs require the same package signing certificate as the installed app.");
    nextSteps.push("Recover the old computer's C:\\Users\\brown\\.android\\debug.keystore and rebuild with ARTBOOK_KEYSTORE_PATH.");
    nextSteps.push("Only use uninstall/reset if preserving the current phone app data is no longer needed.");
  } else if (!keystore.exists) {
    status = "blocked_keystore_path_missing";
    canInstallInPlace = false;
    reasons.push("ARTBOOK_KEYSTORE_PATH is set, but the file cannot be read.");
    nextSteps.push("Check the keystore path and rebuild.");
  } else {
    status = "ready_to_try_external_keystore";
    canInstallInPlace = null;
    reasons.push("An explicit keystore is configured. If it is the old phone-compatible keystore, an in-place update should be possible.");
    nextSteps.push("Rebuild with ARTBOOK_KEYSTORE_PATH, then run adb install -r only after confirming this is the intended keystore.");
  }

  return { status, canInstallInPlace, reasons, nextSteps };
}

const devices = listDevices();
const serial = process.env.ADB_SERIAL || process.env.ANDROID_SERIAL || devices.devices[0] || "";
const device = inspectInstalled(serial);
const apk = inspectApk();
const installedApk = inspectInstalledApk(serial, device);
const keystore = {
  envPathSet: !!envKeystorePath,
  path: envKeystorePath ? path.resolve(envKeystorePath) : "",
  exists: envKeystorePath ? fs.existsSync(path.resolve(envKeystorePath)) : false,
  alias: (process.env.ARTBOOK_KEYSTORE_ALIAS || "androiddebugkey").trim() || "androiddebugkey",
  passwordSource: process.env.ARTBOOK_KEYSTORE_PASS ? "ARTBOOK_KEYSTORE_PASS" : "default-android-debug-password"
};

const report = {
  packageName,
  adb: {
    path: adb,
    devices: devices.devices,
    selectedSerial: serial || null,
    error: devices.error
  },
  device,
  apk,
  installedApk,
  keystore,
  readiness: readiness(device, apk, keystore, installedApk)
};

console.log(JSON.stringify(report, null, 2));

if (report.readiness.status.startsWith("blocked_")) {
  process.exitCode = 2;
}
