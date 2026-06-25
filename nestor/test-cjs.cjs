"use strict";
try {
  const em = require('electron/main');
  console.log("require(electron/main) type:", typeof em);
  if (typeof em === 'object') console.log("keys:", Object.keys(em).slice(0,10));
} catch(e) { console.log("require(electron/main) err:", e.message.slice(0,100)); }

try {
  const ec = require('electron/common');
  console.log("require(electron/common) type:", typeof ec);
  if (typeof ec === 'object') console.log("keys:", Object.keys(ec).slice(0,10));
} catch(e) { console.log("require(electron/common) err:", e.message.slice(0,100)); }

console.log("process.type:", process.type);
