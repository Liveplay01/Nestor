import * as electronMain from 'electron/main'
// Check at different points
console.log("1. On load - keys:", Object.keys(electronMain).length)
const me = electronMain['module.exports']
console.log("2. module.exports keys:", Object.keys(me || {}).length)
// Try accessing app via getter if any
console.log("3. type of electronMain:", typeof electronMain)
// Try prototype
const proto = Object.getPrototypeOf(me || {})
console.log("4. proto keys:", Object.keys(proto || {}).slice(0, 5))
// Log raw
console.log("5. JSON:", JSON.stringify(me, null, 2)?.slice(0, 200))
