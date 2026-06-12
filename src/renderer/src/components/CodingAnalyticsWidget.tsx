/**
 * IRIS AI - CODING ANALYTICS WIDGET
 * Session stats, productivity score, streaks
 */
import { useEffect, useState } from 'react'
import {
  RiBarChartLine, RiTimeLine, RiFileCodeLine,
  RiFireLine, RiTrophyLine, RiArrowUpLine
} from 'react-icons/ri'

interface Session {
  id: string
  startedAt: string
  durationMs: number
  filesCreated: number
  filesModified: number
  commandsRun: number
  errorsEncountered: number
  errorsFixed: number
  buildsPassed: number
  productivityScore: number
  languages: Record<string, number>
}

interface LifetimeStats {
  totalSessions: number
  totalCodingHours: number
  totalFilesCreated: number
  totalCommandsRun: number
  totalErrorsFixed: number
  favoriteLanguage: string
  currentStreak: number
  longestStreak: number
}

export default function CodingAnalyticsWidget() {
  const [session, setSession] = useState<Session | null>(null)
  const [stats, setStats] = useState<LifetimeStats | null>(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [s, st] = await Promise.all([
        window.electron.ipcRenderer.invoke('analytics:current-session'),
        window.electron.ipcRenderer.invoke('analytics:stats')
      ])
      if (s) setSession(s)
      if (st) setStats(st)
    } catch (_e) {}
  }

  const formatDuration = (ms: number): string => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  const topLang = session?.languages
    ? Object.entries(session.languages).sort((a, b) => b[1] - a[1])[0]
    : null

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
          <RiBarChartLine size={13} color="#a78bfa" />
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: '#a1a1aa' }}>CODING</span>
          {session && (
            <span style={{ fontSize: '7px', color: '#34d399', background: 'rgba(52,211,153,0.1)',
              borderRadius: '999px', padding: '1px 5px' }}>LIVE</span>
          )}
        </div>
        <button onClick={loadData} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <RiArrowUpLine size={9} color="#52525b" />
        </button>
      </div>

      {/* Productivity score */}
      {session && (
        <div style={{
          background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.12)',
          borderRadius: '8px', padding: '8px', marginBottom: '6px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '7px', fontWeight: 700, color: '#52525b', letterSpacing: '0.08em' }}>PRODUCTIVITY SCORE</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: session.productivityScore > 60 ? '#34d399' : session.productivityScore > 30 ? '#facc15' : '#ef4444', fontFamily: 'monospace' }}>
            {session.productivityScore}
          </div>
          <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', marginTop: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${session.productivityScore}%`, height: '100%',
              background: session.productivityScore > 60 ? '#34d399' : session.productivityScore > 30 ? '#facc15' : '#ef4444',
              borderRadius: '999px', transition: 'width 1s ease-out' }} />
          </div>
        </div>
      )}

      {/* Session stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px', marginBottom: '6px' }}>
        {session ? [
          { icon: <RiTimeLine size={8} />, label: 'TIME', value: formatDuration(session.durationMs), color: '#60a5fa' },
          { icon: <RiFileCodeLine size={8} />, label: 'FILES', value: String(session.filesCreated + session.filesModified), color: '#34d399' },
          { icon: <RiFireLine size={8} />, label: 'CMDS', value: String(session.commandsRun), color: '#f97316' }
        ].map((s, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: '3px', padding: '3px 4px', textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', color: s.color }}>
              {s.icon}
              <span style={{ fontSize: '5px', fontWeight: 700, color: '#52525b' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#e4e4e7', fontFamily: 'monospace' }}>{s.value}</div>
          </div>
        )) : [
          { label: 'TIME', value: '--' }, { label: 'FILES', value: '--' }, { label: 'CMDS', value: '--' }
        ].map((s, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: '3px', padding: '3px 4px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '5px', fontWeight: 700, color: '#3f3f46' }}>{s.label}</div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#3f3f46', fontFamily: 'monospace' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Lifetime stats */}
      {stats && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '7px', color: '#71717a', background: 'rgba(255,255,255,0.03)',
            borderRadius: '3px', padding: '2px 5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <RiTrophyLine size={8} color="#facc15" /> {stats.totalCodingHours}h total
          </span>
          {stats.currentStreak > 0 && (
            <span style={{ fontSize: '7px', color: '#f97316', background: 'rgba(249,115,22,0.05)',
              borderRadius: '3px', padding: '2px 5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              🔥 {stats.currentStreak}d streak
            </span>
          )}
          {topLang && (
            <span style={{ fontSize: '7px', color: '#60a5fa', background: 'rgba(96,165,250,0.05)',
              borderRadius: '3px', padding: '2px 5px' }}>
              {topLang[0]} ({topLang[1]})
            </span>
          )}
        </div>
      )}
    </div>
  )
}
