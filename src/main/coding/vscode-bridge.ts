/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IRIS AI — VS CODE WORKSPACE BRIDGE                        ║
 * ║  "I see you're working on auth.ts, sir. Need help?"        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * PERFORMANCE GUARANTEES:
 *   - Polls every 3 seconds (NOT 500ms)
 *   - Only processes when window title CHANGES
 *   - NO file reading during polling (just string parsing)
 *   - File read is ON-DEMAND only (user clicks "Read" or IRIS asks)
 *   - Skips binary files (images, fonts, lock files)
 *   - Max file size: 100KB for on-demand reads
 *   - Gracefully handles: VS Code not running, no file open, errors
 *   - Never throws — errors are caught silently
 *
 * HOW IT WORKS:
 *   1. Uses node-window-manager to read VS Code window title
 *   2. Parses: "filename.ts - project-name - Visual Studio Code"
 *   3. Extracts: activeFile, workspaceName, language
 *   4. Caches context — only sends IPC event when something changes
 *   5. File content read ONLY on explicit demand
 */

import { ipcMain, BrowserWindow, app } from 'electron'
import { windowManager } from 'node-window-manager'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// ━━━ TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface VSCodeContext {
  /** Is VS Code detected and running? */
  isConnected: boolean
  /** Currently active filename (e.g. "auth.ts") */
  activeFile: string | null
  /** Workspace/project name (e.g. "my-project") */
  workspaceName: string | null
  /** Detected language from file extension */
  language: string | null
  /** File extension (e.g. "ts") */
  extension: string | null
  /** Full file path if resolved, null otherwise */
  filePath: string | null
  /** Timestamp of last context change */
  lastChanged: number
}

export interface FileReadResult {
  success: boolean
  content: string | null
  filePath: string | null
  size: number
  lines: number
  language: string | null
  error: string | null
}

// ━━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Poll interval — 3 seconds for performance */
const POLL_INTERVAL_MS = 3000

/** Max file size to read: 100KB */
const MAX_FILE_SIZE = 100 * 1024

/** Binary extensions to skip */
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'svg', 'webp',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv', 'flac',
  'zip', 'tar', 'gz', 'rar', '7z', 'bz2',
  'exe', 'dll', 'so', 'dylib', 'bin', 'dat',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'sqlite', 'db', 'lock'
])

/** Language map for file extensions */
const LANG_MAP: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript React',
  js: 'JavaScript', jsx: 'JavaScript React', mjs: 'JavaScript',
  py: 'Python', pyw: 'Python',
  rb: 'Ruby', go: 'Go', rs: 'Rust',
  java: 'Java', kt: 'Kotlin', kts: 'Kotlin',
  cpp: 'C++', cc: 'C++', c: 'C', h: 'C/C++ Header', hpp: 'C++ Header',
  cs: 'C#', fs: 'F#',
  php: 'PHP', swift: 'Swift', dart: 'Dart',
  html: 'HTML', htm: 'HTML',
  css: 'CSS', scss: 'SCSS', sass: 'Sass', less: 'Less',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
  xml: 'XML', sql: 'SQL', graphql: 'GraphQL', gql: 'GraphQL',
  md: 'Markdown', mdx: 'MDX', txt: 'Text',
  sh: 'Shell', bash: 'Bash', zsh: 'Zsh', fish: 'Fish',
  dockerfile: 'Docker', makefile: 'Makefile',
  vue: 'Vue', svelte: 'Svelte', astro: 'Astro',
  prisma: 'Prisma', proto: 'Protocol Buffers',
  r: 'R', lua: 'Lua', elixir: 'Elixir', ex: 'Elixir',
  haskell: 'Haskell', hs: 'Haskell', scala: 'Scala',
  cmake: 'CMake', gradle: 'Gradle',
  env: 'Environment', gitignore: 'Git', editorconfig: 'Editor Config',
  prettierrc: 'Prettier', eslintrc: 'ESLint'
}

/** VS Code title identifiers */
const VSCODE_IDENTIFIERS = ['visual studio code', 'vscode', 'code -']

/** Titles that mean "no file is open" */
const SKIP_TITLES = [
  'welcome', 'settings', 'extensions', 'output', 'debug console',
  'terminal', 'keyboard shortcuts', 'about', 'get started',
  'release notes', 'preferences'
]

// ━━━ STATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let cachedContext: VSCodeContext = {
  isConnected: false,
  activeFile: null,
  workspaceName: null,
  language: null,
  extension: null,
  filePath: null,
  lastChanged: 0
}

let pollInterval: NodeJS.Timeout | null = null
let mainWindow: BrowserWindow | null = null
let cachedFileContent: string | null = null
let cachedFilePath: string | null = null
/** Known project directories for file resolution */
let projectDirs: string[] = []

// ━━━ CORE DETECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Parse VS Code window title into structured context.
 *
 * Title formats:
 *   "auth.ts - my-project - Visual Studio Code"
 *   "auth.ts - Visual Studio Code"
 *   "auth.ts - my-project - Visual Studio Code [Unsupported]"
 *   "Welcome - Visual Studio Code"
 */
function parseTitle(title: string): {
  activeFile: string | null
  workspaceName: string | null
  language: string | null
  extension: string | null
} {
  // Remove "Visual Studio Code" suffix + optional flags
  let clean = title
    .replace(/\s*[-—]\s*Visual Studio Code(\s*\[.*?\])?$/i, '')
    .replace(/\s*[-—]\s*Code(\s*\[.*?\])?$/i, '')
    .trim()

  if (!clean) return { activeFile: null, workspaceName: null, language: null, extension: null }

  // Skip non-file views
  const lower = clean.toLowerCase()
  for (const skip of SKIP_TITLES) {
    if (lower.startsWith(skip)) {
      return { activeFile: null, workspaceName: null, language: null, extension: null }
    }
  }

  // Split by " - " separator
  const parts = clean.split(/\s*[-—]\s*/)

  const rawFile = parts[0]?.trim() || null
  // Workspace is the middle part (if 3+ segments) or second-to-last
  const workspaceName = parts.length >= 3
    ? parts[parts.length - 1]?.trim() || null
    : parts.length === 2
      ? parts[1]?.trim() || null
      : null

  // Validate: must have a dot (real file) and not be too long
  if (!rawFile || !rawFile.includes('.') || rawFile.length > 120) {
    return { activeFile: null, workspaceName: null, language: null, extension: null }
  }

  const ext = rawFile.split('.').pop()?.toLowerCase() || null
  const language = ext ? (LANG_MAP[ext] || null) : null

  return { activeFile: rawFile, workspaceName, language, extension: ext }
}

/**
 * Detect VS Code window and update context.
 * Called every 3 seconds. Only sends IPC when context CHANGES.
 */
function detect(): void {
  try {
    const windows = windowManager.getWindows()

    // Find focused VS Code window
    const vscodeWin = windows.find((w) => {
      const t = w.getTitle()
      if (!t) return false
      const lower = t.toLowerCase()
      return VSCODE_IDENTIFIERS.some((id) => lower.includes(id))
    })

    if (!vscodeWin) {
      // VS Code not running — only notify if status changed
      if (cachedContext.isConnected) {
        cachedContext = {
          isConnected: false,
          activeFile: null,
          workspaceName: null,
          language: null,
          extension: null,
          filePath: null,
          lastChanged: Date.now()
        }
        notifyRenderer()
      }
      return
    }

    const title = vscodeWin.getTitle()
    if (!title) return

    const parsed = parseTitle(title)

    // Only update if something actually changed
    if (
      parsed.activeFile !== cachedContext.activeFile ||
      parsed.workspaceName !== cachedContext.workspaceName
    ) {
      cachedContext = {
        isConnected: true,
        activeFile: parsed.activeFile,
        workspaceName: parsed.workspaceName,
        language: parsed.language,
        extension: parsed.extension,
        filePath: null,
        lastChanged: Date.now()
      }

      // Try to resolve full path (lightweight — just checks existence)
      cachedContext.filePath = resolveFilePath(parsed.activeFile, parsed.workspaceName)

      // Invalidate file content cache when file changes
      cachedFileContent = null
      cachedFilePath = null

      notifyRenderer()
    }
  } catch (_e) {
    // Silently fail — never break IRIS
  }
}

/**
 * Resolve full file path from filename + workspace name.
 * Lightweight: only uses fs.existsSync, no search.
 */
function resolveFilePath(
  fileName: string | null,
  workspaceName: string | null
): string | null {
  if (!fileName) return null

  // Build candidate paths from known project directories
  const candidates: string[] = []

  for (const dir of projectDirs) {
    if (workspaceName && path.basename(dir) === workspaceName) {
      // Direct match: project dir name matches workspace name
      candidates.push(path.join(dir, fileName))
      // Also check common subdirs (src, lib, app, components, etc.)
      for (const sub of ['src', 'lib', 'app', 'components', 'pages', 'routes', 'utils', 'types', 'hooks', 'services', 'middleware']) {
        candidates.push(path.join(dir, sub, fileName))
      }
    }
  }

  // Also try common locations if workspace name is known
  if (workspaceName) {
    const home = require('os').homedir()
    const commonDirs = [
      path.join(home, 'Desktop'),
      path.join(home, 'projects'),
      path.join(home, 'Documents'),
      path.join(home, 'repos'),
      path.join(home, 'code'),
      path.join(home, 'work'),
      '/home/debjeet-dhar/Desktop/Dukanlink/saas1'
    ]
    for (const base of commonDirs) {
      const projectDir = path.join(base, workspaceName)
      candidates.push(path.join(projectDir, fileName))
      for (const sub of ['src', 'lib', 'app', 'components']) {
        candidates.push(path.join(projectDir, sub, fileName))
      }
    }
  }

  // Check candidates (fast — just existsSync)
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch { /* skip */ }
  }

  return null
}

/**
 * Build project directory list from common locations.
 * Called once on init, then updated when user opens projects.
 */
function discoverProjectDirs(): string[] {
  const dirs: string[] = []
  const home = require('os').homedir()

  const scanBases = [
    path.join(home, 'Desktop'),
    path.join(home, 'projects'),
    path.join(home, 'Documents'),
    path.join(home, 'repos'),
    path.join(home, 'code'),
    path.join(home, 'work'),
    '/home/debjeet-dhar/Desktop/Dukanlink/saas1'
  ]

  for (const base of scanBases) {
    try {
      if (!fs.existsSync(base)) continue
      const entries = fs.readdirSync(base, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const fullPath = path.join(base, entry.name)
          // Quick check: is this a code project?
          const hasPackageJson = fs.existsSync(path.join(fullPath, 'package.json'))
          const hasCargoToml = fs.existsSync(path.join(fullPath, 'Cargo.toml'))
          const hasPyProject = fs.existsSync(path.join(fullPath, 'pyproject.toml'))
          const hasGoMod = fs.existsSync(path.join(fullPath, 'go.mod'))
          const hasGit = fs.existsSync(path.join(fullPath, '.git'))
          if (hasPackageJson || hasCargoToml || hasPyProject || hasGoMod || hasGit) {
            dirs.push(fullPath)
          }
        }
      }
    } catch { /* skip */ }
  }

  return dirs
}

/** Send context update to renderer — only when changed */
function notifyRenderer(): void {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('vscode:context-changed', cachedContext)
    }
  } catch { /* skip */ }
}

// ━━━ ON-DEMAND FILE READ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Read the currently active VS Code file.
 * Only called on-demand — NOT during polling.
 */
function readActiveFile(): FileReadResult {
  const filePath = cachedContext.filePath

  if (!filePath) {
    return {
      success: false,
      content: null,
      filePath: null,
      size: 0,
      lines: 0,
      language: cachedContext.language,
      error: 'File path not resolved. Open the file directly in VS Code or tell IRIS the project path.'
    }
  }

  // Return cached if same file
  if (cachedFileContent && cachedFilePath === filePath) {
    return {
      success: true,
      content: cachedFileContent,
      filePath,
      size: Buffer.byteLength(cachedFileContent, 'utf8'),
      lines: cachedFileContent.split('\n').length,
      language: cachedContext.language,
      error: null
    }
  }

  try {
    // Skip binary files
    if (cachedContext.extension && BINARY_EXTENSIONS.has(cachedContext.extension)) {
      return {
        success: false,
        content: null,
        filePath,
        size: 0,
        lines: 0,
        language: cachedContext.language,
        error: `Binary file (${cachedContext.extension}). Cannot read.`
      }
    }

    const stat = fs.statSync(filePath)

    // Skip large files
    if (stat.size > MAX_FILE_SIZE) {
      return {
        success: false,
        content: null,
        filePath,
        size: stat.size,
        lines: 0,
        language: cachedContext.language,
        error: `File too large (${(stat.size / 1024).toFixed(0)}KB). Max: 100KB.`
      }
    }

    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n').length

    // Cache the result
    cachedFileContent = content
    cachedFilePath = filePath

    return {
      success: true,
      content,
      filePath,
      size: stat.size,
      lines,
      language: cachedContext.language,
      error: null
    }
  } catch (e) {
    return {
      success: false,
      content: null,
      filePath,
      size: 0,
      lines: 0,
      language: cachedContext.language,
      error: `Failed to read file: ${(e as Error).message}`
    }
  }
}

// ━━━ MODULE REGISTRATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function registerVSCodeBridge(): void {
  console.log('[Coding:VSCode-Bridge] Initializing...')

  // Discover project directories once on init
  try {
    projectDirs = discoverProjectDirs()
    console.log(`[Coding:VSCode-Bridge] Found ${projectDirs.length} project directories`)
  } catch (_e) {
    projectDirs = []
  }

  // ── IPC: Get current context (sync, instant) ──
  ipcMain.handle('vscode:get-context', () => {
    return cachedContext
  })

  // ── IPC: Read active file (on-demand, NOT polled) ──
  ipcMain.handle('vscode:read-active-file', () => {
    return readActiveFile()
  })

  // ── IPC: Add a project directory for file resolution ──
  ipcMain.handle('vscode:add-project-dir', (_event, dirPath: string) => {
    try {
      if (fs.existsSync(dirPath) && !projectDirs.includes(dirPath)) {
        projectDirs.push(dirPath)
        // Re-resolve file path
        if (cachedContext.activeFile) {
          cachedContext.filePath = resolveFilePath(cachedContext.activeFile, cachedContext.workspaceName)
          notifyRenderer()
        }
        return { success: true }
      }
      return { success: false, error: 'Directory not found or already registered' }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  // ── IPC: Refresh project directories ──
  ipcMain.handle('vscode:refresh-dirs', () => {
    try {
      projectDirs = discoverProjectDirs()
      return { success: true, count: projectDirs.length }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  // ── Start detection when window is ready ──
  ipcMain.on('vscode:start-watching', (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) mainWindow = win
    } catch { /* skip */ }

    if (pollInterval) clearInterval(pollInterval)

    // Initial detect
    detect()

    // Poll every 3 seconds
    pollInterval = setInterval(detect, POLL_INTERVAL_MS)

    console.log('[Coding:VSCode-Bridge] Watching for VS Code (3s interval)')
  })

  // ── Stop watching ──
  ipcMain.on('vscode:stop-watching', () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    console.log('[Coding:VSCode-Bridge] Stopped watching')
  })

  console.log('[Coding:VSCode-Bridge] Ready (IPC handlers registered)')
}
