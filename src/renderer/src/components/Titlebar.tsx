import { useState, useEffect } from 'react'
import {
  RiSubtractLine,
  RiCloseLine,
  RiCheckboxBlankLine,
  RiCheckboxMultipleBlankLine,
  RiSunLine,
  RiMoonLine
} from 'react-icons/ri'
import { useThemeStore } from '@renderer/store/theme-store'

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const { theme, toggleTheme } = useThemeStore()

  useEffect(() => {
    if (window.electron && window.electron.process) {
      setIsMac(window.electron.process.platform === 'darwin')
    } else {
      setIsMac(navigator.userAgent.toLowerCase().includes('mac'))
    }
  }, [])

  // Sync theme attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const minimize = () => window.electron.ipcRenderer.send('window-min')
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
    window.electron.ipcRenderer.send('window-max')
  }
  const close = () => window.electron.ipcRenderer.send('window-close')

  const isDark = theme === 'dark'

  return (
    <div
      className="w-full h-14 flex items-center justify-between px-0 backdrop-blur-2xl border-b drag-region select-none z-50 relative"
      style={{
        backgroundColor: 'var(--iris-bg-bar)',
        borderColor: 'var(--iris-border-primary)',
        WebkitAppRegion: 'drag'
      }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, var(--iris-accent-glow), transparent)`
        }}
      />

      <div className="flex items-center h-full pl-5 pr-3 gap-3 z-50 no-drag" style={{ WebkitAppRegion: 'no-drag' }}>
        {isMac ? (
          <div className="flex items-center gap-2.5">
            <button
              onClick={close}
              className="w-4 h-4 rounded-full bg-[#ff5f57] border border-[#e0443e]/30 flex items-center justify-center group transition-all duration-200 hover:scale-110"
            >
              <RiCloseLine
                size={10}
                className="opacity-0 group-hover:opacity-100 text-[#4d0000] transition-opacity duration-150 font-bold"
              />
            </button>
            <button
              onClick={minimize}
              className="w-4 h-4 rounded-full bg-[#febc2e] border border-[#d89e24]/30 flex items-center justify-center group transition-all duration-200 hover:scale-110"
            >
              <RiSubtractLine
                size={10}
                className="opacity-0 group-hover:opacity-100 text-[#995700] transition-opacity duration-150 font-bold"
              />
            </button>
            <button
              onClick={toggleMaximize}
              className="w-4 h-4 rounded-full bg-[#28c840] border border-[#1aab29]/30 flex items-center justify-center group transition-all duration-200 hover:scale-110"
            >
              <RiCheckboxBlankLine
                size={8}
                className="opacity-0 group-hover:opacity-100 text-[#006500] transition-opacity duration-150 font-bold"
              />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 opacity-80">
            <div className="relative flex items-center justify-center w-6 h-6">
              <div
                className="absolute inset-0 rounded-lg blur-md animate-pulse"
                style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(5,150,105,0.15)' }}
              />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                style={{ color: 'var(--iris-accent-light)' }}
                className="w-5 h-5 relative z-10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'var(--iris-text-muted)' }}
            >
              IRIS
            </span>
          </div>
        )}
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 pointer-events-none">
        <div className="flex items-end gap-1 h-5">
          {[1, 2, 3, 2].map((bar, i) => (
            <div
              key={i}
              className="w-0.75 rounded-full animate-pulse"
              style={{
                backgroundColor: 'var(--iris-accent-light)',
                height: i === 0 || i === 3 ? '60%' : '100%',
                animationDelay: `${i * 0.15}s`,
                animationDuration: '1.4s',
                boxShadow: isDark ? '0 0 8px rgba(52, 211, 153, 0.5)' : 'none'
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className="text-xs font-bold tracking-[0.3em] uppercase font-mono"
            style={{ color: 'var(--iris-text-primary)' }}
          >
            IRIS
          </span>
          <span
            className="text-[11px] font-mono"
            style={{ color: 'var(--iris-text-dim)' }}
          >
            //
          </span>
          <span
            className="text-[11px] font-medium tracking-widest uppercase font-mono"
            style={{ color: 'var(--iris-text-muted)' }}
          >
            {isMac ? 'macOS' : 'SYSTEM'}
          </span>
        </div>

        <div className="relative flex items-center justify-center w-2.5 h-2.5">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-30 animate-ping"
            style={{ backgroundColor: 'var(--iris-accent)' }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{
              backgroundColor: 'var(--iris-accent)',
              boxShadow: isDark ? '0 0 10px rgba(52, 211, 153, 0.7)' : '0 0 6px rgba(16,185,129,0.4)'
            }}
          />
        </div>
      </div>

      <div className="flex items-center h-full no-drag z-50" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* ─── Theme Toggle ─── */}
        <button
          onClick={toggleTheme}
          className="h-full px-4 flex items-center justify-center transition-all duration-300 cursor-pointer"
          style={{ color: 'var(--iris-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--iris-accent-light)'
            e.currentTarget.style.backgroundColor = 'var(--iris-bg-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--iris-text-muted)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <RiSunLine size={18} /> : <RiMoonLine size={18} />}
        </button>

        {!isMac && (
          <>
            <button
              onClick={minimize}
              className="w-14 h-full flex items-center justify-center transition-all duration-200"
              style={{ color: 'var(--iris-text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--iris-text-primary)'
                e.currentTarget.style.backgroundColor = 'var(--iris-bg-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--iris-text-muted)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              title="Minimize"
            >
              <RiSubtractLine size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={toggleMaximize}
              className="w-14 h-full flex items-center justify-center transition-all duration-200"
              style={{ color: 'var(--iris-text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--iris-text-primary)'
                e.currentTarget.style.backgroundColor = 'var(--iris-bg-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--iris-text-muted)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? (
                <RiCheckboxMultipleBlankLine size={15} strokeWidth={1.5} />
              ) : (
                <RiCheckboxBlankLine size={15} strokeWidth={1.5} />
              )}
            </button>
            <button
              onClick={close}
              className="w-14 h-full flex items-center justify-center transition-all duration-200"
              style={{ color: 'var(--iris-text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff'
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.9)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--iris-text-muted)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              title="Close"
            >
              <RiCloseLine size={20} strokeWidth={1.5} />
            </button>
          </>
        )}
        {isMac && <div className="w-25" />}
      </div>
    </div>
  )
}

export default TitleBar
