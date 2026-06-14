/**
 * IRIS AI — MODEL HEALTH CARD (Dashboard Widget)
 * Live model status — see which AI is alive.
 */
import { useEffect, useState } from 'react'
import {
  RiServerLine, RiRefreshLine, RiCheckLine, RiCloseLine,
  RiLoader4Line, RiCloudLine, RiCpuLine, RiSpeedLine,
  RiTimerLine, RiErrorWarningLine
} from 'react-icons/ri'

interface ModelStatus {
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

const PROVIDER_ICONS: Record<string, any> = {
  groq: RiSpeedLine,
  google: RiCloudLine,
  ollama: RiCpuLine,
  huggingface: RiServerLine
}

const PROVIDER_COLORS: Record<string, string> = {
  groq: '#f97316',
  google: '#60a5fa',
  ollama: '#34d399',
  huggingface: '#a78bfa'
}

export default function ModelHealthCard() {
  const [models, setModels] = useState<ModelStatus[]>([])
  const [activeModel, setActiveModel] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadStatus = async () => {
    try {
      const [status, active] = await Promise.all([
        window.electron.ipcRenderer.invoke('model-router:status'),
        window.electron.ipcRenderer.invoke('model-router:active')
      ])
      if (status?.length) setModels(status)
      if (active) setActiveModel(active)
    } catch (_e) {}
  }

  const runHealthCheck = async () => {
    setChecking(true)
    try {
      const geminiKey = localStorage.getItem('iris_custom_api_key') || ''
      const groqKey = localStorage.getItem('iris_groq_api_key') || ''
      const hfKey = localStorage.getItem('iris_hf_api_key') || ''
      const aimlKey = localStorage.getItem('iris_aiml_api_key') || ''
      await window.electron.ipcRenderer.invoke('model-router:health-check', {
        geminiKey, groqKey, hfKey, aimlKey,
        ollamaUrl: localStorage.getItem('iris_ollama_url') || 'http://localhost:11434',
        ollamaModel: localStorage.getItem('iris_ollama_model') || 'qwen2.5vl:3b'
      })
      await loadStatus()
    } catch (_e) {}
    setChecking(false)
  }

  const getHealthColor = (model: ModelStatus): string => {
    if (!model.available) return '#ef4444'
    if (model.errorRate > 0.3) return '#f59e0b'
    return '#34d399'
  }

  const getHealthLabel = (model: ModelStatus): string => {
    if (!model.available) return 'DOWN'
    if (model.errorRate > 0.3) return 'DEGRADED'
    if (model.requestCount === 0) return 'READY'
    return 'HEALTHY'
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
          <RiServerLine size={13} color="#60a5fa" />
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: '#a1a1aa' }}>AI MODELS</span>
        </div>
        <button onClick={runHealthCheck} disabled={checking} style={{
          background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
          borderRadius: '4px', padding: '2px 6px', cursor: checking ? 'not-allowed' : 'pointer',
          color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '3px',
          fontSize: '7px', fontWeight: 700, letterSpacing: '0.05em'
        }}>
          {checking ? <RiLoader4Line size={9} style={{ animation: 'spin 1s linear infinite' }} /> : <RiRefreshLine size={9} />}
          {checking ? '...' : 'CHECK'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {models.length === 0 ? (
          <div style={{ color: '#3f3f46', fontSize: '8px', textAlign: 'center', padding: '8px', fontFamily: 'monospace' }}>LOADING...</div>
        ) : (
          models.map((model, idx) => {
            const healthColor = getHealthColor(model)
            const healthLabel = getHealthLabel(model)
            const isActive = model.name === activeModel
            const ProviderIcon = PROVIDER_ICONS[model.provider] || RiServerLine
            const providerColor = PROVIDER_COLORS[model.provider] || '#71717a'

            return (
              <div key={model.name} style={{
                background: isActive ? `rgba(${hexToRgb(providerColor)},0.05)` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? `rgba(${hexToRgb(providerColor)},0.15)` : 'rgba(255,255,255,0.04)'}`,
                borderRadius: '6px', padding: '5px 8px',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <ProviderIcon size={11} color={providerColor} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 700, color: '#e4e4e7' }}>{model.name}</span>
                    {isActive && (
                      <span style={{ fontSize: '6px', fontWeight: 700, color: '#34d399',
                        background: 'rgba(52,211,153,0.1)', borderRadius: '2px', padding: '0 4px' }}>ACTIVE</span>
                    )}
                    <span style={{ fontSize: '6px', color: '#3f3f46', marginLeft: 'auto' }}>#{idx + 1}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '6px', fontWeight: 700, color: healthColor,
                      background: `rgba(${hexToRgb(healthColor)},0.1)`, borderRadius: '2px', padding: '0 4px',
                      display: 'flex', alignItems: 'center', gap: '2px'
                    }}>
                      {!model.available ? <RiCloseLine size={7} /> :
                        model.errorRate > 0.3 ? <RiErrorWarningLine size={7} /> :
                        <RiCheckLine size={7} />}
                      {healthLabel}
                    </span>
                    {model.latencyMs !== null && (
                      <span style={{ fontSize: '7px', color: '#52525b', fontFamily: 'monospace' }}>{model.latencyMs}ms</span>
                    )}
                    <span style={{ fontSize: '7px', color: '#3f3f46', fontFamily: 'monospace' }}>{model.requestCount}req</span>
                  </div>
                </div>
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
  if (!result) return '96,165,250'
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
}
