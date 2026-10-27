import { defineStore, acceptHMRUpdate } from 'pinia'
import { ref, computed } from 'vue'

export interface FileEntry {
  name: string
  path: string
  is_dir: boolean
  children?: FileEntry[]
}

// 「最近」书架的一项:文件或文件夹(与 Rust RecentItem 对齐)
export interface RecentItem {
  name: string
  path: string
  is_dir: boolean
}

/** 打开的文件标签页 */
export interface TabItem {
  id: string
  path: string
  name: string
  content: string
  isModified: boolean
  scrollTop: number
  readingProgress: number
}

export type ViewMode = 'editor' | 'preview' | 'split'

/** 语言设置:system 跟随系统,zh / en 固定 */
export type LanguageSetting = 'system' | 'zh' | 'en'

export interface AppSettings {
  font_size: number
  font_family: string
  line_height: number
  theme: string
  editor_font_size: number
  editor_width: number
  preview_max_width: number
  show_sidebar: boolean
  sidebar_width?: number
  view_mode: ViewMode
  auto_save: boolean
  language: LanguageSetting
}

export const useAppStore = defineStore('app', () => {
  // Tabs & File state
  const tabs = ref<TabItem[]>([])
  const activeTabId = ref<string>('')
  const fileTree = ref<FileEntry[]>([])

  const activeTab = computed(() => {
    return tabs.value.find((t) => t.id === activeTabId.value) || null
  })

  const currentFilePath = computed(() => activeTab.value?.path || '')
  const currentFileName = computed(() => activeTab.value?.name || '')

  const fileContent = computed({
    get: () => activeTab.value?.content || '',
    set: (val: string) => {
      if (activeTab.value) {
        activeTab.value.content = val
        activeTab.value.isModified = true
      }
    },
  })

  const isModified = computed({
    get: () => activeTab.value?.isModified || false,
    set: (val: boolean) => {
      if (activeTab.value) {
        activeTab.value.isModified = val
      }
    },
  })

  const hasFile = computed(() => tabs.value.length > 0 && activeTab.value !== null)

  // Session state (持久化到 session.json,启动时恢复上次目录/文件/阅读位置)
  const lastFolderPath = ref<string>('')
  const lastFilePath = ref<string>('')
  const lastScrollTop = ref<number>(0)
  // 启动恢复时由 App.vue 设置,PreviewPanel render 完成后读取并清空(一次性)
  const pendingScrollRestore = ref<number | null>(null)
  // 同上,但按进度比例(0~1)恢复:书架里点开任意有进度的文件时使用
  const pendingProgressRestore = ref<number | null>(null)
  // 每个文件的阅读进度(path → 0.0~1.0),书架进度条展示 + 恢复继续阅读
  const readingProgress = ref<Record<string, number>>({})

  // 最近书架(最近优先,去重,上限 MAX_RECENT)
  const recentItems = ref<RecentItem[]>([])
  const MAX_RECENT = 20

  // UI state
  const showSidebar = ref(true)
  const sidebarFilterMdOnly = ref(true)
  const treeCollapseSignal = ref(0)
  const showSettings = ref(false)
  const showQuickOpen = ref(false)
  const immersive = ref(false)
  const showToc = ref(true)
  const tocWidth = ref<number>(
    Number(localStorage.getItem('mdnice_toc_width')) || 240
  )

  function setTocWidth(width: number) {
    const clamped = Math.max(180, Math.min(500, Math.round(width)))
    tocWidth.value = clamped
    localStorage.setItem('mdnice_toc_width', String(clamped))
  }

  const sidebarWidth = ref<number>(
    Number(localStorage.getItem('mdnice_sidebar_width')) || 220
  )

  function setSidebarWidth(width: number) {
    const clamped = Math.max(160, Math.min(600, Math.round(width)))
    sidebarWidth.value = clamped
    localStorage.setItem('mdnice_sidebar_width', String(clamped))
    updateSettings({ sidebar_width: clamped })
  }

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
    sidebar_width: 220,
    view_mode: 'split',
    auto_save: true,
    language: 'system',
  })

  function setContent(content: string) {
    if (activeTab.value) {
      activeTab.value.content = content
      activeTab.value.isModified = true
    }
  }

  function setTabModified(tabId: string, modified: boolean) {
    const tab = tabs.value.find((t) => t.id === tabId)
    if (tab) {
      tab.isModified = modified
    }
  }

  function openFile(
    path: string,
    name: string,
    content: string,
    options?: { restoreScroll?: number; restoreProgress?: number }
  ) {
    const existing = tabs.value.find((t) => t.path === path)
    if (existing) {
      activeTabId.value = existing.id
      lastFilePath.value = path
      // 若外部有更新且本地未做修改，静默更新内容
      if (!existing.isModified && content !== existing.content) {
        existing.content = content
      }
      if (options?.restoreScroll !== undefined) {
        existing.scrollTop = options.restoreScroll
        pendingScrollRestore.value = options.restoreScroll
      } else if (options?.restoreProgress !== undefined) {
        existing.readingProgress = options.restoreProgress
        pendingProgressRestore.value = options.restoreProgress
      } else if (existing.scrollTop > 0) {
        pendingScrollRestore.value = existing.scrollTop
      }
      pushRecent({ name, path, is_dir: false })
      return
    }

    const initialScroll = options?.restoreScroll ?? 0
    const initialProgress = options?.restoreProgress ?? (readingProgress.value[path] || 0)

    const newTab: TabItem = {
      id: path,
      path,
      name,
      content,
      isModified: false,
      scrollTop: initialScroll,
      readingProgress: initialProgress,
    }

    tabs.value.push(newTab)
    activeTabId.value = path
    lastFilePath.value = path
    pushRecent({ name, path, is_dir: false })

    if (options?.restoreScroll !== undefined) {
      pendingScrollRestore.value = options.restoreScroll
    } else if (options?.restoreProgress !== undefined) {
      pendingProgressRestore.value = options.restoreProgress
    }
  }

  function switchTab(tabId: string) {
    if (tabId === activeTabId.value) return
    const target = tabs.value.find((t) => t.id === tabId)
    if (!target) return

    activeTabId.value = tabId
    lastFilePath.value = target.path

    if (target.scrollTop > 0) {
      pendingScrollRestore.value = target.scrollTop
    } else if ((target.readingProgress || readingProgress.value[target.path] || 0) > 0.005) {
      pendingProgressRestore.value = target.readingProgress || readingProgress.value[target.path]
    } else {
      pendingScrollRestore.value = 0
    }
  }

  function closeTab(tabId: string) {
    const index = tabs.value.findIndex((t) => t.id === tabId)
    if (index === -1) return

    const isClosingActive = activeTabId.value === tabId
    tabs.value.splice(index, 1)

    if (tabs.value.length === 0) {
      activeTabId.value = ''
      pendingScrollRestore.value = null
      pendingProgressRestore.value = null
      clearSession({ lastFilePath: true, lastScrollTop: true })
      return
    }

    if (isClosingActive) {
      const nextIndex = Math.min(index, tabs.value.length - 1)
      const nextTab = tabs.value[nextIndex]
      switchTab(nextTab.id)
    }
  }

  function closeOtherTabs(tabId: string) {
    const target = tabs.value.find((t) => t.id === tabId)
    if (!target) return
    tabs.value = [target]
    switchTab(target.id)
  }

  function closeTabsToRight(tabId: string) {
    const index = tabs.value.findIndex((t) => t.id === tabId)
    if (index === -1) return
    const isTargetOrLeftActive = tabs.value.findIndex((t) => t.id === activeTabId.value) <= index
    tabs.value = tabs.value.slice(0, index + 1)
    if (!isTargetOrLeftActive) {
      switchTab(tabId)
    }
  }

  function closeAllTabs() {
    tabs.value = []
    activeTabId.value = ''
    pendingScrollRestore.value = null
    pendingProgressRestore.value = null
    clearSession({ lastFilePath: true, lastScrollTop: true })
  }

  function reorderTabs(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= tabs.value.length ||
      toIndex >= tabs.value.length
    ) {
      return
    }
    const [moved] = tabs.value.splice(fromIndex, 1)
    tabs.value.splice(toIndex, 0, moved)
  }

  function nextTab() {
    if (tabs.value.length <= 1) return
    const idx = tabs.value.findIndex((t) => t.id === activeTabId.value)
    const nextIdx = (idx + 1) % tabs.value.length
    switchTab(tabs.value[nextIdx].id)
  }

  function prevTab() {
    if (tabs.value.length <= 1) return
    const idx = tabs.value.findIndex((t) => t.id === activeTabId.value)
    const prevIdx = (idx - 1 + tabs.value.length) % tabs.value.length
    switchTab(tabs.value[prevIdx].id)
  }

  function updateActiveTabScroll(scrollTop: number, progress: number) {
    if (!activeTab.value) return
    activeTab.value.scrollTop = scrollTop
    activeTab.value.readingProgress = progress
    lastScrollTop.value = scrollTop
    setReadingProgress(activeTab.value.path, progress)
  }

  // 打开文件夹:设置目录树、确保侧边栏展开、记录上次目录、进书架
  function openFolder(path: string, entries: FileEntry[]) {
    fileTree.value = entries
    showSidebar.value = true
    settings.value.show_sidebar = true
    setSession({ lastFolderPath: path })
    pushRecent({ name: path.split('/').pop() || path, path, is_dir: true })
  }

  // 最近书架:去重 + 置顶 + 截断
  function pushRecent(item: RecentItem) {
    recentItems.value = [
      item,
      ...recentItems.value.filter((r) => r.path !== item.path),
    ].slice(0, MAX_RECENT)
  }

  function removeRecent(path: string) {
    recentItems.value = recentItems.value.filter((r) => r.path !== path)
  }

  function setRecentItems(items: RecentItem[]) {
    recentItems.value = items
  }

  // 更新 session 字段(camelCase;useSession 在与 Rust 交互的边界做 snake_case 转换)
  function setSession(partial: Partial<{ lastFolderPath: string; lastFilePath: string; lastScrollTop: number }>) {
    if (partial.lastFolderPath !== undefined) lastFolderPath.value = partial.lastFolderPath
    if (partial.lastFilePath !== undefined) lastFilePath.value = partial.lastFilePath
    if (partial.lastScrollTop !== undefined) lastScrollTop.value = partial.lastScrollTop
  }

  function setReadingProgress(path: string, progress: number) {
    if (!path) return
    const clamped = Math.max(0, Math.min(1, progress))
    const current = readingProgress.value[path] ?? -1
    // 滚动高频触发,变化小于 0.5% 不更新,避免无意义的响应式风暴
    if (Math.abs(current - clamped) < 0.005) return
    readingProgress.value = { ...readingProgress.value, [path]: clamped }
  }

  function setReadingProgressMap(map: Record<string, number>) {
    readingProgress.value = map || {}
  }

  // 容错回退:清掉失效的 session 字段(传入 true 表示清除该项)
  function clearSession(partial: { lastFolderPath?: boolean; lastFilePath?: boolean; lastScrollTop?: boolean }) {
    if (partial.lastFolderPath) lastFolderPath.value = ''
    if (partial.lastFilePath) lastFilePath.value = ''
    if (partial.lastScrollTop) lastScrollTop.value = 0
  }

  // 关闭当前目录并回到初始状态(欢迎页):清空文件树、当前文件,并清掉 session 记录,
  // 否则下次启动又会自动恢复这个目录
  function closeFolder() {
    closeAllTabs()
    fileTree.value = []
    clearSession({ lastFolderPath: true, lastFilePath: true, lastScrollTop: true })
  }

  function updateSettings(newSettings: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...newSettings }
  }

  // 侧边栏开关:翻转 UI state 并同步到 settings(借助 settings 深层 watcher 自动持久化)
  function toggleSidebar() {
    showSidebar.value = !showSidebar.value
    settings.value.show_sidebar = showSidebar.value
  }

  function toggleSidebarFilter() {
    sidebarFilterMdOnly.value = !sidebarFilterMdOnly.value
  }

  function collapseAllFolders() {
    treeCollapseSignal.value++
  }

  function toggleToc() {
    showToc.value = !showToc.value
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
    tabs,
    activeTabId,
    activeTab,
    currentFilePath,
    currentFileName,
    fileContent,
    isModified,
    fileTree,
    lastFolderPath,
    lastFilePath,
    lastScrollTop,
    pendingScrollRestore,
    pendingProgressRestore,
    readingProgress,
    setReadingProgress,
    setReadingProgressMap,
    recentItems,
    pushRecent,
    removeRecent,
    setRecentItems,
    setSession,
    clearSession,
    closeFolder,
    showSidebar,
    sidebarWidth,
    setSidebarWidth,
    showSettings,
    showQuickOpen,
    showToc,
    toggleToc,
    tocWidth,
    setTocWidth,
    settings,
    hasFile,
    setContent,
    setTabModified,
    openFile,
    switchTab,
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
    reorderTabs,
    nextTab,
    prevTab,
    updateActiveTabScroll,
    openFolder,
    updateSettings,
    cycleViewMode,
    toggleSidebar,
    sidebarFilterMdOnly,
    toggleSidebarFilter,
    treeCollapseSignal,
    collapseAllFolders,
    immersive,
    toggleImmersive,
  }
})

// 让 store 改动支持 HMR,否则新增/修改的 action 不会热更新到运行中的实例
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
