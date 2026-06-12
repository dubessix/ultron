/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — UNIVERSAL AGENT ORCHESTRATOR                    ║
 * ║  "Every request → Agent. Main always free."                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * DESIGN PHILOSOPHY:
 *   User says ANYTHING → Intent classified → Agent spawned
 *   Main thread returns immediately ("Agent X on it!")
 *   Agent works in background → Result delivered when ready
 *   User can keep talking — main is ALWAYS FREE
 *
 * Agent Types (8 types for everything):
 *   💬 AssistantAgent  — General chat, Q&A, conversation
 *   🧑‍💻 CoderAgent     — Code generation, refactoring, debugging
 *   🔍 ResearchAgent   — Deep research, web search, docs
 *   📊 AnalyzerAgent   — Code review, data analysis, patterns
 *   🛠️ BuilderAgent    — Project/file creation, scaffolding
 *   ⚡ ExecutorAgent   — System commands, file ops, app control
 *   🎨 CreativeAgent   — Image generation, website building
 *   🧠 MemoryAgent     — Memory operations, learning, recall
 *
 * Intent Classification: LOCAL (zero AI cost, instant)
 *   Keywords → AgentType. Falls back to 'assistant' for anything.
 */

import { ipcMain, app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { ModelRouter } from '../ai/model-router'
import { PersonalityEngine } from '../soul/personality-engine'
import { BrainRouter } from '../brain/brain-router'
import { EpisodicMemory } from '../brain/episodic-memory'
import { EmotionEngine } from '../soul/emotion-engine'
import { NoticeEngine } from '../soul/notice-engine'
import { SemanticMemory } from '../brain/semantic-memory'
import { SharedConsciousness } from '../brain/shared-consciousness'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AgentType = 'assistant' | 'coder' | 'researcher' | 'analyzer' | 'builder' | 'executor' | 'creative' | 'memory'
export type AgentStatus = 'spawning' | 'working' | 'done' | 'failed' | 'cancelled'

export interface SubAgent {
  id: string
  type: AgentType
  name: string
  emoji: string
  task: string
  status: AgentStatus
  progress: number
  progressLabel: string
  result: string | null
  resultFiles: string[]
  error: string | null
  spawnedAt: number
  completedAt: number | null
  durationMs: number | null
  chatId?: string          // Telegram chat to deliver result to
  source: 'telegram' | 'dashboard' | 'voice'
}

export interface AgentSpawnConfig {
  type: AgentType
  task: string
  context?: string
  filePath?: string
  keys?: any
  chatId?: string
  source?: 'telegram' | 'dashboard' | 'voice'
}

// Result callback type — lets Telegram/Dashboard get notified
export type AgentResultCallback = (agent: SubAgent, message: string) => void

// ━━━ AGENT DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const AGENT_DEFS: Record<AgentType, {
  name: string
  emoji: string
  systemPrompt: string
  steps: string[]
  color: string
}> = {
  assistant: {
    name: 'AssistantAgent',
    emoji: '💬',
    systemPrompt: 'You are IRIS, a helpful AI assistant. Be concise, friendly, and insightful. Use HTML formatting (<b>, <code>, <pre>). Keep under 2000 chars.',
    steps: ['Thinking...', 'Crafting response...', 'Done!'],
    color: '#60a5fa'
  },
  coder: {
    name: 'CoderAgent',
    emoji: '🧑‍💻',
    systemPrompt: 'You are an elite developer. Write clean, production-ready code. Output ONLY raw code, no markdown fences. Be precise and include error handling.',
    steps: ['Planning approach...', 'Writing code...', 'Reviewing...', 'Done!'],
    color: '#3b82f6'
  },
  researcher: {
    name: 'ResearchAgent',
    emoji: '🔍',
    systemPrompt: 'You are a research specialist. Compile comprehensive information. Be thorough, cite specifics. Format with headers and bullet points.',
    steps: ['Searching...', 'Analyzing sources...', 'Compiling report...', 'Done!'],
    color: '#a78bfa'
  },
  analyzer: {
    name: 'AnalyzerAgent',
    emoji: '📊',
    systemPrompt: 'You are a code and data analyst. Find bugs, suggest improvements, detect patterns. Be specific with line numbers and fixes. Rate quality /10.',
    steps: ['Reading input...', 'Running analysis...', 'Detecting patterns...', 'Generating report...', 'Done!'],
    color: '#f59e0b'
  },
  builder: {
    name: 'BuilderAgent',
    emoji: '🛠️',
    systemPrompt: 'You are a project builder. Generate complete, working files. HTML/CSS/JS for web, full configs for projects. Output raw content only.',
    steps: ['Planning structure...', 'Generating files...', 'Writing configs...', 'Finalizing...', 'Done!'],
    color: '#34d399'
  },
  executor: {
    name: 'ExecutorAgent',
    emoji: '⚡',
    systemPrompt: 'You are a system executor. Execute commands precisely. Report results clearly with status codes. Handle errors gracefully.',
    steps: ['Preparing command...', 'Executing...', 'Processing output...', 'Done!'],
    color: '#f97316'
  },
  creative: {
    name: 'CreativeAgent',
    emoji: '🎨',
    systemPrompt: 'You are a creative AI. Generate stunning visuals, websites, and designs. Be imaginative and bold. Output raw HTML/CSS for websites.',
    steps: ['Imagining...', 'Creating...', 'Polishing...', 'Done!'],
    color: '#ec4899'
  },
  memory: {
    name: 'MemoryAgent',
    emoji: '🧠',
    systemPrompt: 'You are a memory specialist. Help store, retrieve, and organize information. Be precise with facts and timestamps.',
    steps: ['Accessing memory...', 'Processing...', 'Storing...', 'Done!'],
    color: '#8b5cf6'
  }
}

// ━━━ INTENT CLASSIFIER (LOCAL — ZERO AI COST) ━━━━━━━━━━━━━━

const INTENT_RULES: { patterns: RegExp[]; type: AgentType; priority: number }[] = [
  // CODER — code generation/writing
  {
    priority: 10,
    type: 'coder',
    patterns: [
      /\b(write|create|generate|make|build)\s+(a\s+)?(function|component|api|route|class|module|service|hook|test|script|method|interface|type|enum|utility|helper|middleware|handler)\b/i,
      /\b(refactor|rewrite|optimize|clean up|fix)\s+(this|my|the|a\s+)?(code|function|file|component|module)\b/i,
      /\b(write|create|generate)\s+code\b/i,
      /\bcode\s+(for|that|this)\b/i,
      /\bimplement\s+(a\s+)?(new\s+)?(feature|logic|algorithm|pattern)\b/i,
      /\b(debug|fix)\s+(this|the|my)\s?(bug|error|issue|code)\b/i,
      /\bwrite\s+me\s+(a\s+)?(script|program|function|class)\b/i,
      /\bconvert\s+(this|the)?\s*(code|file|function)\s*(from|to)\b/i,
      /\badd\s+(error handling|typescript|types|validation|tests)\b/i
    ]
  },
  // RESEARCHER — deep research
  {
    priority: 9,
    type: 'researcher',
    patterns: [
      /\b(research|deep dive|investigate|look into|find out|explain in detail)\b/i,
      /\bwhat\s+is\s+(the\s+)?(best|latest|current|difference)\b/i,
      /\b(how\s+does|how\s+do|why\s+does|why\s+do)\b/i,
      /\btell\s+me\s+about\b/i,
      /\bcompare\s+(.*\s+vs\s+.*)\b/i,
      /\b(tutorial|guide|documentation|docs)\s+(for|on|about)\b/i,
      /\b(pros\s+and\s+cons|advantages|disadvantages)\b/i
    ]
  },
  // ANALYZER — code/data review
  {
    priority: 10,
    type: 'analyzer',
    patterns: [
      /\b(review|analyze|audit|check|inspect|examine)\s+(this|my|the|a\s+)?(code|file|project|app|data|log)\b/i,
      /\bfind\s+(bugs|issues|errors|problems|vulnerabilities)\b/i,
      /\b(rate|score|grade)\s+(this|my|the)\s?(code|project|app)\b/i,
      /\b(is\s+this\s+code|code\s+quality|performance\s+issues)\b/i,
      /\bexplain\s+(this|the)\s+code\b/i,
      /\bwhat\s+(does|is)\s+(this|the)\s+(code|function|class|error)\b/i
    ]
  },
  // BUILDER — project creation
  {
    priority: 10,
    type: 'builder',
    patterns: [
      /\b(build|create|make)\s+(me\s+)?(a\s+)?(login|signup|dashboard|landing|api|component|page|form|app|website|project|server|backend|frontend|portfolio)\b/i,
      /\b(build|create|make)\s+(a\s+)?(website|html|landing|page|app)\b/i,
      /\bscaffold\s+(a\s+)?(new\s+)?(project|app|component)\b/i,
      /\b(setup|set up|initialize)\s+(a\s+)?(new\s+)?(project|react|next|express|node)\b/i,
      /\b(create|new)\s+(react|next|vue|angular|express|node|python|fastapi)\s*(app|project)?\b/i
    ]
  },
  // EXECUTOR — system commands
  {
    priority: 8,
    type: 'executor',
    patterns: [
      /\b(run|execute|start|launch|open|kill|stop)\s+(the\s+)?(server|app|program|process|command|script)\b/i,
      /\binstall\s+(the\s+)?(package|dependency|module|npm|pip|brew)\b/i,
      /\b(update|upgrade)\s+(the\s+)?(system|packages|dependencies|npm)\b/i,
      /\b(git|npm|yarn|pnpm|docker|pip|python|node)\s+(init|install|start|run|build|push|pull|commit|add)\b/i,
      /\b(compile|build|bundle|deploy)\s+(the\s+)?(project|app|code)\b/i
    ]
  },
  // CREATIVE — image/design generation
  {
    priority: 9,
    type: 'creative',
    patterns: [
      /\b(generate|create|make|design|draw)\s+(a\s+)?(image|picture|photo|illustration|logo|icon|banner|thumbnail|poster)\b/i,
      /\b(build|design|create)\s+(a\s+)?(beautiful|stunning|modern)\s+(website|page|landing)\b/i,
      /\b(image|picture|photo)\s+(of|for|about)\b/i
    ]
  },
  // MEMORY — store/recall facts
  {
    priority: 9,
    type: 'memory',
    patterns: [
      /\b(remember|memorize|store|save)\s+(this|that|the\s+fact)?\b/i,
      /\b(recall|remember|what\s+do\s+you\s+know)\b/i,
      /\b(forget|delete)\s+(this|that|about)\b/i,
      /\b(what\s+did\s+i\s+tell|what\s+do\s+you\s+know\s+about\s+me)\b/i
    ]
  }
]

/**
 * Classify a user message into an agent type.
 * LOCAL classification — zero AI calls, instant, free forever.
 * Falls back to 'assistant' for anything that doesn't match.
 */
export function classifyIntent(message: string): AgentType {
  const msg = message.toLowerCase().trim()

  // Score each type
  const scores: Partial<Record<AgentType, number>> = {}

  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(msg)) {
        scores[rule.type] = (scores[rule.type] || 0) + rule.priority
      }
    }
  }

  // Find highest scoring type
  let bestType: AgentType = 'assistant'
  let bestScore = 0

  for (const [type, score] of Object.entries(scores)) {
    if ((score || 0) > bestScore) {
      bestScore = score || 0
      bestType = type as AgentType
    }
  }

  return bestType
}

// ━━━ ORCHESTRATOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class Orchestrator {
  private static agents: Map<string, SubAgent> = new Map()
  private static mainWindow: BrowserWindow | null = null
  private static resultCallbacks: AgentResultCallback[] = []
  private static maxConcurrentAgents = 5

  static init(window: BrowserWindow): void {
    this.mainWindow = window
    console.log('[Agents:Orchestrator] Universal Agent System initialized')
  }

  /**
   * Register a callback for when agents complete.
   * Used by Telegram bot to deliver results.
   */
  static onResult(callback: AgentResultCallback): void {
    this.resultCallbacks.push(callback)
  }

  /**
   * Spawn a new agent for ANY task.
   * Returns immediately — work happens in background.
   * Main thread stays FREE.
   */
  static async spawn(config: AgentSpawnConfig): Promise<SubAgent> {
    const def = AGENT_DEFS[config.type]
    const id = `agent_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`

    const agent: SubAgent = {
      id,
      type: config.type,
      name: `${def.name}-${id.split('_').pop()}`,
      emoji: def.emoji,
      task: config.task,
      status: 'spawning',
      progress: 0,
      progressLabel: 'Initializing...',
      result: null,
      resultFiles: [],
      error: null,
      spawnedAt: Date.now(),
      completedAt: null,
      durationMs: null,
      chatId: config.chatId,
      source: config.source || 'telegram'
    }

    this.agents.set(id, agent)
    this.broadcastUpdate()

    // Fire-and-forget — main thread returns immediately
    this.executeAsync(agent, config, def).catch(() => {})

    return agent
  }

  /**
   * Universal dispatch: classify intent + spawn agent.
   * ONE function to handle ANY user message.
   */
  static async dispatch(
    userMessage: string,
    options?: {
      chatId?: string
      source?: 'telegram' | 'dashboard' | 'voice'
      keys?: any
      filePath?: string
    }
  ): Promise<{ agent: SubAgent; spawnMessage: string }> {
    const intent = classifyIntent(userMessage)

    const agent = await this.spawn({
      type: intent,
      task: userMessage,
      keys: options?.keys,
      chatId: options?.chatId,
      source: options?.source || 'telegram',
      filePath: options?.filePath
    })

    const spawnMessage = this.getSpawnMessage(agent)
    return { agent, spawnMessage }
  }

  /**
   * Get all agents sorted by spawn time (newest first).
   */
  static getAll(): SubAgent[] {
    return Array.from(this.agents.values())
      .sort((a, b) => b.spawnedAt - a.spawnedAt)
  }

  /**
   * Get active (working) agents.
   */
  static getActive(): SubAgent[] {
    return this.getAll().filter(a => a.status === 'working' || a.status === 'spawning')
  }

  /**
   * Get completed agents.
   */
  static getCompleted(): SubAgent[] {
    return this.getAll().filter(a => a.status === 'done')
  }

  /**
   * Get failed agents.
   */
  static getFailed(): SubAgent[] {
    return this.getAll().filter(a => a.status === 'failed')
  }

  /**
   * Get a specific agent.
   */
  static get(id: string): SubAgent | undefined {
    return this.agents.get(id)
  }

  /**
   * Cancel an agent.
   */
  static cancel(id: string): boolean {
    const agent = this.agents.get(id)
    if (!agent) return false
    if (agent.status === 'done' || agent.status === 'failed' || agent.status === 'cancelled') return false

    agent.status = 'cancelled'
    agent.progressLabel = 'Cancelled'
    agent.completedAt = Date.now()
    agent.durationMs = agent.completedAt - agent.spawnedAt
    this.broadcastUpdate()
    return true
  }

  /**
   * Clear completed/failed/cancelled agents.
   */
  static clear(): void {
    for (const [id, agent] of this.agents) {
      if (agent.status !== 'working' && agent.status !== 'spawning') {
        this.agents.delete(id)
      }
    }
    this.broadcastUpdate()
  }

  /**
   * Get full status report.
   */
  static getStatusReport(): {
    total: number
    active: number
    completed: number
    failed: number
    byType: Record<string, number>
    recentResults: SubAgent[]
  } {
    const all = this.getAll()
    const byType: Record<string, number> = {}
    for (const a of all) {
      byType[a.type] = (byType[a.type] || 0) + 1
    }

    return {
      total: all.length,
      active: all.filter(a => a.status === 'working' || a.status === 'spawning').length,
      completed: all.filter(a => a.status === 'done').length,
      failed: all.filter(a => a.status === 'failed').length,
      byType,
      recentResults: all.filter(a => a.status === 'done').slice(0, 5)
    }
  }

  /**
   * Get a spawn announcement message — personality-aware.
   */
  static getSpawnMessage(agent: SubAgent): string {
    const cfg = PersonalityEngine.getConfig()
    const name = cfg.greetingName

    const messages: Record<AgentType, string[]> = {
      assistant: [
        `💬 ${agent.name} on it, ${name}! Processing your request. I'm free — tell me more!`,
        `${agent.name} handling that for you, ${name}. What else?`
      ],
      coder: [
        `🧑‍💻 ${agent.name} coding that now, ${name}! I'm still here for anything else.`,
        `${agent.name} deployed for code, ${name}. Writing in background. Keep going!`
      ],
      researcher: [
        `🔍 ${agent.name} researching that, ${name}! I'm free for other questions.`,
        `Research agent deployed! ${agent.name} will report back. What else, ${name}?`
      ],
      analyzer: [
        `📊 ${agent.name} analyzing that, ${name}. Results coming soon. I'm free!`,
        `Analysis agent on it, ${name}! ${agent.name} will find the issues.`
      ],
      builder: [
        `🛠️ ${agent.name} building that, ${name}! I'm still available for more tasks.`,
        `Builder deployed! ${agent.name} is constructing it. Keep going, ${name}!`
      ],
      executor: [
        `⚡ ${agent.name} executing that command, ${name}! I'm free for next one.`,
        `Executor agent running that, ${name}. More commands?`
      ],
      creative: [
        `🎨 ${agent.name} creating that, ${name}! Something beautiful coming. I'm free!`,
        `Creative agent on it, ${name}! ${agent.name} designing now.`
      ],
      memory: [
        `🧠 ${agent.name} handling memory, ${name}! I'm free for more.`,
        `Memory agent processing, ${name}. What else?`
      ]
    }

    const options = messages[agent.type] || messages.assistant
    return options[Math.floor(Math.random() * options.length)]
  }

  /**
   * Get a completion announcement message.
   */
  static getCompletionMessage(agent: SubAgent): string {
    const cfg = PersonalityEngine.getConfig()
    const name = cfg.greetingName

    if (agent.status === 'failed') {
      return `${agent.emoji} ${agent.name} hit an issue: ${agent.error}. Want me to retry, ${name}?`
    }

    if (agent.status === 'cancelled') {
      return `${agent.emoji} ${agent.name} was cancelled.`
    }

    const dur = agent.durationMs ? `${(agent.durationMs / 1000).toFixed(1)}s` : ''

    // Truncate result for notification
    const resultPreview = agent.result
      ? agent.result.substring(0, 200).replace(/<[^>]*>/g, '')
      : 'Task complete.'

    return `${agent.emoji} ${agent.name} finished in ${dur}, ${name}!\n\n${resultPreview}${agent.result && agent.result.length > 200 ? '...' : ''}${agent.resultFiles.length ? `\n\n📁 Files: ${agent.resultFiles.join(', ')}` : ''}`
  }

  // ━━━ INTERNAL: AGENT EXECUTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private static async executeAsync(
    agent: SubAgent,
    config: AgentSpawnConfig,
    def: typeof AGENT_DEFS['assistant']
  ): Promise<void> {
    try {
      // Step 1: Spawning → Working
      agent.status = 'working'
      agent.progress = 5
      agent.progressLabel = def.steps[0]
      this.broadcastUpdate()

      // Step 2: Build AI context
      const brainCtx = BrainRouter.getContext(config.task)
      const soulPrompt = PersonalityEngine.buildSystemPrompt()
      const emotionMod = EmotionEngine.getSystemPromptModifier()

      const fullSystemPrompt = `${soulPrompt}\n\n${def.systemPrompt}\n\n${brainCtx.contextString}\n${emotionMod}`

      agent.progress = 15
      agent.progressLabel = def.steps[1] || 'Processing...'
      this.broadcastUpdate()

      // Observe user behavior
      try { NoticeEngine.observe(config.task, config.source || 'telegram') } catch {}

      // Step 3: Call AI model (non-blocking — this is the heavy work)
      const keys = config.keys || this.getKeys()
      let switchNotification = ''

      const result = await ModelRouter.chat(config.task, {
        keys,
        systemPrompt: fullSystemPrompt,
        maxTokens: config.type === 'assistant' ? 2048 : 4096,
        onSwitch: (from: string, to: string) => {
          switchNotification = `\n\n<i>⚠️ ${from} unavailable, using ${to}.</i>`
        }
      })

      agent.progress = 60
      agent.progressLabel = def.steps[2] || 'Reviewing...'
      this.broadcastUpdate()

      if (!result.text || result.text.includes('All AI models are currently unavailable')) {
        throw new Error(result.text || 'No response from AI models')
      }

      // Step 4: Process result
      let output = result.text

      // Add model switch notification
      if (result.switched && switchNotification) {
        output += switchNotification
      }

      // Builder/Coder: auto-save to file if path provided
      if ((config.type === 'coder' || config.type === 'builder') && config.filePath) {
        const cleanCode = output.replace(/^```\w*\n?/, '').replace(/```$/, '').trim()
        fs.writeFileSync(config.filePath, cleanCode, 'utf-8')
        agent.resultFiles.push(config.filePath)
        output = `Saved to: ${config.filePath}\n\n${output.substring(0, 500)}`
      } else if (config.type === 'builder' && !config.filePath) {
        // Auto-save builder output to Desktop
        const cleanCode = output.replace(/^```\w*\n?/, '').replace(/```$/, '').trim()
        const isHtml = cleanCode.includes('<html') || cleanCode.includes('<!DOCTYPE')
        const fileName = `iris_build_${Date.now()}.${isHtml ? 'html' : 'txt'}`
        const savePath = path.join(require('os').homedir(), 'Desktop', fileName)
        fs.writeFileSync(savePath, cleanCode, 'utf-8')
        agent.resultFiles.push(savePath)
        output = `Saved to: ${savePath}\n\nPreview:\n${output.substring(0, 300)}...`
      }

      agent.progress = 85
      agent.progressLabel = def.steps[3] || 'Finalizing...'
      this.broadcastUpdate()

      // Step 5: Finalize
      agent.result = output.substring(0, 4000)
      agent.progress = 100
      agent.progressLabel = def.steps[def.steps.length - 1]
      agent.status = 'done'
      agent.completedAt = Date.now()
      agent.durationMs = agent.completedAt - agent.spawnedAt

      // Record in brain
      try {
        EpisodicMemory.record({
          type: 'creation',
          title: `${agent.name} completed: ${agent.task.substring(0, 60)}`,
          detail: `Agent ${agent.name} (${agent.type}) done in ${agent.durationMs}ms. ${agent.result?.substring(0, 200)}`,
          context: { source: 'auto', tags: ['sub-agent', agent.type, 'universal'] },
          outcome: 'success',
          insights: [`${agent.type} agent handled "${agent.task.substring(0, 30)}"`]
        })
      } catch {}

      // ── Sync to Shared Consciousness (Telegram ↔ Desktop) ──
      try {
        SharedConsciousness.broadcastFromAgent('agent', {
          agentId: agent.id, type: agent.type,
          task: agent.task.substring(0, 60), duration: agent.durationMs
        }, `🤖 ${agent.name} completed: ${agent.task.substring(0, 40)}`)
      } catch {}

      this.broadcastUpdate()

      // Deliver result
      const completionMsg = this.getCompletionMessage(agent)
      this.deliverResult(agent, completionMsg)

    } catch (err: any) {
      agent.status = 'failed'
      agent.error = err.message?.substring(0, 200) || 'Unknown error'
      agent.completedAt = Date.now()
      agent.durationMs = agent.completedAt - agent.spawnedAt

      try {
        EpisodicMemory.record({
          type: 'error',
          title: `${agent.name} failed: ${agent.task.substring(0, 60)}`,
          detail: agent.error,
          context: { source: 'auto', tags: ['sub-agent', 'error', agent.type] },
          outcome: 'failure'
        })
      } catch {}

      this.broadcastUpdate()

      const completionMsg = this.getCompletionMessage(agent)
      this.deliverResult(agent, completionMsg)
    }
  }

  /**
   * Deliver result to all listeners:
   * - Dashboard (via IPC)
   * - Telegram (via callback)
   * - Any registered callbacks
   */
  private static deliverResult(agent: SubAgent, message: string): void {
    // Dashboard
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('agent:completed', { agent, message })
    }

    // Telegram + custom callbacks
    for (const cb of this.resultCallbacks) {
      try { cb(agent, message) } catch {}
    }
  }

  private static getKeys(): any {
    try {
      const Store = require('electron-store')
      const StoreClass = (Store as any).default || Store
      const store = new StoreClass()
      return {
        geminiKey: store.get('geminiKey', '') as string,
        groqKey: store.get('groqKey', '') as string,
        hfKey: store.get('hfKey', '') as string,
        ollamaUrl: 'http://localhost:11434'
      }
    } catch {
      return { geminiKey: '', groqKey: '', hfKey: '', ollamaUrl: 'http://localhost:11434' }
    }
  }

  private static broadcastUpdate(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('agents:update', this.getAll())
    }
  }
}

export default Orchestrator

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function registerOrchestrator(): void {
  ipcMain.handle('agents:spawn', (_, config: AgentSpawnConfig) => {
    return Orchestrator.spawn(config)
  })

  ipcMain.handle('agents:dispatch', (_, message: string, options?: any) => {
    return Orchestrator.dispatch(message, options)
  })

  ipcMain.handle('agents:get-all', () => {
    return Orchestrator.getAll()
  })

  ipcMain.handle('agents:get-active', () => {
    return Orchestrator.getActive()
  })

  ipcMain.handle('agents:get-completed', () => {
    return Orchestrator.getCompleted()
  })

  ipcMain.handle('agents:get-failed', () => {
    return Orchestrator.getFailed()
  })

  ipcMain.handle('agents:get', (_, id: string) => {
    return Orchestrator.get(id)
  })

  ipcMain.handle('agents:cancel', (_, id: string) => {
    return Orchestrator.cancel(id)
  })

  ipcMain.handle('agents:clear', () => {
    Orchestrator.clear()
    return { success: true }
  })

  ipcMain.handle('agents:status-report', () => {
    return Orchestrator.getStatusReport()
  })

  ipcMain.handle('agents:classify', (_, message: string) => {
    return classifyIntent(message)
  })

  ipcMain.handle('agents:spawn-message', (_, agent: SubAgent) => {
    return Orchestrator.getSpawnMessage(agent)
  })

  console.log('[Agents:Orchestrator] Universal Agent System registered ✅')
}
