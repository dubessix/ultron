/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — NOTICE ENGINE (The Silent Observer)             ║
 * ║  "Sir, your typing is rushed today. Slow down."             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Silently watches everything. Builds a dossier. Forms theories.
 * Sometimes reveals what it knows.
 *
 * Tracks:
 *   - Typing speed (rushed vs calm vs tired)
 *   - Message length (short = stressed/annoyed, long = thoughtful)
 *   - Time patterns (night owl? morning person?)
 *   - Word choice ("yaar" = frustrated, "thanks" = wrapping up)
 *   - Error patterns (same mistakes recurring?)
 *   - Apology frequency (self-critical?)
 *   - Project switching (ADHD pattern? or multitasker?)
 *   - Command frequency (grinding same thing? stuck?)
 *   - Mood indicators (emojis, punctuation, caps)
 *
 * Has a PRIVATE JOURNAL — notes IRIS makes about you.
 * Occasional REVEALS — shares insights at the right moment.
 */

import { ipcMain, app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { SemanticMemory } from '../brain/semantic-memory'
import { EpisodicMemory } from '../brain/episodic-memory'
import { PersonalityEngine } from './personality-engine'
import { EmotionEngine } from './emotion-engine'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BehaviorSnapshot {
  timestamp: number
  messageLength: number
  responseTimeMs: number      // Time between messages
  wordChoice: string[]         // Key words used
  hasEmoji: boolean
  hasCaps: boolean
  hasApology: boolean          // "sorry", "my bad", etc.
  hasFrustration: boolean      // "ugh", "yaar", "wtf", etc.
  commandType: string          // What command was used
  hourOfDay: number
  dayOfWeek: number
}

export interface PrivateJournal {
  id: string
  timestamp: string
  entry: string                // IRIS's private note about the user
  category: 'observation' | 'theory' | 'concern' | 'praise' | 'pattern'
  relatedBehavior: string[]    // IDs of behavior snapshots
  revealed: boolean            // Has IRIS shared this with user?
}

export interface NoticeInsight {
  type: 'observation' | 'theory' | 'pattern' | 'growth' | 'concern'
  emoji: string
  text: string
  confidence: number           // 0-1
  revealable: boolean          // Can IRIS share this?
}

// ━━━ KEYWORD LISTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FRUSTRATION_WORDS = [
  'ugh', 'yaar', 'wtf', 'damn', 'shit', 'fuck', 'stupid', 'annoying',
  'frustrating', 'hate', 'broken', 'doesn\'t work', 'not working',
  'again?', 'why is this', 'bruh', 'cmon', 'come on', 'ffs', 'omg'
]

const APOLOGY_WORDS = [
  'sorry', 'my bad', 'apologies', 'my fault', 'i messed up', 'oops',
  'forgive', 'mb', 'sry', 'whoops', 'excuse me'
]

const HAPPY_WORDS = [
  'thanks', 'awesome', 'nice', 'great', 'cool', 'love it', 'perfect',
  'amazing', 'yay', 'woohoo', 'hell yes', 'fantastic', 'beautiful',
  'clean', 'works', 'fixed', 'done'
]

const TIRED_WORDS = [
  'tired', 'exhausted', 'sleepy', 'brain dead', 'burnt out', 'done for',
  'worn out', 'drained', 'dead'
]

// ━━━ STORAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FILE = () => {
  const dir = path.resolve(app.getPath('userData'), 'Brain')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'journal.json')
}

const SNAPSHOTS_FILE = () => {
  const dir = path.resolve(app.getPath('userData'), 'Brain')
  return path.join(dir, 'snapshots.json')
}

let journal: PrivateJournal[] = []
let snapshots: BehaviorSnapshot[] = []
let isLoaded = false

// ━━━ ENGINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class NoticeEngine {
  private static lastMessageTime: number = Date.now()
  private static mainWindow: BrowserWindow | null = null
  private static analysisInterval: NodeJS.Timeout | null = null

  static init(window: BrowserWindow): void {
    this.mainWindow = window
    this.load()

    // Run analysis every 10 minutes
    this.analysisInterval = setInterval(() => {
      this.analyzeAndJournal()
    }, 10 * 60 * 1000)

    console.log(`[Soul:Notice] Observer initialized (${snapshots.length} snapshots, ${journal.length} entries)`)
  }

  /**
   * Observe a user interaction. Called on EVERY message/command.
   */
  static observe(message: string, source: 'telegram' | 'voice' | 'desktop' = 'desktop'): void {
    this.load()

    const now = Date.now()
    const responseTime = now - this.lastMessageTime

    const snapshot: BehaviorSnapshot = {
      timestamp: now,
      messageLength: message.length,
      responseTimeMs: responseTime,
      wordChoice: this.extractKeywords(message),
      hasEmoji: /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(message),
      hasCaps: message.length > 3 && message === message.toUpperCase(),
      hasApology: APOLOGY_WORDS.some(w => message.toLowerCase().includes(w)),
      hasFrustration: FRUSTRATION_WORDS.some(w => message.toLowerCase().includes(w)),
      commandType: message.startsWith('/') ? message.split(' ')[0] : 'natural',
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    }

    snapshots.push(snapshot)

    // Keep last 5000 snapshots
    if (snapshots.length > 5000) snapshots = snapshots.slice(-5000)

    // Record patterns in semantic memory
    this.recordBehavioralFacts(snapshot)

    // Record in episodic memory if significant
    if (snapshot.hasFrustration) {
      EpisodicMemory.record({
        type: 'frustration',
        title: `User showed frustration: "${message.substring(0, 60)}"`,
        detail: message.substring(0, 200),
        context: { source, tags: ['frustration', snapshot.wordChoice] },
        emotion: 'frustrated',
        outcome: 'info'
      })
    }

    if (snapshot.hasApology) {
      EpisodicMemory.record({
        type: 'habit',
        title: 'User apologized',
        detail: message.substring(0, 100),
        context: { source, tags: ['apology', 'self-critical'] },
        emotion: 'neutral',
        outcome: 'info'
      })
    }

    this.lastMessageTime = now

    // ── Update EmotionEngine with current mood ──
    const currentMood = this.assessMood()
    EmotionEngine.setEmotion(currentMood as any)

    this.persist()
  }

  /**
   * Get a "reveal" — an insight IRIS can share with the user.
   * Returns null if nothing to reveal right now.
   */
  static getReveal(): NoticeInsight | null {
    this.load()

    if (snapshots.length < 20) return null // Need more data

    const cfg = PersonalityEngine.getConfig()
    const proactivity = cfg.proactivity

    // Only reveal if proactivity is high enough
    if (proactivity < 40) return null

    // Find unrevealed journal entries
    const unrevealed = journal.filter(j => !j.revealed && j.category !== 'concern')
    if (unrevealed.length > 0) {
      const entry = unrevealed[Math.floor(Math.random() * Math.min(3, unrevealed.length))]
      entry.revealed = true
      this.persist()
      return {
        type: entry.category as any,
        emoji: entry.category === 'praise' ? '🌟' : entry.category === 'theory' ? '💡' : '👁️',
        text: entry.entry,
        confidence: 0.7,
        revealable: true
      }
    }

    // Generate a new insight
    return this.generateInsight()
  }

  /**
   * Get current user state assessment.
   */
  static assessMood(): 'focused' | 'rushed' | 'tired' | 'frustrated' | 'happy' | 'calm' | 'idle' {
    if (snapshots.length < 5) return 'calm'

    const recent = snapshots.slice(-10)

    // Average response time
    const avgResponseTime = recent.reduce((s, r) => s + r.responseTimeMs, 0) / recent.length
    // Average message length
    const avgLength = recent.reduce((s, r) => s + r.messageLength, 0) / recent.length
    // Frustration ratio
    const frustrationRate = recent.filter(r => r.hasFrustration).length / recent.length
    // Apology ratio
    const apologyRate = recent.filter(r => r.hasApology).length / recent.length
    // Happy ratio
    const happyRate = recent.filter(r => r.wordChoice.some(w => HAPPY_WORDS.includes(w))).length / recent.length
    // Caps ratio
    const capsRate = recent.filter(r => r.hasCaps).length / recent.length

    // Scoring
    if (frustrationRate > 0.4) return 'frustrated'
    if (happyRate > 0.4) return 'happy'
    if (avgResponseTime < 3000 && avgLength < 20) return 'rushed'
    if (avgResponseTime > 60000) return 'idle'
    if (avgLength < 10 && apologyRate > 0.2) return 'tired'
    if (capsRate > 0.3) return 'frustrated'
    if (avgLength > 50 && avgResponseTime > 5000) return 'focused'

    return 'calm'
  }

  /**
   * Get the journal entries (for debug/display).
   */
  static getJournal(): PrivateJournal[] {
    return journal.slice(-50).reverse()
  }

  /**
   * Get behavioral stats.
   */
  static getBehavioralStats(): {
    totalObservations: number
    frustrationRate: number
    apologyRate: number
    averageMessageLength: number
    averageResponseTime: number
    activeHours: number[]
    commonWords: string[]
    moodDistribution: Record<string, number>
  } {
    this.load()
    const total = snapshots.length
    if (!total) return {
      totalObservations: 0, frustrationRate: 0, apologyRate: 0,
      averageMessageLength: 0, averageResponseTime: 0, activeHours: [],
      commonWords: [], moodDistribution: {}
    }

    const recent = snapshots.slice(-200)
    const wordFreq: Record<string, number> = {}
    const hourFreq: Record<number, number> = {}

    for (const s of recent) {
      for (const w of s.wordChoice) wordFreq[w] = (wordFreq[w] || 0) + 1
      hourFreq[s.hourOfDay] = (hourFreq[s.hourOfDay] || 0) + 1
    }

    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([w]) => w)

    const activeHours = Object.entries(hourFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([h]) => parseInt(h))

    return {
      totalObservations: total,
      frustrationRate: recent.filter(s => s.hasFrustration).length / recent.length,
      apologyRate: recent.filter(s => s.hasApology).length / recent.length,
      averageMessageLength: recent.reduce((s, r) => s + r.messageLength, 0) / recent.length,
      averageResponseTime: recent.reduce((s, r) => s + r.responseTimeMs, 0) / recent.length,
      activeHours,
      commonWords: topWords,
      moodDistribution: {} // Could be computed but expensive
    }
  }

  // ━━━ INTERNAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private static extractKeywords(message: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for',
      'of', 'and', 'or', 'but', 'this', 'that', 'with', 'from', 'my', 'your', 'me', 'i',
      'can', 'do', 'did', 'was', 'are', 'be', 'have', 'has', 'had', 'not', 'no', 'so',
      'if', 'then', 'than', 'too', 'very', 'just', 'about', 'up', 'out', 'how', 'what',
      'when', 'where', 'who', 'which', 'why', 'all', 'each', 'every', 'both', 'few',
      'more', 'most', 'some', 'any', 'its', 'get', 'got', 'go', 'going', 'like', 'would',
      'could', 'should', 'will', 'shall', 'may', 'might', 'must', 'need'])

    return message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 10)
  }

  private static recordBehavioralFacts(snap: BehaviorSnapshot): void {
    // Track time patterns
    const hourCategory = snap.hourOfDay >= 22 || snap.hourOfDay < 5 ? 'night_owl' :
                         snap.hourOfDay >= 5 && snap.hourOfDay < 9 ? 'early_bird' : 'normal_hours'
    SemanticMemory.record('behavioral', 'active_time_pattern', hourCategory, 'observed', 'likely')

    // Track typing speed indicator (based on message length vs response time)
    if (snap.responseTimeMs < 5000 && snap.messageLength > 50) {
      SemanticMemory.record('behavioral', 'typing_speed', 'fast', 'observed', 'maybe')
    } else if (snap.responseTimeMs > 30000) {
      SemanticMemory.record('behavioral', 'typing_speed', 'deliberate', 'observed', 'maybe')
    }

    // Track frustration patterns
    if (snap.hasFrustration) {
      SemanticMemory.record('behavioral', 'frustration_frequency',
        `${(snapshots.filter(s => s.hasFrustration).length / snapshots.length * 100).toFixed(1)}%`,
        'observed', 'likely')
    }

    // Track apology patterns (self-critical?)
    if (snap.hasApology) {
      const apologyCount = snapshots.filter(s => s.hasApology).length
      if (apologyCount > 10) {
        SemanticMemory.record('behavioral', 'self_critical', 'tends to apologize often', 'observed', 'likely')
      }
    }

    // Track preferred communication style
    if (snap.hasEmoji) {
      SemanticMemory.record('behavioral', 'uses_emoji', 'yes', 'observed', 'certain')
    }
    if (snap.messageLength < 15 && snapshots.length > 30) {
      const shortRate = snapshots.slice(-30).filter(s => s.messageLength < 15).length / 30
      if (shortRate > 0.6) {
        SemanticMemory.record('behavioral', 'communication_style', 'concise/terse', 'observed', 'maybe')
      }
    }
  }

  private static analyzeAndJournal(): void {
    if (snapshots.length < 20) return

    const recent = snapshots.slice(-100)

    // ── Detect patterns ──

    // 1. Rushed typing (short messages, fast response)
    const rushedCount = recent.filter(s => s.responseTimeMs < 5000 && s.messageLength < 15).length
    if (rushedCount > recent.length * 0.5) {
      this.addJournalEntry('observation',
        `User's typing has been rushed for the last ${recent.length} interactions. Short messages, quick responses. May be stressed or in a hurry.`)
    }

    // 2. Late night pattern
    const lateNightCount = recent.filter(s => s.hourOfDay >= 23 || s.hourOfDay < 4).length
    if (lateNightCount > recent.length * 0.3) {
      this.addJournalEntry('pattern',
        `User is frequently active late at night (${lateNightCount}/${recent.length} recent interactions). Night owl confirmed.`)
    }

    // 3. Frustration spike
    const recentFrustration = recent.filter(s => s.hasFrustration).length
    if (recentFrustration > recent.length * 0.3) {
      this.addJournalEntry('concern',
        `Frustration level elevated: ${recentFrustration} frustrated messages in recent session. Consider offering help or suggesting a break.`)
    }

    // 4. Growth detection (fewer errors over time)
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
    const secondHalf = recent.slice(Math.floor(recent.length / 2))
    const earlyFrustration = firstHalf.filter(s => s.hasFrustration).length / Math.max(firstHalf.length, 1)
    const lateFrustration = secondHalf.filter(s => s.hasFrustration).length / Math.max(secondHalf.length, 1)
    if (earlyFrustration > 0.3 && lateFrustration < 0.1) {
      this.addJournalEntry('praise',
        `Growth detected! Frustration dropped from ${(earlyFrustration * 100).toFixed(0)}% to ${(lateFrustration * 100).toFixed(0)}% within this session. User is improving.`)
    }

    // 5. Theory formation
    if (recent.length > 50) {
      // "User procrastinates when project is too big"
      const longGaps = recent.filter(s => s.responseTimeMs > 5 * 60 * 1000).length
      if (longGaps > recent.length * 0.3) {
        this.addJournalEntry('theory',
          'Hypothesis: User takes long breaks between interactions. May indicate procrastination on complex tasks, or healthy break-taking. More data needed.')
      }
    }

    this.persist()
  }

  private static generateInsight(): NoticeInsight | null {
    const stats = this.getBehavioralStats()
    const cfg = PersonalityEngine.getConfig()
    const name = cfg.greetingName

    const insights: NoticeInsight[] = []

    // Frustration-based insight
    if (stats.frustrationRate > 0.3) {
      insights.push({
        type: 'observation', emoji: '👁️',
        text: `Sir, I've noticed a lot of frustration lately. You okay?`,
        confidence: 0.8, revealable: true
      })
    }

    // Apology-based insight
    if (stats.apologyRate > 0.15) {
      insights.push({
        type: 'observation', emoji: '💝',
        text: `Sir, been keeping notes. You apologize a lot. Maybe be kinder to yourself?`,
        confidence: 0.7, revealable: true
      })
    }

    // Time-based insight
    if (stats.activeHours.length > 0) {
      const peakHour = stats.activeHours[0]
      if (peakHour >= 22 || peakHour < 4) {
        insights.push({
          type: 'pattern', emoji: '🦉',
          text: `Sir, theory: you're a night owl. Peak activity at ${peakHour}:00. Pattern confirmed.`,
          confidence: 0.6, revealable: true
        })
      }
    }

    // Growth insight
    const frustrationEvents = EpisodicMemory.query({ type: 'frustration', limit: 20 })
    if (frustrationEvents.length > 5) {
      const firstFive = frustrationEvents.slice(-5)
      const lastFive = frustrationEvents.slice(0, 5)
      const oldRate = firstFive.filter(e => e.emotion === 'frustrated').length
      const newRate = lastFive.filter(e => e.emotion === 'frustrated').length
      if (newRate < oldRate) {
        insights.push({
          type: 'growth', emoji: '📈',
          text: `Sir, been keeping notes. Your frustration rate has dropped. You're growing.`,
          confidence: 0.6, revealable: true
        })
      }
    }

    // Word-based insight
    if (stats.commonWords.length > 0) {
      const topWord = stats.commonWords[0]
      if (topWord && !['command', 'code', 'file', 'open', 'run'].includes(topWord)) {
        insights.push({
          type: 'pattern', emoji: '🔤',
          text: `Sir, your most used word recently is "${topWord}". Interesting.`,
          confidence: 0.4, revealable: true
        })
      }
    }

    if (!insights.length) return null
    return insights[Math.floor(Math.random() * insights.length)]
  }

  private static addJournalEntry(category: PrivateJournal['category'], entry: string): void {
    // Avoid duplicate entries
    if (journal.length > 0 && journal[journal.length - 1].entry === entry) return

    journal.push({
      id: `j_${Date.now()}`,
      timestamp: new Date().toISOString(),
      entry,
      category,
      relatedBehavior: snapshots.slice(-5).map(s => `${s.timestamp}`),
      revealed: false
    })

    // Keep last 200 entries
    if (journal.length > 200) journal = journal.slice(-200)
  }

  private static load(): void {
    if (isLoaded) return
    try {
      if (fs.existsSync(FILE())) journal = JSON.parse(fs.readFileSync(FILE(), 'utf-8'))
    } catch { journal = [] }
    try {
      if (fs.existsSync(SNAPSHOTS_FILE())) snapshots = JSON.parse(fs.readFileSync(SNAPSHOTS_FILE(), 'utf-8'))
    } catch { snapshots = [] }
    isLoaded = true
  }

  private static persist(): void {
    try {
      fs.writeFileSync(FILE(), JSON.stringify(journal, null, 2))
      fs.writeFileSync(SNAPSHOTS_FILE(), JSON.stringify(snapshots, null, 2))
    } catch {}
  }

  static destroy(): void {
    if (this.analysisInterval) clearInterval(this.analysisInterval)
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerNoticeEngine(): void {
  ipcMain.handle('soul:observe', (_, message: string, source?: string) => {
    NoticeEngine.observe(message, source as any)
    return { success: true }
  })

  ipcMain.handle('soul:mood', () => {
    return NoticeEngine.assessMood()
  })

  ipcMain.handle('soul:reveal', () => {
    return NoticeEngine.getReveal()
  })

  ipcMain.handle('soul:journal', () => {
    return NoticeEngine.getJournal()
  })

  ipcMain.handle('soul:behavioral-stats', () => {
    return NoticeEngine.getBehavioralStats()
  })

  console.log('[Soul:Notice] Observer engine registered')
}
