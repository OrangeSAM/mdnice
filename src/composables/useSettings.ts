import { ref, watch } from 'vue'
import { useAppStore, AppSettings } from '../stores/app'
import { invoke } from '@tauri-apps/api/core'

export function useSettings() {
  const store = useAppStore()
  const isLoading = ref(false)

  const loadSettings = async () => {
    isLoading.value = true
    try {
      const settings = await invoke<AppSettings>('load_settings')
      store.updateSettings(settings)
      applySettings(settings)
      // 侧边栏可见性持久化在 settings 里,启动时一次性同步到 UI state
      store.showSidebar = settings.show_sidebar
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      isLoading.value = false
    }
  }

  const saveSettings = async () => {
    try {
      await invoke('save_settings', { settings: store.settings })
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }

  const applySettings = (settings: AppSettings) => {
    const root = document.documentElement
    root.style.setProperty('--font-size-base', `${settings.font_size}px`)
    root.style.setProperty('--line-height-base', `${settings.line_height}`)
    root.style.setProperty('--editor-font-size', `${settings.editor_font_size}px`)
    root.style.setProperty('--preview-max-width', `${settings.preview_max_width}px`)

    if (settings.font_family && settings.font_family !== 'system-ui') {
      root.style.setProperty('--font-sans', `${settings.font_family}, system-ui, sans-serif`)
    }
  }

  watch(
    () => store.settings,
    (newSettings) => {
      applySettings(newSettings)
      saveSettings()
    },
    { deep: true }
  )

  return {
    isLoading,
    loadSettings,
    saveSettings,
    applySettings,
  }
}
