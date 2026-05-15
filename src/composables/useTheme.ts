import { ref, watch, onMounted } from 'vue'
import { useAppStore } from '../stores/app'

const themeMode = ref<'light' | 'dark' | 'system'>('system')

function getSystemTheme(): 'light' | 'dark' {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function applyTheme(mode: 'light' | 'dark' | 'system') {
  const effectiveTheme = mode === 'system' ? getSystemTheme() : mode
  document.documentElement.setAttribute('data-theme', effectiveTheme)
}

export function useTheme() {
  const store = useAppStore()

  const setTheme = (mode: 'light' | 'dark' | 'system') => {
    themeMode.value = mode
    store.updateSettings({ theme: mode })
    applyTheme(mode)
  }

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme')
    setTheme(current === 'dark' ? 'light' : 'dark')
  }

  const init = () => {
    themeMode.value = (store.settings.theme as any) || 'system'
    applyTheme(themeMode.value)

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (themeMode.value === 'system') {
          applyTheme('system')
        }
      })
    }
  }

  onMounted(() => {
    init()
  })

  return {
    themeMode,
    setTheme,
    toggleTheme,
  }
}
