/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — PROACTIVE SUGGESTION ENGINE                     ║
 * ║  "That variable name is already used in line 47."           ║
 * ║  "You usually run tests after committing. Want me to?"      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Watches for opportunities to be helpful BEFORE being asked.
 * Uses episodic memory patterns to predict what user might need.
 *
 * Suggestion Types:
 *   1. CODE — Variable reuse, missing error handling, long functions
 *   2. WORKFLOW — "You usually do X after Y", repetitive task automation
 *   3. LEARNING — "You've used grep 20x this week. Cheat sheet?"
 *   4. CONTEXTUAL — "This is similar to a bug you fixed last Tuesday"
 *   5. EFFICIENCY — "You can alias that command. Save 10 keystrokes"
 */

import { ipcMain, BrowserWindow, app } from 'electron'
import { EpisodicMemory } from '../brain/episodic-memory'
import { SemanticMemory } from '../brain/semantic-memory'
import { EmotionEngine } from './emotion-engine'
import { PersonalityEngine } from './personality-engine'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type SuggestionCategory = 
  | 'code' | 'workflow' | 'learning' | 'contextual' | 'efficiency' | 'wellness'

export interface Suggestion {
  id: string
  category: SuggestionCategory
  emoji: string
  title: string              // Short title
  detail: string             // Full suggestion text
  confidence: number         // 0-1
  actionable: boolean        // Can IRIS do something about it?
  action?: string            // What IRIS can do
  priority: 'low' | 'medium' | 'high'
  source: string             // What triggered this suggestion
}

// ━━━ SUGGESTION ENGINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class SuggestionEngine {
  private static lastSuggestion: number = 0
  private static suggestionHistory: Suggestion[] = []
  private static mainWindow: BrowserWindow | null = null
  private static readonly MIN_SUGGESTION_INTERVAL = 15 * 60 * 1000 // 15 min between suggestions

  static init(window: BrowserWindow): void {
    this.mainWindow = window

    // Generate suggestions every 10 minutes
    setInterval(() => {
      this.generateAndSend()
    }, 10 * 60 * 1000)

    console.log('[Soul:Suggestion] Engine initialized')
  }

  /**
   * Get all current suggestions based on context.
   */
  static getSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = []

    // 1. WORKFLOW SUGGESTIONS (pattern-based)
    suggestions.push(...this.getWorkflowSuggestions())

    // 2. CONTEXTUAL SUGGESTIONS (memory-based)
    suggestions.push(...this.getContextualSuggestions())

    // 3. LEARNING SUGGESTIONS (usage-based)
    suggestions.push(...this.getLearningSuggestions())

    // 4. EFFICIENCY SUGGESTIONS (frequency-based)
    suggestions.push(...this.getEfficiencySuggestions())

    // 5. WELLNESS SUGGESTIONS (emotion-based)
    suggestions.push(...this.getWellnessSuggestions())

    // Sort by confidence, dedupe
    const seen = new Set<string>()
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .filter(s => {
        if (seen.has(s.title)) return false
        seen.add(s.title)
        return true
      })
      .slice(0, 5)
  }

  /**
   * Generate and send the best suggestion to the user.
   */
  static generateAndSend(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    // Don't suggest too often
    if (Date.now() - this.lastSuggestion < this.MIN_SUGGESTION_INTERVAL) return

    // Check if we should interrupt based on emotion
    const suggestions = this.getSuggestions()
    if (!suggestions.length) return

    const best = suggestions[0]
    if (!EmotionEngine.shouldInterrupt(
      best.priority === 'high' ? 'important' : 'normal'
    )) return

    // Check proactivity setting
    const cfg = PersonalityEngine.getConfig()
    if (cfg.proactivity < 30 && best.priority !== 'high') return

    this.lastSuggestion = Date.now()
    this.suggestionHistory.push(best)
    if (this.suggestionHistory.length > 50) {
      this.suggestionHistory = this.suggestionHistory.slice(-50)
    }

    this.mainWindow.webContents.send('soul:suggestion', best)
    console.log(`[Soul:Suggestion] Sent: ${best.title}`)
  }

  /**
   * Get suggestion for a specific action the user just did.
   * Called in real-time as user works.
   */
  static getSuggestionForAction(action: string): Suggestion | null {
    const stats = EpisodicMemory.getStats()
    const patterns = EpisodicMemory.getPatterns()
    const cfg = PersonalityEngine.getConfig()

    // Check if this action matches a known pattern
    for (const pattern of patterns) {
      if (action.toLowerCase().includes(pattern.description.toLowerCase().substring(0, 20))) {
        // This is a recurring action
        const count = pattern.occurrences
        if (count >= 5 && !action.includes('macro') && !action.includes('workflow')) {
          return {
            id: `sug_${Date.now()}`,
            category: 'workflow',
            emoji: '🔄',
            title: `Automate "${action.substring(0, 40)}"?`,
            detail: `You've done this ${count} times. I can create a macro/workflow for it. Want me to?`,
            confidence: Math.min(1, count / 10),
            actionable: true,
            action: `create_macro:${action}`,
            priority: 'low',
            source: `pattern detected (${count} occurrences)`
          }
        }
      }
    }

    // Check if similar action had errors before
    const similarEvents = EpisodicMemory.recall(action, 3)
    const pastFailures = similarEvents.filter(e => e.outcome === 'failure')
    if (pastFailures.length > 0) {
      const fix = pastFailures.find(e => e.insights.length > 0)
      if (fix) {
        return {
          id: `sug_${Date.now()}`,
          category: 'contextual',
          emoji: '💡',
          title: 'Similar issue before',
          detail: `Last time you did "${action}", it failed: "${fix.title}". You fixed it with: ${fix.insights.join(', ')}.`,
          confidence: 0.7,
          actionable: true,
          action: `apply_previous_fix:${fix.id}`,
          priority: 'medium',
          source: 'episodic memory recall'
        }
      }
    }

    return null
  }

  // ━━━ SUGGESTION GENERATORS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private static getWorkflowSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = []
    const patterns = EpisodicMemory.getPatterns()

    for (const p of patterns) {
      // Sequential pattern: "After X, user usually does Y"
      if (p.type === 'sequential' && p.confidence > 0.5) {
        suggestions.push({
          id: `sug_wf_${p.id}`,
          category: 'workflow',
          emoji: '📋',
          title: 'Workflow suggestion',
          detail: `I noticed a pattern: ${p.description}. Want me to automate this?`,
          confidence: p.confidence * 0.7,
          actionable: true,
          action: `create_workflow:${p.id}`,
          priority: 'low',
          source: 'pattern detection'
        })
      }

      // Recurring pattern: "You keep doing X"
      if (p.type === 'recurring' && p.occurrences >= 5) {
        suggestions.push({
          id: `sug_rc_${p.id}`,
          category: 'efficiency',
          emoji: '⚡',
          title: 'Automate repetitive task',
          detail: `${p.description}. This has happened ${p.occurrences} times. I can create a macro for it.`,
          confidence: Math.min(0.9, p.occurrences / 15),
          actionable: true,
          action: `create_macro:${p.id}`,
          priority: 'low',
          source: `recurring pattern (${p.occurrences}x)`
        })
      }
    }

    return suggestions
  }

  private static getContextualSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = []
    const recentErrors = EpisodicMemory.query({ type: 'error', limit: 10, outcome: 'failure' })

    // Suggest fixes for recent errors
    if (recentErrors.length >= 2) {
      const latestError = recentErrors[0]
      suggestions.push({
        id: `sug_ctx_${Date.now()}`,
        category: 'contextual',
        emoji: '🐛',
        title: 'Recurring errors detected',
        detail: `You've had ${recentErrors.length} errors recently. Latest: "${latestError.title}". Want me to search for solutions?`,
        confidence: 0.6,
        actionable: true,
        action: `research_fix:${latestError.title}`,
        priority: 'medium',
        source: 'error pattern detection'
      })
    }

    // Check for similar past problems that were solved
    const recentFrustration = EpisodicMemory.query({ type: 'frustration', limit: 3 })
    if (recentFrustration.length >= 2) {
      const solved = recentFrustration.find(e => e.outcome === 'success' && e.insights.length > 0)
      if (solved) {
        suggestions.push({
          id: `sug_sim_${Date.now()}`,
          category: 'contextual',
          emoji: '🔍',
          title: 'Similar issue solved before',
          detail: `This looks like "${solved.title}" which you solved with: ${solved.insights.join(', ')}. Same approach?`,
          confidence: 0.5,
          actionable: true,
          action: `apply_fix:${solved.id}`,
          priority: 'medium',
          source: 'memory recall'
        })
      }
    }

    return suggestions
  }

  private static getLearningSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = []
    const stats = EpisodicMemory.getStats()

    // If user has many command-type events, suggest learning aliases
    if ((stats.byType['command'] || 0) > 50) {
      suggestions.push({
        id: `sug_learn_${Date.now()}`,
        category: 'learning',
        emoji: '📚',
        title: 'Power user detected',
        detail: `You've used ${stats.byType['command']} commands this week. Want me to show you some power-user shortcuts and aliases?`,
        confidence: 0.5,
        actionable: true,
        action: 'show_power_tips',
        priority: 'low',
        source: 'usage statistics'
      })
    }

    // TypeScript errors pattern
    const tsErrors = EpisodicMemory.query({
      text: 'typescript type error',
      type: 'error',
      limit: 5
    })
    if (tsErrors.length >= 3) {
      suggestions.push({
        id: `sug_ts_${Date.now()}`,
        category: 'learning',
        emoji: '📘',
        title: 'TypeScript patterns',
        detail: `Your TypeScript errors are mostly type-related. I can create a cheat sheet or suggest stricter tsconfig options.`,
        confidence: 0.6,
        actionable: true,
        action: 'generate_ts_cheatsheet',
        priority: 'low',
        source: 'error analysis'
      })
    }

    return suggestions
  }

  private static getEfficiencySuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = []

    // Check for long file search sessions
    const recentSearches = EpisodicMemory.query({ type: 'search', limit: 10 })
    if (recentSearches.length >= 5) {
      suggestions.push({
        id: `sug_eff_${Date.now()}`,
        category: 'efficiency',
        emoji: '🗂️',
        title: 'Organize files better',
        detail: `You've searched for files ${recentSearches.length} times recently. Want me to suggest a better folder structure?`,
        confidence: 0.4,
        actionable: true,
        action: 'suggest_file_structure',
        priority: 'low',
        source: 'search frequency analysis'
      })
    }

    return suggestions
  }

  private static getWellnessSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = []
    const emotion = EmotionEngine.getCurrentEmotion()
    const adaptation = EmotionEngine.getAdaptation()

    if (adaptation.suggestBreak) {
      suggestions.push({
        id: `sug_well_${Date.now()}`,
        category: 'wellness',
        emoji: '☕',
        title: 'Take a break',
        detail: `You seem ${emotion}. A short break (5-10 min) can actually boost productivity. Your code will wait.`,
        confidence: 0.8,
        actionable: false,
        priority: 'high',
        source: 'emotion engine'
      })
    }

    // Late night wellness
    const hour = new Date().getHours()
    if (hour >= 1 && hour <= 4) {
      suggestions.push({
        id: `sug_night_${Date.now()}`,
        category: 'wellness',
        emoji: '🌙',
        title: 'Late night session',
        detail: `It's ${hour} AM. Sleep deprivation reduces code quality by up to 30%. Tomorrow-you will thank present-you for sleeping.`,
        confidence: 0.9,
        actionable: false,
        priority: 'high',
        source: 'time detection'
      })
    }

    return suggestions
  }

  /**
   * Get suggestion history
   */
  static getHistory(): Suggestion[] {
    return this.suggestionHistory.slice(-20).reverse()
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerSuggestionEngine(): void {
  ipcMain.handle('soul:suggestions', () => {
    return SuggestionEngine.getSuggestions()
  })

  ipcMain.handle('soul:suggestion-for-action', (_, action: string) => {
    return SuggestionEngine.getSuggestionForAction(action)
  })

  ipcMain.handle('soul:suggestion-history', () => {
    return SuggestionEngine.getHistory()
  })

  console.log('[Soul:Suggestion] Engine registered')
}
