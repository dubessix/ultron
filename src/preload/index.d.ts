import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>
        send(channel: string, ...args: any[]): void
        on(channel: string, func: (...args: any[]) => void): () => void
        once(channel: string, func: (...args: any[]) => void): void
        removeListener(channel: string, func: (...args: any[]) => void): void
        removeAllListeners(channel: string): void
      }
    }
    settings: {
      get(key: string): Promise<any>
      set(key: string, value: any): Promise<void>
      delete(key: string): Promise<void>
      all(): Promise<any>
    }
    api: unknown
  }
}
