import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../stores/app'
import { guardUnsavedChanges } from '../composables/useUnsavedGuard'

/**
 * 统一的「打开一个 Markdown 文件」入口:
 * - 若已在标签页中，直接激活该标签页并恢复位置；
 * - 若未打开，读取文件内容并作为新标签页打开。
 * 侧边栏、快速打开、外部文件关联等处共用。
 */
export async function openMarkdownFile(path: string, name: string): Promise<void> {
  const store = useAppStore()
  const existingTab = store.tabs.find((t) => t.path === path)
  if (existingTab) {
    store.switchTab(existingTab.id)
    return
  }

  try {
    const content = await invoke<string>('read_file', { path })
    let restoreScroll: number | undefined
    let restoreProgress: number | undefined

    // 恢复阅读位置:上次读的文件用绝对滚动位置,其他文件按阅读进度比例恢复
    if (path === store.lastFilePath && store.lastScrollTop > 0) {
      restoreScroll = store.lastScrollTop
    } else if ((store.readingProgress[path] ?? 0) > 0.005) {
      restoreProgress = store.readingProgress[path]
    }

    store.openFile(path, name, content, { restoreScroll, restoreProgress })
  } catch (e) {
    console.error('Open file failed:', e)
  }
}
