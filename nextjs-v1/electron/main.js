const { app, BrowserWindow, ipcMain, protocol } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development";

let mainWindow;

// Enable SharedArrayBuffer for WebGPU support
app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");
app.commandLine.appendSwitch("enable-unsafe-webgpu");

// Enable WASM and dynamic imports
app.commandLine.appendSwitch("enable-features", "WebAssemblyStreaming");
app.commandLine.appendSwitch("enable-features", "WebAssembly");
app.commandLine.appendSwitch("js-flags", "--expose-gc");

// Disable CORS in development
if (isDev) {
  app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors");
  app.commandLine.appendSwitch("disable-site-isolation-trials");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "Whisper Diarization",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Disabled to allow blob: URLs and WASM
      sandbox: false, // Required for Web Workers
      webgl: true,
      enableWebSQL: false,
      allowRunningInsecureContent: isDev, // Allow in dev mode
      // Enable experimental features for WebGPU and WASM
      experimentalFeatures: true,
    },
    icon: path.join(__dirname, "../public/logo.svg"),
  });

  // Configure session for WASM and WebGPU
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Cross-Origin-Embedder-Policy": ["require-corp"],
          "Cross-Origin-Opener-Policy": ["same-origin"],
          // Allow WASM execution
          "Content-Security-Policy": [
            "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
              "script-src * 'unsafe-inline' 'unsafe-eval' blob: data:; " +
              "worker-src * blob: data:; " +
              "connect-src * data: blob: 'unsafe-inline'; " +
              "img-src * data: blob: 'unsafe-inline';",
          ],
        },
      });
    },
  );

  // Log console messages from renderer for debugging
  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      console.log(`Renderer: ${message}`);
    },
  );

  if (isDev) {
    // Development mode: load from Next.js dev server
    mainWindow.loadURL("http://localhost:3000/web-transc");
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode: load from static build
    mainWindow.loadFile(
      path.join(__dirname, "../out/web-transc/index.html"),
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Configure persistent cache for ML models
  // Models will be stored in userData directory and persist across app restarts
  const { session } = require("electron");
  const modelCachePath = path.join(
    app.getPath("userData"),
    "ml-models-cache",
  );

  session.defaultSession.setStoragePath(modelCachePath);
  console.log("📦 Model cache directory:", modelCachePath);

  // Prevent automatic cache clearing on app quit
  app.on("before-quit", () => {
    // Ensure cache persists
    session.defaultSession.clearCache = false;
  });

  // Register protocol for loading local files
  protocol.registerFileProtocol("file", (request, callback) => {
    const pathname = decodeURI(request.url.replace("file:///", ""));
    callback(pathname);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle app crashes
app.on("render-process-gone", (event, webContents, details) => {
  console.error("Render process gone:", details);
});

// IPC handlers (if needed for future features)
ipcMain.handle("get-app-path", () => {
  return app.getPath("userData");
});

ipcMain.handle("get-version", () => {
  return app.getVersion();
});
