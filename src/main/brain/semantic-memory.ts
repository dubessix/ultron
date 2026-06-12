/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — SEMANTIC MEMORY ENGINE                          ║
 * ║  "Sir, you prefer JWT over OAuth. Noted."                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Facts, preferences, skills, environment, behavioral patterns.
 * This is the "What IRIS KNOWS about you" memory.
 *
 * Categories:
 *   - Identity (name, pronouns, timezone, language preferences)
 *   - Skills (languages, frameworks, tools you use)
 *   - Preferences (editor, theme, workflow, AI personality)
 *   - Projects (paths, stacks, deployment targets)
 *   - Environment (PC specs, apps installed, key directories)
 *   - Behavioral (active hours, typing patterns, habits)
 *   - Relationships (people you message, contacts)
 *   - Theories (IRIS's hypotheses about you — formed by Notice Engine)
 */

import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type FactCategory =
  | 'identity' | 'skill' | 'preference' | 'project' | 'environment'
  | 'behavioral' | 'relationship' | 'theory' | 'goal' | 'custom'

export type FactConfidence = 'certain' | 'likely' | 'maybe' | 'unconfirmed'

export interface SemanticFact {
  id: string
  category: FactCategory
  key: string            // e.g. "preferred_auth_method"
  value: string          // e.g. "JWT"
  source: string         // How IRIS learned this: "user_told", "observed", "inferred"
  confidence: FactConfidence
  firstSeen: string      // ISO date
  lastSeen: string       // Updated when confirmed again
  confirmations: number  // How many times this was observed/stated
  relatedFacts: string[] // IDs of related facts
  context?: string       // Additional context
}

export interface SemanticQuery {
  category?: FactCategory
  key?: string
  search?: string        // Free text search in value
  minConfidence?: FactConfidence
  source?: string
}

// ━━━ STORAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FILE = () => {
  const dir = path.resolve(app.getPath('userData'), 'Brain')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'semantic.json')
}

let facts: SemanticFact[] = []
let isLoaded = false

// ━━━ CORE ENGINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class SemanticMemory {

  static init(): void {
    if (isLoaded) return
    try {
      if (fs.existsSync(FILE())) {
        facts = JSON.parse(fs.readFileSync(FILE(), 'utf-8'))
      }
    } catch { facts = [] }
    isLoaded = true
    console.log(`[Brain:Semantic] Loaded ${facts.length} facts`)
  }

  /**
   * Store a fact. If a fact with same category+key exists, update it.
   */
  static record(
    category: FactCategory,
    key: string,
    value: string,
    source: string = 'observed',
    confidence: FactConfidence = 'likely'
  ): SemanticFact {
    this.init()

    // Check if fact already exists
    const existing = facts.find(f => f.category === category && f.key === key)

    if (existing) {
      // Update existing fact
      existing.value = value
      existing.lastSeen = new Date().toISOString()
      existing.confirmations++
      // Upgrade confidence with more confirmations
      if (existing.confirmations >= 5) existing.confidence = 'certain'
      else if (existing.confirmations >= 3) existing.confidence = 'likely'
      this.persist()
      return existing
    }

    const fact: SemanticFact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      category,
      key,
      value,
      source,
      confidence,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      confirmations: 1,
      relatedFacts: []
    }

    facts.push(fact)
    this.persist()
    return fact
  }

  /**
   * Quick get a fact value by category + key.
   */
  static get(category: FactCategory, key: string): string | null {
    this.init()
    const fact = facts.find(f => f.category === category && f.key === key)
    return fact?.value || null
  }

  /**
   * Query facts with filters.
   */
  static query(q: SemanticQuery = {}): SemanticFact[] {
    this.init()
    let results = [...facts]

    if (q.category) results = results.filter(f => f.category === q.category)
    if (q.key) results = results.filter(f => f.key.includes(q.key!))
    if (q.source) results = results.filter(f => f.source === q.source)
    if (q.search) {
      const s = q.search.toLowerCase()
      results = results.filter(f =>
        f.value.toLowerCase().includes(s) || f.key.toLowerCase().includes(s)
      )
    }
    if (q.minConfidence) {
      const levels: FactConfidence[] = ['unconfirmed', 'maybe', 'likely', 'certain']
      const minIdx = levels.indexOf(q.minConfidence)
      results = results.filter(f => levels.indexOf(f.confidence) >= minIdx)
    }

    return results.sort((a, b) => b.confirmations - a.confirmations)
  }

  /**
   * Build a summary of everything IRIS knows — for AI context injection.
   */
  static buildKnowledgeSummary(): string {
    this.init()
    if (!facts.length) return ''

    const byCategory: Record<string, string[]> = {}
    for (const f of facts) {
      if (f.confidence === 'unconfirmed') continue
      const cat = f.category
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(`  - ${f.key}: ${f.value} (${f.confidence}, ${f.confirmations}x confirmed)`)
    }

    const sections = Object.entries(byCategory)
      .map(([cat, items]) => {
        const label = cat.charAt(0).toUpperCase() + cat.slice(1)
        return `[${label}]:\n${items.join('\n')}`
      })
      .join('\n\n')

    return `\n\n[IRIS KNOWLEDGE ABOUT USER]:\n${sections}`
  }

  /**
   * Get all facts about the user as a plain text summary.
   */
  static getUserProfile(): string {
    this.init()
    const lines = facts
      .filter(f => f.confidence !== 'unconfirmed')
      .map(f => `${f.category}/${f.key}: ${f.value}`)
    return lines.join('\n')
  }

  /**
   * Record a theory (hypothesis about the user).
   */
  static recordTheory(theory: string, evidence: string): SemanticFact {
    return this.record('theory', `theory_${Date.now()}`, theory, 'inferred', 'maybe')
  }

  /**
   * Confirm or deny a theory.
   */
  static updateTheory(factId: string, confirmed: boolean): void {
    this.init()
    const fact = facts.find(f => f.id === factId)
    if (fact) {
      fact.confidence = confirmed ? 'certain' : 'unconfirmed'
      fact.lastSeen = new Date().toISOString()
      if (confirmed) fact.confirmations++
      this.persist()
    }
  }

  /**
   * Get count of facts by category.
   */
  static getStats(): Record<string, number> {
    this.init()
    const stats: Record<string, number> = { total: facts.length }
    for (const f of facts) {
      stats[f.category] = (stats[f.category] || 0) + 1
    }
    return stats
  }

  private static persist(): void {
    try {
      fs.writeFileSync(FILE(), JSON.stringify(facts, null, 2))
    } catch (e) {
      console.error('[Brain:Semantic] Persist error:', e)
    }
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerSemanticMemory(): void {
  SemanticMemory.init()

  ipcMain.handle('brain:semantic-record', (_, cat, key, value, source?, conf?) => {
    return SemanticMemory.record(cat, key, value, source, conf)
  })

  ipcMain.handle('brain:semantic-get', (_, cat, key) => {
    return SemanticMemory.get(cat, key)
  })

  ipcMain.handle('brain:semantic-query', (_, query?) => {
    return SemanticMemory.query(query)
  })

  ipcMain.handle('brain:semantic-profile', () => {
    return SemanticMemory.getUserProfile()
  })

  ipcMain.handle('brain:semantic-knowledge', () => {
    return SemanticMemory.buildKnowledgeSummary()
  })

  ipcMain.handle('brain:semantic-theory', (_, theory, evidence) => {
    return SemanticMemory.recordTheory(theory, evidence)
  })

  ipcMain.handle('brain:semantic-stats', () => {
    return SemanticMemory.getStats()
  })

  console.log('[Brain:Semantic] Knowledge engine registered')
}
