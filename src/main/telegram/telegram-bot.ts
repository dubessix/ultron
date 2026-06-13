/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🤖 IRIS AI — Telegram Remote Control Module
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Control your entire PC from Telegram on your phone.
 * All desktop features accessible via bot commands.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { IpcMain, app, shell, BrowserWindow } from 'electron'
import { exec, execSync } from 'child_process'
import { GoogleGenAI } from '@google/genai'
import { ModelRouter } from '../ai/model-router'
import { PersonalityEngine } from '../soul/personality-engine'
import { BrainRouter } from '../brain/brain-router'
import { NoticeEngine } from '../soul/notice-engine'
import { EmotionEngine } from '../soul/emotion-engine'
import { SuggestionEngine } from '../soul/suggestion-engine'
import { PairProgrammer } from '../soul/pair-programmer'
import Orchestrator, { classifyIntent } from '../agents/orchestrator'
import type { SubAgent } from '../agents/orchestrator'
import { EpisodicMemory } from '../brain/episodic-memory'
import { SemanticMemory } from '../brain/semantic-memory'
import { ProceduralMemory } from '../brain/procedural-memory'
import { SharedConsciousness } from '../brain/shared-consciousness'
import fs from 'fs'
import path from 'path'
import os from 'os'
import screenshot from 'screenshot-desktop'
import util from 'util'

let storeInstance: any = null
function getStore() {
  if (!storeInstance) {
    const Store = require('electron-store')
    const StoreClass = Store.default || Store
    storeInstance = new StoreClass()
  }
  return storeInstance
}

const execAsync = util.promisify(exec)

// ─── Types ───
interface BotConfig {
  token: string
  allowedChatIds: string[]
  geminiKey: string
  groqKey: string
}

// ─── State ───
let botConfig: BotConfig | null = null
let isBotRunning = false
let pollingInterval: NodeJS.Timeout | null = null
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 10 // auto-restart after 10 fails
let lastUpdateId = 0
let mainWindow: BrowserWindow | null = null

// ─── Emoji Helpers ───
const EMOJI = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
  lock: '🔒',
  brain: '🧠',
  pc: '🖥️',
  file: '📁',
  search: '🔍',
  camera: '📸',
  mic: '🎤',
  globe: '🌐',
  chart: '📊',
  weather: '🌤️',
  mail: '📧',
  phone: '📱',
  rocket: '🚀',
  key: '🔑',
  shield: '🛡️',
  terminal: '💻',
  music: '🎵',
  note: '📝',
  link: '🔗',
  cpu: '⚡',
  memory: '💾',
  network: '📡',
  wormhole: '🕳️',
  spark: '✨',
  ghost: '👻'
}

// ─── Send Message to Telegram ───
async function sendTelegram(text: string, chatId?: string): Promise<void> {
  if (!botConfig) return
  const targetId = chatId || botConfig.allowedChatIds[0]
  if (!targetId) return

  try {
    // Split long messages (Telegram limit: 4096 chars)
    const chunks = []
    for (let i = 0; i < text.length; i += 4000) {
      chunks.push(text.substring(i, i + 4000))
    }
    for (const chunk of chunks) {
      await fetch(`https://api.telegram.org/bot${botConfig.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetId,
          text: chunk,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      })
      // Rate limit: 30 messages per second
      await new Promise((r) => setTimeout(r, 50))
    }
  } catch (e) {
    console.error('Telegram send error:', e)
  }
}

// ─── Send Photo to Telegram ───
async function sendTelegramPhoto(
  imagePath: string,
  caption?: string,
  chatId?: string
): Promise<void> {
  if (!botConfig) return
  const targetId = chatId || botConfig.allowedChatIds[0]
  if (!targetId) return

  try {
    const FormData = (await import('form-data')).default
    const formData = new FormData()
    formData.append('chat_id', targetId)
    formData.append('photo', fs.createReadStream(imagePath))
    if (caption) formData.append('caption', caption)

    await fetch(`https://api.telegram.org/bot${botConfig.token}/sendPhoto`, {
      method: 'POST',
      body: formData as any
    })
  } catch (e) {
    // Fallback: send as document
    try {
      const FormData2 = (await import('form-data')).default
      const formData2 = new FormData2()
      formData2.append('chat_id', targetId)
      formData2.append('document', fs.createReadStream(imagePath))
      if (caption) formData2.append('caption', caption)

      await fetch(`https://api.telegram.org/bot${botConfig.token}/sendDocument`, {
        method: 'POST',
        body: formData2 as any
      })
    } catch (e2) {
      console.error('Telegram photo send error:', e2)
    }
  }
}

// ─── Send File to Telegram ───
async function sendTelegramFile(
  filePath: string,
  caption?: string,
  chatId?: string
): Promise<void> {
  if (!botConfig) return
  const targetId = chatId || botConfig.allowedChatIds[0]
  if (!targetId) return

  try {
    const FormData = (await import('form-data')).default
    const formData = new FormData()
    formData.append('chat_id', targetId)
    formData.append('document', fs.createReadStream(filePath))
    if (caption) formData.append('caption', caption)

    await fetch(`https://api.telegram.org/bot${botConfig.token}/sendDocument`, {
      method: 'POST',
      body: formData as any
    })
  } catch (e) {
    console.error('Telegram file send error:', e)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  COMMAND HANDLERS — Each maps to an existing IRIS feature
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleStatus(): Promise<string> {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const cpuCount = os.cpus().length
  const uptime = (os.uptime() / 3600).toFixed(1)
  const platform = os.platform()
  const hostname = os.hostname()

  return `${EMOJI.pc} <b>IRIS System Status</b>

${EMOJI.cpu} CPU Cores: <b>${cpuCount}</b>
${EMOJI.memory} RAM: <b>${((totalMem - freeMem) / 1024 ** 3).toFixed(1)} / ${(totalMem / 1024 ** 3).toFixed(1)} GB</b> (${(((totalMem - freeMem) / totalMem) * 100).toFixed(1)}%)
⏱️ Uptime: <b>${uptime}h</b>
🖥️ Platform: <b>${platform}</b>
🏠 Hostname: <b>${hostname}</b>
${EMOJI.shield} IRIS: <b>Online & Monitoring</b>`
}

async function handleRunningApps(): Promise<string> {
  try {
    let cmd: string
    if (os.platform() === 'linux') {
      cmd = `ps -e -o comm= | grep -iE '^(chrome|firefox|code|nautilus|gnome-terminal|discord|spotify|telegram|thunderbird|gimp|vlc|eog|gedit|kate|dolphin|konsole|brave|chromium|microsoft-edge|slack|zoom|skype)' | sort -u`
    } else if (os.platform() === 'win32') {
      cmd = `powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -ExpandProperty ProcessName"`
    } else {
      cmd = `osascript -e 'tell application "System Events" to get name of (processes where background only is false)'`
    }

    const { stdout } = await execAsync(cmd)
    const apps = stdout
      .split(/\r?\n|,\s*/)
      .map((a) => a.trim())
      .filter((a) => a)

    if (apps.length === 0) return `${EMOJI.info} No GUI applications detected.`

    const appList = apps.map((a) => `  • <code>${a}</code>`).join('\n')
    return `${EMOJI.pc} <b>Running Applications (${apps.length}):</b>\n\n${appList}`
  } catch (e) {
    return `${EMOJI.error} Could not detect running apps.`
  }
}

async function handleLaunchApp(appName: string): Promise<string> {
  if (!appName) return `${EMOJI.warning} Usage: <code>/launch &lt;app_name&gt;</code>`

  const aliases: Record<string, string> = {
    vscode: 'code',
    chrome: 'google-chrome',
    firefox: 'firefox',
    brave: 'brave-browser',
    terminal: 'gnome-terminal',
    files: 'nautilus',
    nautilus: 'nautilus',
    calculator: 'gnome-calculator',
    settings: 'gnome-control-center',
    notepad: 'gedit',
    discord: 'discord',
    spotify: 'spotify',
    telegram: 'telegram-desktop',
    steam: 'steam',
    camera: 'cheese'
  }

  const cmd = aliases[appName.toLowerCase()] || appName

  try {
    if (os.platform() === 'linux') {
      // Try direct launch
      exec(cmd + ' &', (error) => {
        if (error) {
          // Try .desktop file
          exec(
            `find /usr/share/applications ~/.local/share/applications -maxdepth 1 -iname "*${appName}*.desktop" 2>/dev/null | head -1`,
            (_, __, desktopFile) => {
              if (desktopFile && desktopFile.trim()) {
                exec(`gtk-launch "$(basename "${desktopFile.trim()}" .desktop)" &`)
              }
            }
          )
        }
      })
    } else {
      exec(`start ${cmd}`)
    }
    return `${EMOJI.success} Launched <b>${appName}</b>`
  } catch (e) {
    return `${EMOJI.error} Failed to launch ${appName}: ${(e as Error).message}`
  }
}

async function handleKillApp(appName: string): Promise<string> {
  if (!appName) return `${EMOJI.warning} Usage: <code>/kill &lt;app_name&gt;</code>`

  try {
    if (os.platform() === 'linux') {
      await execAsync(`pkill -f "${appName}"`)
    } else {
      await execAsync(`taskkill /IM "${appName}" /F /T`)
    }
    return `${EMOJI.success} Killed <b>${appName}</b>`
  } catch (e) {
    return `${EMOJI.error} Could not kill ${appName}. Not running?`
  }
}

async function handleTerminal(command: string): Promise<string> {
  if (!command) return `${EMOJI.warning} Usage: <code>/terminal &lt;command&gt;</code>`

  try {
    const shell = os.platform() === 'linux' ? process.env.SHELL || '/bin/bash' : 'powershell.exe'
    const shellArgs = os.platform() === 'linux' ? ['-c', command] : ['-Command', command]

    const { stdout, stderr } = await execAsync(command, {
      shell,
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 5
    })

    let output = ''
    if (stdout) output += stdout
    if (stderr) output += `\n[STDERR]: ${stderr}`

    if (!output.trim()) output = '(No output)'

    return `${EMOJI.terminal} <b>Command:</b> <code>${command}</code>\n\n<pre>${output.substring(0, 3900)}</pre>`
  } catch (e: any) {
    const output = e.stdout || e.stderr || e.message || 'Unknown error'
    return `${EMOJI.terminal} <b>Command:</b> <code>${command}</code>\n${EMOJI.error} <pre>${output.substring(0, 3900)}</pre>`
  }
}

async function handleScreenshot(chatId: string): Promise<string> {
  try {
    const filename = `IRIS_Remote_${Date.now()}.png`
    const savePath = path.join(os.tmpdir(), filename)
    await screenshot({ filename: savePath })

    await sendTelegramPhoto(
      savePath,
      `${EMOJI.camera} Screenshot captured — ${new Date().toLocaleString()}`,
      chatId
    )

    // Cleanup
    setTimeout(() => {
      try {
        fs.unlinkSync(savePath)
      } catch {}
    }, 5000)

    return '' // Photo sent separately
  } catch (e) {
    return `${EMOJI.error} Screenshot failed: ${(e as Error).message}`
  }
}

async function handleBrowseDir(dirPath: string): Promise<string> {
  if (!dirPath) dirPath = os.homedir()

  try {
    // Resolve shortcuts
    if (
      ['desktop', 'documents', 'downloads', 'music', 'pictures', 'videos'].includes(
        dirPath.toLowerCase()
      )
    ) {
      dirPath = path.join(os.homedir(), dirPath.charAt(0).toUpperCase() + dirPath.slice(1))
    } else if (dirPath === 'home' || dirPath === '~') {
      dirPath = os.homedir()
    }

    const stats = fs.statSync(dirPath)
    if (!stats.isDirectory()) return `${EMOJI.error} '${dirPath}' is a file, not a directory.`

    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const items = entries
      .filter((d) => !d.name.startsWith('.'))
      .slice(0, 50)
      .map((d) => {
        const icon = d.isDirectory() ? '📁' : '📄'
        return `  ${icon} ${d.name}${d.isDirectory() ? '/' : ''}`
      })

    return `${EMOJI.file} <b>Directory:</b> <code>${dirPath}</code>\n<b>Items:</b> ${items.length}\n\n${items.join('\n')}`
  } catch (e) {
    return `${EMOJI.error} Cannot read directory: ${(e as Error).message}`
  }
}

async function handleReadFile(filePath: string): Promise<string> {
  if (!filePath) return `${EMOJI.warning} Usage: <code>/read &lt;file_path&gt;</code>`

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const truncated =
      content.length > 3500 ? content.substring(0, 3500) + '\n...(truncated)' : content
    return `${EMOJI.file} <b>File:</b> <code>${filePath}</code>\n\n<pre>${truncated}</pre>`
  } catch (e) {
    return `${EMOJI.error} Cannot read file: ${(e as Error).message}`
  }
}

async function handleSearchFiles(query: string): Promise<string> {
  if (!query) return `${EMOJI.warning} Usage: <code>/search &lt;filename&gt;</code>`

  try {
    // Use 'find' command for fast native search
    const home = os.homedir()
    const cmd = `find "${home}" -maxdepth 5 -iname "*${query}*" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.cache/*" 2>/dev/null | head -20`

    const { stdout } = await execAsync(cmd, { timeout: 15000 })
    const results = stdout.split('\n').filter((r) => r.trim())

    if (results.length === 0) return `${EMOJI.search} No files found matching '${query}'`

    const fileList = results.map((r) => `  📄 <code>${r}</code>`).join('\n')
    return `${EMOJI.search} <b>Search:</b> "${query}"\n<b>Found:</b> ${results.length} results\n\n${fileList}`
  } catch (e) {
    return `${EMOJI.search} No files found matching '${query}'`
  }
}

async function handleSaveNote(text: string): Promise<string> {
  if (!text) return `${EMOJI.warning} Usage: <code>/note &lt;text&gt;</code>`

  try {
    const notesDir = path.resolve(app.getPath('userData'), 'Notes')
    if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true })

    const title = text
      .substring(0, 30)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
    const filePath = path.join(notesDir, `${title}.md`)
    const content = `# ${text.substring(0, 30)}\n\n${text}\n\n_Saved via Telegram — ${new Date().toISOString()}_`

    fs.writeFileSync(filePath, content, 'utf-8')
    return `${EMOJI.success} Note saved: <code>${title}.md</code>`
  } catch (e) {
    return `${EMOJI.error} Failed to save note: ${(e as Error).message}`
  }
}

async function handleListNotes(): Promise<string> {
  try {
    const notesDir = path.resolve(app.getPath('userData'), 'Notes')
    if (!fs.existsSync(notesDir)) return `${EMOJI.info} No notes yet.`

    const files = fs.readdirSync(notesDir).filter((f) => f.endsWith('.md'))
    if (files.length === 0) return `${EMOJI.info} No notes found.`

    const list = files.map((f) => `  ${EMOJI.note} ${f.replace('.md', '')}`).join('\n')
    return `${EMOJI.note} <b>Notes (${files.length}):</b>\n\n${list}`
  } catch (e) {
    return `${EMOJI.error} Failed to list notes.`
  }
}

async function handleWeather(city: string): Promise<string> {
  if (!city) return `${EMOJI.warning} Usage: <code>/weather &lt;city&gt;</code>`

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    )
    const geoData = await geoRes.json()
    if (!geoData.results?.length) return `${EMOJI.error} City not found: ${city}`

    const loc = geoData.results[0]
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
    )
    const w = (await weatherRes.json()).current

    return `${EMOJI.weather} <b>Weather in ${loc.name}, ${loc.country}</b>

🌡️ Temperature: <b>${w.temperature_2m}°C</b>
💧 Humidity: <b>${w.relative_humidity_2m}%</b>
💨 Wind: <b>${w.wind_speed_10m} km/h</b>
📋 Code: <b>${w.weather_code}</b>`
  } catch (e) {
    return `${EMOJI.error} Weather fetch failed.`
  }
}

async function handleStock(ticker: string): Promise<string> {
  if (!ticker) return `${EMOJI.warning} Usage: <code>/stock &lt;ticker&gt;</code>`

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=5m`
    )
    const data = await res.json()
    if (!data.chart?.result) return `${EMOJI.error} Invalid ticker: ${ticker}`

    const meta = data.chart.result[0].meta
    const change = meta.regularMarketPrice - meta.chartPreviousClose
    const pct = ((change / meta.chartPreviousClose) * 100).toFixed(2)
    const arrow = change >= 0 ? '📈' : '📉'

    return `${EMOJI.chart} <b>${meta.symbol}</b>

💰 Price: <b>${meta.regularMarketPrice} ${meta.currency}</b>
${arrow} Change: <b>${change >= 0 ? '+' : ''}${change.toFixed(2)} (${pct}%)</b>
📊 Previous Close: ${meta.chartPreviousClose}`
  } catch (e) {
    return `${EMOJI.error} Stock fetch failed for ${ticker}.`
  }
}

async function handleSetVolume(level: string): Promise<string> {
  const pct = parseInt(level)
  if (isNaN(pct) || pct < 0 || pct > 100)
    return `${EMOJI.warning} Usage: <code>/volume &lt;0-100&gt;</code>`

  try {
    if (os.platform() === 'linux') {
      await execAsync(`pactl set-sink-volume @DEFAULT_SINK@ ${pct}%`)
    } else {
      // Windows
      await execAsync(`powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]174)" `)
    }
    return `${EMOJI.music} Volume set to <b>${pct}%</b>`
  } catch (e) {
    return `${EMOJI.error} Volume control failed.`
  }
}

async function handleLockScreen(): Promise<string> {
  try {
    if (os.platform() === 'linux') {
      exec('gnome-screensaver-command -l || loginctl lock-session')
    } else if (os.platform() === 'win32') {
      exec('rundll32.exe user32.dll,LockWorkStation')
    } else {
      exec('pmset displaysleepnow')
    }
    return `${EMOJI.lock} Screen locked!`
  } catch (e) {
    return `${EMOJI.error} Lock failed.`
  }
}

async function handleWebSearch(query: string): Promise<string> {
  if (!query) return `${EMOJI.warning} Usage: <code>/web &lt;query&gt;</code>`

  try {
    // Open in browser on PC
    shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`)
    return `${EMOJI.globe} Opened browser search for: <b>${query}</b>`
  } catch (e) {
    return `${EMOJI.error} Web search failed.`
  }
}

async function handleOpenFile(filePath: string): Promise<string> {
  if (!filePath) return `${EMOJI.warning} Usage: <code>/open &lt;file_path&gt;</code>`

  try {
    await shell.openPath(filePath)
    return `${EMOJI.success} Opened: <code>${filePath}</code>`
  } catch (e) {
    return `${EMOJI.error} Cannot open: ${(e as Error).message}`
  }
}

async function handleLocation(): Promise<string> {
  try {
    const res = await fetch(
      'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en'
    )
    const data = await res.json()

    return `${EMOJI.phone} <b>PC Location</b>

📍 <b>${data.city || 'Unknown'}, ${data.principalSubdivision || ''}, ${data.countryName || 'Unknown'}</b>
🌐 Lat: ${data.latitude}, Lon: ${data.longitude}
🕐 Timezone: ${data.timeZone?.name || 'Unknown'}`
  } catch (e) {
    return `${EMOJI.error} Location unavailable.`
  }
}

async function handleGetFile(filePath: string, chatId: string): Promise<string> {
  if (!filePath) return `${EMOJI.warning} Usage: <code>/getfile &lt;path&gt;</code>`

  try {
    if (!fs.existsSync(filePath)) return `${EMOJI.error} File not found: ${filePath}`
    await sendTelegramFile(filePath, `${EMOJI.file} ${path.basename(filePath)}`, chatId)
    return ''
  } catch (e) {
    return `${EMOJI.error} Cannot send file: ${(e as Error).message}`
  }
}

async function handleWormhole(port: string): Promise<string> {
  if (!port) return `${EMOJI.warning} Usage: <code>/wormhole &lt;port&gt;</code>`

  try {
    const { startTunnel } = await import('untun')
    const tunnel = await startTunnel({ port: parseInt(port), acceptCloudflareNotice: true })
    const url = await tunnel.getURL()

    return `${EMOJI.wormhole} <b>Wormhole Open!</b>

${EMOJI.link} Public URL: <code>${url}</code>
🔌 Local Port: <code>${port}</code>

Anyone on the internet can access your local server.`
  } catch (e) {
    return `${EMOJI.error} Wormhole failed: ${(e as Error).message}`
  }
}

async function handleDownloadFile(url: string, savePath?: string): Promise<string> {
  if (!url) return `${EMOJI.warning} Usage: <code>/download &lt;url&gt; [save_path]</code>`

  try {
    const fileName = path.basename(new URL(url).pathname) || `download_${Date.now()}`
    const target = savePath || path.join(os.homedir(), 'Downloads', fileName)

    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(target, buffer)

    return `${EMOJI.success} Downloaded to: <code>${target}</code>\n📦 Size: <b>${(buffer.length / 1024).toFixed(1)} KB</b>`
  } catch (e) {
    return `${EMOJI.error} Download failed: ${(e as Error).message}`
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🤖 AI COMMAND — UNIVERSAL AGENT DISPATCH
//  Every message → classify intent → spawn agent → return immediately
//  Main thread stays FREE. Agent delivers result when ready.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleAICommand(userMessage: string, chatId: string): Promise<string> {
  // ── Build fallback key chain ──
  const keys = {
    geminiKey: botConfig?.geminiKey || '',
    groqKey: botConfig?.groqKey || (getStore().get('iris_groq_api_key') as string) || '',
    hfKey: (getStore().get('iris_hf_api_key') as string) || '',
    ollamaUrl: 'http://localhost:11434'
  }

  if (!keys.geminiKey && !keys.groqKey && !keys.hfKey) {
    return `${EMOJI.error} No AI keys configured. Set Gemini, Groq, or HuggingFace key in Settings.`
  }

  // ── Check if this is a task/reminder request ──
  // "remind me tomorrow..." → Create task, don't spawn agent
  if (ProceduralMemory.isTaskRequest(userMessage)) {
    const task = ProceduralMemory.createFromNL(userMessage, 'telegram', chatId)
    if (task) {
      SharedConsciousness.broadcastFromTelegram(
        'task',
        { title: task.title, dueAt: task.dueAt },
        `New task from Telegram: ${task.title}`
      )
      const dueStr = task.dueAt
        ? `Due: <b>${new Date(task.dueAt).toLocaleString()}</b>`
        : 'No deadline'
      return `⏰ Task created!\n\n📝 <b>${task.title}</b>\n${dueStr}\nRecurrence: ${task.recurrence}\n\nI'll notify you when it's time! Desktop also synced. 🧠`
    }
    // If parsing failed, fall through to agent dispatch
  }

  // ── UNIVERSAL DISPATCH: Every message → Agent ──
  // Intent classified locally (zero AI cost, instant)
  // Agent spawned in background — main returns immediately
  try {
    const { agent, spawnMessage } = await Orchestrator.dispatch(userMessage, {
      chatId,
      source: 'telegram',
      keys
    })

    // Return spawn message IMMEDIATELY — main is FREE for next message
    return spawnMessage
  } catch (e) {
    return `${EMOJI.error} Agent dispatch failed: ${(e as Error).message}`
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ALL 31 MISSING COMMAND HANDLERS — NOW ADDED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ──── GHOST: DESKTOP CONTROL ────

async function handleGhostType(text: string): Promise<string> {
  if (!text) return `${EMOJI.warning} Usage: <code>/type &lt;text&gt;</code>`
  try {
    const { keyboard } = await import('@nut-tree-fork/nut-js')
    await keyboard.type(text)
    return `${EMOJI.success} Typed: <code>${text.substring(0, 100)}</code>`
  } catch (e) {
    return `${EMOJI.error} Ghost type failed`
  }
}

async function handleGhostClick(args: string): Promise<string> {
  const [xStr, yStr] = args.split(' ')
  const x = parseInt(xStr),
    y = parseInt(yStr)
  if (isNaN(x) || isNaN(y)) return `${EMOJI.warning} Usage: <code>/click &lt;x&gt; &lt;y&gt;</code>`
  try {
    const { mouse } = await import('@nut-tree-fork/nut-js')
    await mouse.leftClick()
    return `${EMOJI.success} Clicked at (${x}, ${y})`
  } catch (e) {
    return `${EMOJI.error} Ghost click failed`
  }
}

async function handleGhostScroll(direction: string): Promise<string> {
  if (!['up', 'down'].includes(direction))
    return `${EMOJI.warning} Usage: <code>/scroll up|down</code>`
  try {
    const { mouse } = await import('@nut-tree-fork/nut-js')
    if (direction === 'up') await mouse.scrollUp(500)
    else await mouse.scrollDown(500)
    return `${EMOJI.success} Scrolled ${direction}`
  } catch (e) {
    return `${EMOJI.error} Scroll failed`
  }
}

async function handleGhostShortcut(keys: string): Promise<string> {
  if (!keys) return `${EMOJI.warning} Usage: <code>/shortcut ctrl+c</code>`
  try {
    const { keyboard, Key } = await import('@nut-tree-fork/nut-js')
    const keyMap: Record<string, any> = {
      ctrl: Key.LeftControl,
      alt: Key.LeftAlt,
      shift: Key.LeftShift,
      super: Key.LeftSuper,
      win: Key.LeftSuper,
      enter: Key.Enter,
      tab: Key.Tab,
      esc: Key.Escape,
      space: Key.Space,
      backspace: Key.Backspace,
      f5: Key.F5,
      f11: Key.F11,
      a: Key.A,
      b: Key.B,
      c: Key.C,
      d: Key.D,
      e: Key.E,
      f: Key.F,
      g: Key.G,
      h: Key.H,
      i: Key.I,
      j: Key.J,
      k: Key.K,
      l: Key.L,
      m: Key.M,
      n: Key.N,
      o: Key.O,
      p: Key.P,
      q: Key.Q,
      r: Key.R,
      s: Key.S,
      t: Key.T,
      u: Key.U,
      v: Key.V,
      w: Key.W,
      x: Key.X,
      y: Key.Y,
      z: Key.Z
    }
    const parts = keys.toLowerCase().split('+')
    const mapped = parts.map((p) => keyMap[p.trim()]).filter(Boolean)
    if (mapped.length === 0) return `${EMOJI.error} Unknown keys: ${keys}`
    for (const k of mapped) await keyboard.pressKey(k)
    await new Promise((r) => setTimeout(r, 50))
    for (const k of mapped.reverse()) await keyboard.releaseKey(k)
    return `${EMOJI.success} Pressed: <code>${keys}</code>`
  } catch (e) {
    return `${EMOJI.error} Shortcut failed`
  }
}

async function handleTeleportWindow(args: string): Promise<string> {
  const parts = args.split(' ')
  const position = parts[parts.length - 1]?.toLowerCase()
  const appName = parts.slice(0, -1).join(' ') || parts[0]
  const valid = [
    'left',
    'right',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    'max',
    'maximize'
  ]
  if (!appName || !valid.includes(position))
    return `${EMOJI.warning} Usage: <code>/teleport &lt;app&gt; left|right|max</code>`
  try {
    const { windowManager } = await import('node-window-manager')
    windowManager.requestAccessibility()
    const windows = windowManager.getWindows()
    const target = windows.find(
      (w) =>
        w.getTitle().toLowerCase().includes(appName.toLowerCase()) ||
        w.path.toLowerCase().includes(appName.toLowerCase())
    )
    if (!target) return `${EMOJI.error} Window '${appName}' not found`
    if (position === 'max' || position === 'maximize') {
      target.maximize()
      return `${EMOJI.success} Maximized ${appName}`
    }
    // Use electron screen if available, else defaults
    const display = mainWindow?.getDisplay ? mainWindow.getBounds() : { width: 1920, height: 1080 }
    const w = 1920,
      h = 1080
    const hW = Math.floor(w / 2),
      hH = Math.floor(h / 2)
    const bounds: Record<string, any> = {
      left: { x: 0, y: 0, width: hW, height: h },
      right: { x: hW, y: 0, width: hW, height: h },
      'top-left': { x: 0, y: 0, width: hW, height: hH },
      'bottom-left': { x: 0, y: hH, width: hW, height: hH },
      'top-right': { x: hW, y: 0, width: hW, height: hH },
      'bottom-right': { x: hW, y: hH, width: hW, height: hH }
    }
    target.setBounds(bounds[position] || { x: 0, y: 0, width: w, height: h })
    return `${EMOJI.success} ${appName} → <b>${position}</b>`
  } catch (e) {
    return `${EMOJI.error} Teleport failed: ${(e as Error).message}`
  }
}

async function handleSmartDropZones(): Promise<string> {
  return `${EMOJI.info} Smart Drop Zones require GUI. Use the desktop app.`
}

// ──── FILE OPS: WRITE / COPY / MOVE / DELETE / MKDIR ────

async function handleWriteFile(args: string): Promise<string> {
  const idx = args.indexOf(' ')
  if (idx === -1) return `${EMOJI.warning} Usage: <code>/write &lt;path&gt; &lt;content&gt;</code>`
  try {
    fs.writeFileSync(args.substring(0, idx), args.substring(idx + 1), 'utf-8')
    return `${EMOJI.success} File written to <code>${args.substring(0, idx)}</code>`
  } catch (e) {
    return `${EMOJI.error} Write failed: ${(e as Error).message}`
  }
}

async function handleFileCopy(args: string): Promise<string> {
  const p = args.split(' ')
  if (p.length < 2) return `${EMOJI.warning} Usage: <code>/copy &lt;src&gt; &lt;dest&gt;</code>`
  try {
    fs.cpSync(p[0], p[1], { recursive: true })
    return `${EMOJI.success} Copied`
  } catch (e) {
    return `${EMOJI.error} Copy failed`
  }
}

async function handleFileMove(args: string): Promise<string> {
  const p = args.split(' ')
  if (p.length < 2) return `${EMOJI.warning} Usage: <code>/move &lt;src&gt; &lt;dest&gt;</code>`
  try {
    fs.renameSync(p[0], p[1])
    return `${EMOJI.success} Moved`
  } catch (e) {
    return `${EMOJI.error} Move failed`
  }
}

async function handleFileDelete(fp: string): Promise<string> {
  if (!fp) return `${EMOJI.warning} Usage: <code>/delete &lt;path&gt;</code>`
  try {
    fs.rmSync(fp, { recursive: true, force: true })
    return `${EMOJI.success} Deleted`
  } catch (e) {
    return `${EMOJI.error} Delete failed`
  }
}

async function handleMkdir(dp: string): Promise<string> {
  if (!dp) return `${EMOJI.warning} Usage: <code>/mkdir &lt;path&gt;</code>`
  try {
    fs.mkdirSync(dp, { recursive: true })
    return `${EMOJI.success} Created: <code>${dp}</code>`
  } catch (e) {
    return `${EMOJI.error} Mkdir failed`
  }
}

// ──── EMAIL ────

async function handleEmail(args: string, chatId: string): Promise<string> {
  if (!args) return `${EMOJI.warning} Usage: <code>/email read|send|draft</code>`
  const sub = args.split(' ')[0].toLowerCase()
  const rest = args.split(' ').slice(1).join(' ')
  if (sub === 'read') {
    return `${EMOJI.info} Email reading requires OAuth. Connect Gmail in desktop Settings first.`
  }
  if (sub === 'send' || sub === 'draft') {
    const parts = rest.split('|')
    if (parts.length < 3)
      return `${EMOJI.warning} Usage: <code>/email send to@x.com|Subject|Body</code>`
    return `${EMOJI.info} Email requires OAuth. Connect Gmail in desktop Settings, then I can send to ${parts[0]}.`
  }
  return `${EMOJI.warning} Usage: <code>/email read|send|draft</code>`
}

// ──── WHATSAPP & SPOTIFY ────

async function handleWhatsApp(args: string): Promise<string> {
  if (!args) return `${EMOJI.warning} Usage: <code>/whatsapp name|message</code>`
  const parts = args.split('|')
  if (parts.length < 2) return `${EMOJI.warning} Usage: <code>/whatsapp name|message</code>`
  try {
    await handleLaunchApp('whatsapp')
    await new Promise((r) => setTimeout(r, 3000))
    const { keyboard, Key } = await import('@nut-tree-fork/nut-js')
    await keyboard.pressKey(Key.LeftControl, Key.N)
    await keyboard.releaseKey(Key.N, Key.LeftControl)
    await new Promise((r) => setTimeout(r, 500))
    await keyboard.type(parts[0])
    await new Promise((r) => setTimeout(r, 500))
    await keyboard.pressKey(Key.Down)
    await keyboard.releaseKey(Key.Down)
    await keyboard.pressKey(Key.Enter)
    await keyboard.releaseKey(Key.Enter)
    await new Promise((r) => setTimeout(r, 500))
    await keyboard.type(parts[1])
    await keyboard.pressKey(Key.Enter)
    await keyboard.releaseKey(Key.Enter)
    return `${EMOJI.success} WhatsApp message sent to <b>${parts[0]}</b>`
  } catch (e) {
    return `${EMOJI.error} WhatsApp failed`
  }
}

async function handleSpotify(songName: string): Promise<string> {
  if (!songName) return `${EMOJI.warning} Usage: <code>/spotify &lt;song&gt;</code>`
  try {
    await handleLaunchApp('spotify')
    await new Promise((r) => setTimeout(r, 5000))
    const { keyboard, Key } = await import('@nut-tree-fork/nut-js')
    await keyboard.pressKey(Key.LeftControl, Key.K)
    await keyboard.releaseKey(Key.K, Key.LeftControl)
    await new Promise((r) => setTimeout(r, 800))
    await keyboard.pressKey(Key.LeftControl, Key.A)
    await keyboard.releaseKey(Key.A, Key.LeftControl)
    await keyboard.pressKey(Key.Backspace)
    await keyboard.releaseKey(Key.Backspace)
    await keyboard.type(songName)
    await new Promise((r) => setTimeout(r, 800))
    await keyboard.pressKey(Key.Enter)
    await keyboard.releaseKey(Key.Enter)
    await new Promise((r) => setTimeout(r, 1500))
    await keyboard.pressKey(Key.Tab)
    await keyboard.releaseKey(Key.Tab)
    await new Promise((r) => setTimeout(r, 200))
    await keyboard.pressKey(Key.Tab)
    await keyboard.releaseKey(Key.Tab)
    await new Promise((r) => setTimeout(r, 200))
    await keyboard.pressKey(Key.Enter)
    await keyboard.releaseKey(Key.Enter)
    await new Promise((r) => setTimeout(r, 200))
    await keyboard.pressKey(Key.Enter)
    await keyboard.releaseKey(Key.Enter)
    return `${EMOJI.music} Now playing <b>${songName}</b>`
  } catch (e) {
    return `${EMOJI.error} Spotify failed`
  }
}

// ──── IMAGE GENERATION ────

async function handleImageGeneration(prompt: string, chatId: string): Promise<string> {
  if (!prompt) return `${EMOJI.warning} Usage: <code>/image &lt;prompt&gt;</code>`
  const hfKey = (getStore().get('iris_hf_api_key') as string) || ''
  if (!hfKey) return `${EMOJI.error} HuggingFace key required in Settings`
  try {
    await sendTelegram(`${EMOJI.spark} Generating: "${prompt}"...`, chatId)
    const { InferenceClient } = await import('@huggingface/inference')
    const client = new InferenceClient(hfKey)
    const blob: any = await client.textToImage({
      model: 'black-forest-labs/FLUX.1-schnell',
      inputs: prompt
    })
    const buffer = Buffer.from(await blob.arrayBuffer())
    const tmp = path.join(os.tmpdir(), `iris_gen_${Date.now()}.png`)
    fs.writeFileSync(tmp, buffer)
    // save to gallery
    const gDir = path.resolve(app.getPath('userData'), 'Gallery')
    if (!fs.existsSync(gDir)) fs.mkdirSync(gDir, { recursive: true })
    fs.writeFileSync(
      path.join(gDir, `${prompt.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}_${Date.now()}.png`),
      buffer
    )
    await sendTelegramPhoto(tmp, `${EMOJI.spark} Generated: "${prompt}"`, chatId)
    setTimeout(() => {
      try {
        fs.unlinkSync(tmp)
      } catch {}
    }, 5000)
    return ''
  } catch (e: any) {
    if (e.message?.includes('503')) return `${EMOJI.warning} Model loading. Try again in 20s.`
    return `${EMOJI.error} Image failed: ${e.message}`
  }
}

// ──── WEBSITE BUILDER ────

async function handleWebsiteBuild(description: string, chatId: string): Promise<string> {
  if (!description) return `${EMOJI.warning} Usage: <code>/website &lt;desc&gt;</code>`
  if (!botConfig?.geminiKey) return `${EMOJI.error} Gemini key required`
  try {
    await sendTelegram(`${EMOJI.terminal} Building website: "${description}"... ~30s`, chatId)
    const ai = new GoogleGenAI({ apiKey: botConfig.geminiKey })
    const resp = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Build a single HTML file for: "${description}". Tailwind CDN, animated. ONLY raw HTML.`
    })
    let html = (resp.text || '')
      .replace(/^```html\n?/, '')
      .replace(/```$/, '')
      .trim()
    const savePath = path.join(os.homedir(), 'Desktop', `iris_site_${Date.now()}.html`)
    fs.writeFileSync(savePath, html, 'utf-8')
    await sendTelegramFile(savePath, `${EMOJI.globe} Website: "${description}"`, chatId)
    shell.openPath(savePath)
    return ''
  } catch (e) {
    return `${EMOJI.error} Build failed: ${(e as Error).message}`
  }
}

// ──── VISION & OCR ────

async function handleVision(chatId: string): Promise<string> {
  if (!botConfig?.geminiKey) return `${EMOJI.error} Gemini key required`
  try {
    await sendTelegram(`${EMOJI.camera} Analyzing screen...`, chatId)
    const tmp = path.join(os.tmpdir(), `vis_${Date.now()}.png`)
    await screenshot({ filename: tmp })
    const b64 = fs.readFileSync(tmp).toString('base64')
    const ai = new GoogleGenAI({ apiKey: botConfig.geminiKey })
    const resp = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          {
            text: 'Describe what you see on this screen in detail. List apps, code, errors, info.'
          },
          { inlineData: { mimeType: 'image/png', data: b64 } }
        ]
      }
    })
    setTimeout(() => {
      try {
        fs.unlinkSync(tmp)
      } catch {}
    }, 5000)
    return `${EMOJI.brain} <b>Screen Analysis:</b>\n\n${(resp.text || '?').substring(0, 3500)}`
  } catch (e) {
    return `${EMOJI.error} Vision failed`
  }
}

async function handleOCR(chatId: string): Promise<string> {
  if (!botConfig?.geminiKey) return `${EMOJI.error} Gemini key required`
  try {
    await sendTelegram(`${EMOJI.camera} Extracting text...`, chatId)
    const tmp = path.join(os.tmpdir(), `ocr_${Date.now()}.png`)
    await screenshot({ filename: tmp })
    const b64 = fs.readFileSync(tmp).toString('base64')
    const ai = new GoogleGenAI({ apiKey: botConfig.geminiKey })
    const resp = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          {
            text: 'Extract ALL text/code visible. Preserve formatting. Output exactly as visible.'
          },
          { inlineData: { mimeType: 'image/png', data: b64 } }
        ]
      }
    })
    setTimeout(() => {
      try {
        fs.unlinkSync(tmp)
      } catch {}
    }, 5000)
    return `${EMOJI.file} <b>OCR Result:</b>\n\n<pre>${(resp.text || 'No text').substring(0, 3500)}</pre>`
  } catch (e) {
    return `${EMOJI.error} OCR failed`
  }
}

// ──── DEEP RESEARCH ────

async function handleDeepResearch(query: string): Promise<string> {
  if (!query) return `${EMOJI.warning} Usage: <code>/research &lt;topic&gt;</code>`
  const tKey = (getStore().get('iris_tailvy_api_key') as string) || ''
  const gKey = (getStore().get('iris_groq_api_key') as string) || botConfig?.groqKey || ''
  if (!tKey || !gKey) return `${EMOJI.error} Tavily + Groq keys required`
  try {
    const { tavily } = await import('@tavily/core')
    const tvly = tavily({ apiKey: tKey })
    const data = await tvly.search(query, {
      searchDepth: 'advanced',
      includeAnswer: true,
      maxResults: 5
    })
    const ctx = data.results.map((r: any) => `${r.url}\n${r.content}`).join('\n\n')
    const Groq = (await import('groq-sdk')).default
    const groq = new Groq({ apiKey: gKey })
    const c = await groq.chat.completions.create({
      messages: [
        { role: 'user', content: `Research: "${query}"\nContext:\n${ctx}\n\nDetailed summary:` }
      ],
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' }
    })
    const summary = JSON.parse(c.choices[0]?.message?.content || '{}').summary || 'No data'
    return `${EMOJI.search} <b>Research:</b> "${query}"\n\n${summary.substring(0, 3500)}`
  } catch (e) {
    return `${EMOJI.error} Research failed: ${(e as Error).message}`
  }
}

// ──── ORACLE / INGEST / INDEX ────

async function handleOracleQuery(q: string): Promise<string> {
  if (!q) return `${EMOJI.warning} Usage: <code>/oracle &lt;question&gt;</code>`
  return `${EMOJI.info} Use <code>/ingest &lt;path&gt;</code> first to load codebase, then ask questions.`
}

async function handleIngestCodebase(dp: string): Promise<string> {
  if (!dp) return `${EMOJI.warning} Usage: <code>/ingest &lt;dir&gt;</code>`
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('telegram-command', { action: 'ingest', path: dp })
  return `${EMOJI.success} Ingestion started for <code>${dp}</code>`
}

async function handleIndexDirectory(dp: string): Promise<string> {
  if (!dp) return `${EMOJI.warning} Usage: <code>/index &lt;dir&gt;</code>`
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('telegram-command', { action: 'index', path: dp })
  return `${EMOJI.success} Indexing started for <code>${dp}</code>`
}

// ──── CODE GENERATION & REVIEW ────

async function handleCodeGen(desc: string, chatId: string): Promise<string> {
  if (!desc) return `${EMOJI.warning} Usage: <code>/code &lt;desc&gt;</code>`
  if (!botConfig?.geminiKey) return `${EMOJI.error} Gemini key required`
  try {
    await sendTelegram(`${EMOJI.terminal} Coding: "${desc}"...`, chatId)
    const ai = new GoogleGenAI({ apiKey: botConfig.geminiKey })
    const r = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Write code for: "${desc}". ONLY raw code. No markdown.`
    })
    let code = (r.text || '')
      .replace(/^```\w*\n?/, '')
      .replace(/```$/, '')
      .trim()
    const pDir = path.resolve(app.getPath('userData'), 'Projects')
    if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true })
    const fp = path.join(pDir, `tg_code_${Date.now()}.txt`)
    fs.writeFileSync(fp, code, 'utf-8')
    await sendTelegramFile(fp, `${EMOJI.terminal} Code: "${desc}"`, chatId)
    return ''
  } catch (e) {
    return `${EMOJI.error} Code gen failed`
  }
}

async function handleCodeReview(fp: string): Promise<string> {
  if (!fp) return `${EMOJI.warning} Usage: <code>/review &lt;filepath&gt;</code>`
  if (!botConfig?.geminiKey) return `${EMOJI.error} Gemini key required`
  try {
    if (!fs.existsSync(fp)) return `${EMOJI.error} Not found: ${fp}`
    const content = fs.readFileSync(fp, 'utf-8')
    if (content.length > 20000) return `${EMOJI.error} File too large (>20KB)`
    const ai = new GoogleGenAI({ apiKey: botConfig.geminiKey })
    const r = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Review this code. Bugs? Security? Performance? Suggestions? Rating /10.\n\n${content}`
    })
    return `${EMOJI.brain} <b>Review: ${path.basename(fp)}</b>\n\n${(r.text || '?').substring(0, 3500)}`
  } catch (e) {
    return `${EMOJI.error} Review failed`
  }
}

// ──── SMART FILE SEARCH ────

async function handleSmartFileSearch(query: string): Promise<string> {
  if (!query) return `${EMOJI.warning} Usage: <code>/smartsearch &lt;query&gt;</code>`
  const gKey = (getStore().get('iris_groq_api_key') as string) || botConfig?.groqKey || ''
  if (!gKey) return await handleSearchFiles(query)
  try {
    const Groq = (await import('groq-sdk')).default
    const groq = new Groq({ apiKey: gKey })
    const c = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `Extract search keywords: "${query}". JSON: {"keywords":["k1","k2"]}`
        }
      ],
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' }
    })
    const kws = JSON.parse(c.choices[0]?.message?.content || '{"keywords":[]}').keywords || []
    if (!kws.length) return await handleSearchFiles(query)
    const findArgs = kws.map((k) => `-iname "*${k}*"`).join(' -a ')
    const { stdout } = await execAsync(
      `find "${os.homedir()}" -maxdepth 5 ${findArgs} -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -20`,
      { timeout: 15000 }
    )
    const results = stdout.split('\n').filter((r) => r.trim())
    if (!results.length) return `${EMOJI.search} No results for "${query}" (${kws.join(', ')})`
    return `${EMOJI.search} <b>Smart:</b> "${query}" [${kws.join(', ')}]\n\n${results.map((r) => `📄 <code>${r}</code>`).join('\n')}`
  } catch (e) {
    return await handleSearchFiles(query)
  }
}

// ──── MEMORY ────

async function handleRemember(fact: string): Promise<string> {
  if (!fact) return `${EMOJI.warning} Usage: <code>/remember &lt;fact&gt;</code>`
  try {
    const mDir = path.resolve(app.getPath('userData'), 'Memory')
    if (!fs.existsSync(mDir)) fs.mkdirSync(mDir, { recursive: true })
    const mFile = path.join(mDir, 'saved-user-memory.json')
    let bank: any[] = []
    try {
      bank = JSON.parse(fs.readFileSync(mFile, 'utf-8'))
    } catch {}
    bank.push({ fact, timestamp: new Date().toISOString(), source: 'telegram' })
    fs.writeFileSync(mFile, JSON.stringify(bank, null, 2))
    return `${EMOJI.brain} Remembered: <b>${fact}</b> (${bank.length} total)`
  } catch (e) {
    return `${EMOJI.error} Memory failed`
  }
}

async function handleRecall(): Promise<string> {
  try {
    const mFile = path.resolve(app.getPath('userData'), 'Memory', 'saved-user-memory.json')
    if (!fs.existsSync(mFile)) return `${EMOJI.info} No memories yet`
    const bank = JSON.parse(fs.readFileSync(mFile, 'utf-8'))
    if (!bank.length) return `${EMOJI.info} Empty`
    return `${EMOJI.brain} <b>Memory (${bank.length}):</b>\n\n${bank
      .slice(-20)
      .reverse()
      .map((m: any) => `  ${EMOJI.brain} ${m.fact}`)
      .join('\n')}`
  } catch (e) {
    return `${EMOJI.error} Recall failed`
  }
}

// ──── STOCKS COMPARE ────

async function handleCompareStocks(args: string): Promise<string> {
  const [t1, t2] = args.split(' ')
  if (!t1 || !t2) return `${EMOJI.warning} Usage: <code>/stocks TSLA AAPL</code>`
  try {
    const [r1, r2] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${t1}?range=1d&interval=5m`).then(
        (r) => r.json()
      ),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${t2}?range=1d&interval=5m`).then(
        (r) => r.json()
      )
    ])
    const m1 = r1.chart?.result?.[0]?.meta,
      m2 = r2.chart?.result?.[0]?.meta
    if (!m1 || !m2) return `${EMOJI.error} Invalid tickers`
    const c1 = m1.regularMarketPrice - m1.chartPreviousClose
    const c2 = m2.regularMarketPrice - m2.chartPreviousClose
    return `${EMOJI.chart} <b>${m1.symbol}</b>: ${m1.regularMarketPrice} (${c1 >= 0 ? '+' : ''}${((c1 / m1.chartPreviousClose) * 100).toFixed(2)}%)
<b>${m2.symbol}</b>: ${m2.regularMarketPrice} (${c2 >= 0 ? '+' : ''}${((c2 / m2.chartPreviousClose) * 100).toFixed(2)}%)
${c1 > c2 ? `${m1.symbol} winning 🏆` : `${m2.symbol} winning 🏆`}`
  } catch (e) {
    return `${EMOJI.error} Compare failed`
  }
}

// ──── MAP / NAVIGATE ────

async function handleMap(place: string): Promise<string> {
  if (!place) return `${EMOJI.warning} Usage: <code>/map &lt;place&gt;</code>`
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`
    )
    const d = await r.json()
    if (!d.length) return `${EMOJI.error} Not found: ${place}`
    shell.openExternal(`https://www.openstreetmap.org/?mlat=${d[0].lat}&mlon=${d[0].lon}`)
    return `${EMOJI.globe} Map: <b>${d[0].display_name.split(',')[0]}</b>`
  } catch (e) {
    return `${EMOJI.error} Map failed`
  }
}

async function handleNavigation(args: string): Promise<string> {
  const p = args.split('|')
  if (p.length < 2) return `${EMOJI.warning} Usage: <code>/navigate from|to</code>`
  shell.openExternal(
    `https://www.google.com/maps/dir/${encodeURIComponent(p[0])}/${encodeURIComponent(p[1])}`
  )
  return `${EMOJI.globe} Navigation: <b>${p[0]}</b> → <b>${p[1]}</b>`
}

// ──── HACK / GALLERY ────

async function handleHackWebsite(url: string): Promise<string> {
  if (!url) return `${EMOJI.warning} Usage: <code>/hack &lt;url&gt;</code>`
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('telegram-command', { action: 'hack', url })
  return `${EMOJI.ghost} Reality hack on <code>${url}</code>. Check desktop.`
}

async function handleGallery(): Promise<string> {
  try {
    const gDir = path.resolve(app.getPath('userData'), 'Gallery')
    if (!fs.existsSync(gDir)) return `${EMOJI.info} No gallery yet`
    const files = fs.readdirSync(gDir).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    if (!files.length) return `${EMOJI.info} Empty`
    return `${EMOJI.camera} <b>Gallery (${files.length}):</b>\n${files
      .slice(-5)
      .reverse()
      .map((f) => `  📸 ${f}`)
      .join('\n')}\n\n<code>/getfile full_path</code> to download`
  } catch (e) {
    return `${EMOJI.error} Gallery error`
  }
}

// ──── PHONE (ADB) ────

async function handlePhoneControl(args: string, chatId: string): Promise<string> {
  if (!args)
    return `${EMOJI.phone} Commands:\n/phone connect ip:port\n/phone info\n/phone screenshot\n/phone tap x% y%\n/phone swipe up|down|left|right\n/phone open com.pkg\n/phone close com.pkg`
  const sub = args.split(' ')[0].toLowerCase()
  const rest = args.split(' ').slice(1).join(' ')
  try {
    if (sub === 'connect') {
      const { stdout } = await execAsync(`adb connect ${rest}`)
      return `${EMOJI.success} ${stdout.trim()}`
    }
    if (sub === 'info') {
      const { stdout: m } = await execAsync('adb shell getprop ro.product.model 2>/dev/null')
      const { stdout: b } = await execAsync('adb shell dumpsys battery 2>/dev/null')
      return `${EMOJI.phone} <b>${m.trim() || '?'}</b> 🔋${b.match(/level: (\d+)/)?.[1] || '?'}%`
    }
    if (sub === 'screenshot') {
      const p = path.join(os.tmpdir(), `phone_${Date.now()}.png`)
      await execAsync(`adb exec-out screencap -p > "${p}"`)
      await sendTelegramPhoto(p, `${EMOJI.phone} Phone`, chatId)
      setTimeout(() => {
        try {
          fs.unlinkSync(p)
        } catch {}
      }, 5000)
      return ''
    }
    if (sub === 'tap') {
      const [xp, yp] = rest.split(' ').map(Number)
      const { stdout } = await execAsync('adb shell wm size')
      const m = stdout.match(/(\d+)x(\d+)/)
      if (!m) return `${EMOJI.error} No screen`
      await execAsync(
        `adb shell input tap ${Math.round((xp / 100) * parseInt(m[1]))} ${Math.round((yp / 100) * parseInt(m[2]))}`
      )
      return `${EMOJI.success} Tapped ${xp}%,${yp}%`
    }
    if (sub === 'swipe') {
      const { stdout } = await execAsync('adb shell wm size')
      const m = stdout.match(/(\d+)x(\d+)/)
      if (!m) return `${EMOJI.error} No screen`
      const w = +m[1],
        h = +m[2],
        cx = w / 2,
        cy = h / 2
      const cmds: Record<string, string> = {
        up: `input swipe ${cx} ${h * 0.7} ${cx} ${h * 0.3} 300`,
        down: `input swipe ${cx} ${h * 0.3} ${cx} ${h * 0.7} 300`,
        left: `input swipe ${w * 0.8} ${cy} ${w * 0.2} ${cy} 300`,
        right: `input swipe ${w * 0.2} ${cy} ${w * 0.8} ${cy} 300`
      }
      if (!cmds[rest]) return `${EMOJI.warning} up|down|left|right`
      await execAsync(`adb shell ${cmds[rest]}`)
      return `${EMOJI.success} Swiped ${rest}`
    }
    if (sub === 'open') {
      await execAsync(`adb shell monkey -p ${rest} -c android.intent.category.LAUNCHER 1`)
      return `${EMOJI.success} Opened ${rest}`
    }
    if (sub === 'close') {
      await execAsync(`adb shell am force-stop ${rest}`)
      return `${EMOJI.success} Closed ${rest}`
    }
    return `${EMOJI.warning} Unknown`
  } catch (e) {
    return `${EMOJI.error} Phone failed. Device connected?`
  }
}

// ──── WIDGET / MACRO / PROJECT / VSCODE ────

async function handleCreateWidget(desc: string): Promise<string> {
  if (!desc) return `${EMOJI.warning} Usage: <code>/widget &lt;desc&gt;</code>`
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('telegram-command', { action: 'widget', desc })
  return `${EMOJI.success} Widget triggered: "${desc}"`
}

async function handleExecuteMacro(name: string): Promise<string> {
  if (!name) return `${EMOJI.warning} Usage: <code>/macro &lt;name&gt;</code>`
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('telegram-command', { action: 'macro', name })
  return `${EMOJI.success} Macro "${name}" triggered`
}

async function handleOpenProject(name: string): Promise<string> {
  if (!name) return `${EMOJI.warning} Usage: <code>/project &lt;name&gt;</code>`
  try {
    const pDir = path.resolve(app.getPath('userData'), 'Projects')
    if (!fs.existsSync(pDir)) return `${EMOJI.error} No projects`
    const match = fs.readdirSync(pDir).find((f) => f.toLowerCase().includes(name.toLowerCase()))
    if (!match) return `${EMOJI.error} Not found: ${name}`
    exec(`code "${path.join(pDir, match)}"`)
    return `${EMOJI.success} Opened <b>${match}</b> in VS Code`
  } catch (e) {
    return `${EMOJI.error} Failed`
  }
}

async function handleOpenInVSCode(fp: string): Promise<string> {
  if (!fp) return `${EMOJI.warning} Usage: <code>/vscode &lt;path&gt;</code>`
  exec(`code "${fp}"`)
  return `${EMOJI.success} Opened in VS Code`
}

async function handleModelHealth(): Promise<string> {
  try {
    const status = ModelRouter.getStatus()
    if (!status.length) return `${EMOJI.info} Model health not available yet`
    const lines = status.map((m: any) => {
      const icon = m.available ? '🟢' : '🔴'
      const lat = m.latencyMs ? `${m.latencyMs}ms` : '—'
      const err = m.lastError ? `\n    ⚠️ ${m.lastError.substring(0, 50)}` : ''
      return `${icon} <b>${m.name}</b>: ${m.available ? 'Online' : 'Offline'} | ${lat} | ${m.requestCount || 0} reqs${err}`
    })
    const active = ModelRouter.getActiveModel()
    return `${EMOJI.brain} <b>IRIS Model Health</b>\n\n${lines.join('\n')}\n\n⚡ Active: <b>${active}</b>\n\nChain: Gemini → Groq → HuggingFace → Ollama`
  } catch (e) {
    return `${EMOJI.error} Health check failed`
  }
}

async function handleSoulStatus(args: string): Promise<string> {
  const cfg = PersonalityEngine.getConfig()
  if (!args) {
    return `${EMOJI.ghost} <b>IRIS Soul Status</b>

🎭 Personality: <b>${cfg.level.toUpperCase()}</b>
👤 Name: <b>${cfg.userName}</b>
🏷️ Called: <b>${cfg.greetingName}</b>
😄 Humor: ${cfg.humor}%
👔 Formality: ${cfg.formality}%
💡 Proactivity: ${cfg.proactivity}%

${cfg.customPrompt ? `📝 Custom: <i>${cfg.customPrompt.substring(0, 100)}...</i>` : ''}

Usage:
/soul professional|friendly|jarvis|snarky
/soul name &lt;your name&gt;`
  }

  const parts = args.split(' ')
  const sub = parts[0].toLowerCase()

  if (['professional', 'friendly', 'jarvis', 'snarky'].includes(sub)) {
    PersonalityEngine.setConfig({ level: sub as any })
    return `${EMOJI.success} Personality set to <b>${sub.toUpperCase()}</b>. Try talking to me!`
  }

  if (sub === 'name' && parts[1]) {
    const name = parts.slice(1).join(' ')
    PersonalityEngine.setConfig({ userName: name })
    return `${EMOJI.success} I'll call you <b>${name}</b> from now on. Nice to meet you! 👋`
  }

  return `${EMOJI.warning} Usage: /soul professional|friendly|jarvis|snarky | /soul name &lt;name&gt;`
}

async function handleBrainStatus(args: string): Promise<string> {
  if (!args) {
    const stats = { episodic: EpisodicMemory.getStats(), semantic: SemanticMemory.getStats() }
    const patterns = EpisodicMemory.getPatterns()
    const behavioral = NoticeEngine.getBehavioralStats()
    const mood = NoticeEngine.assessMood()

    return `${EMOJI.brain} <b>IRIS Brain Status</b>

📦 <b>Episodic Memory:</b> ${stats.episodic.total} events
   Types: ${Object.entries(stats.episodic.byType)
     .sort((a: any, b: any) => b[1] - a[1])
     .slice(0, 5)
     .map(([k, v]: any) => `${k}(${v})`)
     .join(', ')}
   Patterns: ${stats.episodic.patternCount}

🧠 <b>Semantic Knowledge:</b> ${stats.semantic.total} facts
   Categories: ${Object.entries(stats.semantic)
     .filter(([k]) => k !== 'total')
     .map(([k, v]) => `${k}(${v})`)
     .join(', ')}

👁️ <b>Behavioral:</b> ${behavioral.totalObservations} observations
   Mood: ${mood}
   Active hours: ${behavioral.activeHours.join(', ')}:00
   Frustration rate: ${(behavioral.frustrationRate * 100).toFixed(0)}%
   Top words: ${behavioral.commonWords.slice(0, 5).join(', ')}

${
  patterns.length
    ? `📊 <b>Detected Patterns:</b>\n${patterns
        .slice(-3)
        .map((p) => `  • ${p.description}`)
        .join('\n')}`
    : ''
}

Usage:
/brain recall &lt;topic&gt; — Search memories
/brain learn &lt;category&gt; &lt;key&gt; &lt;value&gt; — Teach me something
/brain patterns — Show all patterns
/brain profile — My profile on you`
  }

  const parts = args.split(' ')
  const sub = parts[0].toLowerCase()
  const rest = parts.slice(1).join(' ')

  if (sub === 'recall' || sub === 'search') {
    const results = EpisodicMemory.query({ text: rest, limit: 10 })
    if (!results.length) return `${EMOJI.search} No memories found for "${rest}"`
    return `${EMOJI.brain} <b>Memories: "${rest}"</b>\n\n${results.map((r) => `  ${r.type} | ${r.title} | ${r.outcome}`).join('\n')}`
  }

  if (sub === 'learn') {
    const learnParts = rest.split(' ')
    if (learnParts.length < 3)
      return `${EMOJI.warning} Usage: /brain learn &lt;category&gt; &lt;key&gt; &lt;value&gt;`
    const cat = learnParts[0]
    const key = learnParts[1]
    const val = learnParts.slice(2).join(' ')
    BrainRouter.learnFact(cat, key, val, 'telegram')
    return `${EMOJI.brain} Learned: <b>${cat}/${key}</b> = <code>${val}</code>. I'll remember this.`
  }

  if (sub === 'patterns') {
    const pats = EpisodicMemory.getPatterns()
    if (!pats.length) return `${EMOJI.info} No patterns detected yet. Keep using IRIS!`
    return `${EMOJI.brain} <b>Patterns (${pats.length}):</b>\n\n${pats
      .slice(-10)
      .map((p) => `  ${p.type} (${(p.confidence * 100).toFixed(0)}%): ${p.description}`)
      .join('\n')}`
  }

  if (sub === 'profile') {
    const profile = SemanticMemory.getUserProfile()
    if (!profile) return `${EMOJI.info} I don't know much about you yet. Teach me with /brain learn`
    return `${EMOJI.brain} <b>What I Know About You:</b>\n\n${profile.split('\n').slice(0, 20).join('\n')}`
  }

  return `${EMOJI.warning} Usage: /brain [recall|learn|patterns|profile]`
}

async function handleForget(args: string): Promise<string> {
  if (!args)
    return `${EMOJI.warning} Usage: <code>/forget &lt;topic&gt;</code> — Not implemented yet. Memory is permanent!`
  return `${EMOJI.info} IRIS doesn't forget, sir. But I can overwrite. Tell me what to learn instead.`
}

async function handleJournal(): Promise<string> {
  const journal = NoticeEngine.getJournal()
  if (!journal.length) return `${EMOJI.info} No journal entries yet. IRIS is watching... 👁️`
  return `${EMOJI.ghost} <b>IRIS's Private Journal</b> (last 10)\n\n${journal
    .slice(0, 10)
    .map(
      (j) =>
        `  ${j.category === 'praise' ? '🌟' : j.category === 'concern' ? '⚠️' : j.category === 'theory' ? '💡' : '👁️'} <i>${new Date(j.timestamp).toLocaleDateString()}</i>: ${j.entry}`
    )
    .join('\n\n')}`
}

async function handleMood(): Promise<string> {
  const emotion = EmotionEngine.getCurrentEmotion()
  const adaptation = EmotionEngine.getAdaptation()
  const dominant = EmotionEngine.getDominantToday()
  const behavioral = NoticeEngine.getBehavioralStats()

  const moodEmoji: Record<string, string> = {
    focused: '🎯',
    frustrated: '😤',
    happy: '😊',
    tired: '😴',
    rushed: '⚡',
    calm: '😌',
    confused: '🤔',
    idle: '💤'
  }

  return `${moodEmoji[emotion] || '🧠'} <b>IRIS Emotion Assessment</b>

<b>Current mood:</b> ${emotion.toUpperCase()}
<b>Dominant today:</b> ${dominant.toUpperCase()}

<b>Adaptation:</b>
  Humor: ${adaptation.humorLevel}%
  Proactivity: ${adaptation.proactivity}%
  Response style: ${adaptation.responseLength}
  Jokes: ${adaptation.allowJokes ? '✅' : '❌'}
  Break suggestion: ${adaptation.suggestBreak ? '✅' : '❌'}

<b>Behavioral:</b>
  Frustration rate: ${(behavioral.frustrationRate * 100).toFixed(0)}%
  Avg message length: ${behavioral.averageMessageLength.toFixed(0)} chars
  Active hours: ${behavioral.activeHours.join(', ')}:00`
}

async function handleSuggest(): Promise<string> {
  const suggestions = SuggestionEngine.getSuggestions()
  if (!suggestions.length) return `${EMOJI.info} No suggestions right now. Everything looks good!`
  return `${EMOJI.brain} <b>IRIS Suggestions</b>\n\n${suggestions
    .map(
      (s) =>
        `${s.emoji} <b>[${s.category}]</b> ${s.title}\n  ${s.detail}\n  Confidence: ${(s.confidence * 100).toFixed(0)}% | Priority: ${s.priority}`
    )
    .join('\n\n')}`
}

async function handleWatch(projectPath: string): Promise<string> {
  if (!projectPath) return `${EMOJI.warning} Usage: <code>/watch /path/to/project</code>`
  PairProgrammer.watch(projectPath)
  return `${EMOJI.success} 👁️ Now watching <code>${projectPath}</code>. I'll comment on your code as you work!`
}

async function handlePair(args: string): Promise<string> {
  if (!args) {
    const status = { active: PairProgrammer.isActive(), stats: PairProgrammer.getStats() }
    return `${EMOJI.ghost} <b>Pair Programmer</b>\n\nActive: ${status.active ? '✅' : '❌'}\nFiles created: ${status.stats.filesCreated}\nFiles modified: ${status.stats.filesModified}\nCommits: ${status.stats.commits}`
  }
  if (args === 'stop') {
    PairProgrammer.stopAll()
    return `${EMOJI.success} Stopped pair programming mode.`
  }
  if (args === 'start') {
    if (botConfig) {
      const homeDir = os.homedir()
      PairProgrammer.watch(homeDir)
      return `${EMOJI.success} Pair programmer started! Watching your home directory.`
    }
  }
  return `${EMOJI.warning} Usage: /pair start|stop`
}

async function handleAgents(args: string): Promise<string> {
  if (!args) {
    const report = Orchestrator.getStatusReport()
    const agents = Orchestrator.getAll()
    const active = agents.filter((a) => a.status === 'working' || a.status === 'spawning')

    if (!agents.length)
      return `${EMOJI.info} No agents yet. Just type anything — every message spawns an agent!`

    let reply = `${EMOJI.ghost} <b>Universal Agent Hub</b>\n\n`
    reply += `📊 Total: <b>${report.total}</b> | ⚡ Active: <b>${report.active}</b> | ✅ Done: <b>${report.completed}</b> | ❌ Failed: <b>${report.failed}</b>\n`

    // Type breakdown
    const typeBreakdown = Object.entries(report.byType)
      .map(([type, count]) => {
        const emojis: Record<string, string> = {
          assistant: '💬',
          coder: '🧑\u200d💻',
          researcher: '🔍',
          analyzer: '📊',
          builder: '🛠\uFE0F',
          executor: '⚡',
          creative: '🎨',
          memory: '🧠'
        }
        return `${emojis[type] || '🤖'}${count}`
      })
      .join(' ')
    reply += `Types: ${typeBreakdown}\n\n`

    // Active agents with live progress
    if (active.length) {
      reply += `<b>⚡ Active Now:</b>\n`
      for (const a of active) {
        const dur = ((Date.now() - a.spawnedAt) / 1000).toFixed(0)
        reply += `  ${a.emoji} <b>${a.name}</b>\n`
        reply += `     ${a.progressLabel} — ${a.progress}% (${dur}s)\n`
        reply += `     "${a.task.substring(0, 40)}..."\n`
      }
      reply += '\n'
    }

    // Recent completed
    const recentDone = agents.filter((a) => a.status === 'done').slice(0, 3)
    if (recentDone.length) {
      reply += `<b>✅ Recent Results:</b>\n`
      for (const a of recentDone) {
        const dur = a.durationMs ? `${(a.durationMs / 1000).toFixed(1)}s` : '?'
        const preview = a.result ? a.result.replace(/<[^>]*>/g, '').substring(0, 60) : 'Done'
        reply += `  ${a.emoji} ${a.name} — ${dur}\n     ${preview}...\n`
      }
      reply += '\n'
    }

    // Recent failed
    const recentFailed = agents.filter((a) => a.status === 'failed').slice(0, 2)
    if (recentFailed.length) {
      reply += `<b>❌ Failed:</b>\n`
      for (const a of recentFailed) {
        reply += `  ${a.emoji} ${a.name} — ${a.error?.substring(0, 50)}\n`
      }
    }

    reply += `\n<b>Commands:</b>\n/agents clear — Remove finished\n/agents cancel &lt;id&gt; — Cancel active\n/agents status &lt;id&gt; — Full details`
    return reply
  }

  const parts = args.split(' ')
  if (parts[0] === 'clear') {
    Orchestrator.clear()
    return `${EMOJI.success} Cleared completed agents.`
  }
  if (parts[0] === 'cancel' && parts[1]) {
    const ok = Orchestrator.cancel(parts[1])
    return ok ? `${EMOJI.success} Agent cancelled.` : `${EMOJI.error} Could not cancel agent.`
  }
  if (parts[0] === 'status' && parts[1]) {
    const agent = Orchestrator.get(parts[1])
    if (!agent) return `${EMOJI.error} Agent not found.`
    const dur = agent.durationMs
      ? `${(agent.durationMs / 1000).toFixed(1)}s`
      : `${((Date.now() - agent.spawnedAt) / 1000).toFixed(0)}s`
    return `${agent.emoji} <b>${agent.name}</b>\n\nType: ${agent.type}\nStatus: ${agent.status}\nProgress: ${agent.progress}% — ${agent.progressLabel}\nDuration: ${dur}\nTask: ${agent.task}${agent.result ? `\n\n<b>Result:</b>\n${agent.result.substring(0, 500)}` : ''}${agent.error ? `\n\n⚠️ Error: ${agent.error}` : ''}${agent.resultFiles.length ? `\n📁 Files: ${agent.resultFiles.join(', ')}` : ''}`
  }

  return `${EMOJI.warning} Usage: /agents [clear|cancel &lt;id&gt;|status &lt;id&gt;]`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TASKS / HABITS / REMINDERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleTasks(args: string, chatId: string): Promise<string> {
  if (!args) {
    const pending = ProceduralMemory.getPending()
    const overdue = ProceduralMemory.getOverdue()
    const upcoming = ProceduralMemory.getUpcoming(24)
    const habits = ProceduralMemory.getHabits()
    const stats = ProceduralMemory.getStats()

    let reply = `⏰ <b>Tasks & Habits</b>\n\n`
    reply += `📊 ${stats.pending} pending | ${stats.overdue} overdue | ${stats.upcomingCount} upcoming today | ${stats.habits} habits\n\n`

    if (overdue.length) {
      reply += `<b>🔴 Overdue:</b>\n`
      for (const t of overdue.slice(0, 5)) {
        const due = new Date(t.dueAt!).toLocaleString()
        reply += `  ⏰ <b>${t.title}</b> — was due ${due}\n`
      }
      reply += '\n'
    }

    if (upcoming.length) {
      reply += `<b>🟡 Upcoming (24h):</b>\n`
      for (const t of upcoming.slice(0, 5)) {
        const due = new Date(t.dueAt!).toLocaleString()
        reply += `  📅 <b>${t.title}</b> — ${due}\n`
      }
      reply += '\n'
    }

    if (pending.length && !upcoming.length && !overdue.length) {
      reply += `<b>📋 All Pending:</b>\n`
      for (const t of pending.slice(0, 10)) {
        const due = t.dueAt ? new Date(t.dueAt).toLocaleString() : 'no deadline'
        reply += `  • <b>${t.title}</b> — ${due}\n`
      }
      reply += '\n'
    }

    if (habits.length) {
      reply += `<b>🔄 Habits:</b>\n`
      for (const t of habits.slice(0, 5)) {
        reply += `  🔁 ${t.title} (${t.recurrence}) — done ${t.completionCount}x\n`
      }
      reply += '\n'
    }

    reply += `<b>Usage:</b>\n/tasks &lt;task description&gt; — Create task\n/tasks complete &lt;id&gt;\n/tasks snooze &lt;id&gt; &lt;duration&gt;\n/tasks cancel &lt;id&gt;\n\n<i>Or just say: "remind me tomorrow at 9am to deploy"</i>`
    return reply
  }

  const parts = args.split(' ')
  const sub = parts[0].toLowerCase()

  if (sub === 'complete' || sub === 'done') {
    if (!parts[1]) return `${EMOJI.warning} Usage: /tasks complete &lt;id&gt;`
    const ok = ProceduralMemory.complete(parts[1])
    return ok ? `${EMOJI.success} Task completed! 🎉` : `${EMOJI.error} Task not found.`
  }

  if (sub === 'snooze') {
    if (!parts[1]) return `${EMOJI.warning} Usage: /tasks snooze &lt;id&gt; [1h/30min/1day]`
    const duration = parts[2] || '1h'
    const ok = ProceduralMemory.snooze(parts[1], duration)
    return ok ? `${EMOJI.success} Snoozed for ${duration} ⏰` : `${EMOJI.error} Task not found.`
  }

  if (sub === 'cancel') {
    if (!parts[1]) return `${EMOJI.warning} Usage: /tasks cancel &lt;id&gt;`
    const ok = ProceduralMemory.cancel(parts[1])
    return ok ? `${EMOJI.success} Task cancelled.` : `${EMOJI.error} Task not found.`
  }

  // Default: create a task from natural language
  const task = ProceduralMemory.createFromNL(args, 'telegram', chatId)
  if (!task)
    return `${EMOJI.warning} Couldn't parse that task. Try: "remind me tomorrow at 9am to deploy"`

  SharedConsciousness.broadcastFromTelegram(
    'task',
    { title: task.title, dueAt: task.dueAt },
    `New task from Telegram: ${task.title}`
  )
  const dueStr = task.dueAt ? `Due: <b>${new Date(task.dueAt).toLocaleString()}</b>` : 'No deadline'
  return `${EMOJI.success} Task created!\n\n📝 <b>${task.title}</b>\n${dueStr}\nRecurrence: ${task.recurrence}\n\nI'll remind you when it's time! ⏰`
}

async function handleConsciousness(): Promise<string> {
  return SharedConsciousness.getStatusReport()
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  COMMAND ROUTER — Routes /commands to handlers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function processMessage(text: string, chatId: string): Promise<string> {
  const parts = text.split(' ')
  const cmd = parts[0].toLowerCase()
  const args = parts.slice(1).join(' ')

  switch (cmd) {
    case '/start':
    case '/help':
      return `${EMOJI.rocket} <b>IRIS AI — Full Remote Control</b>

<b>📊 System:</b>
/status /apps /launch &lt;app&gt; /kill &lt;app&gt;
/screenshot /lock /volume &lt;0-100&gt; /ping /models

<b>📁 Files:</b>
/browse &lt;path&gt; /read &lt;path&gt; /write &lt;path&gt; &lt;text&gt;
/search &lt;name&gt; /open &lt;path&gt; /getfile &lt;path&gt;
/download &lt;url&gt; /copy &lt;src&gt; &lt;dest&gt; /move &lt;src&gt; &lt;dest&gt;
/delete &lt;path&gt; /mkdir &lt;path&gt; /smartsearch &lt;query&gt;

<b>💻 Terminal & Desktop:</b>
/terminal &lt;cmd&gt; /type &lt;text&gt; /click &lt;x&gt; &lt;y&gt;
/scroll &lt;up|down&gt; /shortcut &lt;ctrl+c&gt; /teleport &lt;app&gt; &lt;left|right|max&gt;

<b>📧 Communication:</b>
/email read /email send &lt;to&gt;|&lt;subject&gt;|&lt;body&gt;
/whatsapp &lt;name&gt;|&lt;message&gt; /spotify &lt;song&gt;

<b>🎨 Creative & Visual:</b>
/image &lt;prompt&gt; /website &lt;description&gt;
/vision /ocr

<b>🧠 AI & Research:</b>
/research &lt;topic&gt; /oracle &lt;question&gt;
/code &lt;description&gt; /review &lt;filepath&gt;
/ingest &lt;path&gt; /index &lt;path&gt;

<b>📝 Notes & Memory:</b>
/note &lt;text&gt; /notes /remember &lt;fact&gt; /recall

<b>🌐 Web & Info:</b>
/weather &lt;city&gt; /stock &lt;ticker&gt; /stocks &lt;t1&gt; &lt;t2&gt;
/web &lt;query&gt; /map &lt;place&gt; /navigate &lt;from&gt;|&lt;to&gt;
/location /wormhole &lt;port&gt; /hack &lt;url&gt;

<b>📱 Phone Control:</b>
/phone connect|info|screenshot|tap|swipe|open|close

<b>🔧 Other:</b>
/widget /macro /project /vscode /gallery /models

<b>🧠 Brain & Soul:</b>
/brain [recall|learn|patterns|profile]
/mood — Current emotion assessment
/suggest — Get proactive suggestions
/journal — IRIS's private journal
/agents — Sub-agent control center
/tasks — Tasks & reminders (or just say "remind me...")
/consciousness — Brain sync status
/soul [professional|friendly|jarvis|snarky]
/watch &lt;path&gt; — Pair programmer mode
/pair [start|stop]

<b>🧠 AI Mode:</b> Just type naturally — no /command!`

    // ──── SYSTEM ────
    case '/status':
      return await handleStatus()
    case '/apps':
      return await handleRunningApps()
    case '/launch':
    case '/open_app':
      return await handleLaunchApp(args)
    case '/kill':
    case '/close_app':
      return await handleKillApp(args)
    case '/screenshot':
    case '/screen':
    case '/ss':
      return await handleScreenshot(chatId)
    case '/lock':
      return await handleLockScreen()
    case '/volume':
    case '/vol':
      return await handleSetVolume(args)
    case '/ping':
      return `${EMOJI.success} Pong! IRIS alive on <b>${os.hostname()}</b>. ${new Date().toLocaleTimeString()}`
    case '/models':
    case '/health':
      return await handleModelHealth()
    case '/soul':
      return await handleSoulStatus(args)
    case '/brain':
    case '/memories':
    case '/mind':
      return await handleBrainStatus(args)
    case '/forget':
      return await handleForget(args)
    case '/journal':
      return await handleJournal()
    case '/mood':
      return await handleMood()
    case '/suggest':
      return await handleSuggest()
    case '/watch':
      return await handleWatch(args)
    case '/pair':
      return await handlePair(args)
    case '/agents':
      return await handleAgents(args)
    case '/tasks':
    case '/todo':
    case '/reminders':
      return await handleTasks(args, chatId)
    case '/consciousness':
    case '/sync':
      return await handleConsciousness()

    // ──── TERMINAL & DESKTOP ────
    case '/terminal':
    case '/cmd':
    case '/run':
      return await handleTerminal(args)
    case '/type':
      return await handleGhostType(args)
    case '/click':
      return await handleGhostClick(args)
    case '/scroll':
      return await handleGhostScroll(args)
    case '/shortcut':
      return await handleGhostShortcut(args)
    case '/teleport':
      return await handleTeleportWindow(args)
    case '/dropzone':
      return await handleSmartDropZones()

    // ──── FILE OPERATIONS ────
    case '/browse':
    case '/ls':
    case '/dir':
      return await handleBrowseDir(args)
    case '/read':
    case '/cat':
      return await handleReadFile(args)
    case '/write':
    case '/write_file':
      return await handleWriteFile(args)
    case '/search':
    case '/find':
      return await handleSearchFiles(args)
    case '/smartsearch':
    case '/smart_file_search':
      return await handleSmartFileSearch(args)
    case '/open':
      return await handleOpenFile(args)
    case '/getfile':
    case '/send':
      return await handleGetFile(args, chatId)
    case '/download':
      return await handleDownloadFile(args)
    case '/copy':
      return await handleFileCopy(args)
    case '/move':
      return await handleFileMove(args)
    case '/delete':
      return await handleFileDelete(args)
    case '/mkdir':
    case '/create_folder':
      return await handleMkdir(args)

    // ──── EMAIL ────
    case '/email':
    case '/gmail':
      return await handleEmail(args, chatId)

    // ──── COMMUNICATION ────
    case '/whatsapp':
      return await handleWhatsApp(args)
    case '/spotify':
    case '/music':
      return await handleSpotify(args)

    // ──── CREATIVE & VISUAL ────
    case '/image':
    case '/generate':
      return await handleImageGeneration(args, chatId)
    case '/website':
    case '/build':
      return await handleWebsiteBuild(args, chatId)
    case '/vision':
    case '/analyze':
      return await handleVision(chatId)
    case '/ocr':
      return await handleOCR(chatId)

    // ──── AI & RESEARCH ────
    case '/research':
    case '/deepresearch':
      return await handleDeepResearch(args)
    case '/oracle':
      return await handleOracleQuery(args)
    case '/code':
    case '/codegen':
      return await handleCodeGen(args, chatId)
    case '/review':
      return await handleCodeReview(args)
    case '/ingest':
      return await handleIngestCodebase(args)
    case '/index':
      return await handleIndexDirectory(args)

    // ──── NOTES & MEMORY ────
    case '/note':
      return await handleSaveNote(args)
    case '/notes':
      return await handleListNotes()
    case '/remember':
      return await handleRemember(args)
    case '/recall':
      return await handleRecall()

    // ──── WEB & INFO ────
    case '/weather':
      return await handleWeather(args)
    case '/stock':
      return await handleStock(args)
    case '/stocks':
    case '/compare':
      return await handleCompareStocks(args)
    case '/web':
      return await handleWebSearch(args)
    case '/map':
      return await handleMap(args)
    case '/navigate':
    case '/nav':
    case '/directions':
      return await handleNavigation(args)
    case '/location':
    case '/loc':
      return await handleLocation()
    case '/wormhole':
    case '/tunnel':
      return await handleWormhole(args)
    case '/hack':
      return await handleHackWebsite(args)
    case '/gallery':
      return await handleGallery()

    // ──── PHONE CONTROL ────
    case '/phone':
    case '/mobile':
    case '/adb':
      return await handlePhoneControl(args, chatId)

    // ──── MISC ────
    case '/widget':
      return await handleCreateWidget(args)
    case '/macro':
      return await handleExecuteMacro(args)
    case '/project':
      return await handleOpenProject(args)
    case '/vscode':
      return await handleOpenInVSCode(args)

    // ──── AI NATURAL LANGUAGE ────
    default:
      return await handleAICommand(text, chatId)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TELEGRAM POLLING ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function pollTelegram(): Promise<void> {
  if (!botConfig || !isBotRunning) return

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botConfig.token}/getUpdates?offset=${lastUpdateId + 1}&timeout=30&allowed_updates=["message"]`
    )
    const data = await res.json()

    if (!data.ok || !data.result?.length) {
      consecutiveErrors = 0 // Reset — connection is healthy
      return
    }

    for (const update of data.result) {
      lastUpdateId = update.update_id

      if (!update.message?.text) continue

      const chatId = String(update.message.chat.id)
      const text = update.message.text.trim()

      // ─── Security: Only respond to authorized users ───
      if (!botConfig.allowedChatIds.includes(chatId)) {
        await sendTelegram(
          `${EMOJI.shield} <b>Access Denied.</b>\nYour Chat ID: <code>${chatId}</code>\nAdd this ID in IRIS Settings to authorize.`,
          chatId
        )
        continue
      }

      // Send "typing" indicator
      await fetch(`https://api.telegram.org/bot${botConfig.token}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' })
      }).catch(() => {})

      // Process command
      const reply = await processMessage(text, chatId)
      if (reply) {
        await sendTelegram(reply, chatId)
      }
    }
  } catch (e) {
    consecutiveErrors++
    console.error(`Telegram poll error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, e)

    // ── Auto-reconnect after too many errors ──
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.log('[Telegram] Too many errors, auto-restarting bot...')
      consecutiveErrors = 0
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
      }
      if (botConfig) {
        setTimeout(() => {
          isBotRunning = false
          startBot(botConfig)
          console.log('[Telegram] Bot auto-restarted ✅')
        }, 10000) // Wait 10s before reconnect
      }
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BOT LIFECYCLE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function startBot(config: BotConfig): { success: boolean; message: string } {
  if (isBotRunning) return { success: false, message: 'Bot already running.' }
  if (!config.token) return { success: false, message: 'Bot token required.' }

  botConfig = config
  isBotRunning = true
  lastUpdateId = 0

  // ── Register Agent Result Callback ──
  // When any agent finishes → auto-deliver result to Telegram
  Orchestrator.onResult((agent: SubAgent, message: string) => {
    if (agent.chatId) {
      sendTelegram(message, agent.chatId).catch(() => {})
    }
  })

  // ── Wire Shared Consciousness (Telegram ↔ Desktop = One Brain) ──
  SharedConsciousness.setTelegramNotify(sendTelegram)
  ProceduralMemory.setTelegramNotify(sendTelegram)

  // Start polling every 5 seconds
  pollingInterval = setInterval(pollTelegram, 5000)

  // Send startup notification
  setTimeout(async () => {
    await sendTelegram(
      `${EMOJI.rocket} <b>IRIS AI Connected!</b>\n\n${EMOJI.pc} Your PC is now remotely accessible.\nType /help to see all commands.\n\n_${os.hostname()} — ${new Date().toLocaleString()}_`
    )
  }, 1000)

  return { success: true, message: 'Telegram bot started.' }
}

function stopBot(): { success: boolean; message: string } {
  if (!isBotRunning) return { success: false, message: 'Bot not running.' }

  isBotRunning = false
  botConfig = null

  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }

  return { success: true, message: 'Telegram bot stopped.' }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  IPC REGISTRATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerTelegramBot(ipcMain: IpcMain) {
  ipcMain.handle('telegram-start', async (_, config: BotConfig) => {
    try {
      return startBot(config)
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('telegram-stop', async () => {
    return stopBot()
  })

  ipcMain.handle('telegram-status', async () => {
    return {
      running: isBotRunning,
      chatIds: botConfig?.allowedChatIds || []
    }
  })

  // Send a message from the PC to Telegram (for notifications)
  ipcMain.handle('telegram-notify', async (_, message: string) => {
    if (!isBotRunning) return { success: false }
    await sendTelegram(message)
    return { success: true }
  })
}
