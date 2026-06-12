/**
 * IRIS AI - ERROR COMPANION (FIXED)
 */
import { ipcMain, app, BrowserWindow, Notification } from 'electron'
import fs from 'fs'
import path from 'path'
import { EpisodicMemory } from '../brain/episodic-memory'

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info'
export type ErrorCategory =
  | 'syntax'
  | 'typescript'
  | 'runtime'
  | 'import'
  | 'network'
  | 'permission'
  | 'memory'
  | 'config'
  | 'build'
  | 'test'
  | 'git'
  | 'docker'
  | 'unknown'

export interface ErrorEntry {
  id: string
  raw: string
  message: string
  file: string | null
  line: number | null
  column: number | null
  category: ErrorCategory
  severity: ErrorSeverity
  language: string
  suggestion: string
  aiFix: string | null
  autoFixable: boolean
  autoFixCommand: string | null
  timestamp: string
  resolved: boolean
  resolvedAt: string | null
  source: 'terminal' | 'build' | 'test' | 'editor' | 'manual'
}

export interface ErrorStats {
  totalErrors: number
  todayErrors: number
  resolvedCount: number
  topCategories: { category: ErrorCategory; count: number }[]
  topFiles: { file: string; count: number }[]
  avgResolveTime: number
  streak: number
  currentUnresolved: number
}

interface ErrorPattern {
  regex: RegExp
  category: ErrorCategory
  severity: ErrorSeverity
  extractMessage: (match: RegExpMatchArray) => string
  extractFile?: (match: RegExpMatchArray) => string | null
  extractLine?: (match: RegExpMatchArray) => number | null
  extractColumn?: (match: RegExpMatchArray) => number | null
  suggestion: string | ((match: RegExpMatchArray) => string)
  autoFixable?: boolean
  autoFixCommand?: string
  language: string
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    regex: /(.+\.tsx?):(\d+):(\d+)\s*-\s*error\s+TS(\d+):\s*(.+)/,
    category: 'typescript',
    severity: 'error',
    extractMessage: (m) => `TS${m[4]}: ${m[5]}`,
    extractFile: (m) => m[1],
    extractLine: (m) => parseInt(m[2]),
    extractColumn: (m) => parseInt(m[3]),
    suggestion: 'TypeScript type error. Check the type annotations and function signatures.',
    language: 'ts'
  },
  {
    regex: /error\s+TS(\d+):\s*(.+)/,
    category: 'typescript',
    severity: 'error',
    extractMessage: (m) => `TS${m[1]}: ${m[2]}`,
    suggestion: 'Fix the TypeScript error. Check types.',
    language: 'ts'
  },
  {
    regex: /Cannot find module ['"](.+?)['"]/,
    category: 'import',
    severity: 'error',
    extractMessage: (m) => `Module not found: ${m[1]}`,
    suggestion: 'Install the missing package or check the import path.',
    autoFixable: true,
    autoFixCommand: 'npm-install',
    language: 'ts'
  },
  {
    regex: /Module not found:\s*Error[^:]*:\s*Can't resolve ['"](.+?)['"]/,
    category: 'import',
    severity: 'error',
    extractMessage: (m) => `Can't resolve: ${m[1]}`,
    suggestion: 'Check import path or install the package.',
    autoFixable: true,
    language: 'ts'
  },
  {
    regex: /SyntaxError:\s*(.+?)(?:\n|$)/,
    category: 'syntax',
    severity: 'critical',
    extractMessage: (m) => `SyntaxError: ${m[1]}`,
    suggestion: 'Fix the syntax. Check for missing brackets, quotes, or semicolons.',
    language: 'js'
  },
  {
    regex: /TypeError:\s*(.+)/,
    category: 'runtime',
    severity: 'error',
    extractMessage: (m) => `TypeError: ${m[1]}`,
    suggestion: 'Check if the variable has the expected type. Add null checks.',
    language: 'js'
  },
  {
    regex: /ReferenceError:\s*(\w+)\s+is not defined/,
    category: 'runtime',
    severity: 'error',
    extractMessage: (m) => `${m[1]} is not defined`,
    suggestion: (m) => `Define "${m[1]}" before use, or check for typos.`,
    language: 'js'
  },
  {
    regex: /(ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND)/,
    category: 'network',
    severity: 'error',
    extractMessage: (m) => `Network error: ${m[1]}`,
    suggestion: 'Check internet connection, server URL, and firewall.',
    language: '*'
  },
  {
    regex: /(EACCES|Permission denied)/,
    category: 'permission',
    severity: 'error',
    extractMessage: (m) => `Permission denied: ${m[1]}`,
    suggestion: 'Run with elevated permissions or fix file permissions.',
    autoFixable: true,
    autoFixCommand: 'chmod',
    language: '*'
  },
  {
    regex: /EADDRINUSE.*?:(\d+)/,
    category: 'runtime',
    severity: 'error',
    extractMessage: (m) => `Port ${m[1]} already in use`,
    suggestion: (m) => `Kill the process on port ${m[1]} or use a different port.`,
    autoFixable: true,
    autoFixCommand: 'kill-port',
    language: '*'
  },
  {
    regex: /ENOENT.*?'(.+?)'/,
    category: 'runtime',
    severity: 'error',
    extractMessage: (m) => `File not found: ${m[1]}`,
    suggestion: 'Check the file path exists. Create the directory or file.',
    language: '*'
  },
  {
    regex: /(JavaScript heap out of memory|FATAL ERROR:.+heap)/,
    category: 'memory',
    severity: 'critical',
    extractMessage: () => 'JavaScript heap out of memory',
    suggestion: 'Increase memory: NODE_OPTIONS=--max-old-space-size=4096',
    autoFixable: true,
    language: 'js'
  },
  {
    regex: /FAIL\s+(.+\.(test|spec)\.\w+)/,
    category: 'test',
    severity: 'error',
    extractMessage: (m) => `Test failed: ${m[1]}`,
    extractFile: (m) => m[1],
    suggestion: 'Review the test assertion and expected vs actual values.',
    language: 'ts'
  },
  {
    regex: /fatal:\s*(.+)/,
    category: 'git',
    severity: 'error',
    extractMessage: (m) => `Git: ${m[1]}`,
    suggestion: 'Check git status, branch, and remote configuration.',
    language: 'git'
  },
  {
    regex: /ImportError:\s*(.+)/,
    category: 'import',
    severity: 'error',
    extractMessage: (m) => `ImportError: ${m[1]}`,
    suggestion: 'Install the missing package: pip install <package>',
    autoFixable: true,
    autoFixCommand: 'pip-install',
    language: 'py'
  },
  {
    regex: /KeyError:\s*['"](.+?)['"]/,
    category: 'runtime',
    severity: 'error',
    extractMessage: (m) => `KeyError: ${m[1]}`,
    suggestion: (m) => `Check if key "${m[1]}" exists before accessing.`,
    language: 'py'
  },
  {
    regex: /(.+\.\w+):(\d+):(\d+):\s*(error|warning)\s+(.+)/,
    category: 'build',
    severity: 'warning',
    extractMessage: (m) => m[5],
    extractFile: (m) => m[1],
    extractLine: (m) => parseInt(m[2]),
    extractColumn: (m) => parseInt(m[3]),
    suggestion: 'Review the error and fix accordingly.',
    language: 'ts'
  }
]

const QUICK_FIXES: Record<string, string> = {
  TS2307: 'Cannot find module - install it or fix import path',
  TS2322: 'Type not assignable - fix type or add cast',
  TS2345: 'Argument type mismatch - check function signature',
  TS2304: 'Cannot find name - declare or import it',
  TS7006: 'Parameter has implicit any - add type annotation',
  TS7016: 'No declaration file - npm install @types/<pkg>',
  ECONNREFUSED: 'Connection refused - start the server',
  ENOENT: 'File not found - check path',
  EADDRINUSE: 'Port in use - kill process or change port'
}

const STORE_FILE = 'error-companion.json'
let errorHistory: ErrorEntry[] = []
let mainWindow: BrowserWindow | null = null

function getStorePath(): string {
  return path.join(app.getPath('userData'), STORE_FILE)
}

function loadHistory(): void {
  try {
    if (fs.existsSync(getStorePath())) {
      errorHistory = JSON.parse(fs.readFileSync(getStorePath(), 'utf-8'))
    }
  } catch {
    errorHistory = []
  }
}

function saveHistory(): void {
  try {
    if (errorHistory.length > 500) errorHistory = errorHistory.slice(-500)
    fs.writeFileSync(getStorePath(), JSON.stringify(errorHistory, null, 2))
  } catch {}
}

function generateId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

function resolveSuggestion(pattern: ErrorPattern, match: RegExpMatchArray): string {
  return typeof pattern.suggestion === 'function' ? pattern.suggestion(match) : pattern.suggestion
}

export function parseErrors(
  rawOutput: string,
  source: ErrorEntry['source'] = 'terminal'
): ErrorEntry[] {
  const errors: ErrorEntry[] = []
  const lines = rawOutput.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 5) continue
    if (/^\[.*\]$/.test(trimmed)) continue
    if (/^(npm|yarn|pnpm)\s+(warn|info)/.test(trimmed)) continue

    let matched = false
    for (const pattern of ERROR_PATTERNS) {
      const match = trimmed.match(pattern.regex)
      if (match) {
        const tsMatch = trimmed.match(/TS(\d+)/)
        const tsCode = tsMatch ? `TS${tsMatch[1]}` : ''
        const quickFix =
          QUICK_FIXES[tsCode] ||
          QUICK_FIXES[Object.keys(QUICK_FIXES).find((k) => trimmed.includes(k)) || '']

        errors.push({
          id: generateId(),
          raw: trimmed,
          message: pattern.extractMessage(match),
          file: pattern.extractFile?.(match) || null,
          line: pattern.extractLine?.(match) || null,
          column: pattern.extractColumn?.(match) || null,
          category: pattern.category,
          severity: pattern.severity,
          language: pattern.language,
          suggestion: quickFix || resolveSuggestion(pattern, match),
          aiFix: null,
          autoFixable: pattern.autoFixable || false,
          autoFixCommand: pattern.autoFixCommand || null,
          timestamp: new Date().toISOString(),
          resolved: false,
          resolvedAt: null,
          source
        })
        matched = true
        break
      }
    }

    if (!matched && /(error|ERROR|fail|FAIL|fatal|FATAL)/.test(trimmed) && trimmed.length > 10) {
      errors.push({
        id: generateId(),
        raw: trimmed,
        message: trimmed.substring(0, 200),
        file: null,
        line: null,
        column: null,
        category: 'unknown',
        severity: 'error',
        language: '*',
        suggestion: 'Review the error message for details.',
        aiFix: null,
        autoFixable: false,
        autoFixCommand: null,
        timestamp: new Date().toISOString(),
        resolved: false,
        resolvedAt: null,
        source
      })
    }
  }

  return errors
}

export function getErrorStats(): ErrorStats {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayErrors = errorHistory.filter((e) => e.timestamp >= today)
  const resolved = errorHistory.filter((e) => e.resolved)

  const catCounts: Record<string, number> = {}
  for (const e of todayErrors) {
    catCounts[e.category] = (catCounts[e.category] || 0) + 1
  }
  const topCategories = Object.entries(catCounts)
    .map(([category, count]) => ({ category: category as ErrorCategory, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const fileCounts: Record<string, number> = {}
  for (const e of todayErrors) {
    if (e.file) fileCounts[e.file] = (fileCounts[e.file] || 0) + 1
  }
  const topFiles = Object.entries(fileCounts)
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const resolveTimes = resolved
    .filter((e) => e.resolvedAt)
    .map((e) => new Date(e.resolvedAt!).getTime() - new Date(e.timestamp).getTime())
    .filter((t) => t > 0 && t < 3600000)
  const avgResolveTime =
    resolveTimes.length > 0 ? resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length : 0

  let streak = 0
  for (let i = errorHistory.length - 1; i >= 0; i--) {
    if (errorHistory[i].resolved) streak++
    else break
  }

  return {
    totalErrors: errorHistory.length,
    todayErrors: todayErrors.length,
    resolvedCount: resolved.length,
    topCategories,
    topFiles,
    avgResolveTime,
    streak,
    currentUnresolved: errorHistory.filter((e) => !e.resolved).length
  }
}

export default function registerErrorCompanion(): void {
  loadHistory()

  ipcMain.handle('error-companion:parse', (_, rawOutput: string, source?: string) => {
    const errors = parseErrors(rawOutput, (source as any) || 'terminal')
    if (errors.length > 0) {
      errorHistory.push(...errors)
      saveHistory()
      mainWindow = BrowserWindow.getAllWindows()[0] || null
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('error-companion:new-errors', errors)
      }
      const critical = errors.filter((e) => e.severity === 'critical')
      if (critical.length > 0) {
        try {
          new Notification({
            title: `IRIS \u2014 ${critical.length} Critical Error${critical.length > 1 ? 's' : ''}`,
            body: critical[0].message.substring(0, 100),
            silent: true
          }).show()
        } catch {}
      }
      try {
        EpisodicMemory.record({
          type: 'error',
          title: `${errors.length} error(s) detected`,
          detail: errors
            .map((e) => e.message)
            .join('; ')
            .substring(0, 300),
          context: { source: 'auto', tags: ['error-companion', ...errors.map((e) => e.category)] },
          outcome: 'pending'
        })
      } catch {}
    }
    return errors
  })

  ipcMain.handle('error-companion:history', (_, limit?: number) => {
    return limit ? errorHistory.slice(-limit) : errorHistory
  })

  ipcMain.handle('error-companion:stats', () => getErrorStats())

  ipcMain.handle('error-companion:resolve', (_, id: string) => {
    const entry = errorHistory.find((e) => e.id === id)
    if (entry) {
      entry.resolved = true
      entry.resolvedAt = new Date().toISOString()
      saveHistory()
    }
    return { success: true }
  })

  ipcMain.handle('error-companion:resolve-all', () => {
    for (const e of errorHistory) {
      if (!e.resolved) {
        e.resolved = true
        e.resolvedAt = new Date().toISOString()
      }
    }
    saveHistory()
    return { success: true }
  })

  ipcMain.handle('error-companion:unresolved', () => errorHistory.filter((e) => !e.resolved))

  ipcMain.handle('error-companion:clear', () => {
    errorHistory = []
    saveHistory()
    return { success: true }
  })

  console.log('[Coding:ErrorCompanion] Registered')
}
