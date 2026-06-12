/**
 * IRIS AI - COMMAND PALETTE (Ctrl+Shift+P)
 * Spotlight-style overlay for instant command access
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  RiSearchLine, RiCommandLine, RiCloseLine,
  RiArrowRightLine, RiTimeLine
} from 'react-icons/ri'

interface PaletteCommand {
  id: string
  label: string
  category: 'action' | 'navigation' | 'file' | 'setting' | 'tool' | 'ai' | 'system'
  icon: string
  shortcut?: string
  description: string
  keywords: string[]
}

const CATEGORY_COLORS: Record<string, string> = {
  action: '#f97316', navigation: '#60a5fa', file: '#34d399',
  setting: '#a78bfa', tool: '#facc15', ai: '#ec4899', system: '#71717a'
}

export default function CommandPalette() {
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState('')
  const [commands, setCommands] = useState<PaletteCommand[]>([])
  const [filtered, setFiltered] = useState<PaletteCommand[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load commands
    window.electron?.ipcRenderer?.invoke('palette:commands').then((cmds: PaletteCommand[]) => {
      if (cmds?.length) setCommands(cmds)
    }).catch(() => {})

    // Listen for toggle
    const removeToggle = window.electron?.ipcRenderer?.on('palette:toggle-visibility', () => {
      setVisible(v => !v)
    })

    // Listen for execute from main
    const removeExecute = window.electron?.ipcRenderer?.on('palette:execute-command', (cmd: PaletteCommand) => {
      executeCommand(cmd)
    })

    // Keyboard shortcut (Ctrl+Shift+P) from renderer side
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setVisible(v => !v)
      }
      if (e.key === 'Escape' && visible) {
        setVisible(false)
      }
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      removeToggle?.()
      removeExecute?.()
      window.removeEventListener('keydown', handleKey)
    }
  }, [visible])

  // Filter commands on query change
  useEffect(() => {
    if (!query.trim()) {
      setFiltered(commands)
      setSelectedIdx(0)
      return
    }
    const q = query.toLowerCase()
    const scored = commands.map(cmd => {
      let score = 0
      if (cmd.label.toLowerCase().includes(q)) score += 10
      for (const kw of cmd.keywords) {
        if (kw.includes(q) || q.includes(kw)) score += 5
      }
      if (cmd.category.includes(q)) score += 3
      if (cmd.description.toLowerCase().includes(q)) score += 2
      return { cmd, score }
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.cmd)
    setFiltered(scored)
    setSelectedIdx(0)
  }, [query, commands])

  // Focus input when visible
  useEffect(() => {
    if (visible) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [visible])

  // Scroll selected into view
  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.children
      if (items[selectedIdx]) {
        items[selectedIdx].scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIdx])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIdx]) executeCommand(filtered[selectedIdx])
    } else if (e.key === 'Escape') {
      setVisible(false)
    }
  }

  const executeCommand = async (cmd: PaletteCommand) => {
    // Handle navigation
    if (cmd.action === 'palette:navigate' && cmd.args) {
      // Dispatch custom event that IRIS.tsx listens to
      window.dispatchEvent(new CustomEvent('iris:navigate', { detail: cmd.args }))
    }

    // Notify main process
    await window.electron?.ipcRenderer?.invoke('palette:execute', cmd.id)

    setVisible(false)
    setQuery('')
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', justifyContent: 'center',
      paddingTop: '12vh',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.15s ease-out'
    }}
    onClick={(e) => { if (e.target === e.currentTarget) setVisible(false) }}
    >
      <div style={{
        width: '560px', maxHeight: '420px',
        background: 'var(--iris-bg-secondary)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(96,165,250,0.05)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <RiSearchLine size={18} color="#60a5fa" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command... (actions, navigation, AI, system)"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              fontSize: '14px', color: '#e4e4e7', outline: 'none',
              fontFamily: 'system-ui'
            }}
          />
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '10px', color: '#52525b', fontFamily: 'monospace'
          }}>
            <kbd style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px', padding: '2px 6px', fontSize: '9px'
            }}>Ctrl+Shift+P</kbd>
            <button onClick={() => setVisible(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#52525b'
            }}><RiCloseLine size={14} /></button>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} style={{
          flex: 1, overflow: 'auto', padding: '8px',
          display: 'flex', flexDirection: 'column', gap: '2px'
        }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '30px', textAlign: 'center', color: '#3f3f46', fontSize: '12px', fontFamily: 'monospace'
            }}>
              No commands match "{query}"
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const color = CATEGORY_COLORS[cmd.category] || '#71717a'
              const isSelected = idx === selectedIdx
              return (
                <div key={cmd.id} onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                    background: isSelected ? `rgba(${hexToRgb(color)},0.08)` : 'transparent',
                    border: `1px solid ${isSelected ? `rgba(${hexToRgb(color)},0.2)` : 'transparent'}`
                  }}>
                  <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{cmd.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#fff' : '#e4e4e7' }}>
                      {cmd.label}
                    </div>
                    <div style={{ fontSize: '10px', color: '#52525b', marginTop: '1px' }}>
                      {cmd.description}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '8px', fontWeight: 700, color,
                    background: `rgba(${hexToRgb(color)},0.1)`,
                    borderRadius: '4px', padding: '2px 6px',
                    textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0
                  }}>
                    {cmd.category}
                  </span>
                  {cmd.shortcut && (
                    <kbd style={{
                      fontSize: '8px', color: '#52525b',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '3px', padding: '1px 5px', fontFamily: 'monospace', flexShrink: 0
                    }}>{cmd.shortcut}</kbd>
                  )}
                  {isSelected && <RiArrowRightLine size={12} color={color} />}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '9px', color: '#3f3f46', fontFamily: 'monospace'
        }}>
          <span>\u2191\u2193 navigate \u2022 Enter execute \u2022 Esc close</span>
          <span>{filtered.length} commands</span>
        </div>
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '96,165,250'
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
}
