"use strict";
// Try process.electronBinding which is an internal API
const electron = require("electron");
console.log("require(electron) type:", typeof electron);
console.log("has electronBinding:", typeof process.electronBinding);
// Check if we're truly in the main process
console.log("process.type:", process.type);
console.log("process.versions.electron:", process.versions.electron);
// Try to access app through alternative means
try {
  const { app } = require('electron/main');
  console.log("electron/main app:", typeof app);
} catch(e) { console.log("electron/main err:", e.message); }
