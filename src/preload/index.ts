import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}

const settings = {
  get: (key: string) => ipcRenderer.invoke('settings:get', key),
  set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
  delete: (key: string) => ipcRenderer.invoke('settings:delete', key),
  all: () => ipcRenderer.invoke('settings:all')
}

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
  contextBridge.exposeInMainWorld('settings', settings)
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
  window.settings = settings
  // @ts-ignore
  window.api = api
}
