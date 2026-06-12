/**
 * IRIS AI - ERROR COMPANION WIDGET
 * Live error tracking with fix suggestions
 */
import { useEffect, useState } from 'react'
import {
  RiBugLine, RiCheckLine, RiCloseLine, RiRefreshLine,
  RiAlertLine, RiErrorWarningLine, RiLightbulbLine,
  RiDeleteBinLine, RiCheckDoubleLine
} from 'react-icons/ri'

interface ErrorEntry {
  id: string
  raw: string
  message: string
  file: string | null
  line: number | null
  column: number | null
  category: string
  severity: string
  language: string
  suggestion: string
  autoFixable: boolean
  timestamp: string
  resolved: boolean
}

interface ErrorStats {
  totalErrors: number
  todayErrors: number
  resolvedCount: number
  currentUnresolved: number
  streak: number
  topCategories: { category: string; count: number }[]
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444', error: '#f97316', warning: '#facc15', info: '#60a5fa'
}
const CATEGORY_ICONS: Record<string, string> = {
  syntax: '📖', typescript: '📝', runtime: '\u26A0\uFE0F',
  import: '📦', network: '🌐', permission: '🔒',
  memory: '🧠', build: '🔨', test: '\u2705',
  git: '🔀', docker: '🐳', unknown: '\u2753'
}

export default function ErrorCompanionWidget() {
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)

    // Listen for new errors in real-time
    const removeListener = window.electron?.ipcRenderer?.on('error-companion:new-errors', (_e: any, newErrors: ErrorEntry[]) => {
      setErrors(prev => [...prev, ...newErrors])
    })

    return () => { clearInterval(interval); removeListener?.() }
  }, [])

  const loadData = async () => {
    try {
      const [history, s] = await Promise.all([
        window.electron.ipcRenderer.invoke('error-companion:history', 30),
        window.electron.ipcRenderer.invoke('error-companion:stats')
      ])
      if (history) setErrors(history)
      if (s) setStats(s)
    } catch (_e) {}
  }

  const resolveError = async (id: string) => {
    await window.electron.ipcRenderer.invoke('error-companion:resolve', id)
    await loadData()
  }

  const resolveAll = async () => {
    await window.electron.ipcRenderer.invoke('error-companion:resolve-all')
    await loadData()
  }

  const clearHistory = async () => {
    await window.electron.ipcRenderer.invoke('error-companion:clear')
    await loadData()
  }

  const unresolved = errors.filter(e => !e.resolved)
  const resolved = errors.filter(e => e.resolved)

  return (
    <div style={{
      background: 'var(--iris-bg-card)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '12px', width: '100%'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RiBugLine size={13} color="#f97316" />
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: '#a1a1aa' }}>ERRORS</span>
          {stats && stats.currentUnresolved > 0 && (
            <span style={{ fontSize: '7px', fontWeight: 700, color: '#ef4444',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '999px', padding: '1px 5px' }}>{stats.currentUnresolved}</span>
          )}
          {stats && stats.streak > 0 && (
            <span style={{ fontSize: '7px', color: '#34d399', background: 'rgba(52,211,153,0.1)',
              borderRadius: '999px', padding: '1px 5px' }}>🔥{stats.streak} fixed</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {unresolved.length > 0 && (
            <button onClick={resolveAll} title="Resolve all" style={{
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: '3px', padding: '2px 5px', cursor: 'pointer', color: '#34d399', fontSize: '7px'
            }}><RiCheckDoubleLine size={8} /></button>
          )}
          <button onClick={clearHistory} title="Clear" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: '2px'
          }}><RiDeleteBinLine size={9} /></button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', marginBottom: '6px' }}>
          {[
            { label: 'TODAY', value: stats.todayErrors, color: '#f97316' },
            { label: 'FIXED', value: stats.resolvedCount, color: '#34d399' },
            { label: 'OPEN', value: stats.currentUnresolved, color: '#ef4444' },
            { label: 'STREAK', value: stats.streak, color: '#facc15' }
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '3px', padding: '3px 4px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '6px', fontWeight: 700, color: '#52525b' }}>{s.label}</div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Error list */}
      <div style={{ maxHeight: '140px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {errors.length === 0 ? (
          <div style={{ color: '#3f3f46', fontSize: '8px', textAlign: 'center', padding: '12px', fontFamily: 'monospace' }}>
            No errors detected \u2728
          </div>
        ) : (
          [...unresolved, ...resolved.slice(0, 5)].slice(0, 15).map(err => {
            const sevColor = SEVERITY_COLORS[err.severity] || '#71717a'
            const catIcon = CATEGORY_ICONS[err.category] || '\u2753'
            const isExpanded = expanded === err.id
            return (
              <div key={err.id} style={{
                background: err.resolved ? 'rgba(52,211,153,0.03)' : `rgba(${hexToRgb(sevColor)},0.04)`,
                border: `1px solid ${err.resolved ? 'rgba(52,211,153,0.08)' : `rgba(${hexToRgb(sevColor)},0.12)`}`,
                borderRadius: '5px', padding: '5px 7px',
                opacity: err.resolved ? 0.4 : 1, cursor: 'pointer',
                transition: 'all 0.2s'
              }} onClick={() => setExpanded(isExpanded ? null : err.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '8px' }}>{catIcon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '8px', fontWeight: 600, color: err.resolved ? '#71717a' : '#e4e4e7',
                      textDecoration: err.resolved ? 'line-through' : 'none',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {err.message}
                    </div>
                    {!isExpanded && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '1px' }}>
                        {err.file && <span style={{ fontSize: '6px', color: '#52525b', fontFamily: 'monospace' }}>
                          {err.file.split('/').pop()}{err.line ? `:${err.line}` : ''}
                        </span>}
                        <span style={{ fontSize: '6px', fontWeight: 700, color: sevColor,
                          background: `rgba(${hexToRgb(sevColor)},0.1)`, borderRadius: '2px', padding: '0 3px' }}>
                          {err.category.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  {!err.resolved && (
                    <button onClick={(e) => { e.stopPropagation(); resolveError(err.id) }} title="Fixed" style={{
                      background: 'rgba(52,211,153,0.1)', border: 'none', borderRadius: '3px',
                      padding: '2px', cursor: 'pointer', color: '#34d399'
                    }}><RiCheckLine size={8} /></button>
                  )}
                </div>
                {isExpanded && (
                  <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    {err.suggestion && (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                        <RiLightbulbLine size={8} color="#facc15" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span style={{ fontSize: '7px', color: '#a1a1aa', lineHeight: '1.5' }}>{err.suggestion}</span>
                      </div>
                    )}
                    {err.autoFixable && (
                      <span style={{ fontSize: '6px', color: '#34d399', background: 'rgba(52,211,153,0.1)',
                        borderRadius: '2px', padding: '1px 4px', display: 'inline-block', marginTop: '3px' }}>
                        AUTO-FIXABLE
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '113,113,122'
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
}
