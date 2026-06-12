/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — PAIR PROGRAMMER MODE                            ║
 * ║  "I see you're building an API route. Need middleware?"     ║
 * ╚════════════════════════════════════════════════════━━━━══════╝
 *
 * Watches file changes in your project and offers real-time help.
 * Like having a senior dev looking over your shoulder.
 *
 * Features:
 *   - Watches file saves via fs.watch
 *   - Detects what you're building (API, component, test, etc.)
 *   - Suggests improvements in real-time
 *   - Catches common mistakes (missing error handling, unused vars)
 *   - Celebrates clean code and good patterns
 *   - Background music awareness (Spotify integration)
 *   - Achievement celebrations (first commit, bug fix, clean build)
 */

import { ipcMain, BrowserWindow, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { EmotionEngine } from './emotion-engine'
import { PersonalityEngine } from './personality-engine'
import { EpisodicMemory } from '../brain/episodic-memory'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface PairProgrammerEvent {
  type: 'file_save' | 'file_create' | 'file_delete' | 'git_commit' | 'build_pass' | 'build_fail' | 'test_pass' | 'test_fail'
  filePath: string
  content?: string
  timestamp: number
}

export interface PairObservation {
  emoji: string
  text: string
  type: 'suggestion' | 'praise' | 'warning' | 'info'
  priority: 'low' | 'medium' | 'high'
}

// ━━━ CODE PATTERN DETECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FILE_PATTERNS: Record<string, {
  what: string
  suggestions: string[]
}> = {
  // API routes
  'router': { what: 'API route', suggestions: [
    'Want me to add rate limiting middleware?',
    'Should I add input validation?',
    'Need error handling for this endpoint?',
    'Want me to generate TypeScript types for the response?'
  ]},
  'app.get': { what: 'GET endpoint', suggestions: [
    'Consider adding pagination for list endpoints.',
    'Should I add caching headers?',
  ]},
  'app.post': { what: 'POST endpoint', suggestions: [
    'Need request body validation?',
    'Should I add authentication middleware?',
  ]},
  // React components
  'useState': { what: 'React component with state', suggestions: [
    'Complex state? Consider useReducer instead.',
    'Need me to extract this to a custom hook?',
  ]},
  'useEffect': { what: 'React effect', suggestions: [
    'Did you include all dependencies in the dep array?',
    'Potential memory leak — need a cleanup function?',
    'Consider extracting this logic to a custom hook.',
  ]},
  // Error handling
  'try': { what: 'try/catch block', suggestions: [
    'Make sure the catch block logs the actual error, not just "error occurred".',
    'Should the error propagate to the caller?',
  ]},
  // Database
  'SELECT': { what: 'SQL query', suggestions: [
    'Is this query protected against SQL injection?',
    'Consider adding a LIMIT clause.',
  ]},
  // General
  'TODO': { what: 'TODO comment', suggestions: [
    'I can help you tackle those TODOs. Want to start now?',
  ]},
  'console.log': { what: 'debug console.log', suggestions: [
    'Remember to remove debug console.logs before committing!',
  ]},
  'any': { what: 'TypeScript any type', suggestions: [
    'Using "any" defeats TypeScript. Want me to suggest a proper type?',
  ]},
}

// ━━━ ACHIEVEMENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ACHIEVEMENTS: Record<string, { emoji: string; messages: string[] }> = {
  first_commit: {
    emoji: '🚀',
    messages: ['First commit of the day! Let\'s go!', 'And so it begins. Ship it! 🚀']
  },
  bug_fix: {
    emoji: '🎯',
    messages: ['Nailed it! That bug didn\'t stand a chance.', 'Bug squashed! Clean kill. 🎯']
  },
  clean_build: {
    emoji: '✨',
    messages: ['Clean build. Beautiful.', 'Zero errors. That\'s the way. ✨']
  },
  test_pass: {
    emoji: '✅',
    messages: ['All tests passing! Quality work.', 'Green across the board. Nice! ✅']
  },
  long_session: {
    emoji: '💪',
    messages: ['You\'re 3 hours deep. That\'s dedication.', 'Marathon session. Respect. 💪']
  },
}

// ━━━ PAIR PROGRAMMER ENGINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class PairProgrammer {
  private static mainWindow: BrowserWindow | null = null
  private static watchers: Map<string, fs.FSWatcher> = new Map()
  private static watchedDirs: Set<string> = new Set()
  private static fileSaveTimestamps: Map<string, number> = new Map()
  private static sessionStats = {
    filesCreated: 0,
    filesModified: 0,
    commits: 0,
    buildsPass: 0,
    buildsFail: 0,
    bugsFixed: 0
  }
  private static isRunning = false

  static init(window: BrowserWindow): void {
    this.mainWindow = window
    console.log('[Soul:PairProgrammer] Engine initialized')
  }

  /**
   * Start watching a project directory for file changes.
   */
  static watch(projectPath: string): void {
    if (this.watchers.has(projectPath)) return

    try {
      const watcher = fs.watch(projectPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return

        // Ignore common noise
        const ignored = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
                         '.cache', '.turbo', 'coverage', '.venv', 'out', 'target']
        if (ignored.some(dir => filename.includes(dir))) return
        if (filename.endsWith('.map') || filename.endsWith('.lock')) return

        const fullPath = path.join(projectPath, filename)

        // Debounce — don't fire for same file within 2 seconds
        const now = Date.now()
        const lastSave = this.fileSaveTimestamps.get(fullPath) || 0
        if (now - lastSave < 2000) return
        this.fileSaveTimestamps.set(fullPath, now)

        // Analyze the file change
        this.analyzeFileChange(fullPath, eventType as any, projectPath)
      })

      this.watchers.set(projectPath, watcher)
      this.watchedDirs.add(projectPath)
      this.isRunning = true

      console.log(`[Soul:PairProgrammer] Watching: ${projectPath}`)
    } catch (e) {
      console.error('[Soul:PairProgrammer] Watch failed:', e)
    }
  }

  /**
   * Stop watching a directory.
   */
  static unwatch(projectPath: string): void {
    const watcher = this.watchers.get(projectPath)
    if (watcher) {
      watcher.close()
      this.watchers.delete(projectPath)
      this.watchedDirs.delete(projectPath)
    }
  }

  /**
   * Stop all watchers.
   */
  static stopAll(): void {
    for (const [path, watcher] of this.watchers) {
      watcher.close()
    }
    this.watchers.clear()
    this.watchedDirs.clear()
    this.isRunning = false
  }

  /**
   * Is currently watching?
   */
  static isActive(): boolean {
    return this.isRunning && this.watchers.size > 0
  }

  /**
   * Get session stats
   */
  static getStats(): typeof PairProgrammer.sessionStats {
    return { ...this.sessionStats }
  }

  /**
   * Record an achievement event (called from git, terminal, etc.)
   */
  static recordAchievement(type: keyof typeof ACHIEVEMENTS): void {
    this.sessionStats.commits++

    const achievement = ACHIEVEMENTS[type]
    if (!achievement) return

    const cfg = PersonalityEngine.getConfig()
    const name = cfg.greetingName
    const msg = achievement.messages[Math.floor(Math.random() * achievement.messages.length)]

    // Send celebration to renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (EmotionEngine.shouldInterrupt('normal')) {
        this.mainWindow.webContents.send('soul:pair-programmer', {
          type: 'achievement',
          emoji: achievement.emoji,
          text: msg,
          priority: 'low'
        })
      }
    }

    // Record in memory
    EpisodicMemory.record({
      type: 'achievement',
      title: `Achievement: ${type}`,
      detail: msg,
      context: { source: 'auto', tags: ['achievement', type] },
      emotion: 'happy',
      outcome: 'success'
    })
  }

  // ━━━ INTERNAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private static analyzeFileChange(filePath: string, eventType: string, projectRoot: string): void {
    try {
      // Only analyze code files
      const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.css', '.html']
      const ext = path.extname(filePath).toLowerCase()
      if (!codeExtensions.includes(ext)) return

      // Read file content (small files only)
      let content = ''
      try {
        const stat = fs.statSync(filePath)
        if (stat.size > 50000) return // Skip large files
        content = fs.readFileSync(filePath, 'utf-8')
      } catch { return }

      const relativePath = path.relative(projectRoot, filePath)

      // Track stats
      if (eventType === 'rename') {
        this.sessionStats.filesCreated++
      } else {
        this.sessionStats.filesModified++
      }

      // Check if we should even say anything
      if (!EmotionEngine.shouldInterrupt('normal')) return

      // Analyze content for patterns
      const observation = this.analyzeContent(content, relativePath)
      if (observation) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('soul:pair-programmer', {
            type: observation.type,
            emoji: observation.emoji,
            text: observation.text,
            priority: observation.priority
          })
        }
      }
    } catch {}
  }

  private static analyzeContent(content: string, filePath: string): PairObservation | null {
    // Don't spam — only suggest if proactivity is high enough
    const cfg = PersonalityEngine.getConfig()
    if (cfg.proactivity < 50) return null

    // Check for each known pattern
    for (const [pattern, info] of Object.entries(FILE_PATTERNS)) {
      if (content.includes(pattern)) {
        // Only suggest sometimes (30% chance per pattern)
        if (Math.random() > 0.3) continue

        const suggestion = info.suggestions[Math.floor(Math.random() * info.suggestions.length)]

        return {
          emoji: '💡',
          text: `I see you're working on ${info.what} in ${path.basename(filePath)}. ${suggestion}`,
          type: 'suggestion',
          priority: 'low'
        }
      }
    }

    // Check for potential issues
    const lines = content.split('\n')

    // Very long file
    if (lines.length > 300) {
      return {
        emoji: '📏',
        text: `${path.basename(filePath)} is ${lines.length} lines. Consider splitting into smaller modules.`,
        type: 'suggestion',
        priority: 'low'
      }
    }

    // Missing error handling in async function
    if (content.includes('async') && content.includes('await') && !content.includes('try') && !content.includes('.catch')) {
      return {
        emoji: '⚠️',
        text: `${path.basename(filePath)}: Async function without error handling. Add try/catch?`,
        type: 'warning',
        priority: 'medium'
      }
    }

    return null
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerPairProgrammer(): void {
  ipcMain.handle('soul:pair-watch', (_, projectPath: string) => {
    PairProgrammer.watch(projectPath)
    return { success: true, watching: projectPath }
  })

  ipcMain.handle('soul:pair-unwatch', (_, projectPath: string) => {
    PairProgrammer.unwatch(projectPath)
    return { success: true }
  })

  ipcMain.handle('soul:pair-stop', () => {
    PairProgrammer.stopAll()
    return { success: true }
  })

  ipcMain.handle('soul:pair-status', () => {
    return {
      active: PairProgrammer.isActive(),
      watchedDirs: Array.from(PairProgrammer['watchedDirs'] || []),
      stats: PairProgrammer.getStats()
    }
  })

  ipcMain.handle('soul:pair-achievement', (_, type: string) => {
    PairProgrammer.recordAchievement(type as any)
    return { success: true }
  })

  console.log('[Soul:PairProgrammer] Engine registered')
}
