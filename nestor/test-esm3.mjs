import * as electronMain from 'electron/main'
const cjsExports = electronMain['module.exports']
console.log("module.exports type:", typeof cjsExports)
if (cjsExports && typeof cjsExports === 'object') {
  console.log("module.exports keys:", Object.keys(cjsExports).slice(0, 15))
  console.log("has app:", 'app' in cjsExports)
  console.log("has BrowserWindow:", 'BrowserWindow' in cjsExports)
}
