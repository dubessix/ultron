import { IpcMain } from 'electron'
import { exec } from 'child_process'
import os from 'os'

const runCommand = (cmd: string): Promise<string> => {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout) => {
      resolve(err ? '' : stdout.trim())
    })
  })
}

export default function registerFileScanner(ipcMain: IpcMain) {
  ipcMain.removeHandler('get-running-apps')

  ipcMain.handle('get-running-apps', async () => {
    try {
      if (os.platform() === 'win32') {
        const cmd = `powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -ExpandProperty ProcessName"`
        const output = await runCommand(cmd)
        const apps = output
          .split(/\r?\n/)
          .map((a) => a.trim())
          .filter((a) => a)
        return [...new Set(apps)]
      }

      if (os.platform() === 'darwin') {
        const cmd = `osascript -e 'tell application "System Events" to get name of (processes where background only is false)'`
        const output = await runCommand(cmd)
        return output.split(', ').map((s) => s.trim())
      }

      if (os.platform() === 'linux') {
        // Use wmctrl to get active windows (install with: sudo apt install wmctrl)
        const cmd = `wmctrl -l | awk '{$1=$2=$3=""; print $0}' | sed 's/^ *//'`
        const output = await runCommand(cmd)

        if (output) {
          const apps = output
            .split(/\r?\n/)
            .map((a) => a.trim())
            .filter((a) => a && a !== 'N/A')
          return [...new Set(apps)]
        }

        // Fallback: use ps for GUI apps
        const fallbackCmd = `ps -e -o comm= | grep -iE '^(chrome|firefox|code|nautilus|gnome-terminal|discord|spotify|telegram|thunderbird|gimp|vlc|eog|gedit|kate|dolphin|konsole|brave|chromium|microsoft-edge|slack|zoom|skype|whatsapp)' | sort -u`
        const fallbackOutput = await runCommand(fallbackCmd)
        return fallbackOutput.split(/\r?\n/).filter((a) => a.trim())
      }

      return []
    } catch (e) {
      return []
    }
  })
}
