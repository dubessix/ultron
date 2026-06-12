import { useEffect, useState } from 'react'
import {
  RiRobotLine, RiLoader4Line, RiCheckLine, RiCloseLine,
  RiArrowRightSLine, RiDeleteBinLine
} from 'react-icons/ri'

interface Agent {
  id: string
  type: 'assistant' | 'coder' | 'researcher' | 'analyzer' | 'builder' | 'executor' | 'creative' | 'memory'
  name: string
  emoji: string
  task: string
  status: 'spawning' | 'working' | 'done' | 'failed' | 'cancelled'
  progress: number
  progressLabel: string
  result: string | null
  resultFiles: string[]
  error: string | null
  spawnedAt: number
  completedAt: number | null
  durationMs: number | null
  source: 'telegram' | 'dashboard' | 'voice'
}

const AGENT_COLORS: Record<string, string> = {
  assistant: '#60a5fa',   // blue
  coder: '#3b82f6',       // dark blue
  researcher: '#a78bfa',  // purple
  analyzer: '#f59e0b',    // amber
  builder: '#34d399',     // green
  executor: '#f97316',    // orange
  creative: '#ec4899',    // pink
  memory: '#8b5cf6'       // violet
}

const AGENT_LABELS: Record<string, string> = {
  assistant: 'ASSISTANT',
  coder: 'CODER',
  researcher: 'RESEARCHER',
  analyzer: 'ANALYZER',
  builder: 'BUILDER',
  executor: 'EXECUTOR',
  creative: 'CREATIVE',
  memory: 'MEMORY'
}

const STATUS_STYLES: Record<string, { icon: any; color: string; label: string }> = {
  spawning:  { icon: RiLoader4Line, color: '#60a5fa', label: 'INITIALIZING' },
  working:   { icon: RiLoader4Line, color: '#facc15', label: 'WORKING' },
  done:      { icon: RiCheckLine,   color: '#34d399', label: 'COMPLETED' },
  failed:    { icon: RiCloseLine,   color: '#ef4444', label: 'FAILED' },
  cancelled: { icon: RiCloseLine,   color: '#71717a', label: 'CANCELLED' }
}

export default function AgentWidget() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    // Load initial
    window.electron?.ipcRenderer?.invoke('agents:get-all').then((a: Agent[]) => {
      if (a?.length) setAgents(a)
    }).catch(() => {})

    // Listen for live updates
    const removeListener = window.electron?.ipcRenderer?.on('agents:update', (_e: any, updated: Agent[]) => {
      setAgents(updated || [])
    })

    return () => { removeListener?.() }
  }, [])

  const active = agents.filter(a => a.status === 'working' || a.status === 'spawning')
  const completed = agents.filter(a => a.status === 'done' || a.status === 'failed' || a.status === 'cancelled')
  const hasActive = active.length > 0

  return (
    <div style={{
      background: 'var(--iris-bg-card)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '16px',
      width: '100%',
      maxHeight: '500px',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RiRobotLine size={16} color="#60a5fa" />
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#a1a1aa'
          }}>
            AGENT HUB
          </span>
          {hasActive && (
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              color: '#facc15',
              background: 'rgba(250,204,21,0.1)',
              border: '1px solid rgba(250,204,21,0.2)',
              borderRadius: '999px',
              padding: '2px 8px',
              letterSpacing: '0.1em',
              animation: 'pulse 2s infinite'
            }}>
              {active.length} ACTIVE
            </span>
          )}
          <span style={{
            fontSize: '8px',
            color: '#52525b',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '4px',
            padding: '2px 6px'
          }}>
            {agents.length} total
          </span>
        </div>
        {completed.length > 0 && (
          <button
            onClick={() => window.electron?.ipcRenderer?.invoke('agents:clear')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#71717a',
              fontSize: '9px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RiDeleteBinLine size={12} /> CLEAR
          </button>
        )}
      </div>

      {/* Agent Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Show active first, then completed */}
        {[...active, ...completed.slice(0, 10)].map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            expanded={expanded === agent.id}
            onToggle={() => setExpanded(expanded === agent.id ? null : agent.id)}
          />
        ))}
      </div>
    </div>
  )
}

function AgentCard({ agent, expanded, onToggle }: {
  agent: Agent, expanded: boolean, onToggle: () => void
}) {
  const style = STATUS_STYLES[agent.status] || STATUS_STYLES.working
  const color = AGENT_COLORS[agent.type] || '#60a5fa'
  const isActive = agent.status === 'working' || agent.status === 'spawning'
  const StatusIcon = style.icon

  return (
    <div style={{
      background: isActive ? `rgba(${hexToRgb(color)},0.05)` : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isActive ? `rgba(${hexToRgb(color)},0.15)` : 'rgba(255,255,255,0.05)'}`,
      borderRadius: '10px',
      padding: '10px 12px',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
    onClick={onToggle}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '14px' }}>{agent.emoji}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#e4e4e7',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {agent.name}
            </div>
            <div style={{
              fontSize: '9px',
              color: '#71717a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {agent.task}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {/* Type badge */}
          <span style={{
            fontSize: '7px',
            fontWeight: 700,
            color: color,
            background: `rgba(${hexToRgb(color)},0.1)`,
            borderRadius: '3px',
            padding: '2px 5px',
            letterSpacing: '0.08em'
          }}>
            {AGENT_LABELS[agent.type] || agent.type.toUpperCase()}
          </span>
          {/* Status badge */}
          <span style={{
            fontSize: '8px',
            fontWeight: 700,
            color: style.color,
            background: `rgba(${hexToRgb(style.color)},0.1)`,
            borderRadius: '4px',
            padding: '2px 6px',
            letterSpacing: '0.08em',
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}>
            {isActive && (
              <StatusIcon size={10} style={{ animation: 'spin 1s linear infinite' }} />
            )}
            {!isActive && <StatusIcon size={10} />}
            {style.label}
          </span>
          <RiArrowRightSLine
            size={14}
            color="#52525b"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          />
        </div>
      </div>

      {/* Progress bar (active agents) */}
      {isActive && (
        <div style={{ marginTop: '8px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px'
          }}>
            <span style={{ fontSize: '8px', color: '#71717a' }}>{agent.progressLabel}</span>
            <span style={{ fontSize: '8px', color: color, fontWeight: 700 }}>{agent.progress}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '3px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${agent.progress}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${color}, ${color}88)`,
              borderRadius: '999px',
              boxShadow: `0 0 8px ${color}66`,
              transition: 'width 0.5s ease-out'
            }} />
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div style={{
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: '9px',
          color: '#a1a1aa',
          lineHeight: '1.6'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <span style={{ color: '#52525b' }}>TYPE:</span> {agent.type.toUpperCase()}
            </div>
            <div>
              <span style={{ color: '#52525b' }}>SOURCE:</span> {agent.source?.toUpperCase() || 'N/A'}
            </div>
            <div>
              <span style={{ color: '#52525b' }}>DURATION:</span>{' '}
              {agent.durationMs ? `${(agent.durationMs / 1000).toFixed(1)}s` : `${((Date.now() - agent.spawnedAt) / 1000).toFixed(0)}s`}
            </div>
            <div>
              <span style={{ color: '#52525b' }}>SPAWNED:</span>{' '}
              {new Date(agent.spawnedAt).toLocaleTimeString()}
            </div>
            {agent.resultFiles.length > 0 && (
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#52525b' }}>FILES:</span> {agent.resultFiles.join(', ')}
              </div>
            )}
          </div>

          {/* Result */}
          {agent.result && (
            <div style={{
              marginTop: '8px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '6px',
              padding: '8px',
              fontFamily: 'monospace',
              fontSize: '8px',
              color: '#71717a',
              maxHeight: '120px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {agent.result.substring(0, 500)}
              {agent.result.length > 500 ? '...' : ''}
            </div>
          )}

          {/* Error */}
          {agent.error && (
            <div style={{
              marginTop: '8px',
              color: '#ef4444',
              fontSize: '9px'
            }}>
              ⚠️ {agent.error}
            </div>
          )}

          {/* Cancel button for active agents */}
          {isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.electron?.ipcRenderer?.invoke('agents:cancel', agent.id)
              }}
              style={{
                marginTop: '8px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#ef4444',
                fontSize: '9px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.05em'
              }}
            >
              CANCEL AGENT
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Helper: hex to rgb
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '96,165,250'
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
}
