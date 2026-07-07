import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface FileEntry {
  name: string
  path: string
  is_dir: boolean
  children?: FileEntry[]
}

export type ViewMode = 'editor' | 'preview' | 'split'

export interface AppSettings {
  font_size: number
  font_family: string
  line_height: number
  theme: string
  editor_font_size: number
  editor_width: number
  preview_max_width: number
  show_sidebar: boolean
  view_mode: ViewMode
}

export const useAppStore = defineStore('app', () => {
  // File state
  const currentFilePath = ref<string>('')
  const currentFileName = ref<string>('')
  const fileContent = ref<string>('')
  const isModified = ref(false)
  const fileTree = ref<FileEntry[]>([])

  // UI state
  const showSidebar = ref(true)
  const showSettings = ref(false)

  // Settings
  const settings = ref<AppSettings>({
    font_size: 16,
    font_family: 'system-ui',
    line_height: 1.8,
    theme: 'light',
    editor_font_size: 14,
    editor_width: 50,
    preview_max_width: 800,
    show_sidebar: true,
    view_mode: 'split',
  })

  const hasFile = computed(() => currentFilePath.value !== '')

  function setContent(content: string) {
    fileContent.value = content
    isModified.value = true
  }

  function openFile(path: string, name: string, content: string) {
    currentFilePath.value = path
    currentFileName.value = name
    fileContent.value = content
    isModified.value = false
  }

  function updateSettings(newSettings: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...newSettings }
  }

  function cycleViewMode() {
    const modes: ViewMode[] = ['editor', 'preview', 'split']
    const idx = modes.indexOf(settings.value.view_mode)
    settings.value.view_mode = modes[(idx + 1) % modes.length]
  }

  return {
    currentFilePath,
    currentFileName,
    fileContent,
    isModified,
    fileTree,
    showSidebar,
    showSettings,
    settings,
    hasFile,
    setContent,
    openFile,
    updateSettings,
    cycleViewMode,
  }
})
