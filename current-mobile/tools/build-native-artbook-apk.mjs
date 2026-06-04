import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "build", "native-artbook");
const srcDir = path.join(outDir, "src");
const resDir = path.join(outDir, "res");
const assetsDir = path.join(outDir, "assets");
const assetPayloadDir = path.join(outDir, "asset-payload");
const classesDir = path.join(outDir, "classes");
const classesJar = path.join(outDir, "classes.jar");
const dexDir = path.join(outDir, "dex");
const distUnsigned = path.join(outDir, "artbook-native-unsigned.apk");
const distDexed = path.join(outDir, "artbook-native-dexed.apk");
const distAligned = path.join(outDir, "artbook-native-aligned.apk");
const finalApk = path.resolve(process.env.ARTBOOK_APK_OUT || path.join(root, "artbook-phone-install.apk"));
const desktopApk = process.env.ARTBOOK_DESKTOP_APK_OUT === "0"
  ? ""
  : path.resolve(process.env.ARTBOOK_DESKTOP_APK_OUT || "C:\\Users\\brown\\OneDrive\\Desktop\\artbook-phone-install.apk");
const appVersionCode = 181;
const appVersionName = "1.181";

const androidHome = "C:\\Users\\brown\\AppData\\Local\\Android\\Sdk";
const buildTools = path.join(androidHome, "build-tools", "37.0.0");
const androidJar = path.join(androidHome, "platforms", "android-35", "android.jar");
const javaHome = process.env.JAVA_HOME || "C:\\Program Files\\Android\\Android Studio\\jbr";
const javac = path.join(javaHome, "bin", "javac.exe");
const jar = path.join(javaHome, "bin", "jar.exe");
const aapt2 = path.join(buildTools, "aapt2.exe");
const d8 = path.join(buildTools, "d8.bat");
const zipalign = path.join(buildTools, "zipalign.exe");
const apksigner = path.join(buildTools, "apksigner.bat");
const defaultKeystore = "C:\\Users\\brown\\.android\\debug.keystore";
const defaultKeyAlias = "androiddebugkey";

function readSigningConfig() {
  const explicitKeystore = (process.env.ARTBOOK_KEYSTORE_PATH || "").trim();
  const keystorePath = path.resolve(explicitKeystore || defaultKeystore);
  if (!fs.existsSync(keystorePath)) {
    const envHint = explicitKeystore
      ? "Check ARTBOOK_KEYSTORE_PATH or copy the old computer's C:\\Users\\brown\\.android\\debug.keystore here."
      : "Create an Android debug keystore or set ARTBOOK_KEYSTORE_PATH to the old phone-compatible keystore.";
    throw new Error(`Signing keystore not found: ${keystorePath}\n${envHint}`);
  }
  const storePass = process.env.ARTBOOK_KEYSTORE_PASS ?? "android";
  const keyPass = process.env.ARTBOOK_KEY_PASS ?? storePass;
  return {
    source: explicitKeystore ? "ARTBOOK_KEYSTORE_PATH" : "default-debug-keystore",
    keystorePath,
    keyAlias: (process.env.ARTBOOK_KEYSTORE_ALIAS || defaultKeyAlias).trim() || defaultKeyAlias,
    storePass,
    keyPass
  };
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return fs.statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

function toJarPath(value) {
  return value.split(path.sep).join("/");
}

function addAndroidAssetPayload(apkPath) {
  for (const file of listFiles(assetPayloadDir)) {
    const rel = toJarPath(path.relative(assetPayloadDir, file));
    run(jar, ["uf", apkPath, "-C", assetPayloadDir, rel], { print: false });
  }
}

function run(command, args, options = {}) {
  const isBatch = command.toLowerCase().endsWith(".bat");
  const result = spawnSync(isBatch ? "cmd.exe" : command, isBatch ? ["/c", command, ...args] : args, {
    cwd: options.cwd || root,
    stdio: "pipe",
    encoding: "utf8",
    env: {
      ...process.env,
      JAVA_HOME: javaHome,
      PATH: `${path.join(javaHome, "bin")};${process.env.PATH || ""}`
    },
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`${path.basename(command)} failed`);
  }
  if (options.print !== false && result.stdout.trim()) console.log(result.stdout.trim());
  if (options.print !== false && result.stderr.trim()) console.error(result.stderr.trim());
  return result;
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(srcDir, "com", "steward", "artbook"), { recursive: true });
fs.mkdirSync(path.join(resDir, "values"), { recursive: true });
fs.mkdirSync(path.join(resDir, "drawable"), { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(assetPayloadDir, { recursive: true });
fs.mkdirSync(classesDir, { recursive: true });
fs.mkdirSync(dexDir, { recursive: true });

fs.copyFileSync(path.join(root, "src", "artbook-mobile.html"), path.join(assetsDir, "index.html"));
const projectAssetsDir = path.join(root, "src", "assets");
if (fs.existsSync(projectAssetsDir)) copyRecursive(projectAssetsDir, path.join(assetPayloadDir, "assets", "assets"));

fs.writeFileSync(path.join(outDir, "AndroidManifest.xml"), `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.steward.artbook" android:versionCode="${appVersionCode}" android:versionName="${appVersionName}">
  <uses-sdk android:minSdkVersion="23" android:targetSdkVersion="35" />
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-feature android:name="android.hardware.location" android:required="false" />
  <uses-feature android:name="android.hardware.location.gps" android:required="false" />
  <uses-feature android:name="android.hardware.location.network" android:required="false" />
  <uses-feature android:name="android.hardware.microphone" android:required="false" />
  <uses-feature android:name="android.hardware.camera" android:required="false" />
  <application
      android:theme="@style/AppTheme"
      android:label="Artbook"
      android:icon="@drawable/ic_launcher"
      android:allowBackup="false"
      android:supportsRtl="true"
      android:usesCleartextTraffic="true">
    <activity
        android:name=".MainActivity"
        android:exported="true"
        android:screenOrientation="fullUser"
        android:configChanges="keyboard|keyboardHidden|orientation|screenSize|smallestScreenSize|screenLayout"
        android:windowSoftInputMode="adjustResize">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>
`);

fs.writeFileSync(path.join(resDir, "values", "styles.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <style name="AppTheme" parent="@android:style/Theme.Material.NoActionBar">
    <item name="android:windowNoTitle">true</item>
    <item name="android:windowActionBar">false</item>
    <item name="android:windowLightStatusBar">false</item>
    <item name="android:statusBarColor">#0e0a14</item>
    <item name="android:navigationBarColor">#0e0a14</item>
    <item name="android:fontFamily">sans</item>
  </style>
</resources>
`);

fs.writeFileSync(path.join(resDir, "drawable", "ic_launcher.xml"), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
  android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#0e0a14" android:pathData="M0,0h108v108h-108z" />
  <path android:fillColor="#f472b6" android:pathData="M18,80L45,22h18l27,58h-17l-5,-12h-28l-5,12z" />
  <path android:fillColor="#38bdf8" android:pathData="M46,54h16l-8,-19z" />
  <path android:fillColor="#a78bfa" android:pathData="M32,87h44a8,8 0,0 0,8 -8v-2h-60v2a8,8 0,0 0,8 8z" />
</vector>
`);

fs.writeFileSync(path.join(srcDir, "com", "steward", "artbook", "MainActivity.java"), `package com.steward.artbook;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.util.Locale;

public class MainActivity extends Activity {
  private static final int REQ_LOCATION = 901;
  private static final int REQ_AUDIO = 902;
  private WebView webView;
  private String pendingGeoOrigin;
  private GeolocationPermissions.Callback pendingGeoCallback;
  private PermissionRequest pendingAudioRequest;
  private TextToSpeech textToSpeech;
  private boolean textToSpeechReady = false;
  private String pendingSpeechText = "";
  private String pendingSpeechLang = "en-KE";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    requestWindowFeature(Window.FEATURE_NO_TITLE);
    Window window = getWindow();
    window.setStatusBarColor(Color.rgb(14, 10, 20));
    window.setNavigationBarColor(Color.rgb(14, 10, 20));
    window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    if (Build.VERSION.SDK_INT >= 30) {
      window.setDecorFitsSystemWindows(true);
    }

    WebView.setWebContentsDebuggingEnabled(true);
    setupTextToSpeech();
    webView = new WebView(this);
    webView.setLayoutParams(new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT));
    webView.setBackgroundColor(Color.rgb(14, 10, 20));
    setupWebView();

    FrameLayout root = new FrameLayout(this);
    root.addView(webView);
    setContentView(root);
    webView.loadUrl("file:///android_asset/index.html");
  }

  private void setupTextToSpeech() {
    textToSpeech = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
      @Override public void onInit(int status) {
        textToSpeechReady = status == TextToSpeech.SUCCESS;
        if (textToSpeechReady) {
          applySpeechLanguage(pendingSpeechLang);
          if (pendingSpeechText != null && pendingSpeechText.trim().length() > 0) {
            speakNow(pendingSpeechText, pendingSpeechLang);
            pendingSpeechText = "";
          }
        }
      }
    });
  }

  private void setupWebView() {
    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setGeolocationEnabled(true);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setAllowFileAccess(true);
    settings.setAllowContentAccess(true);
    settings.setUseWideViewPort(true);
    settings.setLoadWithOverviewMode(true);
    settings.setSupportZoom(false);
    settings.setCacheMode(WebSettings.LOAD_DEFAULT);

    webView.addJavascriptInterface(new WebAppInterface(), "Android");
    webView.setWebViewClient(new WebViewClient());
    webView.setWebChromeClient(new WebChromeClient() {
      @Override
      public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
        pendingGeoOrigin = origin;
        pendingGeoCallback = callback;
        if (hasLocationPermission()) {
          callback.invoke(origin, true, false);
        } else if (Build.VERSION.SDK_INT >= 23) {
          requestPermissions(new String[] {
              Manifest.permission.ACCESS_FINE_LOCATION,
              Manifest.permission.ACCESS_COARSE_LOCATION
          }, REQ_LOCATION);
        } else {
          callback.invoke(origin, true, false);
        }
      }

      @Override
      public void onPermissionRequest(final PermissionRequest request) {
        runOnUiThread(new Runnable() {
          @Override public void run() {
            boolean wantsAudio = false;
            boolean wantsOther = false;
            for (String resource : request.getResources()) {
              if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) wantsAudio = true;
              else wantsOther = true;
            }
            if (!wantsAudio || wantsOther) {
              request.deny();
              return;
            }
            if (hasAudioPermission()) {
              request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
            } else if (Build.VERSION.SDK_INT >= 23) {
              pendingAudioRequest = request;
              requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, REQ_AUDIO);
            } else {
              request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
            }
          }
        });
      }
    });
  }

  private boolean hasLocationPermission() {
    if (Build.VERSION.SDK_INT < 23) return true;
    return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
  }

  private boolean hasAudioPermission() {
    if (Build.VERSION.SDK_INT < 23) return true;
    return checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
  }

  private Locale speechLocale(String lang) {
    String safe = lang == null ? "en-KE" : lang;
    if (safe.toLowerCase().startsWith("sw")) return new Locale("sw", "KE");
    if (safe.toLowerCase().startsWith("es")) return new Locale("es", "ES");
    if (safe.toLowerCase().startsWith("ha")) return new Locale("ha", "NG");
    if (safe.toLowerCase().startsWith("en-ke")) return new Locale("en", "KE");
    return Locale.ENGLISH;
  }

  private void applySpeechLanguage(String lang) {
    if (textToSpeech == null || !textToSpeechReady) return;
    try {
      int result = textToSpeech.setLanguage(speechLocale(lang));
      if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
        textToSpeech.setLanguage(Locale.ENGLISH);
      }
      textToSpeech.setSpeechRate(0.94f);
      textToSpeech.setPitch(1.02f);
    } catch (Exception ignored) {}
  }

  private void speakNow(String text, String lang) {
    if (textToSpeech == null) return;
    String clean = text == null ? "" : text.trim();
    if (clean.length() == 0) return;
    if (clean.length() > 700) clean = clean.substring(0, 700);
    if (!textToSpeechReady) {
      pendingSpeechText = clean;
      pendingSpeechLang = lang == null ? "en-KE" : lang;
      return;
    }
    applySpeechLanguage(lang);
    textToSpeech.speak(clean, TextToSpeech.QUEUE_FLUSH, null, "artbook-live-ai");
  }

  @Override
  public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode == REQ_AUDIO && pendingAudioRequest != null) {
      if (hasAudioPermission()) {
        pendingAudioRequest.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
      } else {
        pendingAudioRequest.deny();
      }
      pendingAudioRequest = null;
      return;
    }
    if (requestCode == REQ_LOCATION && pendingGeoCallback != null) {
      boolean granted = hasLocationPermission();
      pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
      pendingGeoOrigin = null;
      pendingGeoCallback = null;
    }
  }

  @Override
  public void onBackPressed() {
    if (webView != null) {
      webView.evaluateJavascript("(function(){ if(window.App){ App.back(); return true; } return false; })();", null);
    } else {
      super.onBackPressed();
    }
  }

  @Override
  protected void onDestroy() {
    if (textToSpeech != null) {
      try {
        textToSpeech.stop();
        textToSpeech.shutdown();
      } catch (Exception ignored) {}
      textToSpeech = null;
    }
    super.onDestroy();
  }

  public class WebAppInterface {
    @JavascriptInterface
    public void setSystemBars(final String color, final boolean lightIcons) {
      runOnUiThread(new Runnable() {
        @Override public void run() {
          int parsed;
          try {
            parsed = Color.parseColor(color);
          } catch (Exception ex) {
            parsed = Color.rgb(14, 10, 20);
          }
          Window window = getWindow();
          window.setStatusBarColor(parsed);
          window.setNavigationBarColor(parsed);
          if (Build.VERSION.SDK_INT >= 23) {
            View decor = window.getDecorView();
            int flags = decor.getSystemUiVisibility();
            if (lightIcons) {
              flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
              if (Build.VERSION.SDK_INT >= 26) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            } else {
              flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
              if (Build.VERSION.SDK_INT >= 26) flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            decor.setSystemUiVisibility(flags);
          }
        }
      });
    }

    @JavascriptInterface
    public void printHtml(final String title, final String html) {
      runOnUiThread(new Runnable() {
        @Override public void run() {
          final WebView printWebView = new WebView(MainActivity.this);
          printWebView.getSettings().setJavaScriptEnabled(false);
          printWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
              try {
                String safeTitle = title == null || title.trim().length() == 0 ? "Artbook receipt" : title;
                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(safeTitle);
                PrintAttributes attrs = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();
                printManager.print(safeTitle, adapter, attrs);
              } catch (Exception ex) {
                Toast.makeText(MainActivity.this, "Could not open PDF print screen", Toast.LENGTH_SHORT).show();
              }
            }
          });
          printWebView.loadDataWithBaseURL("file:///android_asset/", html == null ? "" : html, "text/html", "UTF-8", null);
        }
      });
    }

    @JavascriptInterface
    public void showNativeToast(final String message) {
      runOnUiThread(new Runnable() {
        @Override public void run() {
          Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
        }
      });
    }

    @JavascriptInterface
    public boolean canSpeak() {
      return textToSpeech != null;
    }

    @JavascriptInterface
    public void speak(final String text, final String lang) {
      runOnUiThread(new Runnable() {
        @Override public void run() {
          speakNow(text, lang);
        }
      });
    }

    @JavascriptInterface
    public void stopSpeaking() {
      runOnUiThread(new Runnable() {
        @Override public void run() {
          if (textToSpeech != null) textToSpeech.stop();
        }
      });
    }

    @JavascriptInterface
    public void setSecureMode(final boolean enabled, final String reason) {
      runOnUiThread(new Runnable() {
        @Override public void run() {
          Window window = getWindow();
          if (enabled) {
            window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
          } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
          }
        }
      });
    }

    @JavascriptInterface
    public void logAction(String action) {
      // Placeholder bridge for future backend/native analytics.
    }
  }
}
`);

run(aapt2, ["compile", "--dir", resDir, "-o", path.join(outDir, "compiled.zip")]);
run(aapt2, [
  "link",
  "-o", distUnsigned,
  "-I", androidJar,
  "--manifest", path.join(outDir, "AndroidManifest.xml"),
  "-A", assetsDir,
  "--java", path.join(outDir, "gen"),
  "--min-sdk-version", "23",
  "--target-sdk-version", "35",
  "--version-code", String(appVersionCode),
  "--version-name", appVersionName,
  path.join(outDir, "compiled.zip")
]);

run(javac, [
  "-source", "8",
  "-target", "8",
  "-bootclasspath", androidJar,
  "-d", classesDir,
  path.join(srcDir, "com", "steward", "artbook", "MainActivity.java")
]);
run(jar, ["cf", classesJar, "-C", classesDir, "."]);
run(d8, ["--min-api", "23", "--lib", androidJar, "--output", dexDir, classesJar], { cwd: root });
fs.copyFileSync(distUnsigned, distDexed);
addAndroidAssetPayload(distDexed);
run(jar, ["uf", distDexed, "-C", dexDir, "classes.dex"]);
run(zipalign, ["-p", "-f", "4", distDexed, distAligned]);
fs.mkdirSync(path.dirname(finalApk), { recursive: true });
const signing = readSigningConfig();
run(apksigner, [
  "sign",
  "--ks", signing.keystorePath,
  "--ks-key-alias", signing.keyAlias,
  "--ks-pass", `pass:${signing.storePass}`,
  "--key-pass", `pass:${signing.keyPass}`,
  "--out", finalApk,
  distAligned
]);
run(apksigner, ["verify", "--verbose", finalApk]);
if (desktopApk) {
  fs.mkdirSync(path.dirname(desktopApk), { recursive: true });
  fs.copyFileSync(finalApk, desktopApk);
}

console.log(JSON.stringify({
  finalApk,
  desktopApk: desktopApk || null,
  bytes: fs.statSync(finalApk).size,
  signing: {
    source: signing.source,
    keystorePath: signing.keystorePath,
    keyAlias: signing.keyAlias
  },
  permissions: ["INTERNET", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "RECORD_AUDIO", "CAMERA"]
}, null, 2));
