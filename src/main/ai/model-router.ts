/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — FALLBACK MODEL ROUTER  (4GB RAM Optimized)      ║
 * ║  "Smart routing. Even 4GB machines run IRIS like a pro."   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * OPTIMIZED FOR: 4GB RAM + 150GB storage
 *
 * Model chain (priority order):
 *   1. Groq (FREE cloud, 100ms, no RAM) — PRIMARY
 *   2. Gemini Flash (FREE cloud, no RAM) — FALLBACK
 *   3. Ollama Qwen2.5:1.5b (LOCAL, ~1.2GB RAM) — OFFLINE HERO
 *   4. HuggingFace (FREE cloud, no RAM) — LAST RESORT
 *
 * Local models (Ollama) that fit 4GB RAM:
 *   ┌──────────────────────┬──────────┬──────────┬──────────────┐
 *   │ Model                │ RAM Used │ Download │ Best For     │
 *   ├──────────────────────┼──────────┼──────────┼──────────────┤
 *   │ qwen2.5:1.5b         │ ~1.1 GB  │  0.9 GB  │ FAST chat    │
 *   │ qwen2.5:3b           │ ~2.2 GB  │  1.9 GB  │ SMART chat   │
 *   │ llama3.2:1b          │ ~0.8 GB  │  1.2 GB  │ SPEED demon  │
 *   │ llama3.2:3b          │ ~2.0 GB  │  2.0 GB  │ Good balance │
 *   │ phi3:mini             │ ~2.2 GB  │  2.4 GB  │ Reasoning    │
 *   │ gemma2:2b            │ ~1.5 GB  │  1.6 GB  │ Google smart │
 *   │ tinyllama:1.1b       │ ~0.7 GB  │  0.6 GB  │ ULTRA light  │
 *   │ stable-code:3b       │ ~2.0 GB  │  1.6 GB  │ Code gen     │
 *   │ codellama:7b-q4      │ ~4.0 GB  │  3.8 GB  │ ⚠️ TIGHT FIT │
 *   └──────────────────────┴──────────┴──────────┴──────────────┘
 *
 * RECOMMENDED SETUP (4GB RAM):
 *   ollama pull qwen2.5:1.5b     ← Daily driver (chat, tasks)
 *   ollama pull llama3.2:1b      ← Ultra-fast fallback
 *   ollama pull stable-code:3b   ← Code generation
 *
 * RECOMMENDED SETUP (if you upgrade to 8GB+):
 *   ollama pull qwen2.5:3b       ← Smarter daily
 *   ollama pull codellama:7b     ← Full code power
 */

import { GoogleGenAI } from '@google/genai'
import Groq from 'groq-sdk'
import { InferenceClient } from '@huggingface/inference'
import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ModelResponse {
  text: string
  model: string
  provider: string
  latencyMs: number
  switched: boolean
  tokensUsed?: number
}

export interface ModelKeys {
  geminiKey?: string
  groqKey?: string
  hfKey?: string
  ollamaUrl?: string
  ollamaModel?: string // Allow overriding default model
}

export interface ModelStatus {
  name: string
  provider: string
  available: boolean
  latencyMs: number | null
  errorRate: number
  lastError: string | null
  lastCheck: number
  requestCount: number
  failCount: number
}

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatOptions {
  keys: ModelKeys
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
  systemPrompt?: string
  messages?: ChatMessage[]
  onSwitch?: (from: string, to: string) => void
  taskType?: 'chat' | 'code' | 'fast' // Route to best model for task
}

// ━━━ MODEL DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ModelDef {
  name: string
  provider: string
  model: string
  maxFreeRPM: number
  tier: number
  ramMB: number // RAM needed (0 = cloud)
  diskGB: number // Disk needed (0 = cloud)
  bestFor: string // What this model is best at
  localModel?: string // Ollama model name
}

/**
 * PRIMARY CHAIN — Cloud first (zero RAM), local as offline backup
 *
 * Groq is PRIMARY because:
 *   - FREE, 30 RPM, ~100ms response
 *   - Zero RAM usage (cloud)
 *   - Survives 7h sessions
 *   - llama-3.1-8b-instant is very smart
 *
 * Ollama is OFFLINE HERO because:
 *   - Works WITHOUT internet
 *   - qwen2.5:1.5b fits in 1.1GB RAM
 *   - 150GB disk = store MANY models
 */
const MODEL_CHAIN: ModelDef[] = [
  {
    name: 'Groq Llama',
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    maxFreeRPM: 30,
    tier: 0,
    ramMB: 0, // Cloud — zero RAM
    diskGB: 0,
    bestFor: 'chat, code, research — PRIMARY'
  },
  {
    name: 'Gemini Flash',
    provider: 'google',
    model: 'gemini-1.5-flash',
    maxFreeRPM: 15,
    tier: 1,
    ramMB: 0, // Cloud — zero RAM
    diskGB: 0,
    bestFor: 'long context, vision, analysis'
  },
  {
    name: 'Ollama Local',
    provider: 'ollama',
    model: 'qwen3:4b', // ← USER PRIMARY — smart + fits 4GB
    maxFreeRPM: 999,
    tier: 2,
    ramMB: 2600, // ~2.6 GB
    diskGB: 2.5,
    bestFor: 'OFFLINE hero, primary local model',
    localModel: 'qwen3:4b'
  },
  {
    name: 'HuggingFace',
    provider: 'huggingface',
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    maxFreeRPM: 10,
    tier: 3,
    ramMB: 0, // Cloud — zero RAM
    diskGB: 0,
    bestFor: 'last resort cloud fallback'
  }
]

/**
 * CODE-SPECIFIC MODELS — used when taskType === 'code'
 * These are better at code generation than general chat models.
 */
const CODE_MODELS: Record<string, ModelDef> = {
  ollama: {
    name: 'Ollama Code',
    provider: 'ollama',
    model: 'stable-code:3b', // ← Best code model for 4GB
    maxFreeRPM: 999,
    tier: 0,
    ramMB: 2000,
    diskGB: 1.6,
    bestFor: 'code generation, refactoring',
    localModel: 'stable-code:3b'
  },
  groq: {
    name: 'Groq Coder',
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    maxFreeRPM: 30,
    tier: 1,
    ramMB: 0,
    diskGB: 0,
    bestFor: 'cloud code gen'
  }
}

/**
 * ULTRA-FAST MODELS — used when taskType === 'fast'
 * Tiny models that respond in milliseconds.
 */
const FAST_MODEL: ModelDef = {
  name: 'Ollama Fast',
  provider: 'ollama',
  model: 'llama3.2:1b', // ← FASTEST, 0.8GB RAM
  maxFreeRPM: 999,
  tier: 0,
  ramMB: 800,
  diskGB: 1.2,
  bestFor: 'ULTRA fast responses, classifications',
  localModel: 'llama3.2:1b'
}

// ━━━ ALL RECOMMENDED MODELS FOR 4GB RAM ━━━━━━━━━━━━━━━━━━━━

export const RECOMMENDED_MODELS = [
  // ── PRIMARY (user's chosen model) ──
  {
    name: 'qwen3:4b',
    ram: '2.6 GB',
    disk: '2.5 GB',
    cmd: 'ollama pull qwen3:4b',
    why: 'PRIMARY — smart, fast, great reasoning'
  },
  // ── FALLBACKS ──
  {
    name: 'qwen2.5:1.5b',
    ram: '1.1 GB',
    disk: '0.9 GB',
    cmd: 'ollama pull qwen2.5:1.5b',
    why: 'Lightweight fallback'
  },
  {
    name: 'llama3.2:1b',
    ram: '0.8 GB',
    disk: '1.2 GB',
    cmd: 'ollama pull llama3.2:1b',
    why: 'Ultra-fast fallback'
  },

  // ── RECOMMENDED (total +3.2 GB disk, ~2 GB RAM) ──
  {
    name: 'stable-code:3b',
    ram: '2.0 GB',
    disk: '1.6 GB',
    cmd: 'ollama pull stable-code:3b',
    why: 'Best code model for 4GB'
  },
  {
    name: 'gemma2:2b',
    ram: '1.5 GB',
    disk: '1.6 GB',
    cmd: 'ollama pull gemma2:2b',
    why: 'Google quality, small size'
  },

  // ── POWER USER (if you free up RAM) ──
  {
    name: 'qwen2.5:3b',
    ram: '2.2 GB',
    disk: '1.9 GB',
    cmd: 'ollama pull qwen2.5:3b',
    why: 'Much smarter, fits 4GB'
  },
  {
    name: 'phi3:mini',
    ram: '2.2 GB',
    disk: '2.4 GB',
    cmd: 'ollama pull phi3:mini',
    why: 'Best reasoning in small size'
  },
  {
    name: 'tinyllama:1.1b',
    ram: '0.7 GB',
    disk: '0.6 GB',
    cmd: 'ollama pull tinyllama:1.1b',
    why: 'Absolute minimum model'
  },

  // ── BONUS (150GB = space for ALL of these!) ──
  {
    name: 'llama3.2:3b',
    ram: '2.0 GB',
    disk: '2.0 GB',
    cmd: 'ollama pull llama3.2:3b',
    why: 'Good balance of speed + smarts'
  },
  {
    name: 'mistral:7b',
    ram: '4.0 GB',
    disk: '4.1 GB',
    cmd: 'ollama pull mistral:7b',
    why: '⚠️ TIGHT FIT — close other apps'
  }
]

// ━━━ HEALTH STATE (persisted) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const healthState: Map<string, ModelStatus> = new Map()

function getStatePath(): string {
  return path.join(app.getPath('userData'), 'model-health.json')
}

function loadHealthState(): void {
  try {
    const fp = getStatePath()
    if (fs.existsSync(fp)) {
      const data = JSON.parse(fs.readFileSync(fp, 'utf-8'))
      for (const [k, v] of Object.entries(data)) {
        healthState.set(k, v as ModelStatus)
      }
    }
  } catch {}
  for (const def of MODEL_CHAIN) {
    if (!healthState.has(def.name)) {
      healthState.set(def.name, {
        name: def.name,
        provider: def.provider,
        available: true,
        latencyMs: null,
        errorRate: 0,
        lastError: null,
        lastCheck: 0,
        requestCount: 0,
        failCount: 0
      })
    }
  }
}

function saveHealthState(): void {
  try {
    const data: Record<string, ModelStatus> = {}
    for (const [k, v] of healthState) data[k] = v
    fs.writeFileSync(getStatePath(), JSON.stringify(data, null, 2))
  } catch {}
}

function updateModelHealth(
  name: string,
  success: boolean,
  latencyMs: number,
  error?: string
): void {
  const status = healthState.get(name)
  if (!status) return
  status.requestCount++
  status.lastCheck = Date.now()
  if (success) {
    status.available = true
    status.latencyMs = latencyMs
    status.failCount = Math.max(0, status.failCount - 1)
    status.lastError = null
    status.errorRate = Math.max(0, status.errorRate - 0.05)
  } else {
    status.failCount++
    status.lastError = error || 'Unknown error'
    status.errorRate = Math.min(1, status.errorRate + 0.15)
    if (status.failCount >= 3) status.available = false
  }
  saveHealthState()
}

// ━━━ INDIVIDUAL MODEL CALLERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function callGemini(
  prompt: string,
  keys: ModelKeys,
  opts: ChatOptions
): Promise<{ text: string; tokens?: number }> {
  if (!keys.geminiKey) throw new Error('No Gemini key')
  const ai = new GoogleGenAI({ apiKey: keys.geminiKey })

  const parts: any[] = []
  if (opts.systemPrompt) parts.push({ text: opts.systemPrompt })

  if (opts.messages && opts.messages.length > 0) {
    const contents = opts.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
    const response = await ai.models.generateContent({
      model: MODEL_CHAIN[1].model,
      contents: contents as any,
      config: {
        maxOutputTokens: opts.maxTokens || 2048,
        temperature: opts.temperature ?? 0.7,
        responseMimeType: opts.jsonMode ? 'application/json' : undefined
      }
    })
    return { text: response.text || '', tokens: response.usageMetadata?.totalTokenCount }
  }

  const fullPrompt = opts.systemPrompt ? `${opts.systemPrompt}\n\n${prompt}` : prompt
  const response = await ai.models.generateContent({
    model: MODEL_CHAIN[1].model,
    contents: fullPrompt,
    config: {
      maxOutputTokens: opts.maxTokens || 2048,
      temperature: opts.temperature ?? 0.7,
      responseMimeType: opts.jsonMode ? 'application/json' : undefined
    }
  })
  return { text: response.text || '', tokens: response.usageMetadata?.totalTokenCount }
}

async function callGroq(
  prompt: string,
  keys: ModelKeys,
  opts: ChatOptions
): Promise<{ text: string; tokens?: number }> {
  if (!keys.groqKey) throw new Error('No Groq key')
  const groq = new Groq({ apiKey: keys.groqKey })

  const messages: any[] = []
  if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt })
  if (opts.messages && opts.messages.length > 0) {
    messages.push(...opts.messages)
  } else {
    messages.push({ role: 'user', content: prompt })
  }

  const completion = await groq.chat.completions.create({
    model: MODEL_CHAIN[0].model,
    messages,
    max_tokens: opts.maxTokens || 2048,
    temperature: opts.temperature ?? 0.7,
    response_format: opts.jsonMode ? { type: 'json_object' } : undefined
  })

  const choice = completion.choices[0]
  const text = opts.jsonMode
    ? JSON.parse(choice?.message?.content || '{}')
    : choice?.message?.content || ''

  return {
    text: typeof text === 'object' ? JSON.stringify(text) : text,
    tokens: completion.usage?.total_tokens
  }
}

async function callHuggingFace(
  prompt: string,
  keys: ModelKeys,
  opts: ChatOptions
): Promise<{ text: string; tokens?: number }> {
  if (!keys.hfKey) throw new Error('No HuggingFace key')
  const client = new InferenceClient(keys.hfKey)

  const messages: any[] = []
  if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt })
  if (opts.messages && opts.messages.length > 0) {
    messages.push(...opts.messages)
  } else {
    messages.push({ role: 'user', content: prompt })
  }

  const response = await client.chatCompletion({
    model: MODEL_CHAIN[3].model,
    messages,
    max_tokens: opts.maxTokens || 2048,
    temperature: opts.temperature ?? 0.7
  })

  return {
    text: response.choices?.[0]?.message?.content || '',
    tokens: response.usage?.total_tokens
  }
}

async function callOllama(
  prompt: string,
  keys: ModelKeys,
  opts: ChatOptions,
  modelName?: string
): Promise<{ text: string; tokens?: number }> {
  const url = keys.ollamaUrl || 'http://localhost:11434'
  const model = modelName || keys.ollamaModel || MODEL_CHAIN[2].model
  const messages: any[] = []
  if (opts.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt })
  if (opts.messages && opts.messages.length > 0) {
    messages.push(...opts.messages)
  } else {
    messages.push({ role: 'user', content: prompt })
  }

  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature: opts.temperature ?? 0.7, num_predict: opts.maxTokens || 2048 }
    }),
    signal: AbortSignal.timeout(60000) // 60s for local models (slow on 4GB)
  })

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  return { text: data.message?.content || '', tokens: data.eval_count }
}

// ━━━ ROUTER CLASS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class ModelRouter {
  private static initialized = false

  static init(): void {
    if (this.initialized) return
    this.initialized = true
    loadHealthState()
    console.log(
      '[ModelRouter] Chain:',
      MODEL_CHAIN.map((m) => `${m.name}(${m.ramMB}MB)`).join(' → ')
    )

    setInterval(() => {
      this.runHealthChecks().catch(() => {})
    }, 60_000)
  }

  /**
   * Main chat method — smart routing through fallback chain.
   * Automatically picks the best model for the task type.
   */
  static async chat(prompt: string, opts: ChatOptions): Promise<ModelResponse> {
    this.init()

    // ── Task-aware routing ──
    let chain: ModelDef[]
    if (opts.taskType === 'code') {
      // For code tasks: try code model first, then general chain
      chain = [
        CODE_MODELS.ollama,
        CODE_MODELS.groq,
        ...MODEL_CHAIN.filter((m) => m.provider !== 'groq')
      ]
    } else if (opts.taskType === 'fast') {
      // For fast tasks: tiny model first
      chain = [FAST_MODEL, ...MODEL_CHAIN]
    } else {
      chain = MODEL_CHAIN
    }

    const callers = chain.map((def) => ({
      def,
      fn: () => {
        switch (def.provider) {
          case 'google':
            return callGemini(prompt, opts.keys, opts)
          case 'groq':
            return callGroq(prompt, opts.keys, opts)
          case 'huggingface':
            return callHuggingFace(prompt, opts.keys, opts)
          case 'ollama':
            return callOllama(prompt, opts.keys, opts, def.model)
          default:
            throw new Error(`Unknown provider: ${def.provider}`)
        }
      }
    }))

    let switched = false
    let lastError = ''

    for (const { def, fn } of callers) {
      const status = healthState.get(def.name)

      if (status && !status.available && status.failCount >= 5) {
        console.log(`[ModelRouter] Skipping ${def.name} (dead, ${status.failCount} fails)`)
        continue
      }

      const start = Date.now()
      try {
        const result = await fn()
        const latency = Date.now() - start
        updateModelHealth(def.name, true, latency)
        console.log(`[ModelRouter] ✓ ${def.name}: ${latency}ms`)

        return {
          text: result.text,
          model: def.model,
          provider: def.provider,
          latencyMs: latency,
          switched,
          tokensUsed: result.tokens
        }
      } catch (err: any) {
        const latency = Date.now() - start
        lastError = err.message || String(err)
        updateModelHealth(def.name, false, latency, lastError)
        switched = true
        console.warn(`[ModelRouter] ✗ ${def.name} failed: ${lastError}`)

        if (opts.onSwitch) {
          const nextIdx = callers.findIndex((c) => c.def.name === def.name) + 1
          opts.onSwitch(def.name, callers[nextIdx]?.def?.name || 'none')
        }
        continue
      }
    }

    return {
      text: `⚠️ All AI models unavailable. Last error: ${lastError}. Check API keys / internet / Ollama status.`,
      model: 'none',
      provider: 'error',
      latencyMs: 0,
      switched: true
    }
  }

  static async callModel(
    provider: 'google' | 'groq' | 'huggingface' | 'ollama',
    prompt: string,
    opts: ChatOptions
  ): Promise<ModelResponse> {
    this.init()
    const start = Date.now()
    const def = MODEL_CHAIN.find((m) => m.provider === provider) || MODEL_CHAIN[0]

    let result: { text: string; tokens?: number }
    switch (provider) {
      case 'google':
        result = await callGemini(prompt, opts.keys, opts)
        break
      case 'groq':
        result = await callGroq(prompt, opts.keys, opts)
        break
      case 'huggingface':
        result = await callHuggingFace(prompt, opts.keys, opts)
        break
      case 'ollama':
        result = await callOllama(prompt, opts.keys, opts)
        break
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }

    const latency = Date.now() - start
    updateModelHealth(def.name, true, latency)

    return {
      text: result.text,
      model: def.model,
      provider: def.provider,
      latencyMs: latency,
      switched: false,
      tokensUsed: result.tokens
    }
  }

  static getStatus(): ModelStatus[] {
    this.init()
    return MODEL_CHAIN.map((def) => healthState.get(def.name)!).filter(Boolean)
  }

  static resetModel(name: string): void {
    const status = healthState.get(name)
    if (status) {
      status.available = true
      status.failCount = 0
      status.errorRate = 0
      status.lastError = null
      saveHealthState()
    }
  }

  static resetAll(): void {
    for (const def of MODEL_CHAIN) this.resetModel(def.name)
  }

  static getChain(): ModelDef[] {
    return [...MODEL_CHAIN]
  }

  static getRecommendedModels(): typeof RECOMMENDED_MODELS {
    return RECOMMENDED_MODELS
  }

  static getActiveModel(): string {
    this.init()
    for (const def of MODEL_CHAIN) {
      const status = healthState.get(def.name)
      if (status?.available !== false) return def.name
    }
    return MODEL_CHAIN[0].name
  }

  static async runHealthChecks(): Promise<void> {
    this.init()
    console.log('[ModelRouter] Running health checks...')
    const keys = this.getKeysFromStore()
    const checks = MODEL_CHAIN.map(async (def) => {
      const start = Date.now()
      try {
        switch (def.provider) {
          case 'google':
            if (!keys.geminiKey) throw new Error('No key')
            await callGemini('health check', keys, { keys, maxTokens: 5 })
            break
          case 'groq':
            if (!keys.groqKey) throw new Error('No key')
            await callGroq('health check', keys, { keys, maxTokens: 5 })
            break
          case 'huggingface':
            if (!keys.hfKey) throw new Error('No key')
            await callHuggingFace('health check', keys, { keys, maxTokens: 5 })
            break
          case 'ollama':
            await callOllama('health check', keys, { keys, maxTokens: 5 })
            break
        }
        updateModelHealth(def.name, true, Date.now() - start)
        console.log(`[ModelRouter] Health: ${def.name} OK (${Date.now() - start}ms)`)
      } catch (err: any) {
        updateModelHealth(def.name, false, Date.now() - start, err.message)
        console.warn(`[ModelRouter] Health: ${def.name} FAIL: ${err.message}`)
      }
    })
    await Promise.allSettled(checks)
  }

  private static getKeysFromStore(): ModelKeys {
    try {
      const Store = require('electron-store')
      const StoreClass = (Store as any).default || Store
      const store = new StoreClass()
      return {
        geminiKey: store.get('iris_custom_api_key', '') as string,
        groqKey: store.get('iris_groq_api_key', '') as string,
        hfKey: store.get('iris_hf_api_key', '') as string,
        ollamaUrl: 'http://localhost:11434'
      }
    } catch {
      return { geminiKey: '', groqKey: '', hfKey: '', ollamaUrl: 'http://localhost:11434' }
    }
  }

  static async runHealthChecksWithKeys(keys: ModelKeys): Promise<ModelStatus[]> {
    this.init()
    const checks = MODEL_CHAIN.map(async (def) => {
      const start = Date.now()
      try {
        switch (def.provider) {
          case 'google':
            if (!keys.geminiKey) throw new Error('No key')
            await callGemini('ping', keys, { keys, maxTokens: 5 })
            break
          case 'groq':
            if (!keys.groqKey) throw new Error('No key')
            await callGroq('ping', keys, { keys, maxTokens: 5 })
            break
          case 'huggingface':
            if (!keys.hfKey) throw new Error('No key')
            await callHuggingFace('ping', keys, { keys, maxTokens: 5 })
            break
          case 'ollama':
            await callOllama('ping', keys, { keys, maxTokens: 5 })
            break
        }
        updateModelHealth(def.name, true, Date.now() - start)
      } catch (err: any) {
        updateModelHealth(def.name, false, Date.now() - start, err.message)
      }
      return healthState.get(def.name)!
    })
    return Promise.all(checks)
  }
}

// ━━━ IPC REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerModelRouter(): void {
  ModelRouter.init()

  ipcMain.handle('model-router:status', () => ModelRouter.getStatus())
  ipcMain.handle('model-router:chain', () => ModelRouter.getChain())
  ipcMain.handle('model-router:active', () => ModelRouter.getActiveModel())
  ipcMain.handle('model-router:reset', (_, name) => {
    ModelRouter.resetModel(name)
    return { success: true }
  })
  ipcMain.handle('model-router:reset-all', () => {
    ModelRouter.resetAll()
    return { success: true }
  })
  ipcMain.handle('model-router:health-check', async (_, keys) =>
    ModelRouter.runHealthChecksWithKeys(keys)
  )
  ipcMain.handle('model-router:chat', async (_, prompt, keys, opts?) =>
    ModelRouter.chat(prompt, { keys, ...opts })
  )
  ipcMain.handle('model-router:recommended', () => ModelRouter.getRecommendedModels())

  console.log('[ModelRouter] IPC registered (4GB RAM optimized)')
}
