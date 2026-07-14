const { spawn } = require('child_process')
const path = require('path')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const evJs = path.resolve(__dirname, '../node_modules/electron-vite/bin/electron-vite.js')
const nodeBin = process.execPath

const child = spawn(nodeBin, [evJs, 'dev'], { stdio: 'inherit', env, shell: false })
child.on('exit', (code) => process.exit(code ?? 0))
