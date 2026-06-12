/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — SESSION RITUALS ENGINE                          ║
 * ║  "Good morning, sir. Shall I brief you on today's agenda?" ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Start/end of session rituals that make IRIS feel like a companion.
 *
 * START RITUAL (when IRIS opens):
 *   - Time-aware greeting
 *   - Yesterday's summary (if available)
 *   - System status briefing
 *   - Active model status
 *   - Weather (if configured)
 *
 * END RITUAL (when IRIS closes):
 *   - Session summary
 *   - Auto-commit prompt
 *   - Tomorrow's suggestion
 *   - Farewell in current personality
 */

import { ipcMain, app, BrowserWindow } from 'electron'
import Store from 'electron-store'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { PersonalityEngine, type GreetingContext } from './personality-engine'
import { ModelRouter } from '../ai/model-router'

const StoreClass = (Store as any).default || Store
const store = new StoreClass()

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SessionRecord {
  date: string               // YYYY-MM-DD
  startHour: number
  endHour: number
  durationMin: number
  commands: number
  errors: number
  filesCreated: number
  filesModified: number
  appsUsed: string[]
  highlights: string[]       // Key events
}

export interface StartRitual {
  greeting: string
  timeContext: GreetingContext
  yesterdaySummary?: string
  systemBriefing: {
    hostname: string
    platform: string
    cpu: string
    memoryTotal: string
    memoryFree: string
    uptime: string
  }
  activeModel: string
}

export interface EndRitual {
  farewell: string
  sessionSummary: SessionRecord
  uncommittedChanges: boolean
  suggestion: string
}

// ━━━ SESSION TRACKER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class SessionRitual {
  private static sessionStart: number = 0
  private static commandCount: number = 0
  private static errorCount: number = 0
  private static highlights: string[] = []
  private static appsUsed: Set<string> = new Set()

  /**
   * Called when IRIS starts. Returns the full start ritual.
   */
  static async performStartRitual(): Promise<StartRitual> {
    this.sessionStart = Date.now()
    this.commandCount = 0
    this.errorCount = 0
    this.highlights = []
    this.appsUsed = new Set()

    const tc = PersonalityEngine.getTimeContext()
    const context: GreetingContext = {
      timeOfDay: tc.timeOfDay,
      dayOfWeek: tc.dayOfWeek,
      isWeekend: tc.isWeekend,
      uptime: 0,
      isFirstRun: !store.get('iris_soul_first_run_done')
    }

    if (context.isFirstRun) {
      store.set('iris_soul_first_run_done', true)
    }

    const greeting = PersonalityEngine.generateGreeting(context)
    const yesterdaySummary = this.getYesterdaySummary()
    const systemBriefing = this.getSystemBriefing()

    // Get active model (try/catch in case router not ready)
    let activeModel = 'Unknown'
    try {
       activeModel = ModelRouter.getActiveModel()
    } catch {}

    const ritual: StartRitual = {
      greeting,
      timeContext: context,
      yesterdaySummary,
      systemBriefing,
      activeModel
    }

    console.log(`[Soul:Ritual] Start ritual performed: ${tc.timeOfDay}`)
    return ritual
  }

  /**
   * Called when IRIS is about to close. Returns the end ritual.
   */
  static async performEndRitual(): Promise<EndRitual> {
    const now = Date.now()
    const durationMin = Math.round((now - this.sessionStart) / 60_000)
    const startHour = new Date(this.sessionStart).getHours()
    const endHour = new Date(now).getHours()
    const today = new Date().toISOString().split('T')[0]

    const sessionRecord: SessionRecord = {
      date: today,
      startHour,
      endHour,
      durationMin,
      commands: this.commandCount,
      errors: this.errorCount,
      filesCreated: 0,
      filesModified: 0,
      appsUsed: Array.from(this.appsUsed),
      highlights: this.highlights.slice(-10) // Keep last 10
    }

    // Save session record
    this.saveSessionRecord(sessionRecord)

    const farewell = PersonalityEngine.generateFarewell({
      duration: durationMin,
      commands: this.commandCount,
      bugs: this.errorCount
    })

    const suggestion = this.generateTomorrowSuggestion(sessionRecord)

    return {
      farewell,
      sessionSummary: sessionRecord,
      uncommittedChanges: false, // Would need git check
      suggestion
    }
  }

  /**
   * Record a command for session tracking.
   */
  static recordCommand(command: string, success: boolean): void {
    this.commandCount++
    if (!success) this.errorCount++
    if (success && this.commandCount % 10 === 0) {
      this.highlights.push(`Completed ${this.commandCount} commands`)
    }
  }

  /**
   * Record an app launch.
   */
  static recordApp(appName: string): void {
    this.appsUsed.add(appName)
  }

  /**
   * Record a highlight event.
   */
  static recordHighlight(event: string): void {
    this.highlights.push(event)
  }

  // ━━━ INTERNAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private static getSystemBriefing(): StartRitual['systemBriefing'] {
    const cpus = os.cpus()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const uptimeHrs = Math.round(os.uptime() / 3600)

    const formatBytes = (b: number) => {
      const gb = b / (1024 ** 3)
      return `${gb.toFixed(1)} GB`
    }

    return {
      hostname: os.hostname(),
      platform: `${os.type()} ${os.release()}`,
      cpu: cpus[0]?.model?.split(' ').slice(0, 4).join(' ') || 'Unknown',
      memoryTotal: formatBytes(totalMem),
      memoryFree: formatBytes(freeMem),
      uptime: `${uptimeHrs}h`
    }
  }

  private static getYesterdaySummary(): string | undefined {
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dateStr = yesterday.toISOString().split('T')[0]

      const records = store.get('iris_session_records') as SessionRecord[] | undefined
      if (!records?.length) return undefined

      const record = records.find(r => r.date === dateStr)
      if (!record) return undefined

      const hrs = Math.round(record.durationMin / 60)
      return `Yesterday: ${hrs}h session, ${record.commands} commands, ${record.appsUsed.join(', ') || 'no apps tracked'}`
    } catch {
      return undefined
    }
  }

  private static saveSessionRecord(record: SessionRecord): void {
    try {
      const existing = (store.get('iris_session_records') as SessionRecord[]) || []
      existing.push(record)
      // Keep last 30 days
      const trimmed = existing.slice(-30)
      store.set('iris_session_records', trimmed)
    } catch {}
  }

  private static generateTomorrowSuggestion(record: SessionRecord): string {
    const suggestions: string[] = []

    if (record.errors > 5) {
      suggestions.push('Consider reviewing error patterns from today')
    }
    if (record.durationMin > 360) { // 6+ hours
      suggestions.push('Take more frequent breaks tomorrow')
    }
    if (record.commands > 50) {
      suggestions.push('Consider automating repetitive tasks with macros')
    }
    if (record.appsUsed.length > 5) {
      suggestions.push('Set up a workspace layout for your common apps')
    }

    return suggestions[Math.floor(Math.random() * suggestions.length)] || 'Another productive day awaits!'
  }

  static getCommandCount(): number { return this.commandCount }
  static getErrorCount(): number { return this.errorCount }
  static getSessionStart(): number { return this.sessionStart }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerSessionRitual(): void {
  // Get start ritual
  ipcMain.handle('soul:start-ritual', async () => {
    return await SessionRitual.performStartRitual()
  })

  // Get end ritual
  ipcMain.handle('soul:end-ritual', async () => {
    return await SessionRitual.performEndRitual()
  })

  // Record command
  ipcMain.handle('soul:record-command', (_, command: string, success: boolean) => {
    SessionRitual.recordCommand(command, success)
    return { success: true }
  })

  // Record highlight
  ipcMain.handle('soul:record-highlight', (_, event: string) => {
    SessionRitual.recordHighlight(event)
    return { success: true }
  })

  // Get session history
  ipcMain.handle('soul:session-history', () => {
    return store.get('iris_session_records') || []
  })

  console.log('[Soul:Ritual] Session rituals registered')
}
