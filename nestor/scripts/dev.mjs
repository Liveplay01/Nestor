import { spawn } from 'child_process'

// Remove ELECTRON_RUN_AS_NODE which VSCode injects and causes Electron to
// start in plain Node.js mode instead of browser mode, breaking all APIs.
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const proc = spawn('npx', ['electron-vite', 'dev'], {
  env,
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
})

proc.on('exit', (code) => process.exit(code ?? 0))
