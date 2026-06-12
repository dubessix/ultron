import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  immer((set) => ({
    theme: (localStorage.getItem('iris_theme') as Theme) || 'light',

    toggleTheme: () =>
      set((state) => {
        const next = state.theme === 'dark' ? 'light' : 'dark'
        state.theme = next
        localStorage.setItem('iris_theme', next)
        return state
      }),

    setTheme: (t: Theme) =>
      set((state) => {
        state.theme = t
        localStorage.setItem('iris_theme', t)
        return state
      })
  }))
)
