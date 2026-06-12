/**
 * IRIS AI — VS CODE BRIDGE WIDGET
 * Shows current VS Code context: active file, workspace, language.
 * Lightweight: only re-renders when context CHANGES.
 *
 * Performance:
 *   - No polling from renderer (backend polls at 3s)
 *   - Only updates on IPC event (vscode:context-changed)
 *   - File read is ON-DEMAND (user clicks button)
 *   - Minimal DOM elements
 */
import { useEffect, useState, useCallback } from 'react'
import {
  RiCodeSSlashLine, RiFileCodeLine, RiFolderLine,
  RiArrowUpLine, RiEyeLine, RiExternalLinkLine,
  RiCheckboxCircleLine, RiCloseCircleLine, RiLoader4Line
} from 'react-icons/ri'

interface VSCodeContext {
  isConnected: boolean
  activeFile: string | null
  workspaceName: string | null
  language: string | null
  extension: string | null
  filePath: string | null
  lastChanged: number
}

interface FileReadResult {
  success: boolean
  content: string | null
  filePath: string | null
  size: number
  lines: number
  language: string | null
  error: string | null
}

/** Language → color mapping */
const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', 'TypeScript React': '#3178c6',
  JavaScript: '#f7df1e', 'JavaScript React': '#f7df1e',
  Python: '#3572A5', Ruby: '#701516', Go: '#00ADD8',
  Rust: '#dea584', Java: '#b07219', Kotlin: '#A97BFF',
  'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c',
  JSON: '#292929', YAML: '#cb171e', Markdown: '#083fa1',
  Shell: '#89e051', Docker: '#384d54', Vue: '#41b883',
  Svelte: '#ff3e00', SQL: '#e38c00', PHP: '#4F5D95',
  Swift: '#F05138', Dart: '#00B4AB', GraphQL: '#e10098'
}

export default function VSCodeBridgeWidget() {
  const [ctx, setCtx] = useState<VSCodeContext | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileInfo, setFileInfo] = useState<{ lines: number; size: number } | null>(null)
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  // ── Start watching + listen for context changes ──
  useEffect(() => {
    // Tell backend to start watching
    try {
      window.electron.ipcRenderer.send('vscode:start-watching')
    } catch { /* skip */ }

    // Listen for context updates (only sent when changed)
    const handler = (_event: any, newCtx: VSCodeContext) => {
      setCtx(newCtx)
      // Reset file read state when file changes
      if (newCtx.activeFile !== ctx?.activeFile) {
        setFileContent(null)
        setFileInfo(null)
        setReadError(null)
        setExpanded(false)
      }
    }

    let cleanup: (() => void) | null = null
    try {
      window.electron.ipcRenderer.on('vscode:context-changed', handler)
      cleanup = () => {
        try {
          window.electron.ipcRenderer.removeListener('vscode:context-changed', handler)
        } catch { /* skip */ }
      }
    } catch { /* skip */ }

    // Also fetch initial context
    try {
      window.electron.ipcRenderer.invoke('vscode:get-context').then((c: VSCodeContext) => {
        if (c) setCtx(c)
      }).catch(() => {})
    } catch { /* skip */ }

    return () => {
      if (cleanup) cleanup()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Read active file (on-demand) ──
  const handleReadFile = useCallback(async () => {
    if (reading) return
    setReading(true)
    setReadError(null)
    try {
      const result: FileReadResult = await window.electron.ipcRenderer.invoke('vscode:read-active-file')
      if (result.success && result.content) {
        setFileContent(result.content)
        setFileInfo({ lines: result.lines, size: result.size })
      } else {
        setReadError(result.error || 'Could not read file')
      }
    } catch (e) {
      setReadError('Failed to read file')
    } finally {
      setReading(false)
    }
  }, [reading])

  // ── Open in VS Code ──
  const handleOpenInVSCode = useCallback(() => {
    if (ctx?.filePath) {
      try {
        window.electron.ipcRenderer.invoke('open-in-vscode', ctx.filePath)
      } catch { /* skip */ }
    }
  }, [ctx?.filePath])

  const langColor = ctx?.language ? LANG_COLORS[ctx.language] || '#71717a' : '#71717a'
  const sizeKB = fileInfo ? (fileInfo.size / 1024).toFixed(1) : null

  return (
    <div style={{
      background: 'var(--iris-bg-card)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '12px',
      width: '100%'
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RiCodeSSlashLine size={13} color="#34d399" />
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: '#a1a1aa' }}>VS CODE</span>
          {ctx?.isConnected ? (
            <span style={{
              fontSize: '7px', color: '#34d399', background: 'rgba(52,211,153,0.1)',
              borderRadius: '999px', padding: '1px 5px', display: 'flex', alignItems: 'center', gap: '3px'
            }}>
              <RiCheckboxCircleLine size={7} /> LIVE
            </span>
          ) : (
            <span style={{
              fontSize: '7px', color: '#52525b', background: 'rgba(255,255,255,0.03)',
              borderRadius: '999px', padding: '1px 5px'
            }}>
              <RiCloseCircleLine size={7} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
              NOT DETECTED
            </span>
          )}
        </div>
      </div>

      {/* ── Disconnected state ── */}
      {!ctx?.isConnected && (
        <div style={{
          textAlign: 'center', padding: '8px 4px', color: '#3f3f46',
          fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.05em'
        }}>
          Open VS Code to activate bridge
        </div>
      )}

      {/* ── Connected: File info ── */}
      {ctx?.isConnected && ctx.activeFile && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 8px',
            background: 'rgba(52,211,153,0.04)',
            border: '1px solid rgba(52,211,153,0.1)',
            borderRadius: '8px',
            marginBottom: '6px'
          }}>
            {/* Language dot */}
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: langColor,
              boxShadow: `0 0 6px ${langColor}60`,
              flexShrink: 0
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '10px', fontWeight: 700, color: '#e4e4e7',
                fontFamily: 'monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {ctx.activeFile}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                {ctx.workspaceName && (
                  <span style={{
                    fontSize: '7px', color: '#71717a',
                    display: 'flex', alignItems: 'center', gap: '2px'
                  }}>
                    <RiFolderLine size={7} /> {ctx.workspaceName}
                  </span>
                )}
                {ctx.language && (
                  <span style={{
                    fontSize: '7px', color: langColor,
                    background: `${langColor}15`,
                    borderRadius: '3px', padding: '0px 4px'
                  }}>
                    {ctx.language}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── File path ── */}
          {ctx.filePath && (
            <div style={{
              fontSize: '7px', color: '#3f3f46', fontFamily: 'monospace',
              marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', padding: '0 2px'
            }}>
              {ctx.filePath}
            </div>
          )}

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: fileContent || readError ? '6px' : '0' }}>
            <button
              onClick={handleReadFile}
              disabled={reading}
              style={{
                flex: 1, padding: '4px 8px',
                background: 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.15)',
                borderRadius: '6px', color: '#34d399',
                fontSize: '8px', fontWeight: 600,
                cursor: reading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                fontFamily: 'monospace', letterSpacing: '0.05em'
              }}
            >
              {reading ? <RiLoader4Line size={9} className="animate-spin" /> : <RiEyeLine size={9} />}
              {reading ? 'READING...' : 'READ FILE'}
            </button>
            {ctx.filePath && (
              <button
                onClick={handleOpenInVSCode}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px', color: '#71717a',
                  fontSize: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '3px',
                  fontFamily: 'monospace'
                }}
              >
                <RiExternalLinkLine size={9} /> OPEN
              </button>
            )}
          </div>

          {/* ── File content preview ── */}
          {fileContent && fileInfo && (
            <div style={{ marginTop: '4px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '4px'
              }}>
                <span style={{ fontSize: '7px', color: '#52525b', fontFamily: 'monospace' }}>
                  {fileInfo.lines} lines | {sizeKB}KB
                </span>
                <button
                  onClick={() => setExpanded(!expanded)}
                  style={{
                    background: 'none', border: 'none', color: '#52525b',
                    cursor: 'pointer', fontSize: '7px', fontFamily: 'monospace'
                  }}
                >
                  {expanded ? 'COLLAPSE' : 'EXPAND'}
                </button>
              </div>
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '6px',
                padding: expanded ? '8px' : '6px 8px',
                fontSize: '8px',
                fontFamily: 'monospace',
                color: '#a1a1aa',
                maxHeight: expanded ? '200px' : '60px',
                overflow: 'auto',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: '1.4'
              }}>
                {expanded ? fileContent : fileContent.split('\n').slice(0, 5).join('\n')}
              </pre>
            </div>
          )}

          {/* ── Error state ── */}
          {readError && (
            <div style={{
              fontSize: '7px', color: '#ef4444', fontFamily: 'monospace',
              background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.1)',
              borderRadius: '6px', padding: '4px 8px',
              marginTop: '4px'
            }}>
              {readError}
            </div>
          )}
        </>
      )}

      {/* ── Connected but no file open ── */}
      {ctx?.isConnected && !ctx.activeFile && (
        <div style={{
          textAlign: 'center', padding: '8px 4px', color: '#52525b',
          fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.05em'
        }}>
          No file currently open
        </div>
      )}
    </div>
  )
}
