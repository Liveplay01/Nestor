// Try different import styles
const electronModule = await import('electron')
console.log("dynamic import result:", typeof electronModule)
console.log("keys:", Object.keys(electronModule).slice(0, 5))
