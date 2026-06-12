/**
 * IRIS AI - CODING ANALYTICS ENGINE
 * "Track your flow. Know your patterns."
 *
 * Tracks:
 *   - Files created/modified/deleted per session
 *   - Languages used (by file extension)
 *   - Time spent coding (active vs idle)
 *   - Error rates (from Error Companion)
 *   - Build/test pass rates
 *   - Productivity score
 *   - Streak tracking
 *
 * Storage: userData/coding-analytics.json
 */
import { ipcMain, app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CodingSession {
  id: string
  startedAt: string
  endedAt: string | null
  durationMs: number
  filesCreated: number
  filesModified: number
  filesDeleted: number
  commandsRun: number
  errorsEncountered: number
  errorsFixed: number
  buildsRun: number
  buildsPassed: number
  testsRun: number
  testsPassed: number
  languages: Record<string, number>    // lang -> file count
  topFiles: string[]                   // most edited files
  productivityScore: number            // 0-100
}

export interface AnalyticsState {
  currentSession: CodingSession | null
  allSessions: CodingSession[]
  lifetimeStats: {
    totalSessions: number
    totalCodingHours: number
    totalFilesCreated: number
    totalCommandsRun: number
    totalErrorsFixed: number
    totalBuildsPassed: number
    favoriteLanguage: string
    currentStreak: number              // consecutive days coded
    longestStreak: number
  }
}

// ━━━ ENGINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STORE_FILE = 'coding-analytics.json'
let state: AnalyticsState
let mainWindow: BrowserWindow | null = null
let activityTimer: ReturnType<typeof setInterval> | null = null
let lastActivityAt: number = Date.now()

function getStorePath(): string {
  return path.join(app.getPath('userData'), STORE_FILE)
}

function loadState(): void {
  try {
    if (fs.existsSync(getStorePath())) {
      state = JSON.parse(fs.readFileSync(getStorePath(), 'utf-8'))
      // Recalc lifetime stats
      recalcLifetime()
      return
    }
  } catch {}
  state = {
    currentSession: null,
    allSessions: [],
    lifetimeStats: {
      totalSessions: 0, totalCodingHours: 0, totalFilesCreated: 0,
      totalCommandsRun: 0, totalErrorsFixed: 0, totalBuildsPassed: 0,
      favoriteLanguage: 'typescript', currentStreak: 0, longestStreak: 0
    }
  }
}

function saveState(): void {
  try { fs.writeFileSync(getStorePath(), JSON.stringify(state, null, 2)) } catch {}
}

function generateId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
}

function recalcLifetime(): void {
  const sessions = state.allSessions
  const ls = state.lifetimeStats
  ls.totalSessions = sessions.length
  ls.totalCodingHours = Math.round(sessions.reduce((a, s) => a + s.durationMs, 0) / 3600000 * 10) / 10
  ls.totalFilesCreated = sessions.reduce((a, s) => a + s.filesCreated, 0)
  ls.totalCommandsRun = sessions.reduce((a, s) => a + s.commandsRun, 0)
  ls.totalErrorsFixed = sessions.reduce((a, s) => a + s.errorsFixed, 0)
  ls.totalBuildsPassed = sessions.reduce((a, s) => a + s.buildsPassed, 0)

  // Favorite language
  const langCounts: Record<string, number> = {}
  for (const s of sessions) {
    for (const [lang, count] of Object.entries(s.languages)) {
      langCounts[lang] = (langCounts[lang] || 0) + count
    }
  }
  ls.favoriteLanguage = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'typescript'

  // Streaks
  const days = new Set(sessions.map(s => new Date(s.startedAt).toDateString()))
  let current = 0, longest = 0, prev: Date | null = null
  const sortedDays = Array.from(days).map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime())
  for (const day of sortedDays) {
    if (!prev) { current = 1 }
    else {
      const diff = (prev.getTime() - day.getTime()) / 86400000
      current = diff <= 1.5 ? current + 1 : 1
    }
    longest = Math.max(longest, current)
    prev = day
  }
  ls.currentStreak = current
  ls.longestStreak = longest
}

function calcProductivity(session: CodingSession): number {
  let score = 0
  const durHours = session.durationMs / 3600000
  if (durHours > 0) {
    // Files per hour
    score += Math.min(30, (session.filesCreated + session.filesModified) / durHours * 10)
    // Build pass rate
    if (session.buildsRun > 0) score += Math.min(20, (session.buildsPassed / session.buildsRun) * 20)
    // Error fix rate
    if (session.errorsEncountered > 0) score += Math.min(20, (session.errorsFixed / session.errorsEncountered) * 20)
    // Test pass rate
    if (session.testsRun > 0) score += Math.min(15, (session.testsPassed / session.testsRun) * 15)
    // Commands executed
    score += Math.min(15, session.commandsRun * 0.5)
  }
  return Math.min(100, Math.round(score))
}

function broadcastUpdate(): void {
  mainWindow = BrowserWindow.getAllWindows()[0] || null
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('coding-analytics:update', {
      session: state.currentSession,
      stats: state.lifetimeStats,
      recentSessions: state.allSessions.slice(-10)
    })
  }
}

// ━━━ API ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function startSession(): CodingSession {
  // End previous session if any
  if (state.currentSession) endSession()

  const session: CodingSession = {
    id: generateId(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMs: 0,
    filesCreated: 0, filesModified: 0, filesDeleted: 0,
    commandsRun: 0, errorsEncountered: 0, errorsFixed: 0,
    buildsRun: 0, buildsPassed: 0, testsRun: 0, testsPassed: 0,
    languages: {}, topFiles: [], productivityScore: 0
  }
  state.currentSession = session
  lastActivityAt = Date.now()

  // Track duration
  if (activityTimer) clearInterval(activityTimer)
  activityTimer = setInterval(() => {
    if (state.currentSession) {
      // Only count active time (activity within last 5 min)
      if (Date.now() - lastActivityAt < 300000) {
        state.currentSession!.durationMs += 5000
      }
      // Auto-end after 30 min idle
      if (Date.now() - lastActivityAt > 1800000) {
        endSession()
      }
      saveState()
      broadcastUpdate()
    }
  }, 5000)

  saveState()
  broadcastUpdate()
  return session
}

function endSession(): void {
  if (!state.currentSession) return
  state.currentSession.endedAt = new Date().toISOString()
  state.currentSession.productivityScore = calcProductivity(state.currentSession)
  state.allSessions.push(state.currentSession)
  // Keep last 100 sessions
  if (state.allSessions.length > 100) state.allSessions = state.allSessions.slice(-100)
  recalcLifetime()
  state.currentSession = null
  if (activityTimer) { clearInterval(activityTimer); activityTimer = null }
  saveState()
  broadcastUpdate()
}

function recordActivity(type: 'file_create' | 'file_modify' | 'file_delete' | 'command' | 'error' | 'error_fix' | 'build' | 'build_pass' | 'test' | 'test_pass' | 'language', meta?: any): void {
  lastActivityAt = Date.now()
  if (!state.currentSession) startSession()

  const s = state.currentSession!
  switch (type) {
    case 'file_create': s.filesCreated++; break
    case 'file_modify': s.filesModified++; if (meta?.file) s.topFiles = [...new Set([...s.topFiles, meta.file]).values()].slice(-10); break
    case 'file_delete': s.filesDeleted++; break
    case 'command': s.commandsRun++; break
    case 'error': s.errorsEncountered++; break
    case 'error_fix': s.errorsFixed++; break
    case 'build': s.buildsRun++; break
    case 'build_pass': s.buildsRun++; s.buildsPassed++; break
    case 'test': s.testsRun++; break
    case 'test_pass': s.testsRun++; s.testsPassed++; break
    case 'language':
      if (meta?.lang) s.languages[meta.lang] = (s.languages[meta.lang] || 0) + 1
      break
  }
  s.productivityScore = calcProductivity(s)
  saveState()
  broadcastUpdate()
}

// ━━━ IPC ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerCodingAnalytics(): void {
  loadState()

  ipcMain.handle('analytics:start-session', () => startSession())
  ipcMain.handle('analytics:end-session', () => { endSession(); return { success: true } })
  ipcMain.handle('analytics:current-session', () => state.currentSession)
  ipcMain.handle('analytics:stats', () => state.lifetimeStats)
  ipcMain.handle('analytics:recent-sessions', (_, limit?: number) => state.allSessions.slice(-(limit || 10)))
  ipcMain.handle('analytics:all-sessions', () => state.allSessions)
  ipcMain.handle('analytics:record', (_, type: string, meta?: any) => {
    recordActivity(type as any, meta)
    return { success: true }
  })
  ipcMain.handle('analytics:state', () => ({
    session: state.currentSession,
    stats: state.lifetimeStats,
    recentSessions: state.allSessions.slice(-10)
  }))
  ipcMain.handle('analytics:clear', () => {
    state.allSessions = []
    state.currentSession = null
    recalcLifetime()
    saveState()
    return { success: true }
  })

  // Auto-start session on init
  startSession()

  console.log('[Coding:Analytics] Registered')
}
