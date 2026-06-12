import './assets/main.css'

import React, { JSX, StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'

import LockScreen from './UI/LockScreen'
import { useAuthStore } from './store/auth-store'
import IndexRoot from './IndexRoot'

const electronAPI = (window as any).electron?.ipcRenderer

class SystemErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, errorMsg: '' }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#050505] flex flex-col items-center justify-center text-red-500 font-mono p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">CRITICAL SYSTEM FAILURE</h1>
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300 max-w-2xl wrap-break-word">
            {this.state.errorMsg}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── LOCAL MODE: Bypass cloud auth ───
// Set to true to skip Google OAuth login entirely
// Set to false to restore original login flow
const LOCAL_MODE = true

let isSessionUnlocked = LOCAL_MODE // Auto-unlock in local mode

// ─── Lock Screen (PIN/Face) — kept for security vault ───
const LockRoute = ({ children }: { children: JSX.Element }) => {
  const navigate = useNavigate()

  // In local mode, skip lock screen entirely
  if (LOCAL_MODE) {
    isSessionUnlocked = true
    return children
  }

  if (!isSessionUnlocked) {
    return (
      <LockScreen
        onUnlock={() => {
          isSessionUnlocked = true
          navigate('/')
        }}
      />
    )
  }

  return children
}

const AppRouter = () => {
  useEffect(() => {
    if (electronAPI && !LOCAL_MODE) {
      electronAPI.on('oauth-callback', (_event: any, url: string) => {
        try {
          const urlObj = new URL(url.replace('iris://', 'http://localhost/'))
          const refreshToken = urlObj.searchParams.get('refreshToken')
          const accessToken = urlObj.searchParams.get('accessToken')

          if (refreshToken && accessToken) {
            localStorage.setItem('iris_cloud_token', refreshToken)
            useAuthStore.getState().setAccessToken(accessToken)
          }
        } catch (e) {}
      })
    }
    return () => electronAPI?.removeAllListeners('oauth-callback')
  }, [])

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LockRoute>
            <IndexRoot />
          </LockRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SystemErrorBoundary>
      <HashRouter>
        <AppRouter />
      </HashRouter>
    </SystemErrorBoundary>
  </StrictMode>
)

// Notify splash screen that app is ready
window.dispatchEvent(new Event('app-ready'))
