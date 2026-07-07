import { ref, watch, onMounted } from 'vue'
import { useAppStore } from '../stores/app'

const themeMode = ref<'light' | 'dark' | 'system'>('system')

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Resolve any mode (including "system") to a concrete light/dark value. */
function resolveTheme(mode: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode
}

function applyTheme(mode: 'light' | 'dark' | 'system') {
  document.documentElement.setAttribute('data-theme', resolveTheme(mode))
}

export function useTheme() {
  const store = useAppStore()

  const setTheme = (mode: 'light' | 'dark' | 'system') => {
    themeMode.value = mode
    store.updateSettings({ theme: mode })
    applyTheme(mode)
  }

  const toggleTheme = () => {
    setTheme(themeMode.value === 'dark' ? 'light' : 'dark')
  }

  // Sync themeMode when store.settings.theme changes (e.g. after loadSettings)
  watch(() => store.settings.theme, (t) => {
    if (t && t !== themeMode.value) {
      themeMode.value = t as any
      applyTheme(t as any)
    }
  })

  onMounted(() => {
    themeMode.value = (store.settings.theme as any) || 'light'
    applyTheme(themeMode.value)

    // Re-sync when the system theme changes while in "system" mode.
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (themeMode.value === 'system') applyTheme('system')
    })
  })

  return {
    themeMode,
    setTheme,
    toggleTheme,
  }
}
