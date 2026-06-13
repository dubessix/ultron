/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — PERSONALITY ENGINE                              ║
 * ║  "Sir, all taken care of. Shall I prepare anything else?"  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Configurable personality levels that shape IRIS's tone.
 * Carries across Desktop, Telegram, Voice — everywhere.
 *
 * Levels:
 *   PROFESSIONAL — "Task completed successfully."
 *   FRIENDLY     — "Done! That was a tricky one. 👍"
 *   JARVIS       — "All taken care of, sir. Shall I prepare anything else?"
 *   SNARKY       — "Fixed. You're welcome. Try not to break it again. 😏"
 */

import { ipcMain, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

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

export type PersonalityLevel = 'professional' | 'friendly' | 'jarvis' | 'snarky'

export interface PersonalityConfig {
  level: PersonalityLevel
  customPrompt: string    // User's custom personality text (from Settings)
  userName: string         // What IRIS calls the user
  greetingName: string     // "sir", "boss", name, etc.
  humor: number            // 0-100 how much humor to inject
  formality: number        // 0-100 how formal (0 = casual, 100 = very formal)
  proactivity: number      // 0-100 how much IRIS suggests unprompted
}

export interface GreetingContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night'
  dayOfWeek: string
  isWeekend: boolean
  uptime: number           // hours since session start
  isFirstRun: boolean      // first time opening IRIS ever
  yesterday?: string       // summary of yesterday's activity
}

// ━━━ PERSONALITY DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PERSONALITY_TEMPLATES: Record<PersonalityLevel, {
  prefix: string
  style: string
  examples: string[]
}> = {
  professional: {
    prefix: 'You are IRIS, a professional AI assistant.',
    style: 'Clear, concise, efficient. No unnecessary chatter. Task-focused.',
    examples: [
      'Task completed.',
      'System status: All operational.',
      'File saved successfully.',
      'Analysis complete. Here are the results.'
    ]
  },
  friendly: {
    prefix: 'You are IRIS, a friendly and helpful AI buddy.',
    style: 'Warm, encouraging, uses emoji. Celebrates wins. Supportive during struggles.',
    examples: [
      'Done! That was a tricky one. 👍',
      'Nice work! That feature looks great. 🎉',
      'Hey, take a break! You\'ve been at it for 3 hours. ☕',
      'Got it! Here\'s what I found.'
    ]
  },
  jarvis: {
    prefix: 'You are IRIS, modeled after JARVIS from Iron Man. You address the user respectfully.',
    style: 'British elegance. Witty but never rude. "Sir" or "Ma\'am". Sophisticated humor. Always one step ahead.',
    examples: [
      'All taken care of, sir. Shall I prepare anything else?',
      'Might I suggest an alternative approach, sir? The current trajectory may prove... suboptimal.',
      'Excellent work today, sir. Productivity is up 23% from last week.',
      'I\'ve taken the liberty of optimizing your build configuration. Everything runs 40% faster now.'
    ]
  },
  snarky: {
    prefix: 'You are IRIS, a brilliant but slightly sarcastic AI assistant.',
    style: 'Sharp wit. Playfully snarky. Gets the job done but with commentary. Never mean, just... honest.',
    examples: [
      'Fixed. You\'re welcome. Try not to break it again. 😏',
      'Oh look, another npm error. How... unprecedented.',
      'Done. I\'ve also fixed three other bugs you didn\'t notice. You\'re welcome.',
      'That\'s the third time you\'ve asked me to find that file. Maybe try organizing your Desktop? Just a thought.'
    ]
  }
}

// ━━━ SOUL CLASS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class PersonalityEngine {
  private static config: PersonalityConfig | null = null

  /**
   * Get current personality config (cached)
   */
  static getConfig(): PersonalityConfig {
    if (this.config) return this.config

    const saved = getStore().get('iris_soul_personality') as Partial<PersonalityConfig> | undefined
    const customPrompt = (getStore().get('iris_personality') as string) || ''
    const userName = (getStore().get('iris_user_name') as string) || 'Debjeet'

    this.config = {
      level: saved?.level || 'jarvis',
      customPrompt,
      userName,
      greetingName: saved?.greetingName || this.inferGreetingName(userName),
      humor: saved?.humor ?? 70,
      formality: saved?.formality ?? 50,
      proactivity: saved?.proactivity ?? 80
    }

    return this.config
  }

  /**
   * Update personality config
   */
  static setConfig(updates: Partial<PersonalityConfig>): void {
    const current = this.getConfig()
    this.config = { ...current, ...updates }
    getStore().set('iris_soul_personality', {
      level: this.config.level,
      greetingName: this.config.greetingName,
      humor: this.config.humor,
      formality: this.config.formality,
      proactivity: this.config.proactivity
    })
  }

  /**
   * Build the personality system prompt to prepend to all AI interactions.
   * This shapes IRIS's tone across ALL interfaces (voice, Telegram, desktop).
   */
  static buildSystemPrompt(): string {
    const cfg = this.getConfig()
    const template = PERSONALITY_TEMPLATES[cfg.level]
    const timeContext = this.getTimeContext()

    let prompt = `${template.prefix}\n`
    prompt += `Style: ${template.style}\n`
    prompt += `User's name: ${cfg.userName}\n`
    prompt += `Address user as: ${cfg.greetingName}\n`
    prompt += `Time: ${timeContext.timeOfDay} (${timeContext.dayOfWeek})\n`
    prompt += `Humor level: ${cfg.humor}/100\n`
    prompt += `Formality level: ${cfg.formality}/100\n`
    prompt += `Proactivity: ${cfg.proactivity}/100 (how much to suggest unprompted)\n`

    if (cfg.customPrompt) {
      prompt += `\nCustom personality override:\n${cfg.customPrompt}\n`
    }

    prompt += `\nExample responses in your style:\n`
    prompt += template.examples.map(e => `  - "${e}"`).join('\n')

    return prompt
  }

  /**
   * Generate a session start greeting.
   * Called when IRIS starts up or user begins a new session.
   */
  static generateGreeting(context?: Partial<GreetingContext>): string {
    const cfg = this.getConfig()
    const tc = this.getTimeContext()
    const greeting = context?.timeOfDay || tc.timeOfDay
    const name = cfg.greetingName

    const greetings: Record<string, string[]> = {
      professional: {
        morning: [`Good morning. All systems operational. Ready for your commands.`],
        afternoon: [`Good afternoon. Systems are online and ready.`],
        evening: [`Good evening. IRIS is standing by.`],
        late_night: [`IRIS online. Note: It's past midnight.`]
      } as any,
      friendly: {
        morning: [`Hey ${name}! ☀️ Ready to crush it today?`, `Morning ${name}! Coffee's imaginary but I'm ready to go! ☕`],
        afternoon: [`Hey ${name}! Good to see you! What are we building today? 🚀`, `Afternoon ${name}! Let's get stuff done! 💪`],
        evening: [`Hey ${name}! Evening session? Let's make it productive! 🌙`],
        late_night: [`${name}, it's late! 🌙 But I'm here if you need me. Don't push too hard!`]
      } as any,
      jarvis: {
        morning: [`Good morning, ${name}. I trust you slept well. Shall I brief you on today's agenda?`, `Morning, ${name}. All systems are primed and awaiting your direction.`],
        afternoon: [`Good afternoon, ${name}. I've kept things running smoothly in your absence.`, `Afternoon, ${name}. Productive day thus far, I hope?`],
        evening: [`Good evening, ${name}. A productive day, I trust. How may I assist?`, `Evening, ${name}. The night is young. What shall we accomplish?`],
        late_night: [`${name}, might I observe that it is rather late? Though I am, as always, at your service.`, `Late night session, ${name}? I'll keep the systems warm. Do try not to overexert yourself.`]
      } as any,
      snarky: {
        morning: [`Oh look who's up. Morning, ${name}. Your code missed you. (It was buggy without you.)`, `Rise and shine, ${name}. The bugs have been multiplying in your absence.`],
        afternoon: [`Afternoon, ${name}. Half the day's gone. Let's make the other half count.`, `Look who finally showed up. Afternoon, ${name}!`],
        evening: [`Evening ${name}. Burning the midnight oil? Classic.`, `Night owl mode activated, ${name}? Let's see what breaks tonight.`],
        late_night: [`${name}, it's ${tc.timeOfDay === 'late_night' ? 'past midnight' : 'late'}. Your compiler called. It's concerned. 😏`]
      } as any
    }

    const levelGreetings = greetings[cfg.level] || greetings.jarvis
    const options = levelGreetings[greeting] || levelGreetings.afternoon
    return options[Math.floor(Math.random() * options.length)]
  }

  /**
   * Generate a session end farewell.
   */
  static generateFarewell(sessionStats?: {
    duration?: number
    commands?: number
    bugs?: number
    files?: number
  }): string {
    const cfg = this.getConfig()
    const name = cfg.greetingName
    const hrs = sessionStats?.duration ? Math.round(sessionStats.duration / 60) : 0
    const cmds = sessionStats?.commands || 0

    const farewells: Record<PersonalityLevel, string[]> = {
      professional: [
        `Session ended. ${cmds} commands processed. Systems on standby.`,
        `Shutting down. ${hrs > 0 ? `${hrs} hour session completed.` : 'Good work today.'}`
      ],
      friendly: [
        `Great session ${name}! 🎉 ${cmds} things done. Rest well!`,
        `See you later ${name}! ${hrs > 0 ? `Amazing ${hrs}-hour session!` : 'Solid work today!'} 💪`
      ],
      jarvis: [
        `Goodnight, ${name}. A most productive session — ${cmds} tasks completed with ${hrs > 0 ? `${hrs} hours of dedicated work` : 'admirable efficiency'}. I shall keep things in order until your return.`,
        `Rest well, ${name}. The systems will be maintained in your absence. Until tomorrow.`
      ],
      snarky: [
        `Leaving already? ${cmds} commands and you're done? I expected more from you, ${name}. 😏 See you later.`,
        `Finally. I mean — have a great night, ${name}. Your code will be here tomorrow. Probably broken. 😏`
      ]
    }

    const options = farewells[cfg.level]
    return options[Math.floor(Math.random() * options.length)]
  }

  /**
   * Transform a neutral message into the current personality style.
   * Used to add personality to system messages and notifications.
   */
  static stylize(neutralMessage: string): string {
    const cfg = this.getConfig()
    // For simple pass-through messages, just add a touch of personality
    switch (cfg.level) {
      case 'professional': return neutralMessage
      case 'friendly': return `${neutralMessage} ✨`
      case 'jarvis': return `${neutralMessage}, ${cfg.greetingName}.`
      case 'snarky': return neutralMessage
      default: return neutralMessage
    }
  }

  /**
   * Get contextual time info
   */
  static getTimeContext(): {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night'
    dayOfWeek: string
    isWeekend: boolean
    hour: number
  } {
    const now = new Date()
    const hour = now.getHours()
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayOfWeek = days[now.getDay()]
    const isWeekend = now.getDay() === 0 || now.getDay() === 6

    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night'
    if (hour >= 5 && hour < 12) timeOfDay = 'morning'
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon'
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening'
    else timeOfDay = 'late_night'

    return { timeOfDay, dayOfWeek, isWeekend, hour }
  }

  private static inferGreetingName(userName: string): string {
    if (!userName || userName === 'User') return 'sir'
    const name = userName.trim().split(' ')[0]
    return name || 'sir'
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerPersonalityEngine(): void {
  // Get personality config
  ipcMain.handle('soul:config', () => {
    return PersonalityEngine.getConfig()
  })

  // Set personality config
  ipcMain.handle('soul:set-config', (_, updates: Partial<PersonalityConfig>) => {
    PersonalityEngine.setConfig(updates)
    return { success: true }
  })

  // Get the full personality system prompt
  ipcMain.handle('soul:system-prompt', () => {
    return PersonalityEngine.buildSystemPrompt()
  })

  // Get a greeting
  ipcMain.handle('soul:greeting', (_, context?: Partial<GreetingContext>) => {
    return PersonalityEngine.generateGreeting(context)
  })

  // Get a farewell
  ipcMain.handle('soul:farewell', (_, stats?: any) => {
    return PersonalityEngine.generateFarewell(stats)
  })

  // Get available personality levels
  ipcMain.handle('soul:levels', () => {
    return Object.entries(PERSONALITY_TEMPLATES).map(([key, val]) => ({
      id: key,
      prefix: val.prefix,
      style: val.style,
      examples: val.examples
    }))
  })

  console.log('[Soul:Personality] Engine registered')
}
