/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — BRAIN ROUTER (Unified Memory Interface)         ║
 * ║  One API for all memory operations.                         ║
 * ╚══════════════════════════════════════════════════━━══════════╝
 *
 * This is the single entry point for all memory operations.
 * The Telegram bot, voice AI, and desktop all use this.
 *
 * The Brain Router:
 *   1. Takes a user message/action
 *   2. Queries Episodic memory for relevant past events
 *   3. Queries Semantic memory for facts/preferences
 *   4. Returns a rich context bundle for AI consumption
 *   5. Auto-records the event for future recall
 */

import { ipcMain, app } from 'electron'
import { EpisodicMemory } from './episodic-memory'
import { SemanticMemory } from './semantic-memory'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BrainContext {
  /** Relevant past events */
  memories: string[] // Formatted memory strings
  /** Known facts about the user */
  knowledge: string[] // Formatted fact strings
  /** Active patterns */
  patterns: string[] // Formatted pattern strings
  /** Current mood assessment */
  mood: string
  /** Full context string ready for AI injection */
  contextString: string
}

// ━━━ BRAIN ROUTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class BrainRouter {
  /**
   * Get full brain context for an AI prompt.
   * Call this BEFORE sending any prompt to the AI.
   *
   * Returns a formatted string that gets prepended to the system prompt.
   */
  static getContext(currentAction: string): BrainContext {
    EpisodicMemory.init()
    SemanticMemory.init()

    // 1. Recall relevant past events
    const memories = EpisodicMemory.recall(currentAction, 5)
    const memoryStrings = memories.map((m) => {
      const ago = this.timeAgo(m.timestamp)
      const outcome = m.outcome !== 'info' ? ` (outcome: ${m.outcome})` : ''
      const emotion = m.emotion !== 'neutral' ? ` [user was ${m.emotion}]` : ''
      const insight = m.insights.length ? ` | Insight: ${m.insights.join('; ')}` : ''
      return `${ago}: "${m.title}"${outcome}${emotion}${insight}`
    })

    // 2. Get relevant knowledge
    const allFacts = SemanticMemory.query()
    const knowledgeStrings = allFacts
      .filter((f) => f.confidence !== 'unconfirmed')
      .map((f) => `${f.category}/${f.key}: ${f.value} (${f.confidence})`)

    // 3. Get patterns
    const patterns = EpisodicMemory.getPatterns()
    const patternStrings = patterns.slice(-5).map((p) => p.description)

    // 4. Build context string for AI
    let contextString = ''

    if (memoryStrings.length > 0) {
      contextString += `\n[RELEVANT MEMORIES]:\n${memoryStrings.map((m) => `  - ${m}`).join('\n')}\n`
    }

    if (knowledgeStrings.length > 0) {
      // Only include top 15 most relevant facts
      contextString += `\n[WHAT I KNOW ABOUT USER]:\n${knowledgeStrings
        .slice(0, 15)
        .map((k) => `  - ${k}`)
        .join('\n')}\n`
    }

    if (patternStrings.length > 0) {
      contextString += `\n[PATTERNS I'VE NOTICED]:\n${patternStrings.map((p) => `  - ${p}`).join('\n')}\n`
    }

    return {
      memories: memoryStrings,
      knowledge: knowledgeStrings,
      patterns: patternStrings,
      mood: 'neutral', // Mood comes from NoticeEngine
      contextString
    }
  }

  /**
   * Record a user interaction in the brain.
   */
  static recordInteraction(
    action: string,
    source: 'telegram' | 'voice' | 'desktop' = 'desktop',
    outcome: 'success' | 'failure' | 'partial' | 'info' = 'info',
    extra?: {
      type?: string
      emotion?: string
      project?: string
      tags?: string[]
    }
  ): void {
    EpisodicMemory.record({
      type: (extra?.type as any) || 'command',
      title: action.substring(0, 80),
      detail: action.substring(0, 300),
      context: {
        source,
        project: extra?.project,
        tags: extra?.tags || []
      },
      outcome,
      emotion: (extra?.emotion as any) || 'neutral'
    })
  }

  /**
   * Record a fact the user told IRIS.
   * "IRIS, remember that my deploy server is 192.168.1.5"
   */
  static learnFact(
    category: string,
    key: string,
    value: string,
    source: string = 'user_told'
  ): void {
    SemanticMemory.record(category as any, key, value, source, 'certain')

    // Also record as an event
    EpisodicMemory.record({
      type: 'learning',
      title: `Learned: ${key} = ${value}`,
      detail: `User told IRIS: ${category}/${key} = ${value}`,
      context: {
        source: source === 'telegram' ? 'telegram' : 'desktop',
        tags: ['fact', 'learning']
      },
      outcome: 'success',
      insights: [`User prefers ${key}: ${value}`]
    })
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
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerBrainRouter(): void {
  // Get full brain context
  ipcMain.removeHandler('brain:context')
  ipcMain.handle('brain:context', (_, action: string) => {
    return BrainRouter.getContext(action)
  })

  // Record an interaction
  ipcMain.removeHandler('brain:record-action')
  ipcMain.handle(
    'brain:record-action',
    (_, action: string, source: string, outcome: string, extra?: any) => {
      BrainRouter.recordInteraction(action, source as any, outcome as any, extra)
      return { success: true }
    }
  )

  // Learn a fact
  ipcMain.removeHandler('brain:learn')
  ipcMain.handle(
    'brain:learn',
    (_, category: string, key: string, value: string, source?: string) => {
      BrainRouter.learnFact(category, key, value, source)
      return { success: true }
    }
  )

  // Get brain stats
  ipcMain.removeHandler('brain-router:stats')
  ipcMain.handle('brain-router:stats', () => {
    const episodicStats = EpisodicMemory.getStats()
    const semanticStats = SemanticMemory.getStats()
    return {
      episodic: episodicStats,
      semantic: semanticStats
    }
  })

  console.log('[Brain:Router] Unified memory interface registered')
}
