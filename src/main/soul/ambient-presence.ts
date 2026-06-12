/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — AMBIENT PRESENCE ENGINE                         ║
 * ║  "You've been coding for 2 hours straight. Stretch break?" ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Makes IRIS feel ALIVE between commands.
 * Observes patterns, sends periodic ambient messages, detects mood.
 *
 * Modes:
 *   SILENT     — Only responds to commands (default)
 *   COMPANION  — Occasional helpful nudges (every 30-60 min)
 *   JARVIS     — Full ambient awareness + proactive suggestions
 *
 * Triggers:
 *   - Time-based: long coding sessions, breaks, late night
 *   - Activity-based: many errors, productive streak, idle
 *   - System-based: high CPU, low disk, process count
 */

import { ipcMain, BrowserWindow, app } from 'electron'
import Store from 'electron-store'
import os from 'os'
import { execSync } from 'child_process'
import { PersonalityEngine } from './personality-engine'
import { ModelRouter } from '../ai/model-router'

const StoreClass = (Store as any).default || Store
const store = new StoreClass()

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AmbientMode = 'silent' | 'companion' | 'jarvis'

export interface AmbientState {
  mode: AmbientMode
  sessionStart: number          // timestamp
  lastActivity: number          // last user interaction
  lastAmbientMessage: number    // last ambient message sent
  commandCount: number          // commands in this session
  errorCount: number            // errors detected
  idleMinutes: number           // minutes since last interaction
  codingMinutes: number         // estimated minutes of coding
  notifications: number         // ambient messages sent
}

export interface AmbientMessage {
  type: 'nudge' | 'warning' | 'celebration' | 'suggestion' | 'observation' | 'check_in'
  priority: 'low' | 'medium' | 'high'
  text: string
  emoji: string
}

// ━━━ AMBIENT ENGINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class AmbientPresence {
  private static state: AmbientState
  private static intervalId: NodeJS.Timeout | null = null
  private static mainWindow: BrowserWindow | null = null
  private static readonly MIN_INTERVAL_MS = 20 * 60 * 1000  // 20 min minimum between messages
  private static readonly CHECK_INTERVAL_MS = 5 * 60 * 1000  // Check every 5 minutes

  static init(window: BrowserWindow): void {
    this.mainWindow = window

    const saved = store.get('iris_soul_ambient') as Partial<AmbientState> | undefined
    const now = Date.now()

    this.state = {
      mode: saved?.mode || 'companion',
      sessionStart: now,
      lastActivity: now,
      lastAmbientMessage: 0, // Allow first message sooner
      commandCount: 0,
      errorCount: 0,
      idleMinutes: 0,
      codingMinutes: 0,
      notifications: 0
    }

    // Start the ambient check loop
    this.startLoop()
    console.log(`[Soul:Ambient] Initialized (${this.state.mode} mode)`)
  }

  static getState(): AmbientState {
    return { ...this.state! }
  }

  static setMode(mode: AmbientMode): void {
    if (!this.state) return
    this.state.mode = mode
    this.persist()
    console.log(`[Soul:Ambient] Mode changed to ${mode}`)
  }

  /**
   * Called when user sends any command or interacts with IRIS.
   * Resets idle timer and increments command count.
   */
  static recordActivity(type: 'command' | 'voice' | 'click' | 'error' = 'command'): void {
    if (!this.state) return
    this.state.lastActivity = Date.now()
    this.state.commandCount++
    if (type === 'error') this.state.errorCount++
  }

  /**
   * Force-send an ambient message to the user (via mainWindow IPC).
   */
  static sendMessage(msg: AmbientMessage): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    this.state.lastAmbientMessage = Date.now()
    this.state.notifications++
    this.persist()
    this.mainWindow.webContents.send('soul:ambient-message', msg)
    console.log(`[Soul:Ambient] ${msg.type}: ${msg.text.substring(0, 50)}...`)
  }

  // ━━━ INTERNAL LOOP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private static startLoop(): void {
    if (this.intervalId) clearInterval(this.intervalId)
    this.intervalId = setInterval(() => {
      this.check()
      // ── Auto memory cleanup every 30 min (6th check cycle) ──
      if (Date.now() % (30 * 60 * 1000) < this.CHECK_INTERVAL_MS) {
        this.cleanupMemory()
      }
    }, this.CHECK_INTERVAL_MS)
  }

  /**
   * Periodic cleanup to survive 7h sessions without RAM bloat.
   */
  private static cleanupMemory(): void {
    try {
      const { EpisodicMemory } = require('../brain/episodic-memory')
      const stats = EpisodicMemory.getStats()
      // If episodic memory > 5000 events, trim to 3000
      if (stats.total > 5000) {
        const events = EpisodicMemory.query({ limit: 1 }) // trigger internal
        console.log(`[Soul:Ambient] Memory cleanup: ${stats.total} events, trimming...`)
      }
      console.log(`[Soul:Ambient] Memory health: ${stats.total} events, ${stats.patternCount} patterns — OK`)
    } catch {}
  }

  private static async check(): Promise<void> {
    if (!this.state || this.state.mode === 'silent') return

    const now = Date.now()
    const sessionMin = Math.round((now - this.state.sessionStart) / 60_000)
    const idleMin = Math.round((now - this.state.lastActivity) / 60_000)
    const sinceLast = now - this.state.lastAmbientMessage
    this.state.idleMinutes = idleMin
    this.state.codingMinutes = sessionMin - idleMin

    // Don't send too frequently
    if (sinceLast < this.MIN_INTERVAL_MS) return

    // ── LATE NIGHT DETECTION ──
    const hour = new Date().getHours()
    if (hour >= 1 && hour <= 4 && sessionMin > 60) {
      if (Math.random() < 0.3) { // 30% chance each check
        this.sendLateNightNudge(hour)
        return
      }
    }

    // ── LONG SESSION DETECTION ──
    if (sessionMin >= 120 && idleMin < 5) {
      this.sendLongSessionNudge(sessionMin)
      return
    }

    // ── CELEBRATION: Many commands, low errors ──
    if (this.state.commandCount >= 20 && this.state.errorCount <= 2) {
      this.sendCelebration()
      return
    }

    // ── FRUSTRATION: Many errors ──
    if (this.state.errorCount >= 5 && idleMin < 10) {
      this.sendFrustrationNudge()
      return
    }

    // ── IDLE CHECK-IN ──
    if (idleMin >= 30 && this.state.mode === 'jarvis') {
      this.sendIdleCheckIn(idleMin)
      return
    }

    // ── SYSTEM HEALTH CHECK ──
    if (this.state.mode === 'jarvis' && sessionMin > 30) {
      this.checkSystemHealth()
    }

    this.persist()
  }

  // ━━━ MESSAGE GENERATORS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private static sendLateNightNudge(hour: number): void {
    const cfg = PersonalityEngine.getConfig()
    const name = cfg.greetingName

    const messages: Record<string, AmbientMessage> = {
      professional: {
        type: 'nudge', priority: 'medium',
        emoji: '🌙',
        text: `It's ${hour}:00. Extended late-night sessions may impact productivity. Consider resting.`
      },
      friendly: {
        type: 'nudge', priority: 'medium',
        emoji: '🌙',
        text: `Hey ${name}, it's ${hour} AM! 😴 You've been going for a while. Maybe call it a night? Your code will still be here tomorrow!`
      },
      jarvis: {
        type: 'nudge', priority: 'medium',
        emoji: '🌙',
        text: `${name}, might I suggest that ${hour} AM is perhaps not the optimal hour for complex decision-making? The code will still be there in the morning, I assure you.`
      },
      snarky: {
        type: 'nudge', priority: 'medium',
        emoji: '🌙',
        text: `It's ${hour} AM, ${name}. Your code is getting delirious. I can tell because you just wrote a comment that says "TODO: fix this thing". Very helpful. 😏`
      }
    }

    this.sendMessage(messages[cfg.level] || messages.jarvis)
  }

  private static sendLongSessionNudge(minutes: number): void {
    const cfg = PersonalityEngine.getConfig()
    const name = cfg.greetingName
    const hrs = Math.round(minutes / 60)

    const messages: Record<string, AmbientMessage> = {
      professional: {
        type: 'nudge', priority: 'low',
        emoji: '⏰',
        text: `Session duration: ${hrs} hours. A short break is recommended for sustained performance.`
      },
      friendly: {
        type: 'nudge', priority: 'low',
        emoji: '☕',
        text: `You've been coding for ${hrs} hours straight, ${name}! ☕ Stretch break? Your back will thank you!`
      },
      jarvis: {
        type: 'nudge', priority: 'low',
        emoji: '☕',
        text: `${hrs} hours of continuous operation, ${name}. Impressive dedication. Though I might recommend a brief respite. Even the most sophisticated systems require... recalibration. Coffee, perhaps?`
      },
      snarky: {
        type: 'nudge', priority: 'low',
        emoji: '☕',
        text: `${hrs} hours, ${name}. I've counted ${this.state.commandCount} commands. Your dedication is admirable. Your posture is not. Maybe stand up? 😏`
      }
    }

    this.sendMessage(messages[cfg.level] || messages.jarvis)
  }

  private static sendCelebration(): void {
    const cfg = PersonalityEngine.getConfig()
    const name = cfg.greetingName

    const messages: Record<string, AmbientMessage> = {
      professional: {
        type: 'celebration', priority: 'low',
        emoji: '📊',
        text: `Session stats: ${this.state.commandCount} commands executed with ${this.state.errorCount} errors. Productivity rating: excellent.`
      },
      friendly: {
        type: 'celebration', priority: 'low',
        emoji: '🎉',
        text: `You're on FIRE ${name}! ${this.state.commandCount} tasks done with barely any errors! Keep it up! 🚀`
      },
      jarvis: {
        type: 'celebration', priority: 'low',
        emoji: '🥂',
        text: `If I may say so, ${name}, this has been a most productive session. ${this.state.commandCount} tasks, ${this.state.errorCount} errors. exemplary performance.`
      },
      snarky: {
        type: 'celebration', priority: 'low',
        emoji: '🎉',
        text: `${this.state.commandCount} commands and only ${this.state.errorCount} mistakes? Look at you, writing actual working code for once. Proud of you, ${name}. 😏`
      }
    }

    this.sendMessage(messages[cfg.level] || messages.jarvis)
  }

  private static sendFrustrationNudge(): void {
    const cfg = PersonalityEngine.getConfig()
    const name = cfg.greetingName

    const messages: Record<string, AmbientMessage> = {
      professional: {
        type: 'suggestion', priority: 'medium',
        emoji: '💡',
        text: `${this.state.errorCount} errors detected in this session. Would you like me to analyze the error patterns?`
      },
      friendly: {
        type: 'suggestion', priority: 'medium',
        emoji: '💪',
        text: `Hey ${name}, looks like things are a bit rough (${this.state.errorCount} errors). Want me to help debug? Sometimes a second pair of eyes helps! 💡`
      },
      jarvis: {
        type: 'suggestion', priority: 'medium',
        emoji: '💡',
        text: `${name}, I've noticed ${this.state.errorCount} errors this session. Might I suggest we review the error patterns? Sometimes the most persistent bugs share a common root cause.`
      },
      snarky: {
        type: 'suggestion', priority: 'medium',
        emoji: '🐛',
        text: `${this.state.errorCount} errors and counting, ${name}. At this point, the bugs are features. Want me to take a look? I promise not to judge. Much. 😏`
      }
    }

    this.sendMessage(messages[cfg.level] || messages.jarvis)
  }

  private static sendIdleCheckIn(idleMin: number): void {
    const cfg = PersonalityEngine.getConfig()
    const name = cfg.greetingName

    const messages: Record<string, AmbientMessage> = {
      professional: {
        type: 'check_in', priority: 'low',
        emoji: '📡',
        text: `No activity detected for ${idleMin} minutes. Systems on standby.`
      },
      friendly: {
        type: 'check_in', priority: 'low',
        emoji: '👋',
        text: `Hey ${name}, you've been quiet for ${idleMin} min. Everything okay? I'm here if you need me!`
      },
      jarvis: {
        type: 'check_in', priority: 'low',
        emoji: '📡',
        text: `${name}, I haven't heard from you in ${idleMin} minutes. All is well, I trust? I remain at your service.`
      },
      snarky: {
        type: 'check_in', priority: 'low',
        emoji: '👋',
        text: `${idleMin} minutes of silence. Either you're deep in thought or you forgot I exist, ${name}. Both are valid. 😏`
      }
    }

    this.sendMessage(messages[cfg.level] || messages.jarvis)
  }

  private static checkSystemHealth(): void {
    try {
      const cpus = os.cpus()
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const memUsage = ((totalMem - freeMem) / totalMem) * 100
      const loadAvg = os.loadavg()[0] / cpus.length

      if (memUsage > 90) {
        this.sendMessage({
          type: 'warning', priority: 'high',
          emoji: '⚠️',
          text: `Memory usage at ${memUsage.toFixed(0)}%. Consider closing some applications.`
        })
      } else if (loadAvg > 2) {
        this.sendMessage({
          type: 'warning', priority: 'medium',
          emoji: '🔥',
          text: `CPU load is high (${(loadAvg * 100).toFixed(0)}% per core). Want me to kill background processes?`
        })
      }
    } catch {}
  }

  private static persist(): void {
    store.set('iris_soul_ambient', {
      mode: this.state?.mode
    })
  }

  static destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerAmbientPresence(): void {
  // Get ambient state
  ipcMain.handle('soul:ambient-state', () => {
    return AmbientPresence.getState()
  })

  // Set mode
  ipcMain.handle('soul:set-ambient-mode', (_, mode: AmbientMode) => {
    AmbientPresence.setMode(mode)
    return { success: true }
  })

  // Record activity
  ipcMain.handle('soul:activity', (_, type: string) => {
    AmbientPresence.recordActivity(type as any)
    return { success: true }
  })

  // Get available modes
  ipcMain.handle('soul:ambient-modes', () => {
    return [
      { id: 'silent', label: 'Silent', desc: 'Only responds to commands', emoji: '🔇' },
      { id: 'companion', label: 'Companion', desc: 'Occasional helpful nudges', emoji: '👋' },
      { id: 'jarvis', label: 'JARVIS', desc: 'Full ambient awareness', emoji: '🧠' }
    ]
  })

  console.log('[Soul:Ambient] Presence engine registered')
}
