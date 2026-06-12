import { IpcMain, BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import os from 'os'
import { parseErrors } from '../coding/error-companion'

export default function registerSystemControl(ipcMain: IpcMain) {
  const sanitizePath = (inputPath: string) => {
    let clean = path.normalize(inputPath)
    if (clean.endsWith(path.sep)) clean = clean.slice(0, -1)
    return clean
  }

  ipcMain.handle('run-shell-command', async (_event, { command, cwd }) => {
    return new Promise((resolve) => {
      const safeCwd = cwd ? sanitizePath(cwd) : undefined
      const win = BrowserWindow.getAllWindows()[0]

      // Detect shell based on platform
      const platform = os.platform()
      let shell: string
      let shellArgs: string[]

      if (platform === 'linux') {
        // Use bash on Linux — check for user's preferred shell
        const userShell = process.env.SHELL || '/bin/bash'
        shell = userShell
        shellArgs = ['-c', command]
      } else {
        // Windows: PowerShell
        shell = 'powershell.exe'
        shellArgs = ['-Command', command]
      }

      const child = spawn(shell, shellArgs, {
        cwd: safeCwd,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      child.stdout.on('data', (data) => {
        const output = data.toString()
        if (win) win.webContents.send('terminal-data', output)
        // Parse for errors
        try {
          const errors = parseErrors(output, 'terminal')
          if (errors.length > 0 && win && !win.isDestroyed()) {
            win.webContents.send('error-companion:new-errors', errors)
          }
        } catch {}
      })

      child.stderr.on('data', (data) => {
        const output = data.toString()
        if (win) win.webContents.send('terminal-data', `\x1b[31m${output}\x1b[0m`)
        // Parse stderr for errors
        try {
          const errors = parseErrors(output, 'terminal')
          if (errors.length > 0 && win && !win.isDestroyed()) {
            win.webContents.send('error-companion:new-errors', errors)
          }
        } catch {}
      })

      child.on('close', (code) => {
        const msg = `\r\n[Process exited with code ${code}]\r\n`
        if (win) win.webContents.send('terminal-data', msg)
        resolve({ success: code === 0, output: `Completed with code ${code}` })
      })

      child.on('error', (err) => {
        if (win) win.webContents.send('terminal-data', `Error: ${err.message}`)
        resolve({ success: false, output: err.message })
      })
    })
  })
}
