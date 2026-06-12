import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}

// Always expose — works in both contextIsolated and non-isolated
try {
  contextBridge.exposeInMainWorld('electron', {
    ...electronAPI,
    ipcRenderer: {
      ...electronAPI.ipcRenderer,
      invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
      send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
      on: (channel: string, listener: any) => {
        ipcRenderer.on(channel, listener)
        return () => ipcRenderer.removeListener(channel, listener)
      },
      once: (channel: string, listener: any) => ipcRenderer.once(channel, listener),
      removeListener: (channel: string, listener: any) =>
        ipcRenderer.removeListener(channel, listener),
      removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
    }
  })
  contextBridge.exposeInMainWorld('api', api)
  console.log('[Preload] ✅ Electron API exposed to renderer')
} catch (error) {
  console.error('[Preload] ❌ Failed to expose:', error)
  // Fallback for non-isolated context
  // @ts-ignore
  window.electron = {
    ...electronAPI,
    ipcRenderer: {
      ...electronAPI.ipcRenderer,
      invoke: ipcRenderer.invoke.bind(ipcRenderer),
      send: ipcRenderer.send.bind(ipcRenderer),
      on: ipcRenderer.on.bind(ipcRenderer)
    }
  }
  // @ts-ignore
  window.api = api
}
