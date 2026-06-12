import { IpcMain } from 'electron'
import { exec } from 'child_process'
import os from 'os'

const PROTECTED_PROCESSES_LINUX = [
  'systemd',
  'xorg',
  'wayland',
  'gnome-shell',
  'kwin_wayland',
  'dbus-daemon',
  'NetworkManager',
  'pulseaudio',
  'pipewire',
  'journald'
]

// ─── Linux app aliases ───
const LINUX_APP_ALIASES: Record<string, string> = {
  vscode: 'code',
  code: 'code',
  'visual studio code': 'code',
  terminal: 'gnome-terminal',
  'gnome terminal': 'gnome-terminal',
  konsole: 'konsole',
  alacritty: 'alacritty',
  kitty: 'kitty',
  tilix: 'tilix',
  guake: 'guake',
  git: 'gitkraken',
  mongo: 'mongodb-compass',
  mongodb: 'mongodb-compass',
  postman: 'postman',

  chrome: 'google-chrome',
  'google chrome': 'google-chrome',
  'google-chrome-stable': 'google-chrome-stable',
  chromium: 'chromium-browser',
  edge: 'microsoft-edge',
  brave: 'brave-browser',
  firefox: 'firefox',

  whatsapp: 'whatsapp-nativefier',
  discord: 'discord',
  spotify: 'spotify',
  telegram: 'telegram-desktop',

  steam: 'steam',
  'epic games': 'epicgameslauncher',

  notepad: 'gedit',
  gedit: 'gedit',
  'text editor': 'gedit',
  calculator: 'gnome-calculator',
  settings: 'gnome-control-center',
  files: 'nautilus',
  nautilus: 'nautilus',
  explorer: 'nautilus',
  'file manager': 'nautilus',
  'task manager': 'gnome-system-monitor',
  'system monitor': 'gnome-system-monitor',
  camera: 'cheese',
  photos: 'eog',
  'image viewer': 'eog',
  'screenshot': 'gnome-screenshot',
  vscode_insiders: 'code-insiders'
}

const LINUX_PROCESS_NAMES: Record<string, string> = {
  vscode: 'code',
  code: 'code',
  'visual studio code': 'code',
  chrome: 'google-chrome',
  'google chrome': 'google-chrome',
  chromium: 'chromium-browser',
  edge: 'microsoft-edge',
  brave: 'brave-browser',
  firefox: 'firefox',
  notepad: 'gedit',
  gedit: 'gedit',
  terminal: 'gnome-terminal',
  'gnome terminal': 'gnome-terminal',

  whatsapp: 'whatsapp',
  discord: 'discord',
  spotify: 'spotify',
  telegram: 'telegram-desktop',

  steam: 'steam',
  'epic games': 'epicgameslauncher',

  camera: 'cheese',
  calculator: 'gnome-calculator',
  settings: 'gnome-control-center',
  'task manager': 'gnome-system-monitor',
  'system monitor': 'gnome-system-monitor',
  photos: 'eog',
  explorer: 'nautilus',
  files: 'nautilus',
  nautilus: 'nautilus'
}

// ─── Windows aliases (kept for backward compat) ───
const WIN_APP_ALIASES: Record<string, string> = {
  vscode: 'code',
  code: 'code',
  'visual studio code': 'code',
  terminal: 'wt',
  cmd: 'start cmd',
  git: 'start git-bash',
  mongo: 'mongodbcompass',
  mongodb: 'mongodbcompass',
  postman: 'postman',
  chrome: 'start chrome',
  'google chrome': 'start chrome',
  edge: 'start msedge',
  brave: 'start brave',
  firefox: 'start firefox',
  whatsapp: 'start whatsapp:',
  discord: 'Update.exe --processStart Discord.exe',
  spotify: 'start spotify:',
  telegram: 'start telegram:',
  tlauncher: 'TLauncher',
  minecraft: 'MinecraftLauncher',
  steam: 'start steam:',
  'epic games': 'com.epicgames.launcher:',
  notepad: 'notepad',
  calculator: 'calc',
  settings: 'start ms-settings:',
  explorer: 'explorer',
  files: 'explorer',
  'task manager': 'taskmgr',
  camera: 'start microsoft.windows.camera:',
  photos: 'start microsoft.windows.photos:'
}

const WIN_PROCESS_NAMES: Record<string, string> = {
  vscode: 'code.exe',
  code: 'code.exe',
  'visual studio code': 'code.exe',
  chrome: 'chrome.exe',
  'google chrome': 'chrome.exe',
  edge: 'msedge.exe',
  brave: 'brave.exe',
  firefox: 'firefox.exe',
  notepad: 'notepad.exe',
  cmd: 'cmd.exe',
  terminal: 'WindowsTerminal.exe',
  whatsapp: 'WhatsApp.exe',
  discord: 'Discord.exe',
  spotify: 'Spotify.exe',
  telegram: 'Telegram.exe',
  steam: 'steam.exe',
  'epic games': 'EpicGamesLauncher.exe',
  camera: 'WindowsCamera.exe',
  calculator: 'CalculatorApp.exe',
  settings: 'SystemSettings.exe',
  'task manager': 'Taskmgr.exe',
  photos: 'Microsoft.Photos.exe',
  explorer: 'explorer.exe',
  files: 'explorer.exe'
}

export default function registerAppLauncher(ipcMain: IpcMain) {
  ipcMain.removeHandler('open-app')
  ipcMain.handle('open-app', async (_event, appName: string) => {
    return new Promise((resolve) => {
      const lowerName = appName.toLowerCase().trim()
      const platform = os.platform()

      if (platform === 'linux') {
        let command = LINUX_APP_ALIASES[lowerName]
        if (command) {
          executeCommand(command, appName, resolve)
        } else {
          launchViaDesktopFile(appName, resolve)
        }
      } else {
        let command = WIN_APP_ALIASES[lowerName]
        if (command) {
          executeCommand(command, appName, resolve)
        } else {
          launchViaPowerShell(appName, resolve)
        }
      }
    })
  })

  ipcMain.removeHandler('close-app')
  ipcMain.handle('close-app', async (_event, appName: string) => {
    return new Promise((resolve) => {
      const lowerName = appName.toLowerCase().trim()
      const platform = os.platform()

      if (platform === 'linux') {
        let processName = LINUX_PROCESS_NAMES[lowerName]
        if (!processName) {
          processName = appName
        }

        if (PROTECTED_PROCESSES_LINUX.includes(processName.toLowerCase())) {
          resolve({
            success: false,
            error: `Security Protocol: I cannot close '${appName}' (System Critical Process). Doing so would crash your system.`
          })
          return
        }

        const cmd = `pkill -f "${processName}"`
        exec(cmd, (error) => {
          if (error) {
            resolve({ success: false, error: `Could not close ${appName}. Is it running?` })
          } else {
            resolve({ success: true, message: `Terminated ${appName}` })
          }
        })
      } else {
        let processName = WIN_PROCESS_NAMES[lowerName]
        if (!processName) {
          processName = appName.endsWith('.exe') ? appName : `${appName}.exe`
        }

        const PROTECTED_PROCESSES_WIN = [
          'explorer.exe', 'dwm.exe', 'svchost.exe', 'lsass.exe',
          'csrss.exe', 'wininit.exe', 'winlogon.exe', 'services.exe',
          'taskmgr.exe', 'system', 'registry'
        ]

        if (PROTECTED_PROCESSES_WIN.includes(processName.toLowerCase())) {
          resolve({
            success: false,
            error: `Security Protocol: I cannot close '${appName}' (System Critical Process). Doing so would crash your PC.`
          })
          return
        }

        const cmd = `taskkill /IM "${processName}" /F /T`
        exec(cmd, (error) => {
          if (error) {
            resolve({ success: false, error: `Could not close ${appName}. Is it running?` })
          } else {
            resolve({ success: true, message: `Terminated ${appName}` })
          }
        })
      }
    })
  })
}

function executeCommand(command: string, appName: string, resolve: any) {
  exec(command, (error) => {
    if (error) {
      const platform = os.platform()
      if (platform === 'linux') {
        launchViaDesktopFile(appName, resolve)
      } else {
        launchViaPowerShell(appName, resolve)
      }
    } else {
      resolve({ success: true, message: `Opened ${appName}` })
    }
  })
}

// ─── Linux: launch via .desktop file search ───
function launchViaDesktopFile(appName: string, resolve: any) {
  const findCmd = `find /usr/share/applications /var/lib/snapd/desktop/applications ~/.local/share/applications -maxdepth 1 -iname "*${appName}*.desktop" 2>/dev/null | head -1`
  exec(findCmd, (error, stdout) => {
    if (error || !stdout.trim()) {
      resolve({
        success: false,
        error: `Could not find '${appName}' on this system. Try opening it manually once.`
      })
      return
    }

    const desktopFile = stdout.trim()
    const launchCmd = `gtk-launch "$(basename "${desktopFile}" .desktop)"`

    exec(launchCmd, (launchErr) => {
      if (launchErr) {
        resolve({ success: false, error: `Found app but could not launch: ${launchErr.message}` })
      } else {
        resolve({ success: true, message: `Opened ${appName} via Desktop Entry` })
      }
    })
  })
}

// ─── Windows: launch via PowerShell (kept for backward compat) ───
function launchViaPowerShell(appName: string, resolve: any) {
  const psCommand = `powershell -Command "Get-StartApps | Where-Object { $_.Name -like '*${appName}*' } | Select-Object -First 1 -ExpandProperty AppID"`

  exec(psCommand, (error, stdout) => {
    if (error) {
      resolve({
        success: false,
        error: `Could not find '${appName}' on this system. Try opening it manually once.`
      })
      return
    }

    const appId = stdout.trim()

    if (appId) {
      const launchCmd = `start explorer "shell:AppsFolder\\${appId}"`
      exec(launchCmd, (launchErr) => {
        if (launchErr) {
          resolve({ success: false, error: `Found app but could not launch: ${launchErr.message}` })
        } else {
          resolve({ success: true, message: `Opened ${appName} via System Search` })
        }
      })
    } else {
      resolve({
        success: false,
        error: `Could not find '${appName}' on this system. Try opening it manually once.`
      })
    }
  })
}
