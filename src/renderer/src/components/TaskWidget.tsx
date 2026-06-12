/**
 * IRIS AI — TASK WIDGET (Procedural Memory Desktop UI)
 * Your tasks, habits, reminders — always visible.
 */
import { useEffect, useState } from 'react'
import {
  RiCheckboxCircleLine, RiTimeLine,
  RiAddLine, RiDeleteBinLine, RiRefreshLine, RiCalendarLine
} from 'react-icons/ri'

interface ProceduralTask {
  id: string
  title: string
  detail: string
  source: 'telegram' | 'desktop' | 'voice' | 'auto'
  status: 'pending' | 'completed' | 'snoozed' | 'cancelled' | 'overdue'
  dueAt: string | null
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom'
  createdAt: string
  completedAt: string | null
  completionCount: number
  tags: string[]
  priority: number
}

const PRIORITY_COLORS: Record<number, string> = {
  5: '#ef4444', 4: '#f97316', 3: '#facc15', 2: '#60a5fa', 1: '#71717a'
}
const PRIORITY_LABELS: Record<number, string> = {
  5: 'URG', 4: 'HIGH', 3: 'MED', 2: 'LOW', 1: 'MIN'
}
const RECURRENCE_ICONS: Record<string, string> = {
  once: '📌', daily: '🔄', weekly: '📅', monthly: '🗓', custom: '🔁'
}

export default function TaskWidget() {
  const [tasks, setTasks] = useState<ProceduralTask[]>([])
  const [newTask, setNewTask] = useState('')
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<'pending' | 'all' | 'completed'>('pending')

  useEffect(() => {
    loadTasks()
    const interval = setInterval(loadTasks, 5000)
    return () => clearInterval(interval)
  }, [filter])

  const loadTasks = async () => {
    try {
      let result: ProceduralTask[] = []
      if (filter === 'pending') {
        const pending = await window.electron.ipcRenderer.invoke('procedural:get-pending') || []
        const overdue = await window.electron.ipcRenderer.invoke('procedural:get-overdue') || []
        result = [...overdue, ...pending]
      } else if (filter === 'completed') {
        const all: ProceduralTask[] = await window.electron.ipcRenderer.invoke('procedural:get-all') || []
        result = all.filter(t => t.status === 'completed')
      } else {
        result = await window.electron.ipcRenderer.invoke('procedural:get-all') || []
      }
      setTasks(result)
    } catch (_e) {}
  }

  const handleCreate = async () => {
    if (!newTask.trim() || creating) return
    setCreating(true)
    try {
      await window.electron.ipcRenderer.invoke('procedural:create-nl', newTask, 'desktop')
      setNewTask('')
      await loadTasks()
    } catch (_e) {}
    setCreating(false)
  }

  const handleComplete = async (id: string) => {
    await window.electron.ipcRenderer.invoke('procedural:complete', id)
    await loadTasks()
  }

  const handleSnooze = async (id: string) => {
    await window.electron.ipcRenderer.invoke('procedural:snooze', id)
    await loadTasks()
  }

  const handleCancel = async (id: string) => {
    await window.electron.ipcRenderer.invoke('procedural:cancel', id)
    await loadTasks()
  }

  const formatDue = (dueAt: string | null): string => {
    if (!dueAt) return 'No deadline'
    const d = new Date(dueAt)
    const diff = d.getTime() - Date.now()
    if (diff < 0) return `Overdue ${formatDuration(Math.abs(diff))}`
    if (diff < 3600000) return `In ${Math.ceil(diff / 60000)}m`
    if (diff < 86400000) return `In ${Math.ceil(diff / 3600000)}h`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const isOverdue = (task: ProceduralTask): boolean => {
    if (!task.dueAt || task.status === 'completed') return false
    return new Date(task.dueAt).getTime() < Date.now()
  }

  const overdueCount = tasks.filter(t => isOverdue(t)).length
  const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'overdue').length

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
          <RiCalendarLine size={13} color="#34d399" />
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: '#a1a1aa' }}>TASKS</span>
          {overdueCount > 0 && (
            <span style={{ fontSize: '7px', fontWeight: 700, color: '#ef4444',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '999px', padding: '1px 5px' }}>{overdueCount} LATE</span>
          )}
          <span style={{ fontSize: '7px', color: '#52525b' }}>{pendingCount} active</span>
        </div>
        <button onClick={loadTasks} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <RiRefreshLine size={10} color="#52525b" />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
        {(['pending', 'all', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontSize: '7px', fontWeight: 700, letterSpacing: '0.05em',
            padding: '2px 6px', borderRadius: '3px', cursor: 'pointer',
            border: filter === f ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
            background: filter === f ? 'rgba(52,211,153,0.08)' : 'transparent',
            color: filter === f ? '#34d399' : '#52525b'
          }}>{f.toUpperCase()}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
        <input
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Add task... ('remind me tomorrow 9am')"
          style={{
            flex: 1, fontSize: '9px', fontFamily: 'monospace',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px', padding: '4px 8px', color: '#e4e4e7', outline: 'none'
          }}
        />
        <button onClick={handleCreate} disabled={creating || !newTask.trim()} style={{
          background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
          borderRadius: '4px', padding: '4px 6px', cursor: creating ? 'not-allowed' : 'pointer', color: '#34d399'
        }}><RiAddLine size={10} /></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '180px', overflow: 'auto' }}>
        {tasks.length === 0 ? (
          <div style={{ color: '#3f3f46', fontSize: '8px', textAlign: 'center', padding: '10px', fontFamily: 'monospace' }}>
            {filter === 'completed' ? 'NO COMPLETED TASKS' : 'ALL CLEAR'}</div>
        ) : (
          tasks.slice(0, 15).map(task => {
            const overdue = isOverdue(task)
            const pColor = PRIORITY_COLORS[task.priority] || '#71717a'
            const done = task.status === 'completed'
            return (
              <div key={task.id} style={{
                background: done ? 'rgba(52,211,153,0.03)' :
                  overdue ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${done ? 'rgba(52,211,153,0.08)' :
                  overdue ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: '6px', padding: '5px 7px',
                opacity: done ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: '5px'
              }}>
                <div style={{ width: '3px', height: '14px', borderRadius: '2px',
                  background: done ? '#34d399' : pColor, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '8px', fontWeight: 600, color: done ? '#71717a' : '#e4e4e7',
                    textDecoration: done ? 'line-through' : 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                    <span style={{ fontSize: '7px', color: overdue ? '#ef4444' : '#52525b', fontFamily: 'monospace' }}>
                      {task.dueAt ? formatDue(task.dueAt) : '\u2014'}
                    </span>
                    {task.recurrence !== 'once' && (
                      <span style={{ fontSize: '7px', color: '#60a5fa' }}>{RECURRENCE_ICONS[task.recurrence]}</span>
                    )}
                    <span style={{ fontSize: '6px', fontWeight: 700, color: pColor,
                      background: `rgba(${hexToRgb(pColor)},0.1)`, borderRadius: '2px', padding: '0 3px' }}>
                      {PRIORITY_LABELS[task.priority] || 'LOW'}
                    </span>
                  </div>
                </div>
                {!done && (
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button onClick={() => handleComplete(task.id)} title="Done" style={{
                      background: 'rgba(52,211,153,0.1)', border: 'none', borderRadius: '3px',
                      padding: '2px', cursor: 'pointer', color: '#34d399'
                    }}><RiCheckboxCircleLine size={9} /></button>
                    <button onClick={() => handleSnooze(task.id)} title="Snooze" style={{
                      background: 'rgba(250,204,21,0.1)', border: 'none', borderRadius: '3px',
                      padding: '2px', cursor: 'pointer', color: '#facc15'
                    }}><RiTimeLine size={9} /></button>
                    <button onClick={() => handleCancel(task.id)} title="Cancel" style={{
                      background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '3px',
                      padding: '2px', cursor: 'pointer', color: '#ef4444'
                    }}><RiDeleteBinLine size={9} /></button>
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

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`
  return `${Math.floor(ms / 86400000)}d`
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '113,113,122'
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
}
