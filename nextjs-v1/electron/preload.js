const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  // App info
  getAppPath: () => ipcRenderer.invoke("get-app-path"),
  getVersion: () => ipcRenderer.invoke("get-version"),

  // Platform detection
  platform: process.platform,
  isElectron: true,
});

// Log to console that preload script loaded successfully
console.log("Electron preload script loaded successfully");



