/**
 * IRIS AI - COMMAND PALETTE
 * "Ctrl+Space. Everything. Instant."
 *
 * Spotlight/VS Code-style command palette:
 *   - Search all IRIS commands
 *   - Quick actions (open apps, files, settings)
 *   - Recent files, running agents
 *   - Calculator, timer, notes
 *   - Navigation (switch tabs)
 *   - Custom user commands
 */
import { ipcMain, app, globalShortcut, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface PaletteCommand {
  id: string
  label: string
  category: 'action' | 'navigation' | 'file' | 'setting' | 'tool' | 'ai' | 'system'
  icon: string
  shortcut?: string
  description: string
  action: string          // IPC channel to invoke
  args?: any              // Args for the IPC call
  keywords: string[]      // Search keywords
}

// ━━━ COMMAND REGISTRY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const COMMANDS: PaletteCommand[] = [
  // Navigation
  { id: 'nav.dashboard', label: 'Go to Dashboard', category: 'navigation', icon: '\u{1F3E0}', description: 'Switch to Dashboard view', action: 'palette:navigate', args: 'DASHBOARD', keywords: ['home', 'dashboard', 'main'] },
  { id: 'nav.notes', label: 'Go to Notes', category: 'navigation', icon: '\u{1F4C2}', description: 'Switch to Notes view', action: 'palette:navigate', args: 'NOTES', keywords: ['notes', 'documents', 'write'] },
  { id: 'nav.gallery', label: 'Go to Gallery', category: 'navigation', icon: '\u{1F5BC}', description: 'Switch to Gallery view', action: 'palette:navigate', args: 'GALLERY', keywords: ['gallery', 'images', 'photos'] },
  { id: 'nav.settings', label: 'Go to Settings', category: 'navigation', icon: '\u2699\uFE0F', description: 'Open Command Center', action: 'palette:navigate', args: 'SETTINGS', keywords: ['settings', 'config', 'keys', 'setup'] },
  { id: 'nav.macros', label: 'Go to Workflows', category: 'navigation', icon: '\u{1F9E0}', description: 'Switch to Workflow Editor', action: 'palette:navigate', args: 'Macros', keywords: ['macro', 'workflow', 'automate'] },
  { id: 'nav.phone', label: 'Go to Phone', category: 'navigation', icon: '\u{1F4F1}', description: 'Switch to Phone view', action: 'palette:navigate', args: 'PHONE', keywords: ['phone', 'mobile', 'adb'] },

  // Actions
  { id: 'act.toggle-mic', label: 'Toggle Microphone', category: 'action', icon: '\u{1F3A4}', description: 'Mute/unmute mic', action: 'palette:toggle-mic', keywords: ['mic', 'mute', 'microphone', 'voice'] },
  { id: 'act.toggle-system', label: 'Start/Stop IRIS', category: 'action', icon: '\u{1F50C}', description: 'Connect/disconnect AI', action: 'palette:toggle-system', keywords: ['start', 'stop', 'connect', 'ai', 'iris'] },
  { id: 'act.screenshot', label: 'Take Screenshot', category: 'action', icon: '\u{1F4F8}', description: 'Capture screen', action: 'palette:screenshot', keywords: ['screenshot', 'capture', 'screen', 'snap'] },
  { id: 'act.overlay', label: 'Toggle Overlay Mode', category: 'action', icon: '\u{1F4CA}', shortcut: 'Ctrl+Shift+I', description: 'Mini overlay mode', action: 'toggle-overlay', keywords: ['overlay', 'mini', 'compact', 'float'] },
  { id: 'act.terminal', label: 'Open Terminal', category: 'action', icon: '\u{1F4BB}', description: 'Show terminal overlay', action: 'palette:terminal', keywords: ['terminal', 'console', 'shell', 'command'] },
  { id: 'act.lock', label: 'Lock System', category: 'action', icon: '\u{1F512}', description: 'Lock IRIS', action: 'palette:lock', keywords: ['lock', 'security', 'vault'] },

  // AI / Tools
  { id: 'ai.agent', label: 'Spawn Agent', category: 'ai', icon: '\u{1F916}', description: 'Create a new AI agent', action: 'palette:spawn-agent', keywords: ['agent', 'spawn', 'ai', 'task', 'worker'] },
  { id: 'ai.coder', label: 'IRIS Coder', category: 'ai', icon: '\u{1F4DD}', description: 'AI code generation', action: 'palette:coder', keywords: ['code', 'generate', 'write', 'develop'] },
  { id: 'ai.research', label: 'Deep Research', category: 'ai', icon: '\u{1F50D}', description: 'Research a topic', action: 'palette:research', keywords: ['research', 'search', 'find', 'investigate'] },
  { id: 'ai.oracle', label: 'RAG Oracle', category: 'ai', icon: '\u{1F52E}', description: 'Ask your codebase', action: 'palette:oracle', keywords: ['oracle', 'rag', 'codebase', 'ask'] },
  { id: 'ai.website', label: 'Build Website', category: 'ai', icon: '\u{1F310}', description: 'Generate a website', action: 'palette:website', keywords: ['website', 'build', 'html', 'page'] },

  // System
  { id: 'sys.health', label: 'Model Health Check', category: 'system', icon: '\u2764\uFE0F', description: 'Check AI model status', action: 'palette:health-check', keywords: ['health', 'model', 'status', 'check'] },
  { id: 'sys.tasks', label: 'View Tasks', category: 'system', icon: '\u{1F4CB}', description: 'Show pending tasks', action: 'palette:tasks', keywords: ['task', 'todo', 'reminder', 'pending'] },
  { id: 'sys.agents', label: 'Agent Status', category: 'system', icon: '\u{1F916}', description: 'Show running agents', action: 'palette:agent-status', keywords: ['agent', 'status', 'running', 'active'] },
  { id: 'sys.errors', label: 'Error Dashboard', category: 'system', icon: '\u{1F6A8}', description: 'Show recent errors', action: 'palette:errors', keywords: ['error', 'bug', 'fix', 'issue'] },
  { id: 'sys.analytics', label: 'Coding Analytics', category: 'system', icon: '\u{1F4CA}', description: 'Session stats', action: 'palette:analytics', keywords: ['analytics', 'stats', 'session', 'productivity'] },
  { id: 'sys.sync', label: 'Sync Status', category: 'system', icon: '\u{1F504}', description: 'Consciousness sync', action: 'palette:sync', keywords: ['sync', 'telegram', 'consciousness', 'brain'] },

  // Settings
  { id: 'set.keys', label: 'Edit API Keys', category: 'setting', icon: '\u{1F511}', description: 'Configure API keys', action: 'palette:navigate', args: 'SETTINGS', keywords: ['api', 'key', 'gemini', 'groq', 'config'] },
  { id: 'set.personality', label: 'Edit Personality', category: 'setting', icon: '\u{1F60E}', description: 'Change IRIS personality', action: 'palette:navigate', args: 'SETTINGS', keywords: ['personality', 'tone', 'style', 'jarvis'] },
  { id: 'set.telegram', label: 'Setup Telegram Bot', category: 'setting', icon: '\u{1F4E1}', description: 'Configure Telegram', action: 'palette:navigate', args: 'SETTINGS', keywords: ['telegram', 'bot', 'remote', 'chat'] },
]

// ━━━ IPC ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerCommandPalette(): void {
  // Get all commands
  ipcMain.handle('palette:commands', () => COMMANDS)

  // Search commands
  ipcMain.handle('palette:search', (_, query: string) => {
    if (!query || query.trim().length === 0) return COMMANDS
    const q = query.toLowerCase().trim()
    const scored = COMMANDS.map(cmd => {
      let score = 0
      // Exact match on label
      if (cmd.label.toLowerCase().includes(q)) score += 10
      // Keyword match
      for (const kw of cmd.keywords) {
        if (kw.includes(q) || q.includes(kw)) score += 5
      }
      // Category match
      if (cmd.category.includes(q)) score += 3
      // Description match
      if (cmd.description.toLowerCase().includes(q)) score += 2
      return { cmd, score }
    })
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.cmd)
  })

  // Execute a command
  ipcMain.handle('palette:execute', (_, commandId: string) => {
    const cmd = COMMANDS.find(c => c.id === commandId)
    if (!cmd) return { success: false, error: 'Command not found' }

    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return { success: false, error: 'No window' }

    // Send to renderer to execute
    win.webContents.send('palette:execute-command', cmd)
    return { success: true, command: cmd }
  })

  // Toggle palette visibility (called from renderer shortcut)
  ipcMain.handle('palette:toggle', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) win.webContents.send('palette:toggle-visibility')
    return { success: true }
  })

  // Register global shortcut
  try {
    globalShortcut.register('CommandOrControl+Shift+P', () => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('palette:toggle-visibility')
    })
  } catch {}

  console.log('[Coding:CommandPalette] Registered (Ctrl+Shift+P)')
}
