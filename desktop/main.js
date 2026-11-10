const { app, BrowserWindow, Menu, Tray, shell, dialog, nativeImage, nativeTheme, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
let autoUpdater = null;
try { autoUpdater = require("electron-updater").autoUpdater; } catch { /* updater not bundled */ }

const APP_ID = "com.weekflow.app";

// Draw with the CPU by default. GPU drawing is not needed for a task list, and some
// Windows graphics drivers lock up the whole screen when Chromium uses them.
// Start with --gpu (or set WEEKFLOW_GPU=1) to turn GPU drawing back on.
if (!process.argv.includes("--gpu") && process.env.WEEKFLOW_GPU !== "1") app.disableHardwareAcceleration();

// A short startup log in %APPDATA%\WeekFlow\startup.log, to diagnose any slow or stuck launch.
const t0 = Date.now();
function log(msg) { try { fs.appendFileSync(path.join(app.getPath("userData"), "startup.log"), new Date().toISOString() + " +" + (Date.now() - t0) + "ms " + msg + "\n"); } catch { /* not critical */ } }
const ICON = path.join(__dirname, "app", "icon.png");
const boundsFile = () => path.join(app.getPath("userData"), "window.json");
let win = null;
let tray = null;
let closeToTray = false;
let quitting = false;

function loadBounds() { try { return JSON.parse(fs.readFileSync(boundsFile(), "utf8")); } catch { return null; } }
function saveBounds() {
  if (!win || win.isDestroyed()) return;
  try { fs.writeFileSync(boundsFile(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() })); } catch { /* not critical */ }
}
const send = (cmd) => { if (win && !win.isDestroyed()) { showWindow(); win.webContents.send("wf:command", cmd); } };
function showWindow() { if (!win) return createWindow(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); }

function createWindow() {
  const b = loadBounds();
  nativeTheme.themeSource = "dark";
  win = new BrowserWindow({
    width: b?.width || 1440,
    height: b?.height || 920,
    x: b?.x, y: b?.y,
    minWidth: 760,
    minHeight: 560,
    title: "WeekFlow",
    icon: nativeImage.createFromPath(ICON),
    backgroundColor: "#0b0915",
    show: false,
    autoHideMenuBar: true,
    webPreferences: { additionalArguments: ["--wf-version=" + app.getVersion()], preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true }
  });
  if (b?.maximized) win.maximize();
  let shown = false;
  const reveal = (why) => { if (shown || !win) return; shown = true; log("window shown (" + why + ")"); win.show(); };
  win.once("ready-to-show", () => reveal("ready"));
  win.webContents.once("did-finish-load", () => { log("page loaded"); reveal("loaded"); });
  setTimeout(() => reveal("timeout"), 3000);
  win.webContents.on("render-process-gone", (_e, d) => log("renderer gone: " + d.reason));
  win.webContents.on("unresponsive", () => log("renderer unresponsive"));
  win.on("close", (e) => {
    saveBounds();
    if (closeToTray && !quitting) { e.preventDefault(); win.hide(); ensureTray(); }
  });
  win.on("closed", () => { win = null; });

  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("file://")) { e.preventDefault(); if (/^https?:\/\//.test(url)) shell.openExternal(url); } });
  win.webContents.session.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === "notifications"));
  win.webContents.session.on("will-download", (_e, item) => {
    item.setSaveDialogOptions({
      title: "Export WeekFlow backup",
      defaultPath: path.join(app.getPath("documents"), item.getFilename()),
      filters: [{ name: "WeekFlow backup", extensions: ["json"] }]
    });
  });
  win.loadFile(path.join(__dirname, "app", "index.html"));
}

// ---------- updates ----------
// Checks the WeekFlow release page for a newer version. Nothing downloads until the
// person clicks Download; nothing installs until they click Restart (or quit the app).
let upd = { state: "idle", version: null, percent: 0, error: null, checkedAt: null, notes: null };
function pushUpd(patch) { upd = { ...upd, ...patch }; if (win && !win.isDestroyed()) win.webContents.send("wf:update", upd); refreshTrayMenu(); }
function updaterReady() { return autoUpdater && app.isPackaged; }
// The update server is written into the build (app-update.yml). Until one is set up, say so plainly.
function updateServerSet() { try { return fs.existsSync(path.join(process.resourcesPath, "app-update.yml")); } catch { return false; } }
function setupUpdater() {
  if (!updaterReady()) return;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = { info: (m) => log("update: " + m), warn: (m) => log("update warn: " + m), error: (m) => log("update error: " + m), debug: () => {} };
  autoUpdater.on("checking-for-update", () => pushUpd({ state: "checking", error: null }));
  autoUpdater.on("update-available", (i) => pushUpd({ state: "available", version: i.version, notes: typeof i.releaseNotes === "string" ? i.releaseNotes.replace(/<[^>]+>/g, "").slice(0, 600) : null, checkedAt: new Date().toISOString() }));
  autoUpdater.on("update-not-available", () => pushUpd({ state: "current", checkedAt: new Date().toISOString() }));
  autoUpdater.on("download-progress", (p) => pushUpd({ state: "downloading", percent: Math.round(p.percent || 0) }));
  autoUpdater.on("update-downloaded", (i) => pushUpd({ state: "ready", version: i.version, percent: 100 }));
  autoUpdater.on("error", (e) => pushUpd({ state: "error", error: friendlyUpdateError(e) }));
}
function friendlyUpdateError(e) {
  const msg = String((e && e.message) || e || "");
  if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|net::ERR|getaddrinfo/i.test(msg)) return "Couldn't reach the update server. Check your internet connection and try again.";
  if (/404|No published versions|Cannot find latest/i.test(msg)) return "No published release found yet.";
  return "The update check didn't finish. Try again in a few minutes.";
}
function checkForUpdates(manual) {
  if (!updaterReady()) { pushUpd({ state: "error", error: "Updates work in the installed app only." }); return; }
  if (!updateServerSet()) { pushUpd({ state: "unconfigured", checkedAt: new Date().toISOString() }); return; }
  if (upd.state === "downloading" || upd.state === "ready") { pushUpd({}); return; }
  autoUpdater.checkForUpdates().catch((e) => pushUpd({ state: "error", error: friendlyUpdateError(e) }));
  if (manual) showWindow();
}
ipcMain.on("wf:update:check", () => checkForUpdates(true));
ipcMain.on("wf:update:download", () => { if (updaterReady() && upd.state === "available") { pushUpd({ state: "downloading", percent: 0 }); autoUpdater.downloadUpdate().catch((e) => pushUpd({ state: "error", error: friendlyUpdateError(e) })); } });
ipcMain.on("wf:update:install", () => { if (updaterReady() && upd.state === "ready") { quitting = true; setImmediate(() => autoUpdater.quitAndInstall(false, true)); } });
ipcMain.on("wf:update:get", () => { pushUpd({}); });
ipcMain.on("wf:update:auto", (_e, on) => { autoCheck = !!on; });
let autoCheck = true;

function refreshTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open WeekFlow", click: showWindow },
    { label: "New Task", click: () => send("new") },
    { type: "separator" },
    upd.state === "ready" ? { label: "Restart to Update to " + upd.version, click: () => { quitting = true; autoUpdater.quitAndInstall(false, true); } } : { label: "Check for Updates", click: () => { send("view:settings"); checkForUpdates(true); } },
    { type: "separator" },
    { label: "Quit WeekFlow", click: () => { quitting = true; app.quit(); } }
  ]));
}

function ensureTray() {
  if (tray) return;
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip("WeekFlow");
  refreshTrayMenu();
  tray.on("click", showWindow);
}

function about() {
  dialog.showMessageBox(win, {
    type: "info", icon: nativeImage.createFromPath(ICON), title: "About WeekFlow",
    message: "WeekFlow " + app.getVersion(),
    detail: "Plan your week one day at a time.\nYour tasks are saved on this computer. Use File > Export Backup to keep a copy.\n\nhttps://github.com/jkowalski1216/weekflow-release",
    buttons: ["OK"]
  });
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "&File", submenu: [
      { label: "New Task", accelerator: "CmdOrCtrl+N", click: () => send("new") },
      { type: "separator" },
      { label: "Export Backup…", accelerator: "CmdOrCtrl+E", click: () => send("export") },
      { label: "Import Backup…", accelerator: "CmdOrCtrl+I", click: () => send("import") },
      { type: "separator" },
      { label: "Exit", accelerator: "Alt+F4", click: () => { quitting = true; app.quit(); } }
    ] },
    { label: "&Go", submenu: [
      { label: "Dashboard", accelerator: "CmdOrCtrl+1", click: () => send("view:dashboard") },
      { label: "My Week", accelerator: "CmdOrCtrl+2", click: () => send("view:week") },
      { label: "All Tasks", accelerator: "CmdOrCtrl+3", click: () => send("view:tasks") },
      { label: "Inbox", accelerator: "CmdOrCtrl+4", click: () => send("view:inbox") },
      { label: "Statistics", accelerator: "CmdOrCtrl+5", click: () => send("view:stats") },
      { label: "Settings", accelerator: "CmdOrCtrl+,", click: () => send("view:settings") },
      { type: "separator" },
      { label: "Previous Week", accelerator: "CmdOrCtrl+Left", click: () => send("prevWeek") },
      { label: "Next Week", accelerator: "CmdOrCtrl+Right", click: () => send("nextWeek") },
      { label: "This Week", accelerator: "CmdOrCtrl+T", click: () => send("thisWeek") }
    ] },
    { label: "&View", submenu: [{ role: "reload" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }] },
    { label: "&Help", submenu: [{ label: "Check for Updates…", click: () => { send("view:settings"); checkForUpdates(true); } }, { type: "separator" }, { label: "About WeekFlow", click: about }] }
  ]));
}

ipcMain.on("wf:theme", (_e, t) => { nativeTheme.themeSource = t === "light" ? "light" : t === "system" ? "system" : "dark"; if (win) win.setBackgroundColor(nativeTheme.shouldUseDarkColors ? "#0b0915" : "#f4f2fb"); });
ipcMain.on("wf:closeToTray", (_e, on) => { closeToTray = !!on; if (closeToTray) ensureTray(); else if (tray) { tray.destroy(); tray = null; } });
ipcMain.on("wf:openAtLogin", (_e, on) => {
  if (process.platform === "linux") {
    // Linux desktops start apps listed in ~/.config/autostart.
    const dir = path.join(app.getPath("home"), ".config", "autostart"), file = path.join(dir, "weekflow.desktop");
    try {
      if (on) {
        const exec = process.env.APPIMAGE || process.execPath;
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, "[Desktop Entry]\nType=Application\nName=WeekFlow\nComment=Weekly planner\nExec=\"" + exec + "\"\nIcon=weekflow\nTerminal=false\nX-GNOME-Autostart-enabled=true\n");
      } else if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (e) { log("autostart: " + e.message); }
    return;
  }
  try { app.setLoginItemSettings({ openAtLogin: !!on }); } catch { /* unsupported */ }
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", showWindow);
  app.setAppUserModelId(APP_ID);
  app.on("before-quit", () => { quitting = true; });
  app.whenReady().then(() => { log("start v" + app.getVersion() + (app.isHardwareAccelerationEnabled() ? " gpu" : " cpu")); buildMenu(); createWindow(); setupUpdater();
    // First check shortly after launch, then every 6 hours while WeekFlow is open.
    setTimeout(() => { if (autoCheck && updateServerSet()) checkForUpdates(false); }, 15000);
    setInterval(() => { if (autoCheck && updateServerSet()) checkForUpdates(false); }, 6 * 60 * 60 * 1000);
  });
  app.on("window-all-closed", () => { if (!closeToTray) app.quit(); });
}
