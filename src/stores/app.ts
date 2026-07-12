import { defineStore, acceptHMRUpdate } from 'pinia'
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

  // Session state (持久化到 session.json,启动时恢复上次目录/文件/阅读位置)
  const lastFolderPath = ref<string>('')
  const lastFilePath = ref<string>('')
  const lastScrollTop = ref<number>(0)
  // 启动恢复时由 App.vue 设置,PreviewPanel render 完成后读取并清空(一次性)
  const pendingScrollRestore = ref<number | null>(null)

  // UI state
  const showSidebar = ref(true)
  const showSettings = ref(false)
  const immersive = ref(false)

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
    lastFilePath.value = path
  }

  // 更新 session 字段(camelCase;useSession 在与 Rust 交互的边界做 snake_case 转换)
  function setSession(partial: Partial<{ lastFolderPath: string; lastFilePath: string; lastScrollTop: number }>) {
    if (partial.lastFolderPath !== undefined) lastFolderPath.value = partial.lastFolderPath
    if (partial.lastFilePath !== undefined) lastFilePath.value = partial.lastFilePath
    if (partial.lastScrollTop !== undefined) lastScrollTop.value = partial.lastScrollTop
  }

  // 容错回退:清掉失效的 session 字段(传入 true 表示清除该项)
  function clearSession(partial: { lastFolderPath?: boolean; lastFilePath?: boolean; lastScrollTop?: boolean }) {
    if (partial.lastFolderPath) lastFolderPath.value = ''
    if (partial.lastFilePath) lastFilePath.value = ''
    if (partial.lastScrollTop) lastScrollTop.value = 0
  }

  function updateSettings(newSettings: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...newSettings }
  }

  function cycleViewMode() {
    const modes: ViewMode[] = ['editor', 'preview', 'split']
    const idx = modes.indexOf(settings.value.view_mode)
    settings.value.view_mode = modes[(idx + 1) % modes.length]
  }

  // 沉浸式阅读:隐藏所有 chrome,预览占满。不改 view_mode,退出后自然恢复原视图
  function toggleImmersive() {
    if (immersive.value) {
      immersive.value = false
    } else {
      if (!hasFile.value) return
      immersive.value = true
    }
  }

  return {
    currentFilePath,
    currentFileName,
    fileContent,
    isModified,
    fileTree,
    lastFolderPath,
    lastFilePath,
    lastScrollTop,
    pendingScrollRestore,
    setSession,
    clearSession,
    showSidebar,
    showSettings,
    settings,
    hasFile,
    setContent,
    openFile,
    updateSettings,
    cycleViewMode,
    immersive,
    toggleImmersive,
  }
})

// 让 store 改动支持 HMR,否则新增/修改的 action 不会热更新到运行中的实例
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
