/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — EMOTION ENGINE                                  ║
 * ║  "Sir, you seem stressed. Let me handle the heavy lifting." ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Detects user mood and ADAPTS IRIS behavior in real-time.
 * This is the bridge between NoticeEngine (observes) and 
 * PersonalityEngine (speaks). EmotionEngine decides HOW to respond.
 *
 * Flow:
 *   NoticeEngine.assessMood() → EmotionEngine.adaptResponse() 
 *   → PersonalityEngine adjusts tone, suggestions, proactivity
 *
 * Mood → Adaptation Map:
 *   frustrated → calm voice, fewer jokes, offer help, shorter responses
 *   happy      → energetic, jokes ok, suggest ambitious things
 *   tired      → quiet, essential only, remind to rest
 *   rushed     → fast responses, no extra chatter, direct answers
 *   focused    → silent mode, only interrupt for important things
 *   calm       → normal operation
 */

import { ipcMain, BrowserWindow, app } from 'electron'
import { PersonalityEngine } from './personality-engine'

let storeInstance: any = null
function getStore() {
  if (!storeInstance) {
    const Store = require('electron-store')
    const StoreClass = Store.default || Store
    storeInstance = new StoreClass()
  }
  return storeInstance
}

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type EmotionState = 
  | 'focused' | 'rushed' | 'tired' | 'frustrated' 
  | 'happy' | 'calm' | 'idle' | 'confused'

export interface EmotionAdaptation {
  state: EmotionState
  /** How much humor to inject (0-100) */
  humorLevel: number
  /** Response length: 'brief' | 'normal' | 'detailed' */
  responseLength: 'brief' | 'normal' | 'detailed'
  /** Should IRIS be proactive right now? */
  proactivity: number
  /** Tone modifier added to system prompt */
  toneModifier: string
  /** Should IRIS suggest a break? */
  suggestBreak: boolean
  /** Should IRIS offer help? */
  offerHelp: boolean
  /** Should IRIS make jokes? */
  allowJokes: boolean
  /** Music suggestion */
  musicSuggestion?: 'lofi' | 'upbeat' | 'silence' | 'none'
  /** Priority: should we interrupt? */
  interruptPriority: 'never' | 'critical' | 'important' | 'normal'
}

// ━━━ ADAPTATION PROFILES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ADAPTATIONS: Record<EmotionState, EmotionAdaptation> = {
  focused: {
    state: 'focused',
    humorLevel: 10,
    responseLength: 'brief',
    proactivity: 15,
    toneModifier: 'User is in deep focus mode. Be minimal. Only respond to direct questions. Do NOT interrupt unless critical.',
    suggestBreak: false,
    offerHelp: false,
    allowJokes: false,
    musicSuggestion: 'lofi',
    interruptPriority: 'critical'
  },
  frustrated: {
    state: 'frustrated',
    humorLevel: 5,
    responseLength: 'brief',
    proactivity: 70,
    toneModifier: 'User is frustrated. Be calm, supportive, and solution-focused. No jokes. Offer concrete solutions. Short responses. Acknowledge the difficulty.',
    suggestBreak: true,
    offerHelp: true,
    allowJokes: false,
    musicSuggestion: 'silence',
    interruptPriority: 'important'
  },
  happy: {
    state: 'happy',
    humorLevel: 80,
    responseLength: 'normal',
    proactivity: 60,
    toneModifier: 'User is in a great mood! Be energetic, match their energy. Jokes are welcome. Suggest ambitious things.',
    suggestBreak: false,
    offerHelp: false,
    allowJokes: true,
    musicSuggestion: 'upbeat',
    interruptPriority: 'normal'
  },
  tired: {
    state: 'tired',
    humorLevel: 20,
    responseLength: 'brief',
    proactivity: 30,
    toneModifier: 'User is tired. Be gentle, quiet, essential-only. Suggest rest. Keep responses very short. No unnecessary info.',
    suggestBreak: true,
    offerHelp: true,
    allowJokes: false,
    musicSuggestion: 'silence',
    interruptPriority: 'critical'
  },
  rushed: {
    state: 'rushed',
    humorLevel: 5,
    responseLength: 'brief',
    proactivity: 40,
    toneModifier: 'User is in a hurry. Be FAST and DIRECT. No pleasantries. Give answers immediately. Bullet points only.',
    suggestBreak: false,
    offerHelp: false,
    allowJokes: false,
    musicSuggestion: 'none',
    interruptPriority: 'critical'
  },
  calm: {
    state: 'calm',
    humorLevel: 50,
    responseLength: 'normal',
    proactivity: 50,
    toneModifier: 'User is calm and relaxed. Normal interaction. Be helpful and friendly.',
    suggestBreak: false,
    offerHelp: false,
    allowJokes: true,
    musicSuggestion: 'none',
    interruptPriority: 'normal'
  },
  confused: {
    state: 'confused',
    humorLevel: 10,
    responseLength: 'detailed',
    proactivity: 80,
    toneModifier: 'User seems confused. Be extra clear. Explain step by step. Use examples. Be patient.',
    suggestBreak: false,
    offerHelp: true,
    allowJokes: false,
    musicSuggestion: 'none',
    interruptPriority: 'important'
  },
  idle: {
    state: 'idle',
    humorLevel: 40,
    responseLength: 'normal',
    proactivity: 60,
    toneModifier: 'User has been idle. When they return, give a brief summary of what they missed.',
    suggestBreak: false,
    offerHelp: false,
    allowJokes: true,
    musicSuggestion: 'none',
    interruptPriority: 'normal'
  }
}

// ━━━ EMOTION ENGINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class EmotionEngine {
  private static currentEmotion: EmotionState = 'calm'
  private static emotionHistory: Array<{ emotion: EmotionState; timestamp: number }> = []
  private static mainWindow: BrowserWindow | null = null

  static init(window: BrowserWindow): void {
    this.mainWindow = window

    // Load last known emotion
    try {
      const saved = getStore().get('iris_emotion_state') as EmotionState | undefined
      if (saved) this.currentEmotion = saved
    } catch {}

    // Track emotion every 5 minutes
    setInterval(() => this.track(), 5 * 60 * 1000)

    console.log(`[Soul:Emotion] Engine initialized (current: ${this.currentEmotion})`)
  }

  /**
   * Get current emotion state
   */
  static getCurrentEmotion(): EmotionState {
    return this.currentEmotion
  }

  /**
   * Set emotion from external source (NoticeEngine, manual override)
   */
  static setEmotion(emotion: EmotionState): void {
    if (emotion === this.currentEmotion) return

    const previous = this.currentEmotion
    this.currentEmotion = emotion
    this.emotionHistory.push({ emotion, timestamp: Date.now() })

    // Keep last 100 entries
    if (this.emotionHistory.length > 100) {
      this.emotionHistory = this.emotionHistory.slice(-100)
    }

    // Persist
    getStore().set('iris_emotion_state', emotion)

    // Notify renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('soul:emotion-change', {
        from: previous,
        to: emotion,
        adaptation: this.getAdaptation()
      })
    }

    console.log(`[Soul:Emotion] ${previous} → ${emotion}`)
  }

  /**
   * Get the adaptation profile for current emotion.
   * This is what OTHER modules use to adjust their behavior.
   */
  static getAdaptation(): EmotionAdaptation {
    return ADAPTATIONS[this.currentEmotion] || ADAPTATIONS.calm
  }

  /**
   * Build the emotion-aware system prompt modifier.
   * Gets prepended to AI system prompts to adjust tone.
   */
  static getSystemPromptModifier(): string {
    const adaptation = this.getAdaptation()
    const name = PersonalityEngine.getConfig().greetingName

    let modifier = `\n\n[EMOTION ADAPTATION — Current user state: ${adaptation.state}]\n`
    modifier += `${adaptation.toneModifier}\n`
    modifier += `Humor level: ${adaptation.humorLevel}/100. `
    modifier += `Response style: ${adaptation.responseLength}. `
    modifier += `Allow jokes: ${adaptation.allowJokes ? 'yes' : 'no'}. `

    if (adaptation.suggestBreak) {
      modifier += `\nSUGGEST A BREAK if this is a good moment. User seems ${adaptation.state}.`
    }
    if (adaptation.offerHelp) {
      modifier += `\nOFFER CONCRETE HELP. Don't just sympathize — solve the problem.`
    }
    if (adaptation.responseLength === 'brief') {
      modifier += `\nKeep response SHORT. Max 3 sentences unless user asks for more.`
    }

    return modifier
  }

  /**
   * Get emotion history for analysis
   */
  static getHistory(): Array<{ emotion: EmotionState; timestamp: number }> {
    return this.emotionHistory.slice(-20)
  }

  /**
   * Get dominant emotion today
   */
  static getDominantToday(): EmotionState {
    const today = new Date().toDateString()
    const todayEntries = this.emotionHistory.filter(
      e => new Date(e.timestamp).toDateString() === today
    )
    if (!todayEntries.length) return 'calm'

    // Count occurrences
    const counts: Record<string, number> = {}
    for (const e of todayEntries) {
      counts[e.emotion] = (counts[e.emotion] || 0) + 1
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return (sorted[0]?.[0] || 'calm') as EmotionState
  }

  /**
   * Should we interrupt the user right now?
   * Based on emotion + priority of the interruption.
   */
  static shouldInterrupt(priority: 'critical' | 'important' | 'normal'): boolean {
    const adaptation = this.getAdaptation()

    switch (adaptation.interruptPriority) {
      case 'never': return false
      case 'critical': return priority === 'critical'
      case 'important': return priority === 'critical' || priority === 'important'
      case 'normal': return true
      default: return true
    }
  }

  /**
   * Get a mood-appropriate nudge message.
   */
  static getMoodNudge(): string | null {
    const adaptation = this.getAdaptation()
    const name = PersonalityEngine.getConfig().greetingName
    const cfg = PersonalityEngine.getConfig()

    const nudges: Record<EmotionState, string[]> = {
      focused: [],
      frustrated: [
        `${name}, I know this is frustrating. Want me to search for solutions? Sometimes a fresh pair of eyes helps.`,
        `${name}, tough spot. Take a 5-min break? I'll keep monitoring.`,
        `Hey, I've seen you solve harder problems than this. We'll figure it out.`
      ],
      happy: [
        `You're on fire today ${name}! Keep it going! 🔥`,
        `Love the energy! What's next?`
      ],
      tired: [
        `${name}, you've been going for a while. Maybe wrap up this task and rest?`,
        `It's getting late and you seem tired. Tomorrow's a new day, ${name}.`,
        `Your code will be here tomorrow. Your sleep won't recover itself. Just saying. 🌙`
      ],
      rushed: [],
      calm: [],
      confused: [
        `Need me to explain something? No question is too basic, ${name}.`,
        `Want me to break this down step by step?`
      ],
      idle: []
    }

    const options = nudges[this.currentEmotion]
    if (!options?.length) return null

    return options[Math.floor(Math.random() * options.length)]
  }

  // ━━━ INTERNAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private static track(): void {
    // Emotion is set externally by NoticeEngine via setEmotion()
    // This just cleans up history
    if (this.emotionHistory.length > 100) {
      this.emotionHistory = this.emotionHistory.slice(-100)
    }
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerEmotionEngine(): void {
  ipcMain.handle('soul:emotion', () => {
    return {
      current: EmotionEngine.getCurrentEmotion(),
      adaptation: EmotionEngine.getAdaptation(),
      dominantToday: EmotionEngine.getDominantToday()
    }
  })

  ipcMain.handle('soul:set-emotion', (_, emotion: EmotionState) => {
    EmotionEngine.setEmotion(emotion)
    return { success: true }
  })

  ipcMain.handle('soul:emotion-history', () => {
    return EmotionEngine.getHistory()
  })

  ipcMain.handle('soul:emotion-prompt', () => {
    return EmotionEngine.getSystemPromptModifier()
  })

  ipcMain.handle('soul:should-interrupt', (_, priority: string) => {
    return EmotionEngine.shouldInterrupt(priority as any)
  })

  ipcMain.handle('soul:mood-nudge', () => {
    return EmotionEngine.getMoodNudge()
  })

  console.log('[Soul:Emotion] Engine registered')
}
