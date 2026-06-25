"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("nestor", {
  window: {
    minimize: () => electron.ipcRenderer.invoke("window:minimize"),
    maximize: () => electron.ipcRenderer.invoke("window:maximize"),
    close: () => electron.ipcRenderer.invoke("window:close"),
    isMaximized: () => electron.ipcRenderer.invoke("window:is-maximized")
  },
  settings: {
    get: () => electron.ipcRenderer.invoke("app:get-settings"),
    set: (patch) => electron.ipcRenderer.invoke("app:set-settings", patch),
    selectFolder: () => electron.ipcRenderer.invoke("app:select-folder")
  },
  fs: {
    listDir: (path) => electron.ipcRenderer.invoke("fs:list-dir", { path }),
    readFile: (path) => electron.ipcRenderer.invoke("fs:read-file", { path }),
    createFolder: (path) => electron.ipcRenderer.invoke("fs:create-folder", { path }),
    moveFile: (from, to) => electron.ipcRenderer.invoke("fs:move-file", { from, to }),
    renameFile: (path, newName) => electron.ipcRenderer.invoke("fs:rename-file", { path, newName }),
    deleteFile: (path) => electron.ipcRenderer.invoke("fs:delete-file", { path }),
    undo: (id) => electron.ipcRenderer.invoke("fs:undo", { id }),
    search: (rootPath, query) => electron.ipcRenderer.invoke("fs:search", { rootPath, query }),
    onChanged: (cb) => {
      const handler = (_, p) => cb(p);
      electron.ipcRenderer.on("fs:changed", handler);
      return () => electron.ipcRenderer.removeListener("fs:changed", handler);
    }
  },
  ollama: {
    check: () => electron.ipcRenderer.invoke("ollama:check"),
    models: () => electron.ipcRenderer.invoke("ollama:models"),
    chat: (messages, systemPrompt, model) => electron.ipcRenderer.invoke("ollama:chat", { messages, systemPrompt, model }),
    onStart: (cb) => {
      const h = () => cb();
      electron.ipcRenderer.on("ollama:start", h);
      return () => electron.ipcRenderer.removeListener("ollama:start", h);
    },
    onToken: (cb) => {
      const h = (_, t) => cb(t);
      electron.ipcRenderer.on("ollama:token", h);
      return () => electron.ipcRenderer.removeListener("ollama:token", h);
    },
    onDone: (cb) => {
      const h = () => cb();
      electron.ipcRenderer.on("ollama:done", h);
      return () => electron.ipcRenderer.removeListener("ollama:done", h);
    },
    onError: (cb) => {
      const h = (_, m) => cb(m);
      electron.ipcRenderer.on("ollama:error", h);
      return () => electron.ipcRenderer.removeListener("ollama:error", h);
    }
  },
  history: {
    get: () => electron.ipcRenderer.invoke("history:get"),
    onUpdated: (cb) => {
      const h = (_, items) => cb(items);
      electron.ipcRenderer.on("history:updated", h);
      return () => electron.ipcRenderer.removeListener("history:updated", h);
    }
  },
  onboarding: {
    start: () => electron.ipcRenderer.invoke("onboarding:start"),
    onStep: (cb) => {
      const h = (_, s) => cb(s);
      electron.ipcRenderer.on("onboarding:step", h);
      return () => electron.ipcRenderer.removeListener("onboarding:step", h);
    },
    onProgress: (cb) => {
      const h = (_, p) => cb(p);
      electron.ipcRenderer.on("onboarding:progress", h);
      return () => electron.ipcRenderer.removeListener("onboarding:progress", h);
    },
    onError: (cb) => {
      const h = (_, m) => cb(m);
      electron.ipcRenderer.on("onboarding:error", h);
      return () => electron.ipcRenderer.removeListener("onboarding:error", h);
    }
  }
});
