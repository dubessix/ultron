import { ipcMain } from 'electron'
import { exec } from 'child_process'
import os from 'os'

export default function registerLockSystem() {
  ipcMain.on('trigger-lockdown', (event) => {
    console.log('🔒 TACTICAL LOCKDOWN INITIATED VIA AI.')
    event.sender.reload()
  })

  // Optional: lock the OS screen (Linux-specific)
  ipcMain.on('lock-os-screen', () => {
    const platform = os.platform()

    if (platform === 'linux') {
      // Try multiple Linux lock methods
      // GNOME
      exec('gnome-screensaver-command -l', (err) => {
        if (err) {
          // KDE
          exec('dbus-send --dest=org.freedesktop.ScreenSaver --type=method_call /ScreenSaver org.freedesktop.ScreenSaver.Lock', (err2) => {
            if (err2) {
              // Universal fallback via loginctl
              exec('loginctl lock-session')
            }
          })
        }
      })
    } else if (platform === 'win32') {
      exec('rundll32.exe user32.dll,LockWorkStation')
    } else if (platform === 'darwin') {
      exec('pmset displaysleepnow')
    }
  })
}
