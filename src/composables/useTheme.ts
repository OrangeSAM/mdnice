import { ref, watch, onMounted } from 'vue'
import { useAppStore } from '../stores/app'

export type ConcreteTheme =
  | 'light'
  | 'dark'
  | 'sepia'
  | 'green'
  | 'solarized'
  | 'nord'
  | 'gruvbox'
export type ThemeMode = ConcreteTheme | 'system'

/** 这些主题使用深色形态(决定编辑器语法高亮 / shiki / mermaid 主题) */
const DARK_THEMES: ConcreteTheme[] = ['dark', 'nord', 'gruvbox']

export function isDarkThemeValue(theme: string | undefined): boolean {
  if (!theme) return false
  return DARK_THEMES.includes(theme as ConcreteTheme)
}

export function isConcreteTheme(t: string): t is ConcreteTheme {
  return (DARK_THEMES as string[]).concat(['light', 'sepia', 'green', 'solarized']).includes(t)
}

const themeMode = ref<ThemeMode>('system')

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Resolve any mode (including "system") to a concrete theme value. */
function resolveTheme(mode: ThemeMode): ConcreteTheme {
  if (mode !== 'system') return mode
  const sys = getSystemTheme()
  // 系统深色映射到默认深色;系统浅色映射到默认浅色
  return sys
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', resolveTheme(mode))
}

export function useTheme() {
  const store = useAppStore()

  const setTheme = (mode: ThemeMode) => {
    themeMode.value = mode
    store.updateSettings({ theme: mode })
    applyTheme(mode)
  }

  // Sync themeMode when store.settings.theme changes (e.g. after loadSettings)
  watch(() => store.settings.theme, (t) => {
    if (t && t !== themeMode.value) {
      themeMode.value = isConcreteTheme(t) || t === 'system' ? (t as ThemeMode) : 'light'
      applyTheme(themeMode.value)
    }
  })

  onMounted(() => {
    const saved = store.settings.theme || 'light'
    themeMode.value = isConcreteTheme(saved) || saved === 'system' ? (saved as ThemeMode) : 'light'
    applyTheme(themeMode.value)

    // Re-sync when the system theme changes while in "system" mode.
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (themeMode.value === 'system') applyTheme('system')
    })
  })

  return {
    themeMode,
    setTheme,
  }
}
