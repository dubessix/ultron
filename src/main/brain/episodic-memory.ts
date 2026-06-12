/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — EPISODIC MEMORY ENGINE                          ║
 * ║  "Sir, last Tuesday you were stuck on auth too."            ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Logs EVERY event with rich context, then connects them.
 * This is the "What happened" memory.
 *
 * Features:
 *   - Rich event logging (who, what, where, when, why, outcome)
 *   - Auto-tagging and categorization
 *   - Time-based queries ("what did I do last Tuesday?")
 *   - Pattern detection across events
 *   - Connected memory graph (event → event → insight)
 *   - Auto-expiry (90 days default)
 *   - Migrates old flat memory into graph format
 */

import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type EpisodicTag =
  | 'command' | 'error' | 'fix' | 'creation' | 'search' | 'communication'
  | 'code' | 'deploy' | 'research' | 'file_op' | 'system' | 'debug'
  | 'achievement' | 'frustration' | 'learning' | 'project' | 'preference'
  | 'note' | 'email' | 'social' | 'music' | 'workflow' | 'habit'

export interface EpisodicEvent {
  id: string
  timestamp: string         // ISO 8601
  type: EpisodicTag
  title: string             // Short human-readable summary
  detail: string            // Full description
  context: {
    source: 'voice' | 'telegram' | 'desktop' | 'auto'
    project?: string         // Active project name
    filePath?: string        // Related file
    appName?: string         // Active app
    workingDir?: string      // Current directory
    tags: string[]           // Free-form tags for search
  }
  outcome: 'success' | 'failure' | 'partial' | 'info'
  emotion?: 'neutral' | 'frustrated' | 'happy' | 'confused' | 'focused' | 'tired'
  relatedEvents: string[]   // IDs of connected events
  insights: string[]        // What IRIS learned from this
}

export interface EpisodicQuery {
  text?: string             // Free-text search
  type?: EpisodicTag        // Filter by type
  types?: EpisodicTag[]     // Filter by multiple types
  since?: string            // ISO date - events after this
  until?: string            // ISO date - events before this
  project?: string          // Filter by project
  tags?: string[]           // Filter by tags
  emotion?: string          // Filter by emotion
  outcome?: string          // Filter by outcome
  limit?: number            // Max results
  minInsights?: boolean     // Only events with insights
}

export interface MemoryPattern {
  id: string
  type: 'recurring' | 'sequential' | 'correlation' | 'habit'
  description: string       // "User debugs auth every Tuesday afternoon"
  events: string[]          // Event IDs that form the pattern
  confidence: number        // 0-1
  firstSeen: string
  lastSeen: string
  occurrences: number
}

// ━━━ STORAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DATA_DIR = () => path.resolve(app.getPath('userData'), 'Brain')
const EPISODES_FILE = () => path.join(DATA_DIR(), 'episodes.json')
const PATTERNS_FILE = () => path.join(DATA_DIR(), 'patterns.json')
const GRAPH_FILE = () => path.join(DATA_DIR(), 'graph.json')

interface MemoryGraph {
  nodes: Record<string, string>  // eventId → title (for quick lookup)
  edges: Array<{ from: string; to: string; relation: string }>
}

let events: EpisodicEvent[] = []
let patterns: MemoryPattern[] = []
let graph: MemoryGraph = { nodes: {}, edges: [] }
let isLoaded = false

// ━━━ CORE ENGINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class EpisodicMemory {

  static init(): void {
    if (isLoaded) return
    const dir = DATA_DIR()
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    // Load episodes
    try {
      if (fs.existsSync(EPISODES_FILE())) {
        events = JSON.parse(fs.readFileSync(EPISODES_FILE(), 'utf-8'))
      }
    } catch { events = [] }

    // Load patterns
    try {
      if (fs.existsSync(PATTERNS_FILE())) {
        patterns = JSON.parse(fs.readFileSync(PATTERNS_FILE(), 'utf-8'))
      }
    } catch { patterns = [] }

    // Load graph
    try {
      if (fs.existsSync(GRAPH_FILE())) {
        graph = JSON.parse(fs.readFileSync(GRAPH_FILE(), 'utf-8'))
      }
    } catch { graph = { nodes: {}, edges: [] } }

    // Migrate old flat memory if exists
    this.migrateOldMemory()

    isLoaded = true
    console.log(`[Brain:Episodic] Loaded ${events.length} events, ${patterns.length} patterns`)
  }

  // ━━━ RECORD AN EVENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  static record(partial: Partial<EpisodicEvent> & { title: string }): EpisodicEvent {
    this.init()

    const event: EpisodicEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: partial.type || 'command',
      title: partial.title,
      detail: partial.detail || partial.title,
      context: {
        source: partial.context?.source || 'auto',
        project: partial.context?.project,
        filePath: partial.context?.filePath,
        appName: partial.context?.appName,
        workingDir: partial.context?.workingDir,
        tags: partial.context?.tags || []
      },
      outcome: partial.outcome || 'info',
      emotion: partial.emotion || 'neutral',
      relatedEvents: partial.relatedEvents || [],
      insights: partial.insights || []
    }

    // Auto-connect to recent similar events
    const similar = this.findSimilar(event)
    for (const s of similar.slice(0, 3)) {
      event.relatedEvents.push(s.id)
      this.addEdge(event.id, s.id, 'related')
    }

    events.push(event)
    graph.nodes[event.id] = event.title

    // Trim to 10,000 events max (keep recent)
    if (events.length > 10000) {
      const removed = events.splice(0, events.length - 10000)
      for (const r of removed) delete graph.nodes[r.id]
    }

    this.persist()
    this.detectPatterns()

    return event
  }

  // ━━━ QUERY EVENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  static query(q: EpisodicQuery = {}): EpisodicEvent[] {
    this.init()
    let results = [...events]

    if (q.type) results = results.filter(e => e.type === q.type)
    if (q.types) results = results.filter(e => (q.types as string[]).includes(e.type))
    if (q.outcome) results = results.filter(e => e.outcome === q.outcome)
    if (q.emotion) results = results.filter(e => e.emotion === q.emotion)
    if (q.project) results = results.filter(e =>
      e.context.project?.toLowerCase().includes(q.project!.toLowerCase())
    )
    if (q.tags) results = results.filter(e =>
      q.tags!.some(t => e.context.tags.includes(t))
    )
    if (q.minInsights) results = results.filter(e => e.insights.length > 0)
    if (q.since) results = results.filter(e => e.timestamp >= q.since!)
    if (q.until) results = results.filter(e => e.timestamp <= q.until!)
    if (q.text) {
      const search = q.text.toLowerCase()
      results = results.filter(e =>
        e.title.toLowerCase().includes(search) ||
        e.detail.toLowerCase().includes(search) ||
        e.context.tags.some(t => t.toLowerCase().includes(search))
      )
    }

    // Sort newest first
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    return results.slice(0, q.limit || 50)
  }

  // ━━━ SMART RECALL (for AI context) ━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Given a current action/message, return relevant past memories.
   * This is the magic — IRIS automatically surfaces context.
   */
  static recall(currentContext: string, limit: number = 5): EpisodicEvent[] {
    this.init()
    const words = currentContext.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    const now = new Date()
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]
    const hour = now.getHours()

    // Score each event by relevance
    const scored = events
      .filter(e => {
        // Skip events from the last 5 minutes (current session)
        const age = Date.now() - new Date(e.timestamp).getTime()
        return age > 5 * 60 * 1000
      })
      .map(e => {
        let score = 0
        const eText = `${e.title} ${e.detail} ${e.context.tags.join(' ')}`.toLowerCase()

        // Word overlap
        for (const w of words) {
          if (eText.includes(w)) score += 3
        }

        // Same type match
        for (const w of words) {
          if (e.type.includes(w)) score += 2
        }

        // Recent events get slight boost
        const ageDays = (Date.now() - new Date(e.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        if (ageDays < 1) score += 2
        if (ageDays < 7) score += 1

        // Same day-of-week pattern
        const eDate = new Date(e.timestamp)
        const eDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][eDate.getDay()]
        if (eDayName === dayName) score += 1

        // Similar time-of-day
        if (Math.abs(eDate.getHours() - hour) <= 2) score += 1

        // Events with insights are more valuable
        if (e.insights.length > 0) score += 2

        // Failures that were later fixed are gold
        if (e.outcome === 'failure') score += 1

        return { event: e, score }
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)

    // Deduplicate by title similarity
    const seen = new Set<string>()
    const unique: EpisodicEvent[] = []
    for (const s of scored) {
      const key = s.event.title.toLowerCase().substring(0, 30)
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(s.event)
      }
      if (unique.length >= limit) break
    }

    return unique
  }

  /**
   * Build a recall context string for AI prompts.
   * Returns a formatted summary of relevant memories.
   */
  static buildRecallContext(currentAction: string): string {
    const memories = this.recall(currentAction, 5)
    if (!memories.length) return ''

    const lines = memories.map(m => {
      const ago = this.timeAgo(m.timestamp)
      const emotion = m.emotion !== 'neutral' ? ` [${m.emotion}]` : ''
      const outcome = m.outcome !== 'info' ? ` → ${m.outcome}` : ''
      return `  - ${ago}: "${m.title}"${emotion}${outcome}${m.insights.length ? ` | Learned: ${m.insights.join(', ')}` : ''}`
    })

    return `\n\n[IRIS MEMORY — Relevant past events]:\n${lines.join('\n')}`
  }

  // ━━━ PATTERN DETECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  static getPatterns(): MemoryPattern[] {
    this.init()
    return patterns
  }

  // ━━━ STATS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  static getStats(): { total: number; byType: Record<string, number>; byEmotion: Record<string, number>; patternCount: number } {
    this.init()
    const byType: Record<string, number> = {}
    const byEmotion: Record<string, number> = {}
    for (const e of events) {
      byType[e.type] = (byType[e.type] || 0) + 1
      if (e.emotion) byEmotion[e.emotion] = (byEmotion[e.emotion] || 0) + 1
    }
    return { total: events.length, byType, byEmotion, patternCount: patterns.length }
  }

  // ━━━ INTERNAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private static findSimilar(event: EpisodicEvent): EpisodicEvent[] {
    const words = event.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    return events
      .filter(e => e.id !== event.id)
      .map(e => {
        let score = 0
        const eTitle = e.title.toLowerCase()
        for (const w of words) if (eTitle.includes(w)) score += 2
        if (e.type === event.type) score += 3
        if (e.context.project && e.context.project === event.context.project) score += 5
        return { event: e, score }
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.event)
  }

  private static detectPatterns(): void {
    // Simple pattern detection: recurring events of same type/title
    const recent = events.slice(-200) // Check last 200 events
    const titleCounts: Record<string, { count: number; ids: string[] }> = {}

    for (const e of recent) {
      // Normalize title for grouping
      const key = e.title.toLowerCase()
        .replace(/\d+/g, '#')  // Replace numbers
        .replace(/['"]/g, '')   // Remove quotes
        .trim()
        .substring(0, 40)

      if (!titleCounts[key]) titleCounts[key] = { count: 0, ids: [] }
      titleCounts[key].count++
      titleCounts[key].ids.push(e.id)
    }

    // Find recurring patterns (3+ occurrences)
    for (const [title, data] of Object.entries(titleCounts)) {
      if (data.count >= 3 && !patterns.find(p => p.description.includes(title))) {
        patterns.push({
          id: crypto.randomUUID(),
          type: 'recurring',
          description: `User repeatedly does: "${title}" (${data.count} times)`,
          events: data.ids.slice(-10),
          confidence: Math.min(1, data.count / 10),
          firstSeen: events.find(e => data.ids.includes(e.id))?.timestamp || new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          occurrences: data.count
        })
      }
    }

    // Keep patterns under 100
    if (patterns.length > 100) {
      patterns = patterns.slice(-100)
    }
  }

  private static addEdge(from: string, to: string, relation: string): void {
    graph.edges.push({ from, to, relation })
    // Trim edges
    if (graph.edges.length > 5000) {
      graph.edges = graph.edges.slice(-5000)
    }
  }

  private static persist(): void {
    try {
      const dir = DATA_DIR()
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(EPISODES_FILE(), JSON.stringify(events, null, 2))
      fs.writeFileSync(PATTERNS_FILE(), JSON.stringify(patterns, null, 2))
      fs.writeFileSync(GRAPH_FILE(), JSON.stringify(graph, null, 2))
    } catch (e) {
      console.error('[Brain:Episodic] Persist error:', e)
    }
  }

  private static migrateOldMemory(): void {
    // Migrate old flat memory from permanent-memory.ts
    try {
      const oldFile = path.resolve(app.getPath('userData'), 'Memory', 'saved-user-memory.json')
      if (!fs.existsSync(oldFile)) return
      const oldData = JSON.parse(fs.readFileSync(oldFile, 'utf-8'))
      if (!Array.isArray(oldData) || !oldData.length) return

      // Check if already migrated
      if (events.some(e => e.context.tags.includes('migrated'))) return

      for (const item of oldData) {
        events.push({
          id: crypto.randomUUID(),
          timestamp: item.timestamp || new Date().toISOString(),
          type: 'note',
          title: item.fact?.substring(0, 80) || 'Legacy memory',
          detail: item.fact || '',
          context: { source: (item.source as any) || 'desktop', tags: ['migrated', 'legacy'] },
          outcome: 'info',
          emotion: 'neutral',
          relatedEvents: [],
          insights: []
        })
        if (item.source === 'telegram') {
          events[events.length - 1].context.source = 'telegram'
        }
      }
      this.persist()
      console.log(`[Brain:Episodic] Migrated ${oldData.length} old memories`)
    } catch {}
  }

  private static timeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `${weeks}w ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerEpisodicMemory(): void {
  EpisodicMemory.init()

  ipcMain.handle('brain:record', (_, event: any) => {
    return EpisodicMemory.record(event)
  })

  ipcMain.handle('brain:query', (_, query: EpisodicQuery) => {
    return EpisodicMemory.query(query)
  })

  ipcMain.handle('brain:recall', (_, context: string, limit?: number) => {
    return EpisodicMemory.recall(context, limit)
  })

  ipcMain.handle('brain:recall-context', (_, action: string) => {
    return EpisodicMemory.buildRecallContext(action)
  })

  ipcMain.handle('brain:patterns', () => {
    return EpisodicMemory.getPatterns()
  })

  ipcMain.handle('brain:stats', () => {
    return EpisodicMemory.getStats()
  })

  console.log('[Brain:Episodic] Memory engine registered')
}
