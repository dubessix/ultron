/**
 * IRIS AI — CONSCIOUSNESS SYNC WIDGET (Dashboard)
 * One brain. Every interface sees the same mind.
 */
import { useEffect, useState } from 'react'
import {
  RiExchangeLine, RiBrainLine,
  RiTelegramLine, RiMacLine, RiRefreshLine, RiDatabase2Line,
  RiEmotionLine, RiCheckDoubleLine
} from 'react-icons/ri'

interface ConsciousnessState {
  lastSyncAt: string
  totalFacts: number
  totalEvents: number
  totalTasks: number
  pendingTasks: number
  currentMood: string
  personalityMode: string
  activeAgents: number
}

interface SyncLogEntry {
  id: string
  type: string
  source: string
  timestamp: string
  summary: string
}

const SYNC_COLORS: Record<string, string> = {
  fact: '#60a5fa', event: '#a78bfa', task: '#34d399',
  mood: '#f59e0b', preference: '#ec4899', agent: '#f97316', state: '#71717a'
}
const SYNC_ICONS: Record<string, string> = {
  fact: '📝', event: '📋', task: '\u2705', mood: '😊',
  preference: '\u2699\uFE0F', agent: '🤖', state: '🔄'
}

export default function ConsciousnessWidget() {
  const [state, setState] = useState<ConsciousnessState | null>(null)
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 8000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [s, log] = await Promise.all([
        window.electron.ipcRenderer.invoke('consciousness:state'),
        window.electron.ipcRenderer.invoke('consciousness:sync-log', 10)
      ])
      if (s) setState(s)
      if (log?.length) setSyncLog(log)
    } catch (_e) {}
  }

  const formatTime = (iso: string): string => {
    try {
      const d = new Date(iso)
      const diff = Date.now() - d.getTime()
      if (diff < 60000) return 'now'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch (_e) {
      return iso
    }
  }

  return (
    <div style={{
      background: 'var(--iris-bg-card)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '12px',
      width: '100%'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RiExchangeLine size={13} color="#a78bfa" />
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: '#a1a1aa' }}>SYNC</span>
          <span style={{ fontSize: '7px', color: '#34d399', background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.2)', borderRadius: '999px', padding: '1px 5px' }}>LIVE</span>
        </div>
        <button onClick={loadData} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <RiRefreshLine size={10} color="#52525b" />
        </button>
      </div>

      {state && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '6px' }}>
          {[
            { icon: <RiDatabase2Line size={9} />, label: 'FACTS', value: String(state.totalFacts), color: '#60a5fa' },
            { icon: <RiBrainLine size={9} />, label: 'EVENTS', value: String(state.totalEvents), color: '#a78bfa' },
            { icon: <RiCheckDoubleLine size={9} />, label: 'TASKS', value: String(state.pendingTasks), color: '#34d399' },
            { icon: <RiEmotionLine size={9} />, label: 'MOOD', value: (state.currentMood || 'neutral').substring(0, 5), color: '#f59e0b' }
          ].map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '4px', padding: '4px 5px', textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', color: item.color }}>
                {item.icon}
                <span style={{ fontSize: '6px', fontWeight: 700, color: '#52525b' }}>{item.label}</span>
              </div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#e4e4e7', fontFamily: 'monospace', marginTop: '1px' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '4px',
          background: 'rgba(0,136,204,0.05)', border: '1px solid rgba(0,136,204,0.12)',
          borderRadius: '4px', padding: '3px 6px'
        }}>
          <RiTelegramLine size={9} color="#08c" />
          <span style={{ fontSize: '7px', fontWeight: 700, color: '#71717a' }}>TG</span>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', marginLeft: 'auto' }} />
        </div>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '4px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '4px', padding: '3px 6px'
        }}>
          <RiMacLine size={9} color="#a1a1aa" />
          <span style={{ fontSize: '7px', fontWeight: 700, color: '#71717a' }}>DESK</span>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', marginLeft: 'auto' }} />
        </div>
      </div>

      <div style={{ maxHeight: '100px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '7px', fontWeight: 700, color: '#3f3f46', letterSpacing: '0.08em' }}>SYNC LOG</span>
        {syncLog.length === 0 ? (
          <div style={{ color: '#3f3f46', fontSize: '7px', textAlign: 'center', padding: '6px', fontFamily: 'monospace' }}>No sync events</div>
        ) : (
          syncLog.slice(0, 8).map((entry, i) => {
            const color = SYNC_COLORS[entry.type] || '#71717a'
            const icon = SYNC_ICONS[entry.type] || '🔄'
            return (
              <div key={entry.id || i} style={{
                display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px', borderRadius: '3px'
              }}>
                <span style={{ fontSize: '8px' }}>{icon}</span>
                <span style={{ fontSize: '7px', color: '#71717a', flex: 1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.summary}
                </span>
                <span style={{ fontSize: '6px', fontWeight: 700, color,
                  background: `rgba(${hexToRgb(color)},0.1)`, borderRadius: '2px', padding: '0 3px' }}>
                  {entry.type.toUpperCase()}
                </span>
                <span style={{ fontSize: '6px', color: '#3f3f46', fontFamily: 'monospace' }}>
                  {formatTime(entry.timestamp)}
                </span>
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
