/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — PROCEDURAL MEMORY ENGINE                        ║
 * ║  "Tomorrow at 9am, remind me to push the auth branch."     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * The "HOW and WHEN" memory:
 *   - Scheduled tasks: "remind me tomorrow at 9am to deploy"
 *   - Recurring habits: "every Monday I review PRs"
 *   - Time-based triggers: triggers at specific time/date
 *   - Task chains: step 1 → step 2 → step 3 sequences
 *   - Follow-ups: "check on this in 2 hours"
 *
 * This engine:
 *   1. Parses natural language time expressions ("tomorrow", "in 2h")
 *   2. Creates scheduled reminders and recurring tasks
 *   3. Fires notifications via Telegram + Desktop when due
 *   4. Tracks task completion history for habit detection
 *
 * Storage: Brain/procedural.json
 */

import { ipcMain, app, BrowserWindow, Notification } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { EpisodicMemory } from './episodic-memory'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type TaskStatus = 'pending' | 'completed' | 'snoozed' | 'cancelled' | 'overdue'
export type TaskRecurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom'

export interface ProceduralTask {
  id: string
  /** What to do */
  title: string
  /** Full description / context */
  detail: string
  /** Who created it */
  source: 'telegram' | 'desktop' | 'voice' | 'auto'
  /** Status */
  status: TaskStatus
  /** When it's due — ISO date */
  dueAt: string | null
  /** Recurrence pattern */
  recurrence: TaskRecurrence
  /** Custom recurrence interval in ms (for 'custom') */
  recurrenceMs: number | null
  /** When it was created */
  createdAt: string
  /** When it was completed */
  completedAt: string | null
  /** How many times completed (for habits) */
  completionCount: number
  /** Tags for categorization */
  tags: string[]
  /** Priority 1-5 (5 = urgent) */
  priority: number
  /** Chat ID to deliver notification to (Telegram) */
  notifyChatId?: string
  /** Last notification sent */
  lastNotifiedAt: string | null
}

export interface ProceduralStats {
  total: number
  pending: number
  completed: number
  overdue: number
  habits: number
  completionRate: number
  upcomingCount: number
}

// ━━━ STORAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FILE = () => {
  const dir = path.resolve(app.getPath('userData'), 'Brain')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'procedural.json')
}

let tasks: ProceduralTask[] = []
let isLoaded = false
let checkInterval: NodeJS.Timeout | null = null
let mainWindow: BrowserWindow | null = null
let telegramNotify: ((msg: string, chatId?: string) => Promise<void>) | null = null

// ━━━ CORE ENGINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class ProceduralMemory {

  static init(): void {
    if (isLoaded) return
    try {
      if (fs.existsSync(FILE())) {
        tasks = JSON.parse(fs.readFileSync(FILE(), 'utf-8'))
      }
    } catch { tasks = [] }
    isLoaded = true
    console.log(`[Brain:Procedural] Loaded ${tasks.length} tasks`)
  }

  /**
   * Initialize with window reference for desktop notifications.
   */
  static startChecker(window: BrowserWindow): void {
    this.init()
    mainWindow = window

    // Check every 30 seconds for due tasks
    if (checkInterval) clearInterval(checkInterval)
    checkInterval = setInterval(() => this.checkDueTasks(), 30000)

    // Run initial check
    this.checkDueTasks()

    console.log('[Brain:Procedural] Task checker started (30s interval)')
  }

  /**
   * Register Telegram notification function.
   */
  static setTelegramNotify(fn: (msg: string, chatId?: string) => Promise<void>): void {
    telegramNotify = fn
  }

  // ━━━ CREATE TASK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Create a new procedural task.
   * Parses natural language time expressions.
   */
  static create(params: {
    title: string
    detail?: string
    source?: 'telegram' | 'desktop' | 'voice' | 'auto'
    dueAt?: string | null          // ISO date or natural language
    recurrence?: TaskRecurrence
    tags?: string[]
    priority?: number
    notifyChatId?: string
  }): ProceduralTask {
    this.init()

    const dueAt = params.dueAt ? this.parseTime(params.dueAt) : null

    const task: ProceduralTask = {
      id: `task_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      title: params.title,
      detail: params.detail || params.title,
      source: params.source || 'desktop',
      status: 'pending',
      dueAt,
      recurrence: params.recurrence || 'once',
      recurrenceMs: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      completionCount: 0,
      tags: params.tags || [],
      priority: params.priority || 3,
      notifyChatId: params.notifyChatId,
      lastNotifiedAt: null
    }

    tasks.push(task)
    this.persist()

    // Record in episodic memory
    try {
      EpisodicMemory.record({
        type: 'note',
        title: `Task created: ${task.title.substring(0, 60)}`,
        detail: `Due: ${dueAt ? new Date(dueAt).toLocaleString() : 'no deadline'}. Recurrence: ${task.recurrence}`,
        context: { source: params.source || 'desktop', tags: ['procedural', 'task', 'reminder'] },
        outcome: 'success',
        insights: [`User wants to: ${task.title.substring(0, 40)}`]
      })
    } catch {}

    return task
  }

  /**
   * Create from natural language.
   * "remind me tomorrow at 9am to deploy"
   * "every monday review PRs"
   */
  static createFromNL(text: string, source: 'telegram' | 'desktop' | 'voice' = 'desktop', chatId?: string): ProceduralTask | null {
    const parsed = this.parseNLTask(text)
    if (!parsed) return null

    return this.create({
      title: parsed.title,
      detail: text,
      source,
      dueAt: parsed.dueAt,
      recurrence: parsed.recurrence,
      tags: parsed.tags,
      notifyChatId: chatId
    })
  }

  // ━━━ QUERY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  static getAll(): ProceduralTask[] {
    this.init()
    return [...tasks].sort((a, b) => {
      // Pending first, then by due date
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt)
      if (a.dueAt) return -1
      return 1
    })
  }

  static getPending(): ProceduralTask[] {
    return this.getAll().filter(t => t.status === 'pending')
  }

  static getOverdue(): ProceduralTask[] {
    const now = new Date().toISOString()
    return this.getAll().filter(t => t.status === 'pending' && t.dueAt && t.dueAt < now)
  }

  static getUpcoming(hours: number = 24): ProceduralTask[] {
    const now = new Date()
    const future = new Date(now.getTime() + hours * 3600000).toISOString()
    return this.getAll().filter(t =>
      t.status === 'pending' && t.dueAt && t.dueAt > now.toISOString() && t.dueAt <= future
    )
  }

  static getHabits(): ProceduralTask[] {
    return this.getAll().filter(t => t.recurrence !== 'once')
  }

  static getByTag(tag: string): ProceduralTask[] {
    return this.getAll().filter(t => t.tags.includes(tag))
  }

  static get(id: string): ProceduralTask | undefined {
    return tasks.find(t => t.id === id)
  }

  // ━━━ ACTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  static complete(id: string): boolean {
    const task = tasks.find(t => t.id === id)
    if (!task) return false

    task.status = 'completed'
    task.completedAt = new Date().toISOString()
    task.completionCount++

    // If recurring, create next instance
    if (task.recurrence !== 'once') {
      this.spawnNextRecurrence(task)
    }

    this.persist()

    // Record in brain
    try {
      EpisodicMemory.record({
        type: 'achievement',
        title: `Task completed: ${task.title.substring(0, 60)}`,
        detail: `Completed ${task.recurrence} task. Total completions: ${task.completionCount}`,
        context: { source: task.source, tags: ['procedural', 'completed', task.recurrence] },
        outcome: 'success'
      })
    } catch {}

    return true
  }

  static snooze(id: string, duration: string = '1h'): boolean {
    const task = tasks.find(t => t.id === id)
    if (!task) return false

    const ms = this.parseDuration(duration)
    if (!ms) return false

    task.dueAt = new Date(Date.now() + ms).toISOString()
    task.status = 'pending'
    task.lastNotifiedAt = null
    this.persist()
    return true
  }

  static cancel(id: string): boolean {
    const task = tasks.find(t => t.id === id)
    if (!task) return false
    task.status = 'cancelled'
    this.persist()
    return true
  }

  static clearCompleted(): number {
    const before = tasks.length
    tasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
    this.persist()
    return before - tasks.length
  }

  // ━━━ STATS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  static getStats(): ProceduralStats {
    this.init()
    const pending = tasks.filter(t => t.status === 'pending').length
    const completed = tasks.filter(t => t.status === 'completed').length
    const overdue = this.getOverdue().length
    const habits = tasks.filter(t => t.recurrence !== 'once').length
    const total = tasks.length
    const completionRate = total > 0 ? completed / total : 0

    return {
      total,
      pending,
      completed,
      overdue,
      habits,
      completionRate: Math.round(completionRate * 100),
      upcomingCount: this.getUpcoming(24).length
    }
  }

  // ━━━ NATURAL LANGUAGE PARSING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Check if a message looks like a task/reminder request.
   */
  static isTaskRequest(text: string): boolean {
    const lower = text.toLowerCase()
    return !!(
      lower.match(/\b(remind|reminder|todo|task|schedule|alert|notify|wake)\b/) ||
      lower.match(/\b(tomorrow|tonight|later|next week|next month)\b/) ||
      lower.match(/\b(at \d|in \d+ ?(min|hour|hr|sec|day|week|month))/) ||
      lower.match(/\b(every|each|daily|weekly|monthly)\b.*\b(review|check|do|push|deploy|standup|meeting)\b/) ||
      lower.match(/\b(don'?t forget|make sure|remember to)\b/)
    )
  }

  /**
   * Parse NL task into structured data.
   */
  private static parseNLTask(text: string): {
    title: string
    dueAt: string | null
    recurrence: TaskRecurrence
    tags: string[]
  } | null {
    const lower = text.toLowerCase()

    // Determine recurrence
    let recurrence: TaskRecurrence = 'once'
    if (lower.match(/\bevery\s+(day|daily)\b/) || lower.match(/\bdaily\b/)) recurrence = 'daily'
    else if (lower.match(/\bevery\s+(week|weekly|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)) recurrence = 'weekly'
    else if (lower.match(/\bevery\s+(month|monthly)\b/)) recurrence = 'monthly'

    // Determine due time
    let dueAt: string | null = null
    const now = new Date()

    // "tomorrow at 9am" / "tomorrow"
    const tomorrowMatch = lower.match(/tomorrow\s*(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (tomorrowMatch) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      let hours = parseInt(tomorrowMatch[1])
      const mins = parseInt(tomorrowMatch[2] || '0')
      const ampm = tomorrowMatch[3]?.toLowerCase()
      if (ampm === 'pm' && hours < 12) hours += 12
      if (ampm === 'am' && hours === 12) hours = 0
      tomorrow.setHours(hours, mins, 0, 0)
      dueAt = tomorrow.toISOString()
    } else if (lower.includes('tomorrow')) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)  // Default 9am
      dueAt = tomorrow.toISOString()
    }

    // "tonight at 8pm"
    const tonightMatch = lower.match(/tonight\s*(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (tonightMatch) {
      const tonight = new Date(now)
      let hours = parseInt(tonightMatch[1])
      const mins = parseInt(tonightMatch[2] || '0')
      const ampm = tonightMatch[3]?.toLowerCase()
      if (ampm === 'pm' || (!ampm && hours < 12)) hours += (hours < 12 ? 12 : 0)
      if (ampm === 'am' && hours === 12) hours = 0
      tonight.setHours(hours, mins, 0, 0)
      dueAt = tonight.toISOString()
    } else if (lower.includes('tonight')) {
      const tonight = new Date(now)
      tonight.setHours(20, 0, 0, 0)  // Default 8pm
      dueAt = tonight.toISOString()
    }

    // "in 2 hours" / "in 30 minutes"
    const inMatch = lower.match(/in\s+(\d+)\s*(min|minute|hour|hr|sec|day|week|month)s?/i)
    if (inMatch && !dueAt) {
      const amount = parseInt(inMatch[1])
      const unit = inMatch[2].toLowerCase()
      const multipliers: Record<string, number> = {
        sec: 1000, min: 60000, minute: 60000,
        hour: 3600000, hr: 3600000,
        day: 86400000, week: 604800000, month: 2592000000
      }
      const ms = amount * (multipliers[unit] || 3600000)
      dueAt = new Date(Date.now() + ms).toISOString()
    }

    // "at 3pm" (today)
    const atMatch = lower.match(/(?:today\s*)?at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
    if (atMatch && !dueAt && !lower.includes('tomorrow')) {
      const today = new Date(now)
      let hours = parseInt(atMatch[1])
      const mins = parseInt(atMatch[2] || '0')
      const ampm = atMatch[3]?.toLowerCase()
      if (ampm === 'pm' && hours < 12) hours += 12
      if (ampm === 'am' && hours === 12) hours = 0
      today.setHours(hours, mins, 0, 0)
      // If time has passed, schedule for tomorrow
      if (today < now) today.setDate(today.getDate() + 1)
      dueAt = today.toISOString()
    }

    // "next monday/tuesday/etc"
    const nextDayMatch = lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
    if (nextDayMatch && !dueAt) {
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6
      }
      const targetDay = dayMap[nextDayMatch[1].toLowerCase()]
      const d = new Date(now)
      const currentDay = d.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 7
      d.setDate(d.getDate() + daysUntil)
      d.setHours(9, 0, 0, 0)
      dueAt = d.toISOString()
    }

    // "later" = 2 hours from now
    if (lower.includes('later') && !dueAt) {
      dueAt = new Date(Date.now() + 2 * 3600000).toISOString()
    }

    // Extract clean title (remove time expressions)
    let title = text
      .replace(/\b(remind\s+me\s+(to\s+)?|reminder:\s*|todo:\s*|don'?t\s+forget\s+to\s+|make\s+sure\s+(i\s+)?|remember\s+to\s+)\b/gi, '')
      .replace(/\b(tomorrow|tonight|later|next\s+\w+)\b/gi, '')
      .replace(/\b(in\s+\d+\s*(min|minute|hour|hr|sec|day|week|month)s?)\b/gi, '')
      .replace(/\b(at\s+\d{1,2}(:\d{2})?\s*(am|pm)?)\b/gi, '')
      .replace(/\b(every\s+\w+)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!title || title.length < 3) title = text.substring(0, 60)

    // Tags
    const tags: string[] = ['reminder']
    if (recurrence !== 'once') tags.push('habit', 'recurring')
    if (lower.match(/\b(deploy|push|git|release)\b/)) tags.push('deploy')
    if (lower.match(/\b(meeting|standup|call)\b/)) tags.push('meeting')
    if (lower.match(/\b(review|check)\b/)) tags.push('review')
    if (lower.match(/\b(code|debug|fix)\b/)) tags.push('coding')

    return { title, dueAt, recurrence, tags }
  }

  // ━━━ DUE TASK CHECKER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private static checkDueTasks(): void {
    this.init()
    const now = new Date()

    for (const task of tasks) {
      if (task.status !== 'pending') continue
      if (!task.dueAt) continue

      const due = new Date(task.dueAt)

      // Check if task is due (within 1 minute window to avoid double-fire)
      const diff = now.getTime() - due.getTime()
      if (diff < -60000) continue  // Not yet due
      if (diff > 3600000 && task.status === 'pending') {
        // Overdue by >1hr
        task.status = 'overdue'
      }

      // Already notified recently? (skip if notified in last 5 min)
      if (task.lastNotifiedAt) {
        const lastNotified = new Date(task.lastNotifiedAt).getTime()
        if (now.getTime() - lastNotified < 300000) continue
      }

      // FIRE NOTIFICATION
      this.notifyTask(task)
      task.lastNotifiedAt = now.toISOString()
    }

    this.persist()
  }

  /**
   * Send notification for a due task via Desktop + Telegram.
   */
  private static notifyTask(task: ProceduralTask): void {
    const emoji = task.recurrence !== 'once' ? '🔄' : '⏰'
    const priorityEmoji = task.priority >= 4 ? '🔴' : task.priority >= 3 ? '🟡' : '🟢'
    const message = `${emoji} <b>${task.title}</b>\n\n${priorityEmoji} Priority: ${task.priority}/5\n${task.recurrence !== 'once' ? `🔁 ${task.recurrence}\n` : ''}${task.dueAt ? `📅 Due: ${new Date(task.dueAt).toLocaleString()}\n` : ''}${task.detail !== task.title ? `\n${task.detail}` : ''}`

    // Desktop notification
    try {
      if (Notification.isSupported()) {
        new Notification({
          title: `${emoji} ${task.title}`,
          body: task.detail !== task.title ? task.detail : `Due ${task.dueAt ? new Date(task.dueAt).toLocaleString() : 'now'}`,
          silent: false
        }).show()
      }
    } catch {}

    // Send to renderer
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('procedural:due', { task, message })
      }
    } catch {}

    // Send to Telegram
    if (telegramNotify && task.notifyChatId) {
      telegramNotify(message, task.notifyChatId).catch(() => {})
    } else if (telegramNotify) {
      // No specific chatId — send to default
      telegramNotify(message).catch(() => {})
    }
  }

  /**
   * When a recurring task completes, spawn the next occurrence.
   */
  private static spawnNextRecurrence(task: ProceduralTask): void {
    let nextDue: Date | null = null
    const now = new Date()

    switch (task.recurrence) {
      case 'daily':
        nextDue = new Date(now.getTime() + 86400000)
        break
      case 'weekly':
        nextDue = new Date(now.getTime() + 604800000)
        break
      case 'monthly':
        nextDue = new Date(now.getTime() + 2592000000)
        break
      case 'custom':
        if (task.recurrenceMs) {
          nextDue = new Date(now.getTime() + task.recurrenceMs)
        }
        break
    }

    if (nextDue) {
      const nextTask: ProceduralTask = {
        id: `task_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        title: task.title,
        detail: task.detail,
        source: task.source,
        status: 'pending',
        dueAt: nextDue.toISOString(),
        recurrence: task.recurrence,
        recurrenceMs: task.recurrenceMs,
        createdAt: now.toISOString(),
        completedAt: null,
        completionCount: task.completionCount,  // Carry over count
        tags: [...task.tags],
        priority: task.priority,
        notifyChatId: task.notifyChatId,
        lastNotifiedAt: null
      }
      tasks.push(nextTask)
    }
  }

  // ━━━ TIME PARSING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Parse a time string into ISO date.
   * Accepts: ISO dates, "tomorrow", "in 2h", "tonight", etc.
   */
  private static parseTime(input: string): string | null {
    // Already ISO?
    if (input.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return input
    }

    // Try natural language via parseNLTask
    const parsed = this.parseNLTask(`remind me ${input}`)
    return parsed?.dueAt || null
  }

  /**
   * Parse duration string like "1h", "30min", "2 days" into ms.
   */
  private static parseDuration(input: string): number | null {
    const match = input.match(/(\d+)\s*(min|minute|hour|hr|sec|day|week|month)s?/i)
    if (!match) return null
    const amount = parseInt(match[1])
    const unit = match[2].toLowerCase()
    const multipliers: Record<string, number> = {
      sec: 1000, min: 60000, minute: 60000,
      hour: 3600000, hr: 3600000,
      day: 86400000, week: 604800000, month: 2592000000
    }
    return amount * (multipliers[unit] || 3600000)
  }

  // ━━━ PERSIST ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private static persist(): void {
    try {
      // Cap at 1000 tasks
      if (tasks.length > 1000) {
        // Remove old completed/cancelled tasks
        tasks = tasks.filter(t =>
          t.status === 'pending' ||
          (t.status === 'completed' && t.completionCount > 0) ||
          t.recurrence !== 'once'
        )
        if (tasks.length > 1000) {
          tasks = tasks.slice(-1000)
        }
      }
      fs.writeFileSync(FILE(), JSON.stringify(tasks, null, 2))
    } catch (e) {
      console.error('[Brain:Procedural] Persist error:', e)
    }
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerProceduralMemory(): void {
  ProceduralMemory.init()

  ipcMain.handle('procedural:create', (_, params) => {
    return ProceduralMemory.create(params)
  })

  ipcMain.handle('procedural:create-nl', (_, text, source, chatId?) => {
    return ProceduralMemory.createFromNL(text, source, chatId)
  })

  ipcMain.handle('procedural:is-task', (_, text) => {
    return ProceduralMemory.isTaskRequest(text)
  })

  ipcMain.handle('procedural:get-all', () => {
    return ProceduralMemory.getAll()
  })

  ipcMain.handle('procedural:get-pending', () => {
    return ProceduralMemory.getPending()
  })

  ipcMain.handle('procedural:get-overdue', () => {
    return ProceduralMemory.getOverdue()
  })

  ipcMain.handle('procedural:get-upcoming', (_, hours?) => {
    return ProceduralMemory.getUpcoming(hours || 24)
  })

  ipcMain.handle('procedural:get-habits', () => {
    return ProceduralMemory.getHabits()
  })

  ipcMain.handle('procedural:get', (_, id) => {
    return ProceduralMemory.get(id)
  })

  ipcMain.handle('procedural:complete', (_, id) => {
    return ProceduralMemory.complete(id)
  })

  ipcMain.handle('procedural:snooze', (_, id, duration?) => {
    return ProceduralMemory.snooze(id, duration || '1h')
  })

  ipcMain.handle('procedural:cancel', (_, id) => {
    return ProceduralMemory.cancel(id)
  })

  ipcMain.handle('procedural:clear-completed', () => {
    return ProceduralMemory.clearCompleted()
  })

  ipcMain.handle('procedural:stats', () => {
    return ProceduralMemory.getStats()
  })

  console.log('[Brain:Procedural] Task & habit engine registered')
}
