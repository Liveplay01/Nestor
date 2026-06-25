"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const child_process = require("child_process");
const util = require("util");
const os = require("os");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
function getFileType(filePath) {
  const ext = path__namespace.extname(filePath).toLowerCase().slice(1);
  if (ext === "pdf") return "pdf";
  if (["doc", "docx", "txt", "md", "rtf"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "xls";
  if (["ppt", "pptx", "key", "odp"].includes(ext)) return "ppt";
  if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(ext)) return "img";
  return "other";
}
function listDir(dirPath, depth = 0, maxDepth = 3) {
  if (!fs__namespace.existsSync(dirPath)) return [];
  const entries = [];
  let items;
  try {
    items = fs__namespace.readdirSync(dirPath);
  } catch {
    return [];
  }
  for (const name of items) {
    if (name.startsWith(".")) continue;
    const fullPath = path__namespace.join(dirPath, name);
    let stat;
    try {
      stat = fs__namespace.statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      const entry = {
        name,
        path: fullPath,
        type: "folder",
        isFolder: true,
        children: depth < maxDepth ? listDir(fullPath, depth + 1, maxDepth) : []
      };
      entries.push(entry);
    } else {
      entries.push({
        name,
        path: fullPath,
        type: getFileType(fullPath),
        isFolder: false
      });
    }
  }
  return entries.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });
}
function readFile(filePath) {
  const ext = path__namespace.extname(filePath).toLowerCase();
  const textExts = [".txt", ".md", ".rtf", ".csv", ".json", ".js", ".ts", ".html", ".css"];
  if (textExts.includes(ext)) {
    return fs__namespace.readFileSync(filePath, "utf-8");
  }
  return `[Binary file: ${path__namespace.basename(filePath)}]`;
}
function createFolder(folderPath) {
  fs__namespace.mkdirSync(folderPath, { recursive: true });
  return {
    id: crypto.randomUUID(),
    type: "create_folder",
    verb: "Ordner erstellt",
    target: path__namespace.basename(folderPath),
    time: formatTime(/* @__PURE__ */ new Date()),
    timestamp: Date.now(),
    undone: false,
    path: folderPath
  };
}
function moveFile(from, to) {
  fs__namespace.renameSync(from, to);
  const fromName = path__namespace.basename(from);
  const toDir = path__namespace.basename(path__namespace.dirname(to));
  return {
    id: crypto.randomUUID(),
    type: "move_file",
    verb: "Verschoben",
    target: `${fromName} → ${toDir}`,
    time: formatTime(/* @__PURE__ */ new Date()),
    timestamp: Date.now(),
    undone: false,
    from,
    to
  };
}
function renameFile(filePath, newName) {
  const dir = path__namespace.dirname(filePath);
  const newPath = path__namespace.join(dir, newName);
  const oldName = path__namespace.basename(filePath);
  fs__namespace.renameSync(filePath, newPath);
  return {
    id: crypto.randomUUID(),
    type: "rename_file",
    verb: "Umbenannt",
    target: `${oldName} → ${newName}`,
    time: formatTime(/* @__PURE__ */ new Date()),
    timestamp: Date.now(),
    undone: false,
    from: filePath,
    to: newPath
  };
}
function deleteFile(filePath) {
  let snapshotBase64;
  const stat = fs__namespace.statSync(filePath);
  if (stat.isFile()) {
    const buf = fs__namespace.readFileSync(filePath);
    snapshotBase64 = buf.toString("base64");
    fs__namespace.unlinkSync(filePath);
  } else {
    fs__namespace.rmdirSync(filePath, { recursive: true });
  }
  return {
    id: crypto.randomUUID(),
    type: "delete_file",
    verb: "Gelöscht",
    target: path__namespace.basename(filePath),
    time: formatTime(/* @__PURE__ */ new Date()),
    timestamp: Date.now(),
    undone: false,
    path: filePath,
    snapshotBase64
  };
}
function undoAction(item) {
  switch (item.type) {
    case "move_file":
    case "rename_file":
      if (item.from && item.to) fs__namespace.renameSync(item.to, item.from);
      break;
    case "create_folder":
      if (item.path && fs__namespace.existsSync(item.path)) {
        const entries = fs__namespace.readdirSync(item.path);
        if (entries.length === 0) fs__namespace.rmdirSync(item.path);
      }
      break;
    case "delete_file":
      if (item.path && item.snapshotBase64) {
        const buf = Buffer.from(item.snapshotBase64, "base64");
        fs__namespace.writeFileSync(item.path, buf);
      }
      break;
  }
}
function searchFiles(rootPath, query) {
  const results = [];
  const q = query.toLowerCase();
  function walk(dir, depth) {
    if (depth > 5) return;
    let items;
    try {
      items = fs__namespace.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of items) {
      if (name.startsWith(".")) continue;
      if (name.toLowerCase().includes(q)) {
        const fullPath2 = path__namespace.join(dir, name);
        let stat;
        try {
          stat = fs__namespace.statSync(fullPath2);
        } catch {
          continue;
        }
        results.push({
          name,
          path: fullPath2,
          type: stat.isDirectory() ? "folder" : getFileType(fullPath2),
          isFolder: stat.isDirectory()
        });
      }
      const fullPath = path__namespace.join(dir, name);
      try {
        if (fs__namespace.statSync(fullPath).isDirectory()) walk(fullPath, depth + 1);
      } catch {
      }
    }
  }
  walk(rootPath, 0);
  return results.slice(0, 50);
}
function formatTime(date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}
const OLLAMA_BASE = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.2:3b";
async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3e3) });
    if (!res.ok) return { installed: true, running: false, hasModel: false };
    const data = await res.json();
    const models = data.models ?? [];
    const hasModel = models.some(
      (m) => m.name === DEFAULT_MODEL || m.name.startsWith("llama3.2")
    );
    return { installed: true, running: true, hasModel };
  } catch {
    return { installed: false, running: false, hasModel: false };
  }
}
async function streamChat(win, messages, systemPrompt, model = DEFAULT_MODEL) {
  const allMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ];
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: allMessages,
        stream: true
      })
    });
    if (!res.ok || !res.body) {
      win.webContents.send("ollama:error", "Verbindung zu Ollama fehlgeschlagen.");
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    win.webContents.send("ollama:start");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            win.webContents.send("ollama:token", json.message.content);
          }
          if (json.done) {
            win.webContents.send("ollama:done");
          }
        } catch {
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
    win.webContents.send("ollama:error", msg);
  }
}
async function getAvailableModels() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    const data = await res.json();
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return [];
  }
}
util.promisify(child_process.exec);
const OLLAMA_WIN_URL = "https://ollama.com/download/OllamaSetup.exe";
const MODEL = "llama3.2:3b";
function sendProgress(win, percent, statusText, speedText) {
  win.webContents.send("onboarding:progress", { percent, statusText, speedText });
}
async function downloadFile(url, destPath, win, label) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download fehlgeschlagen: ${res.status}`);
  const total = Number(res.headers.get("content-length") ?? 0);
  let received = 0;
  let lastTime = Date.now();
  let lastReceived = 0;
  const writer = fs__namespace.createWriteStream(destPath);
  const reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    writer.write(Buffer.from(value));
    received += value.byteLength;
    const now = Date.now();
    if (now - lastTime > 500) {
      const speed = (received - lastReceived) / ((now - lastTime) / 1e3);
      const remaining = speed > 0 ? (total - received) / speed : 0;
      const percent = total > 0 ? Math.round(received / total * 100) : 0;
      const speedText = `${formatBytes(speed)}/s · ${formatSeconds(remaining)} verbleibend`;
      sendProgress(
        win,
        percent,
        `${label}… ${formatBytes(received)} / ${formatBytes(total)}`,
        speedText
      );
      lastTime = now;
      lastReceived = received;
    }
  }
  await new Promise((resolve, reject) => {
    writer.end();
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}
async function waitForOllama(timeoutMs = 6e4) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch("http://localhost:11434/api/tags", {
        signal: AbortSignal.timeout(2e3)
      });
      if (res.ok) return true;
    } catch {
    }
    await new Promise((r) => setTimeout(r, 1e3));
  }
  return false;
}
async function runOnboarding(win) {
  const status = await checkOllama();
  if (!status.running) {
    const tmpDir = os__namespace.tmpdir();
    const installerPath = path__namespace.join(tmpDir, "OllamaSetup.exe");
    sendProgress(win, 0, "KI-Engine wird vorbereitet…");
    if (!fs__namespace.existsSync(installerPath)) {
      sendProgress(win, 2, "Lade KI-Engine herunter…");
      await downloadFile(OLLAMA_WIN_URL, installerPath, win, "KI-Engine wird heruntergeladen");
    }
    sendProgress(win, 100, "KI-Engine wird installiert…");
    win.webContents.send("onboarding:step", "install-ollama");
    await new Promise((resolve, reject) => {
      const proc = child_process.spawn(installerPath, ["/VERYSILENT", "/SUPPRESSMSGBOXES"], {
        detached: true,
        stdio: "ignore"
      });
      proc.on("close", (code) => {
        if (code === 0 || code === null) resolve();
        else reject(new Error(`Installer beendet mit Code ${code}`));
      });
      proc.on("error", reject);
    });
    sendProgress(win, 100, "Warte auf KI-Engine…");
    const ready = await waitForOllama();
    if (!ready) {
      win.webContents.send("onboarding:error", "Ollama konnte nicht gestartet werden.");
      return;
    }
  }
  if (!status.hasModel) {
    win.webContents.send("onboarding:step", "pull-model");
    sendProgress(win, 0, `Lade Nestor AI herunter…`);
    const res = await fetch("http://localhost:11434/api/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: MODEL, stream: true })
    });
    if (!res.ok || !res.body) {
      win.webContents.send("onboarding:error", "Modell konnte nicht heruntergeladen werden.");
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let lastTime = Date.now();
    let lastCompleted = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.total && json.completed !== void 0) {
            const now = Date.now();
            const percent = Math.round(json.completed / json.total * 100);
            const speed = (json.completed - lastCompleted) / ((now - lastTime) / 1e3);
            const remaining = speed > 0 ? (json.total - json.completed) / speed : 0;
            const speedText = speed > 0 ? `${formatBytes(speed)}/s · ~${formatSeconds(remaining)} verbleibend` : void 0;
            sendProgress(
              win,
              percent,
              `Nestor AI wird geladen… ${formatBytes(json.completed)} / ${formatBytes(json.total)}`,
              speedText
            );
            lastTime = now;
            lastCompleted = json.completed;
          } else if (json.status === "success") {
            sendProgress(win, 100, "KI-Modell bereit!");
          }
        } catch {
        }
      }
    }
  }
  win.webContents.send("onboarding:step", "choose-folder");
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
function formatSeconds(secs) {
  if (secs < 60) return `${Math.ceil(secs)} Sek`;
  const m = Math.floor(secs / 60);
  return `${m} Min`;
}
const Store = require("electron-store");
const chokidar = require("chokidar");
const store = new Store({
  defaults: {
    settings: {
      rootFolder: "",
      model: "llama3.2:3b",
      language: "de",
      accentColor: "#2563EB",
      onboardingComplete: false
    },
    history: []
  }
});
let watcher = null;
function registerIpcHandlers(getWin) {
  electron.ipcMain.handle("window:minimize", () => getWin()?.minimize());
  electron.ipcMain.handle("window:maximize", () => {
    const w = getWin();
    if (!w) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });
  electron.ipcMain.handle("window:close", () => getWin()?.close());
  electron.ipcMain.handle("window:is-maximized", () => getWin()?.isMaximized() ?? false);
  electron.ipcMain.handle("app:get-settings", () => store.get("settings"));
  electron.ipcMain.handle("app:set-settings", (_, patch) => {
    const current = store.get("settings");
    const next = { ...current, ...patch };
    store.set("settings", next);
    if (patch.rootFolder && patch.rootFolder !== current.rootFolder) {
      startWatcher(patch.rootFolder, getWin);
    }
  });
  electron.ipcMain.handle("app:select-folder", async () => {
    const win = getWin();
    if (!win) return null;
    const result = await electron.dialog.showOpenDialog(win, {
      properties: ["openDirectory"]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle("fs:list-dir", (_, { path: path2 }) => {
    return listDir(path2);
  });
  electron.ipcMain.handle("fs:read-file", (_, { path: path2 }) => {
    return readFile(path2);
  });
  electron.ipcMain.handle("fs:create-folder", (_, { path: path2 }) => {
    const item = createFolder(path2);
    saveHistory(item);
    return item;
  });
  electron.ipcMain.handle("fs:move-file", (_, { from, to }) => {
    const item = moveFile(from, to);
    saveHistory(item);
    return item;
  });
  electron.ipcMain.handle(
    "fs:rename-file",
    (_, { path: path2, newName }) => {
      const item = renameFile(path2, newName);
      saveHistory(item);
      return item;
    }
  );
  electron.ipcMain.handle("fs:delete-file", (_, { path: path2 }) => {
    const item = deleteFile(path2);
    saveHistory(item);
    return item;
  });
  electron.ipcMain.handle("fs:undo", (_, { id }) => {
    const history = store.get("history");
    const item = history.find((h) => h.id === id);
    if (!item || item.undone) return;
    undoAction(item);
    const updated = history.map((h) => h.id === id ? { ...h, undone: true } : h);
    store.set("history", updated);
    getWin()?.webContents.send("history:updated", updated);
  });
  electron.ipcMain.handle("fs:search", (_, { rootPath, query }) => {
    return searchFiles(rootPath, query);
  });
  electron.ipcMain.handle("history:get", () => store.get("history"));
  electron.ipcMain.handle("ollama:check", () => checkOllama());
  electron.ipcMain.handle("ollama:models", () => getAvailableModels());
  electron.ipcMain.handle(
    "ollama:chat",
    async (_, {
      messages,
      systemPrompt,
      model
    }) => {
      const win = getWin();
      if (!win) return;
      await streamChat(
        win,
        messages,
        systemPrompt,
        model
      );
    }
  );
  electron.ipcMain.handle("onboarding:start", async () => {
    const win = getWin();
    if (!win) return;
    await runOnboarding(win);
  });
  const settings = store.get("settings");
  if (settings.rootFolder) {
    startWatcher(settings.rootFolder, getWin);
  }
}
function startWatcher(folderPath, getWin) {
  if (watcher) watcher.close();
  watcher = chokidar.watch(folderPath, {
    depth: 3,
    ignoreInitial: true,
    ignored: /(^|[/\\])\../
  });
  const notify = () => {
    getWin()?.webContents.send("fs:changed", folderPath);
  };
  watcher.on("add", notify).on("unlink", notify).on("addDir", notify).on("unlinkDir", notify);
}
function saveHistory(item) {
  const history = store.get("history");
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1e3;
  const trimmed = history.filter((h) => h.timestamp > cutoff);
  store.set("history", [item, ...trimmed]);
}
const isDev = process.env["NODE_ENV"] === "development" || !!process.env["ELECTRON_RENDERER_URL"];
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#FFFFFF",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  electron.app.setAppUserModelId("com.nestor.app");
  registerIpcHandlers(() => mainWindow);
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
