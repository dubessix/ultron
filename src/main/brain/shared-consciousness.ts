/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — SHARED CONSCIOUSNESS ENGINE                     ║
 * ║  "One brain. Every interface sees the same mind."          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Telegram + Desktop = ONE brain. Everything learned on one
 * interface is instantly available on the other.
 *
 * How it works:
 *   1. Telegram learns a fact → broadcasts to Desktop
 *   2. Desktop records an event → broadcasts to Telegram
 *   3. Both share the same Brain/ files on disk
 *   4. Real-time sync events via IPC + Telegram notifications
 *
 * Sync channels:
 *   - brain:sync:fact        — New fact learned
 *   - brain:sync:event       — New event recorded
 *   - brain:sync:task        — Task created/completed
 *   - brain:sync:mood        — Mood assessment updated
 *   - brain:sync:preference  — Preference changed
 *   - brain:sync:state       — Full state request
 *
 * This module:
 *   1. Hooks into all brain write operations
 *   2. Broadcasts changes to all connected interfaces
 *   3. Provides "catch up" when an interface reconnects
 *   4. Manages the shared state notification system
 */

import { ipcMain, app, BrowserWindow } from 'electron'
import { EpisodicMemory } from '../brain/episodic-memory'
import { SemanticMemory } from '../brain/semantic-memory'
import { BrainRouter } from '../brain/brain-router'
import { ProceduralMemory } from '../brain/procedural-memory'
import { PersonalityEngine } from '../soul/personality-engine'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type SyncSource = 'telegram' | 'desktop' | 'voice'
export type SyncEventType = 'fact' | 'event' | 'task' | 'mood' | 'preference' | 'state' | 'agent'

export interface SyncEvent {
  id: string
  type: SyncEventType
  source: SyncSource
  timestamp: string
  data: any
  summary: string  // Human-readable summary for notifications
}

export interface ConsciousnessState {
  lastSyncAt: string
  totalFacts: number
  totalEvents: number
  totalTasks: number
  pendingTasks: number
  currentMood: string
  personalityMode: string
  activeAgents: number
  sources: {
    telegram: { connected: boolean; lastActivity: string | null }
    desktop: { connected: boolean; lastActivity: string | null }
  }
}

// ━━━ STATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let mainWindow: BrowserWindow | null = null
let telegramNotify: ((msg: string, chatId?: string) => Promise<void>) | null = null
let syncLog: SyncEvent[] = []
let isInitialized = false

// ━━━ CONSCIOUSNESS ENGINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class SharedConsciousness {

  /**
   * Initialize the shared consciousness system.
   * Wires up all brain operations to broadcast sync events.
   */
  static init(window: BrowserWindow): void {
    if (isInitialized) return
    mainWindow = window
    isInitialized = true

    console.log('[Consciousness] Shared Consciousness Engine initialized')
    console.log('[Consciousness] Telegram + Desktop = One Brain')
  }

  /**
   * Register the Telegram notification function.
   */
  static setTelegramNotify(fn: (msg: string, chatId?: string) => Promise<void>): void {
    telegramNotify = fn
  }

  // ━━━ BROADCAST METHODS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Broadcast a sync event to ALL interfaces.
   * Desktop gets it via IPC, Telegram gets it via message.
   */
  static broadcast(event: Omit<SyncEvent, 'id' | 'timestamp'>): void {
    const syncEvent: SyncEvent = {
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...event
    }

    // Add to sync log (keep last 100)
    syncLog.push(syncEvent)
    if (syncLog.length > 100) syncLog = syncLog.slice(-100)

    // ── Send to Desktop (renderer) ──
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('consciousness:sync', syncEvent)
    }

    // ── Send to Telegram (if enabled and from different source) ──
    // Only send important events to Telegram, not everything
    if (telegramNotify && event.source === 'desktop') {
      const importantTypes: SyncEventType[] = ['fact', 'task', 'mood', 'preference']
      if (importantTypes.includes(event.type)) {
        telegramNotify(`🧠 <b>Brain Sync</b> [Desktop → Telegram]\n\n${event.summary}`).catch(() => {})
      }
    }
  }

  /**
   * Broadcast from Telegram → Desktop
   */
  static broadcastFromTelegram(type: SyncEventType, data: any, summary: string): void {
    this.broadcast({ type, source: 'telegram', data, summary })
  }

  /**
   * Broadcast from Desktop → Telegram
   */
  static broadcastFromDesktop(type: SyncEventType, data: any, summary: string): void {
    this.broadcast({ type, source: 'desktop', data, summary })
  }

  /**
   * Broadcast from Agent → All
   */
  static broadcastFromAgent(type: SyncEventType, data: any, summary: string): void {
    this.broadcast({ type, source: 'voice', data, summary })
  }

  // ━━━ HIGH-LEVEL SYNC METHODS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * A fact was learned on any interface.
   */
  static syncFact(category: string, key: string, value: string, source: SyncSource): void {
    SemanticMemory.record(category as any, key, value, source, 'certain')
    this.broadcast({
      type: 'fact',
      source,
      data: { category, key, value },
      summary: `📝 Learned: <b>${key}</b> = <code>${value}</code> (${category})`
    })
  }

  /**
   * An event was recorded on any interface.
   */
  static syncEvent(title: string, detail: string, source: SyncSource, tags: string[] = []): void {
    try {
      EpisodicMemory.record({
        type: tags.includes('error') ? 'error' : 'command',
        title: title.substring(0, 80),
        detail: detail.substring(0, 300),
        context: { source, tags },
        outcome: 'success'
      })
    } catch {}

    this.broadcast({
      type: 'event',
      source,
      data: { title, tags },
      summary: `📋 Event: <b>${title.substring(0, 60)}</b>`
    })
  }

  /**
   * A task was created on any interface.
   */
  static syncTask(title: string, dueAt: string | null, source: SyncSource, chatId?: string): void {
    try {
      ProceduralMemory.create({
        title,
        source,
        dueAt,
        notifyChatId: chatId
      })
    } catch {}

    const dueStr = dueAt ? ` — Due: ${new Date(dueAt).toLocaleString()}` : ''
    this.broadcast({
      type: 'task',
      source,
      data: { title, dueAt },
      summary: `⏰ New task: <b>${title.substring(0, 60)}</b>${dueStr}`
    })
  }

  /**
   * Mood was assessed on any interface.
   */
  static syncMood(mood: string, source: SyncSource): void {
    this.broadcast({
      type: 'mood',
      source,
      data: { mood },
      summary: `🎯 Mood updated: <b>${mood}</b>`
    })
  }

  /**
   * A preference was changed on any interface.
   */
  static syncPreference(key: string, value: string, source: SyncSource): void {
    this.broadcast({
      type: 'preference',
      source,
      data: { key, value },
      summary: `⚙️ Preference: <b>${key}</b> → <code>${value}</code>`
    })
  }

  // ━━━ STATE & RECOVERY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get the full consciousness state — used for "catch up" on reconnect.
   */
  static getState(): ConsciousnessState {
    let totalFacts = 0, totalEvents = 0, totalTasks = 0, pendingTasks = 0
    let currentMood = 'neutral', personalityMode = 'friendly'

    try {
      const semStats = SemanticMemory.getStats()
      totalFacts = semStats.total || 0
    } catch {}

    try {
      const epStats = EpisodicMemory.getStats()
      totalEvents = epStats.total || 0
    } catch {}

    try {
      const taskStats = ProceduralMemory.getStats()
      totalTasks = taskStats.total || 0
      pendingTasks = taskStats.pending || 0
    } catch {}

    try {
      const cfg = PersonalityEngine.getConfig()
      personalityMode = cfg.level
    } catch {}

    return {
      lastSyncAt: new Date().toISOString(),
      totalFacts,
      totalEvents,
      totalTasks,
      pendingTasks,
      currentMood,
      personalityMode,
      activeAgents: 0,
      sources: {
        telegram: {
          connected: !!telegramNotify,
          lastActivity: syncLog.filter(s => s.source === 'telegram').slice(-1)[0]?.timestamp || null
        },
        desktop: {
          connected: !!mainWindow && !mainWindow.isDestroyed(),
          lastActivity: syncLog.filter(s => s.source === 'desktop').slice(-1)[0]?.timestamp || null
        }
      }
    }
  }

  /**
   * Get the sync log (recent sync events).
   */
  static getSyncLog(limit: number = 20): SyncEvent[] {
    return syncLog.slice(-limit)
  }

  /**
   * Get a formatted summary of the consciousness state.
   */
  static getStatusReport(): string {
    const state = this.getState()
    const recentSyncs = syncLog.slice(-5)

    let report = `🧠 <b>IRIS Shared Consciousness</b>\n\n`
    report += `📊 <b>Brain State:</b>\n`
    report += `  Facts: ${state.totalFacts}\n`
    report += `  Events: ${state.totalEvents}\n`
    report += `  Tasks: ${state.totalTasks} (${state.pendingTasks} pending)\n`
    report += `  Mood: ${state.currentMood}\n`
    report += `  Personality: ${state.personalityMode}\n\n`

    report += `🔗 <b>Interfaces:</b>\n`
    report += `  Desktop: ${state.sources.desktop.connected ? '🟢 Connected' : '🔴 Offline'}\n`
    report += `  Telegram: ${state.sources.telegram.connected ? '🟢 Connected' : '🔴 Offline'}\n\n`

    if (recentSyncs.length) {
      report += `📡 <b>Recent Syncs:</b>\n`
      for (const s of recentSyncs) {
        const time = new Date(s.timestamp).toLocaleTimeString()
        const icon = s.source === 'telegram' ? '📱' : s.source === 'desktop' ? '🖥️' : '🤖'
        report += `  ${icon} ${time} — ${s.type}: ${s.summary.replace(/<[^>]*>/g, '').substring(0, 40)}\n`
      }
    }

    report += `\n✅ <b>One brain. Every interface sees the same mind.</b>`
    return report
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerSharedConsciousness(): void {
  // Get consciousness state
  ipcMain.handle('consciousness:state', () => {
    return SharedConsciousness.getState()
  })

  // Get sync log
  ipcMain.handle('consciousness:sync-log', (_, limit?) => {
    return SharedConsciousness.getSyncLog(limit || 20)
  })

  // Sync a fact from renderer
  ipcMain.handle('consciousness:sync-fact', (_, category, key, value) => {
    SharedConsciousness.syncFact(category, key, value, 'desktop')
    return { success: true }
  })

  // Sync an event from renderer
  ipcMain.handle('consciousness:sync-event', (_, title, detail, tags?) => {
    SharedConsciousness.syncEvent(title, detail, 'desktop', tags || [])
    return { success: true }
  })

  // Sync a task from renderer
  ipcMain.handle('consciousness:sync-task', (_, title, dueAt?) => {
    SharedConsciousness.syncTask(title, dueAt || null, 'desktop')
    return { success: true }
  })

  // Get status report
  ipcMain.handle('consciousness:report', () => {
    return SharedConsciousness.getStatusReport()
  })

  console.log('[Consciousness] Shared Consciousness registered ✅')
}
