import { app } from 'electron'
console.log("app:", typeof app)
console.log("version:", process.versions.electron)
app.whenReady().then(() => {
  console.log("App ready!")
  app.quit()
})
