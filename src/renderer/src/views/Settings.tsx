import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as faceapi from 'face-api.js'
import { GiArtificialIntelligence } from 'react-icons/gi'
import {
  RiKey2Line,
  RiSave3Line,
  RiUserVoiceLine,
  RiUserLine,
  RiLockPasswordLine,
  RiScan2Line,
  RiAddLine,
  RiRecordCircleLine,
  RiLock2Line,
  RiSettings4Line,
  RiShieldKeyholeLine,
  RiPlugLine,
  RiBrainLine,
  RiCloudLine,
  RiCpuLine,
  RiTerminalWindowLine,
  RiRefreshLine,
  RiDownloadCloud2Line,
  RiRocketLine,
  RiTelegramLine,
  RiGhostLine,
  RiEyeLine
} from 'react-icons/ri'

interface SettingsProps {
  isSystemActive: boolean
}

type TabType = 'updates' | 'general' | 'keys' | 'models' | 'telegram' | 'security'

const SettingsView = ({ isSystemActive }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('updates')

  const [voice, setVoice] = useState<'MALE' | 'FEMALE'>(
    (localStorage.getItem('iris_voice_profile') as 'MALE' | 'FEMALE') || 'MALE'
  )
  const [personality, setPersonality] = useState('')
  const [userName, setUserName] = useState(localStorage.getItem('iris_user_name') || '')

  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('iris_custom_api_key') || '')
  const [groqKey, setGroqKey] = useState(localStorage.getItem('iris_groq_api_key') || '')
  const [hfKey, setHfKey] = useState(localStorage.getItem('iris_hf_api_key') || '')
  const [tailvyKey, setTailvyKey] = useState(localStorage.getItem('iris_tailvy_api_key') || '')

  const [telegramToken, setTelegramToken] = useState(localStorage.getItem('iris_telegram_token') || '')
  const [telegramChatIds, setTelegramChatIds] = useState(localStorage.getItem('iris_telegram_chatids') || '')
  const [telegramStatus, setTelegramStatus] = useState<'idle' | 'running' | 'error'>('idle')

  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(false)
  const [authPin, setAuthPin] = useState('')
  const [authError, setAuthError] = useState(false)

  const [newPin, setNewPin] = useState('')
  const [faceCount, setFaceCount] = useState(0)

  const [isScanningFace, setIsScanningFace] = useState(false)
  const [enrollStatus, setEnrollStatus] = useState('')
  const [modelStatus, setModelStatus] = useState<any[]>([])
  const [recommendedModels, setRecommendedModels] = useState<any[]>([])
  const [soulLevel, setSoulLevel] = useState<string>('jarvis')
  const [ambientMode, setAmbientMode] = useState<string>('companion')
  const videoRef = useRef<HTMLVideoElement>(null)

  const [appVersion, setAppVersion] = useState('1.3.0')
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'
  >('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateNotes, setUpdateNotes] = useState('No new updates detected.')
  const [downloadProgress, setDownloadProgress] = useState(0)

  useEffect(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke('get-personality').then((res) => {
        if (res) setPersonality(res)
      })
      window.electron.ipcRenderer
        .invoke('check-vault-status')
        .then((res) => setFaceCount(res?.faceCount || 0))

      window.electron.ipcRenderer.invoke('get-app-version').then((v) => setAppVersion(v))

      // Load model health status
      window.electron.ipcRenderer.invoke('model-router:status').then((status: any[]) => {
        if (status?.length) setModelStatus(status)
      }).catch(() => {})

      // Load recommended models
      window.electron.ipcRenderer.invoke('model-router:recommended').then((models: any[]) => {
        if (models?.length) setRecommendedModels(models)
      }).catch(() => {})

      // Load soul config
      window.electron.ipcRenderer.invoke('soul:config').then((cfg: any) => {
        if (cfg) {
          setSoulLevel(cfg.level || 'jarvis')
        }
      }).catch(() => {})
      window.electron.ipcRenderer.invoke('soul:ambient-state').then((state: any) => {
        if (state) setAmbientMode(state.mode || 'companion')
      }).catch(() => {})

      window.electron.ipcRenderer.on('updater-event', (_e, { status, data, error }) => {
        if (status === 'checking') setUpdateStatus('checking')
        if (status === 'available') {
          setUpdateStatus('available')
          setUpdateVersion(data.version)
          setUpdateNotes(data.releaseNotes || 'Bug fixes and performance improvements.')
        }
        if (status === 'not-available') {
          setUpdateStatus('idle')
          setUpdateNotes('System is up to date.')
        }
        if (status === 'downloading') {
          setUpdateStatus('downloading')
          setDownloadProgress(Math.round(data.percent))
        }
        if (status === 'downloaded') setUpdateStatus('ready')
        if (status === 'error') {
          setUpdateStatus('error')
          setUpdateNotes(`Error: ${error}`)
        }
      })
    }
    return () => {
      if (window.electron?.ipcRenderer)
        window.electron.ipcRenderer.removeAllListeners('updater-event')
    }
  }, [])

  const checkForUpdates = () => window.electron.ipcRenderer.invoke('check-for-updates')
  const downloadUpdate = () => window.electron.ipcRenderer.invoke('download-update')
  const installUpdate = () => window.electron.ipcRenderer.invoke('install-update')

  const handleVoiceChange = (v: 'MALE' | 'FEMALE') => {
    if (isSystemActive) return
    setVoice(v)
    localStorage.setItem('iris_voice_profile', v)
  }

  const handlePersonalityChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
    if (words.length <= 150) setPersonality(text)
  }

  const savePersonality = async () => {
    if (window.electron?.ipcRenderer) {
      await window.electron.ipcRenderer.invoke('set-personality', personality)
      alert('Personality Matrix Saved Securely to OS.')
    }
  }

  const saveUserName = () => {
    localStorage.setItem('iris_user_name', userName)
    alert('User Designation Saved.')
  }

  const saveApiKeys = async () => {
    localStorage.setItem('iris_custom_api_key', geminiKey)
    localStorage.setItem('iris_groq_api_key', groqKey)
    localStorage.setItem('iris_hf_api_key', hfKey)
    localStorage.setItem('iris_tailvy_api_key', tailvyKey)

    if (window.electron?.ipcRenderer) {
      try {
        await window.electron.ipcRenderer.invoke('secure-save-keys', { groqKey, geminiKey })
      } catch (e) {}
    }
    alert(
      'All Neural Uplinks (API Keys) secured locally and in OS Vault. Restart AI modules to apply.'
    )
  }

  const currentWordCount = personality
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length

  const unlockSecurityModule = async () => {
    if (!window.electron?.ipcRenderer) return
    const isValid = await window.electron.ipcRenderer.invoke('verify-vault-pin', authPin)
    if (isValid) {
      setIsSecurityUnlocked(true)
      setAuthPin('')
    } else {
      setAuthError(true)
      setTimeout(() => setAuthError(false), 1000)
    }
  }

  const updateMasterPin = async () => {
    if (newPin.length !== 4 || !window.electron?.ipcRenderer) return
    await window.electron.ipcRenderer.invoke('setup-vault-pin', newPin)
    setNewPin('')
    alert('Master PIN Updated Successfully.')
  }

  const startFaceEnrollment = async () => {
    setIsScanningFace(true)
    setEnrollStatus('INITIALIZING CAMERA...')
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('./models')
      ])

      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setEnrollStatus('POSITION FACE IN FRAME')

        const scanInterval = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState !== 4) return
          const detection = await faceapi
            .detectSingleFace(videoRef.current)
            .withFaceLandmarks()
            .withFaceDescriptor()

          if (detection) {
            clearInterval(scanInterval)
            setEnrollStatus('FACE ACQUIRED. ENCRYPTING...')
            const descriptorArray = Array.from(detection.descriptor)

            if (window.electron?.ipcRenderer) {
              await window.electron.ipcRenderer.invoke('setup-vault-face', descriptorArray)
            }

            stream.getTracks().forEach((t) => t.stop())
            setIsScanningFace(false)
            setFaceCount((prev) => prev + 1)
            alert('New Biometric Identity Saved.')
          }
        }, 1000)
      }
    } catch (e) {
      setEnrollStatus('CAMERA ERROR')
      setTimeout(() => setIsScanningFace(false), 2000)
    }
  }

  const cardClass =
    'bg-[#0f0f13] border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col gap-5 hover:border-white/20 transition-all shadow-lg'
  const inputContainerClass =
    'flex items-center border border-white/10 bg-[var(--iris-bg-input)] rounded-lg px-4 py-3 focus-within:border-white/30 focus-within:bg-black transition-all duration-300 w-full'
  const titleClass = 'text-sm font-semibold text-white flex items-center gap-2'

  return (
    <div className="flex-1 p-6 md:p-10 lg:p-16 flex flex-col items-center bg-black min-h-screen text-zinc-100 overflow-y-auto scrollbar-small">
      <motion.div
        className="w-full max-w-4xl flex flex-col gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-[#111] rounded-2xl border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.03)]">
              <GiArtificialIntelligence size={36} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Command Center</h2>
              <p className="text-xs text-zinc-400 font-mono mt-1 tracking-widest flex items-center gap-2 uppercase">
                <RiRecordCircleLine
                  className={`${isSystemActive ? 'text-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'text-zinc-600'}`}
                  size={14}
                />
                {isSystemActive ? 'System Online' : 'System Offline'}
              </p>
            </div>
          </div>

          <div className="flex bg-[#0a0a0c] p-1 rounded-xl border border-white/10 w-full md:w-fit shadow-lg overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'updates' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <RiTerminalWindowLine size={16} /> SYSTEM
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'general' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <RiSettings4Line size={16} /> GENERAL
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'keys' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <RiPlugLine size={16} /> API KEYS
            </button>
            <button
              onClick={() => setActiveTab('telegram')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'telegram' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <RiRocketLine size={16} /> REMOTE
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'security' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <RiShieldKeyholeLine size={16} /> SECURITY
            </button>
          </div>
        </div>

        <div className="relative min-h-125 pb-12 mt-2">
          <AnimatePresence mode="wait">
            {activeTab === 'updates' && (
              <motion.div
                key="updates"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 absolute w-full"
              >
                <div className={`${cardClass} md:col-span-1 border-emerald-500/20`}>
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className={titleClass}>
                      <RiRocketLine className="text-emerald-400" size={18} /> OS Firmware
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded font-mono font-bold tracking-widest">
                      v{appVersion}
                    </span>
                  </div>

                  <div className="flex flex-col gap-4 items-center justify-center flex-1 py-4 text-center">
                    {updateStatus === 'idle' || updateStatus === 'error' ? (
                      <>
                        <RiTerminalWindowLine size={48} className="text-zinc-700" />
                        <p className="text-xs text-zinc-400 font-mono">Current build is stable.</p>
                        <button
                          onClick={checkForUpdates}
                          className="mt-2 w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <RiRefreshLine size={16} /> CHECK FOR UPDATES
                        </button>
                      </>
                    ) : updateStatus === 'checking' ? (
                      <>
                        <RiRefreshLine size={48} className="text-emerald-500 animate-spin" />
                        <p className="text-xs text-emerald-400 font-mono animate-pulse">
                          PINGING NEURAL NETWORK...
                        </p>
                      </>
                    ) : updateStatus === 'available' ? (
                      <>
                        <RiDownloadCloud2Line size={48} className="text-cyan-400" />
                        <p className="text-xs text-cyan-400 font-mono">
                          NEW BUILD FOUND: v{updateVersion}
                        </p>
                        <button
                          onClick={downloadUpdate}
                          className="mt-2 w-full py-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-black font-bold tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all border border-cyan-500/50 cursor-pointer"
                        >
                          <RiDownloadCloud2Line size={16} /> INITIALIZE DOWNLOAD
                        </button>
                      </>
                    ) : updateStatus === 'downloading' ? (
                      <div className="w-full flex flex-col gap-3">
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                          <span>DOWNLOADING PATCH...</span>
                          <span>{downloadProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <RiRecordCircleLine size={48} className="text-emerald-400 animate-pulse" />
                        <p className="text-xs text-emerald-400 font-mono">PATCH DOWNLOADED</p>
                        <button
                          onClick={installUpdate}
                          className="mt-2 w-full py-3 rounded-lg bg-emerald-500 text-black font-bold tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
                        >
                          <RiRocketLine size={16} /> EXECUTE RESTART
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className={`${cardClass} md:col-span-1`}>
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className={titleClass}>
                      <RiTerminalWindowLine className="text-zinc-400" size={18} /> Patch Notes
                    </span>
                  </div>
                  <div className="flex-1 bg-[#050505] border border-white/5 rounded-xl p-4 overflow-y-auto max-h-60 scrollbar-small">
                    <pre className="text-[11px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
                      {updateNotes}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- TAB 2: GENERAL --- */}
            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 absolute w-full"
              >
                <div className={`${cardClass} md:col-span-2`}>
                  <div className="flex justify-between items-center">
                    <span className={titleClass}>
                      <RiUserLine className="text-zinc-400" size={18} /> AI Personality Matrix
                    </span>
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-[10px] font-mono tracking-widest ${currentWordCount >= 150 ? 'text-red-400' : 'text-zinc-400'}`}
                      >
                        {currentWordCount} / 150 WORDS
                      </span>
                      <button
                        onClick={savePersonality}
                        className="text-zinc-400 hover:text-white transition-colors bg-white/5 p-2 rounded-md hover:bg-white/10 border border-white/5"
                      >
                        <RiSave3Line size={18} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={personality}
                    onChange={handlePersonalityChange}
                    placeholder="Define who IRIS is. Example: 'You are a sassy, highly technical assistant...'"
                    className="bg-[#050505] border border-white/10 rounded-lg p-4 text-sm text-zinc-200 h-32 resize-none focus:border-white/30 outline-none transition-all scrollbar-small"
                  />
                </div>

                <div className={cardClass}>
                  <div className="flex justify-between items-end">
                    <span className={titleClass}>
                      <RiUserLine className="text-zinc-400" size={18} /> User Designation
                    </span>
                  </div>
                  <div className={inputContainerClass}>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter operator name..."
                      className="bg-transparent border-none outline-none text-sm text-zinc-100 w-full placeholder:text-zinc-600 font-medium"
                    />
                    <button
                      onClick={saveUserName}
                      className="text-zinc-500 hover:text-white transition-colors ml-2"
                    >
                      <RiSave3Line size={20} />
                    </button>
                  </div>
                </div>

                <div className={`${cardClass} relative`}>
                  <div className="flex justify-between items-center">
                    <span className={titleClass}>
                      <RiUserVoiceLine className="text-zinc-400" size={18} /> OS Voice Profile
                    </span>
                    {isSystemActive && (
                      <span className="text-[10px] text-red-400 font-mono tracking-widest flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                        <RiLock2Line /> LOCKED AS IRIS IS CONNECTED
                      </span>
                    )}
                  </div>
                  <div
                    className={`flex gap-3 h-12 mt-1 ${isSystemActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {(['FEMALE', 'MALE'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleVoiceChange(s)}
                        disabled={isSystemActive}
                        className={`cursor-pointer flex-1 flex items-center justify-center text-[12px] font-bold rounded-lg transition-all tracking-widest border ${
                          voice === s
                            ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                            : 'bg-[#050505] border-white/10 text-zinc-400 hover:text-white hover:border-white/30'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {isSystemActive && (
                    <div
                      className="absolute inset-0 z-10"
                      title="Disconnect AI to change voice"
                    ></div>
                  )}
                </div>

                {/* ── SOUL: PERSONALITY LEVEL ── */}
                <div className={cardClass}>
                  <span className={titleClass}>
                    <RiGhostLine className="text-zinc-400" size={18} /> Personality Mode
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'professional', label: '💼 Professional', desc: 'Clear, concise, efficient' },
                      { id: 'friendly', label: '😊 Friendly', desc: 'Warm, encouraging, emoji' },
                      { id: 'jarvis', label: '🎩 JARVIS', desc: 'British elegance, "sir"' },
                      { id: 'snarky', label: '😏 Snarky', desc: 'Witty, playful commentary' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={async () => {
                          try {
                            await window.electron.ipcRenderer.invoke('soul:set-config', { level: p.id })
                            setSoulLevel(p.id)
                          } catch {}
                        }}
                        className={`cursor-pointer p-3 rounded-lg border text-left transition-all ${
                          soulLevel === p.id
                            ? 'border-white/40 bg-white/10 text-white'
                            : 'border-white/5 bg-[#050505] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{p.label}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── SOUL: AMBIENT MODE ── */}
                <div className={cardClass}>
                  <span className={titleClass}>
                    <RiEyeLine className="text-zinc-400" size={18} /> Ambient Awareness
                  </span>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'silent', label: '🔇 Silent', desc: 'Only respond to commands' },
                      { id: 'companion', label: '👋 Companion', desc: 'Occasional helpful nudges' },
                      { id: 'jarvis', label: '🧠 JARVIS Mode', desc: 'Full ambient awareness' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={async () => {
                          try {
                            await window.electron.ipcRenderer.invoke('soul:set-ambient-mode', m.id)
                            setAmbientMode(m.id)
                          } catch {}
                        }}
                        className={`cursor-pointer p-3 rounded-lg border text-left transition-all ${
                          ambientMode === m.id
                            ? 'border-white/40 bg-white/10 text-white'
                            : 'border-white/5 bg-[#050505] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{m.label}</span>
                          {ambientMode === m.id && <span className="text-[9px] text-green-400 font-mono">ACTIVE</span>}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'keys' && (
              <motion.div
                key="keys"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 gap-6 absolute w-full"
              >
                <div className={`${cardClass} gap-6`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <span className={titleClass}>
                      <RiKey2Line className="text-zinc-400" size={18} /> External API Endpoints
                    </span>
                    <button
                      onClick={saveApiKeys}
                      className="bg-white text-black px-6 py-2.5 rounded-lg text-xs font-bold tracking-widest hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RiSave3Line size={16} /> SAVE ALL KEYS
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-2">
                        <RiBrainLine size={14} /> Gemini Pro Core
                      </label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder="AIzaSy_..."
                          className="bg-transparent border-none outline-none text-sm font-mono text-zinc-100 w-full placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-2">
                        <RiCpuLine size={14} /> Groq Fast Inferencing
                      </label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={groqKey}
                          onChange={(e) => setGroqKey(e.target.value)}
                          placeholder="gsk_..."
                          className="bg-transparent border-none outline-none text-sm font-mono text-zinc-100 w-full placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-2">
                        <RiCloudLine size={14} /> Hugging Face Vision
                      </label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={hfKey}
                          onChange={(e) => setHfKey(e.target.value)}
                          placeholder="hf_..."
                          className="bg-transparent border-none outline-none text-sm font-mono text-zinc-100 w-full placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-2">
                        <RiPlugLine size={14} /> Tailvy Builder Agent
                      </label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={tailvyKey}
                          onChange={(e) => setTailvyKey(e.target.value)}
                          placeholder="tlv_..."
                          className="bg-transparent border-none outline-none text-sm font-mono text-zinc-100 w-full placeholder:text-zinc-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#050505] border border-white/5 p-4 rounded-xl mt-2 flex items-start gap-3">
                    <RiShieldKeyholeLine className="text-zinc-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                      [SECURITY NOTICE]: All API keys are encrypted and stored strictly in your
                      local OS. IRIS does not transmit these keys to any centralized server. You
                      maintain full ownership and billing control over your provider endpoints.
                    </p>
                  </div>

                  {/* ── MODEL HEALTH DASHBOARD ── */}
                  <div className="border border-white/10 rounded-2xl overflow-hidden mt-2">
                    <div className="flex items-center justify-between px-5 py-3 bg-white/[0.02] border-b border-white/5">
                      <span className="text-[10px] text-zinc-300 font-mono tracking-widest uppercase flex items-center gap-2">
                        <RiCpuLine size={14} /> AI Model Fallback Chain
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            const status = await window.electron.ipcRenderer.invoke('model-router:status')
                            setModelStatus(status)
                          } catch {}
                        }}
                        className="text-[10px] text-zinc-400 hover:text-white font-mono tracking-widest cursor-pointer transition-colors"
                      >
                        REFRESH
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
                      {modelStatus.length === 0 && (
                        <p className="text-xs text-zinc-500 col-span-4 text-center py-4">
                          Click REFRESH to check model health
                        </p>
                      )}
                      {modelStatus.map((m: any, i: number) => (
                        <div
                          key={m.name}
                          className={`p-3 rounded-xl border text-center ${
                            i === 0 ? 'border-blue-500/30 bg-blue-500/5' :
                            i === 1 ? 'border-green-500/30 bg-green-500/5' :
                            i === 2 ? 'border-yellow-500/30 bg-yellow-500/5' :
                            'border-red-500/30 bg-red-500/5'
                          }`}
                        >
                          <div className="text-xs font-bold text-zinc-200 mb-1">{m.name}</div>
                          <div className={`text-[10px] font-mono ${
                            m.available ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {m.available ? '● ONLINE' : '● OFFLINE'}
                          </div>
                          {m.latencyMs && (
                            <div className="text-[10px] text-zinc-500 mt-1">{m.latencyMs}ms</div>
                          )}
                          <div className="text-[9px] text-zinc-600 mt-1">
                            {m.requestCount || 0} requests
                          </div>
                          {m.lastError && (
                            <div className="text-[9px] text-red-400 mt-1 truncate" title={m.lastError}>
                              {m.lastError.substring(0, 30)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="px-5 pb-3">
                      <p className="text-[9px] text-zinc-600 font-mono">
                        Chain: Gemini → Groq → HuggingFace → Ollama (local). Auto-switches on failure.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- TAB 4: TELEGRAM REMOTE --- */}
            {activeTab === 'models' && (
              <motion.div
                key="models"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full rounded-3xl overflow-hidden shadow-2xl border border-white/5"
              >
                <div className="bg-[#0a0a0c] p-6 md:p-8 rounded-3xl border border-white/5 flex flex-col gap-6">
                  <span className={titleClass}>
                    <RiCpuLine className="text-zinc-400" size={18} /> Local Models (Ollama)
                  </span>

                  <div className="bg-[#050505] border border-white/5 p-4 rounded-xl">
                    <p className="text-[10px] text-emerald-400/70 font-mono tracking-widest uppercase mb-2 font-bold">
                      YOUR ACTIVE MODEL
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">&#x1F9E0;</span>
                      <div>
                        <p className="text-sm font-bold text-white">qwen3:4b</p>
                        <p className="text-[10px] text-zinc-400">~2.6 GB RAM &#x2022; Primary local model &#x2022; Smart + fast</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#050505] border border-white/5 p-4 rounded-xl">
                    <p className="text-[10px] text-cyan-400/70 font-mono tracking-widest uppercase mb-3 font-bold">
                      RECOMMENDED MODELS
                    </p>
                    <div className="space-y-2">
                      {recommendedModels.length > 0 ? recommendedModels.map((m: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-black/30 border border-white/5">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-white font-mono">{m.name}</p>
                            <p className="text-[9px] text-zinc-500">{m.why} &#x2022; {m.ram} RAM &#x2022; {m.disk} disk</p>
                          </div>
                          <code className="text-[9px] text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 rounded px-2 py-1 font-mono">
                            {m.cmd}
                          </code>
                        </div>
                      )) : (
                        <p className="text-[10px] text-zinc-500">Loading recommended models...</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#050505] border border-white/5 p-4 rounded-xl">
                    <p className="text-[10px] text-amber-400/70 font-mono tracking-widest uppercase mb-2 font-bold">
                      MODEL HEALTH STATUS
                    </p>
                    {modelStatus.length > 0 ? (
                      <div className="space-y-2">
                        {modelStatus.map((m: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-black/30 border border-white/5">
                            <div className={`w-2 h-2 rounded-full ${m.available ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-white">{m.name}</p>
                              <p className="text-[9px] text-zinc-500">{m.provider} &#x2022; {m.latencyMs ? m.latencyMs + 'ms' : 'no data'} &#x2022; {m.requestCount} req</p>
                            </div>
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded ${m.available ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                              {m.available ? 'UP' : 'DOWN'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-500">No model status data yet.</p>
                    )}
                    <button
                      onClick={async () => {
                        const geminiKey = localStorage.getItem('iris_custom_api_key') || ''
                        const groqKey = localStorage.getItem('iris_groq_api_key') || ''
                        const hfKey = localStorage.getItem('iris_hf_api_key') || ''
                        const result = await window.electron.ipcRenderer.invoke('model-router:health-check', {
                          geminiKey, groqKey, hfKey, ollamaUrl: 'http://localhost:11434'
                        })
                        if (result) setModelStatus(result)
                      }}
                      className="mt-3 w-full py-2 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] font-bold tracking-widest hover:bg-white/10 transition-all cursor-pointer"
                    >
                      RUN HEALTH CHECK
                    </button>
                  </div>

                  <div className="bg-[#050505] border border-white/5 p-4 rounded-xl">
                    <p className="text-[10px] text-zinc-400/70 font-mono tracking-widest uppercase mb-2 font-bold">
                      FALLBACK CHAIN
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      <b className="text-white">Groq</b> (cloud, 100ms) &#x2192; <b className="text-white">Gemini Flash</b> (cloud, long context) &#x2192; <b className="text-emerald-400">Ollama qwen3:4b</b> (local, offline) &#x2192; <b className="text-white">HuggingFace</b> (cloud, last resort)
                    </p>
                    <p className="text-[9px] text-zinc-600 mt-2 font-mono">
                      Auto-switches on failure. Health tracked persistently.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'telegram' && (
              <motion.div
                key="telegram"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full rounded-3xl overflow-hidden shadow-2xl border border-white/5 absolute"
              >
                <div className={`${cardClass}`}>
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className={titleClass}>
                      <RiRocketLine className="text-cyan-400" size={18} /> Telegram Remote Control
                    </span>
                    <span
                      className={`text-[10px] px-3 py-1 rounded font-mono font-bold tracking-widest border ${telegramStatus === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}
                    >
                      {telegramStatus === 'running' ? '● CONNECTED' : '○ OFFLINE'}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    Control your entire PC from Telegram on your phone. Send commands, take screenshots, run terminal commands, manage files, and more — all remotely via your Telegram bot.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-2">
                        🤖 Bot Token
                      </label>
                      <div className={inputContainerClass}>
                        <input
                          type="password"
                          value={telegramToken}
                          onChange={(e) => setTelegramToken(e.target.value)}
                          placeholder="123456:ABC-DEF..."
                          className="bg-transparent border-none outline-none text-sm font-mono text-zinc-100 w-full placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-2">
                        💬 Your Chat ID(s)
                      </label>
                      <div className={inputContainerClass}>
                        <input
                          type="text"
                          value={telegramChatIds}
                          onChange={(e) => setTelegramChatIds(e.target.value)}
                          placeholder="123456789 (comma-separated for multiple)"
                          className="bg-transparent border-none outline-none text-sm font-mono text-zinc-100 w-full placeholder:text-zinc-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={async () => {
                        if (!telegramToken || !telegramChatIds) {
                          alert('Please enter Bot Token and Chat ID first.')
                          return
                        }
                        localStorage.setItem('iris_telegram_token', telegramToken)
                        localStorage.setItem('iris_telegram_chatids', telegramChatIds)

                        const geminiKey = localStorage.getItem('iris_custom_api_key') || ''
                        const groqKey = localStorage.getItem('iris_groq_api_key') || ''

                        const result = await window.electron.ipcRenderer.invoke('telegram-start', {
                          token: telegramToken,
                          allowedChatIds: telegramChatIds.split(',').map((s: string) => s.trim()),
                          geminiKey,
                          groqKey
                        })

                        if (result.success) {
                          setTelegramStatus('running')
                        } else {
                          alert('Failed: ' + result.message)
                          setTelegramStatus('error')
                        }
                      }}
                      className="flex-1 py-3 rounded-lg bg-cyan-600 text-white font-bold tracking-widest text-[12px] flex items-center justify-center gap-2 hover:bg-cyan-500 transition-all shadow-lg cursor-pointer"
                    >
                      🚀 START REMOTE
                    </button>
                    <button
                      onClick={async () => {
                        const result = await window.electron.ipcRenderer.invoke('telegram-stop')
                        if (result.success) setTelegramStatus('idle')
                      }}
                      className="px-6 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-bold tracking-widest text-[12px] flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all cursor-pointer"
                    >
                      ⏹ STOP
                    </button>
                  </div>

                  <div className="bg-[#050505] border border-white/5 p-4 rounded-xl mt-4">
                    <p className="text-[10px] text-cyan-400/70 font-mono tracking-widest uppercase mb-2 font-bold">
                      📋 HOW TO SETUP
                    </p>
                    <ol className="text-[10px] text-zinc-400 font-mono leading-relaxed space-y-1">
                      <li>1. Open Telegram, search <code className="text-white">@BotFather</code></li>
                      <li>2. Send <code className="text-white">/newbot</code>, follow prompts</li>
                      <li>3. Copy the Bot Token and paste above</li>
                      <li>4. Send any message to your bot</li>
                      <li>5. Visit <code className="text-white">https://api.telegram.org/bot{'{TOKEN}'}/getUpdates</code></li>
                      <li>6. Find your <code className="text-white">chat.id</code> number and paste above</li>
                      <li>7. Click START REMOTE — done! 🎉</li>
                    </ol>
                  </div>

                  <div className="bg-[#050505] border border-white/5 p-4 rounded-xl mt-2">
                    <p className="text-[10px] text-zinc-400/60 font-mono leading-relaxed">
                      <b className="text-zinc-300">Available commands on Telegram:</b><br />
                      /status • /apps • /launch • /kill • /screenshot • /terminal • /browse • /read • /search • /note • /weather • /stock • /volume • /lock • /web • /open • /getfile • /download • /wormhole • /location<br /><br />
                      💡 Or just type naturally — AI will understand: <i>"show me my screen"</i>, <i>"open vscode"</i>, <i>"what's the weather"</i>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- TAB 5: SECURITY --- */}
            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full rounded-3xl overflow-hidden shadow-2xl border border-white/5 absolute"
              >
                <AnimatePresence>
                  {!isSecurityUnlocked && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                      className="absolute inset-0 z-20 backdrop-blur-2xl bg-black/70 border border-white/10 rounded-3xl flex flex-col items-center justify-center"
                    >
                      <div className="bg-[#111] p-5 rounded-full mb-6 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                        <RiLockPasswordLine size={40} className="text-white" />
                      </div>
                      <p className="text-xs text-zinc-300 font-mono tracking-widest uppercase mb-6 font-semibold">
                        Authenticate to access Vault Settings
                      </p>
                      <div className="flex gap-3 items-center h-12">
                        <input
                          type="password"
                          maxLength={4}
                          pattern="\d*"
                          value={authPin}
                          onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="PIN"
                          className={`h-full bg-[#050505] border w-32 rounded-lg text-center text-xl tracking-[0.5em] text-white outline-none transition-colors ${authError ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-white/20 focus:border-white focus:bg-[#111]'}`}
                        />
                        <button
                          onClick={unlockSecurityModule}
                          className="h-full px-8 bg-white text-black text-xs font-bold tracking-widest rounded-lg hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer"
                        >
                          UNLOCK
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0a0a0c] p-6 rounded-3xl border border-white/5">
                  <div className="bg-[#111113] border border-white/10 p-7 rounded-2xl flex flex-col gap-5">
                    <span className={titleClass}>
                      <RiLockPasswordLine className="text-zinc-400" size={18} /> Update Master PIN
                    </span>
                    <div className={inputContainerClass}>
                      <input
                        type="password"
                        maxLength={4}
                        pattern="\d*"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter new 4-digit PIN..."
                        className="bg-transparent border-none outline-none text-sm font-mono text-zinc-100 w-full tracking-[0.3em]"
                      />
                      <button
                        onClick={updateMasterPin}
                        className="text-zinc-500 hover:text-white transition-colors ml-2 cursor-pointer"
                      >
                        <RiSave3Line size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#111113] border border-white/10 p-7 rounded-2xl flex flex-col gap-6">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className={titleClass}>
                        <RiScan2Line className="text-zinc-400" size={18} /> Biometric Registry
                      </span>
                      <span className="text-[10px] text-white font-mono tracking-widest bg-white/10 px-3 py-1.5 rounded-md font-semibold border border-white/5">
                        {faceCount} ENROLLED
                      </span>
                    </div>

                    {isScanningFace ? (
                      <div className="flex items-center gap-4 bg-[#050505] p-3 rounded-xl border border-white/20">
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-16 h-16 rounded-lg object-cover -scale-x-100 border border-white/10"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] text-white font-mono tracking-widest animate-pulse font-bold">
                            {enrollStatus}
                          </span>
                          <span className="text-xs text-zinc-400">Keep head steady...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 h-full justify-between">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Enroll additional structural face descriptors. Data is mathematically
                          encrypted and stored locally.
                        </p>
                        <button
                          onClick={startFaceEnrollment}
                          className="w-full py-3 rounded-lg bg-white text-black font-bold tracking-widest text-[12px] flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] mt-auto cursor-pointer"
                        >
                          <RiAddLine size={18} /> ENROLL NEW IDENTITY
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default SettingsView
