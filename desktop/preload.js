const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("weekflowDesktop", {
  platform: process.platform,
  setTheme: (theme) => ipcRenderer.send("wf:theme", String(theme)),
  setCloseToTray: (on) => ipcRenderer.send("wf:closeToTray", !!on),
  setOpenAtLogin: (on) => ipcRenderer.send("wf:openAtLogin", !!on),
  onCommand: (fn) => ipcRenderer.on("wf:command", (_e, cmd) => fn(String(cmd))),
  updates: {
    check: () => ipcRenderer.send("wf:update:check"),
    download: () => ipcRenderer.send("wf:update:download"),
    install: () => ipcRenderer.send("wf:update:install"),
    refresh: () => ipcRenderer.send("wf:update:get"),
    setAuto: (on) => ipcRenderer.send("wf:update:auto", !!on),
    onStatus: (fn) => ipcRenderer.on("wf:update", (_e, s) => fn(s))
  },
  version: (process.argv.find((a) => a.startsWith("--wf-version=")) || "").slice(13) || null
});
