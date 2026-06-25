import * as electronMain from 'electron/main'
import * as electronCommon from 'electron/common'
const me = electronMain['module.exports']
const ce = electronCommon['module.exports']
console.log("main module.exports keys:", Object.keys(me || {}))
console.log("common module.exports keys:", Object.keys(ce || {}).slice(0,5))
console.log("process.type:", process.type)
console.log("process.versions.electron:", process.versions.electron)
// Try creating a BrowserWindow after timeout
