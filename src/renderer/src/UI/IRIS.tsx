import { useState, useEffect, Suspense, lazy } from 'react'
import {
  RiWifiLine,
  RiShieldFlashLine,
  RiLayoutGridLine,
  RiBrainLine,
  RiFolderOpenLine,
  RiPhoneLine,
  RiSettings4Line,
  RiBatteryChargeLine,
  RiCameraLine,
  RiComputerLine,
  RiCloseLine,
  RiImageLine
} from 'react-icons/ri'
import { getSystemStatus } from '@renderer/services/system-info'
import { getHistory } from '@renderer/services/iris-ai-brain'
import ViewSkeleton from '@renderer/components/ViewSkelrton'
import { useThemeStore } from '@renderer/store/theme-store'

import DashboardView from '../views/Dashboard'
import PhoneView from '../views/Phone'
import { VisionMode } from '@renderer/IndexRoot'

const WorkFlowEditorView = lazy(() => import('../views/WorkFlowEditor'))
const NotesView = lazy(() => import('../views/Notes'))
const SettingsView = lazy(() => import('../views/Settings'))
const GalleryView = lazy(() => import('../views/Gallery'))

interface IrisProps {
  isSystemActive: boolean
  toggleSystem: () => void
  isMicMuted: boolean
  toggleMic: () => void
  isVideoOn: boolean
  visionMode: VisionMode
  startVision: (mode: 'camera' | 'screen') => void
  stopVision: () => void
  activeStream: MediaStream | null
}

const IRIS = (props: IrisProps) => {
  const [activeTab, setActiveTab] = useState('DASHBOARD')
  const [stats, setStats] = useState<any>(null)
  const [time, setTime] = useState<Date>(new Date())
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [showSourceModal, setShowSourceModal] = useState(false)
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'

  useEffect(() => {
    // Command palette navigation
    const handleNavigate = (e: Event) => {
      const tab = (e as CustomEvent).detail
      if (tab) setActiveTab(tab)
    }
    window.addEventListener('iris:navigate', handleNavigate)
    return () => window.removeEventListener('iris:navigate', handleNavigate)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
      getSystemStatus().then(setStats)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchHistory = async () => {
      const history = await getHistory()
      if (Array.isArray(history)) setChatHistory(history.slice(-15))
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 500)
    return () => clearInterval(interval)
  }, [])

  const handleVisionClick = () => {
    if (props.isVideoOn) {
      props.stopVision()
    } else {
      setShowSourceModal(true)
    }
  }

  const tabs = [
    { id: 'DASHBOARD', icon: <RiLayoutGridLine /> },
    { id: 'Macros', icon: <RiBrainLine /> },
    { id: 'NOTES', icon: <RiFolderOpenLine /> },
    { id: 'GALLERY', icon: <RiImageLine /> },
    { id: 'PHONE', icon: <RiPhoneLine /> },
    { id: 'SETTINGS', icon: <RiSettings4Line /> }
  ]

  return (
    <div
      className="h-screen w-full font-sans overflow-hidden select-none flex flex-col relative pb-5"
      style={{
        backgroundColor: 'var(--iris-bg-primary)',
        color: 'var(--iris-text-primary)'
      }}
    >
      {/* ─── Top Navigation Bar ─── */}
      <div
        className="h-14 w-full flex items-center justify-between px-6 backdrop-blur-md z-50"
        style={{
          backgroundColor: 'var(--iris-bg-bar)',
          borderBottom: '1px solid var(--iris-border-primary)'
        }}
      >
        <div className="hidden lg:flex items-center gap-3">
          <RiShieldFlashLine
            className="text-xl animate-pulse"
            style={{ color: 'var(--iris-accent)' }}
          />
          <div className="flex flex-col leading-none">
            <span
              className="font-black tracking-widest text-lg"
              style={{ color: 'var(--iris-text-primary)' }}
            >
              IRIS AI
            </span>
            <span
              className="text-[12px] font-mono tracking-wide"
              style={{ color: 'var(--iris-accent)' }}
            >
              Advanced Voice Assistant
            </span>
          </div>
        </div>

        {/* ─── Tab Bar ─── */}
        <div
          className="hidden md:flex gap-2 p-1 rounded-lg"
          style={{
            backgroundColor: 'var(--iris-bg-input)',
            border: '1px solid var(--iris-border-primary)'
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="cursor-pointer px-5 py-1.5 text-[10px] font-bold tracking-widest rounded-md transition-all duration-300 flex items-center gap-2"
              style={{
                backgroundColor:
                  activeTab === tab.id ? 'var(--iris-accent-bg)' : 'transparent',
                color:
                  activeTab === tab.id
                    ? 'var(--iris-accent-light)'
                    : 'var(--iris-text-muted)',
                border:
                  activeTab === tab.id
                    ? '1px solid var(--iris-border-accent)'
                    : '1px solid transparent',
                boxShadow:
                  activeTab === tab.id
                    ? isDark
                      ? '0 0 15px rgba(16,185,129,0.1)'
                      : '0 0 10px rgba(16,185,129,0.08)'
                    : 'none'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--iris-text-secondary)'
                  e.currentTarget.style.backgroundColor = 'var(--iris-bg-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--iris-text-muted)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {tab.icon} {tab.id}
            </button>
          ))}
        </div>

        {/* ─── Right Info ─── */}
        <div
          className="flex items-center gap-6 text-[11px] font-mono font-bold"
          style={{ opacity: 0.6 }}
        >
          <div className="flex items-center gap-2" style={{ color: 'var(--iris-accent)' }}>
            <RiWifiLine /> <span>Network</span>
          </div>
          <div className="hidden sm:flex items-center gap-2" style={{ color: 'var(--iris-text-muted)' }}>
            <RiBatteryChargeLine /> <span>100%</span>
          </div>
          <div
            className="px-2 py-1 rounded"
            style={{
              backgroundColor: 'var(--iris-bg-tertiary)',
              color: 'var(--iris-text-secondary)'
            }}
          >
            {time.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* ─── Content Area ─── */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          background: isDark
            ? 'radial-gradient(circle at center, #18181b 0%, #000000 100%)'
            : 'radial-gradient(circle at center, #f1f5f9 0%, #f8fafc 100%)'
        }}
      >
        <div className={`absolute inset-0 ${activeTab === 'DASHBOARD' ? 'block' : 'hidden'}`}>
          <DashboardView
            props={props}
            stats={stats}
            chatHistory={chatHistory}
            onVisionClick={handleVisionClick}
          />
        </div>

        <div className={`absolute inset-0 ${activeTab === 'PHONE' ? 'block' : 'hidden'}`}>
          <PhoneView glassPanel="iris-glass" />
        </div>

        <Suspense fallback={<ViewSkeleton />}>
          {activeTab === 'Macros' && <WorkFlowEditorView />}
          {activeTab === 'NOTES' && <NotesView glassPanel="iris-glass" />}
          {activeTab === 'SETTINGS' && <SettingsView isSystemActive={props.isSystemActive} />}
          {activeTab === 'GALLERY' && <GalleryView />}
        </Suspense>
      </div>

      {/* ─── Vision Source Modal ─── */}
      {showSourceModal && (
        <div className="absolute inset-0 z-100 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
          style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(248,250,252,0.85)' }}
        >
          <div
            className="iris-glass-accent w-96 p-1 flex flex-col shadow-2xl"
          >
            <div
              className="flex items-center justify-between p-4"
              style={{
                borderBottom: '1px solid var(--iris-border-primary)',
                backgroundColor: 'var(--iris-bg-hover)'
              }}
            >
              <span
                className="text-xs font-bold tracking-widest"
                style={{ color: 'var(--iris-accent-light)' }}
              >
                IRIS VISION - SELECT INPUT SOURCE
              </span>
              <button
                onClick={() => setShowSourceModal(false)}
                className="cursor-pointer"
                style={{ color: 'var(--iris-text-muted)' }}
              >
                <RiCloseLine size={18} />
              </button>
            </div>

            <div className="p-4 grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  props.startVision('camera')
                  setShowSourceModal(false)
                }}
                className="cursor-pointer group flex flex-col items-center justify-center gap-3 p-6 rounded-xl transition-all"
                style={{
                  backgroundColor: 'var(--iris-bg-input)',
                  border: '1px solid var(--iris-border-primary)'
                }}
              >
                <div
                  className="p-3 rounded-full transition-colors"
                  style={{ backgroundColor: 'var(--iris-bg-tertiary)', color: 'var(--iris-text-muted)' }}
                >
                  <RiCameraLine size={28} />
                </div>
                <span
                  className="text-[10px] font-bold tracking-widest"
                  style={{ color: 'var(--iris-text-secondary)' }}
                >
                  CAMERA FEED
                </span>
              </button>

              <button
                onClick={() => {
                  props.startVision('screen')
                  setShowSourceModal(false)
                }}
                className="cursor-pointer group flex flex-col items-center justify-center gap-3 p-6 rounded-xl transition-all"
                style={{
                  backgroundColor: 'var(--iris-bg-input)',
                  border: '1px solid var(--iris-border-primary)'
                }}
              >
                <div
                  className="p-3 rounded-full transition-colors"
                  style={{ backgroundColor: 'var(--iris-bg-tertiary)', color: 'var(--iris-text-muted)' }}
                >
                  <RiComputerLine size={28} />
                </div>
                <span
                  className="text-[10px] font-bold tracking-widest"
                  style={{ color: 'var(--iris-text-secondary)' }}
                >
                  SCREEN SHARE
                </span>
              </button>
            </div>

            <div className="p-3 text-center" style={{ backgroundColor: 'var(--iris-bg-input)' }}>
              <p
                className="text-[9px] font-mono"
                style={{ color: 'var(--iris-text-dim)' }}
              >
                SELECT INPUT SOURCE FOR NEURAL PROCESSING
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IRIS
