import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../stores/app'
import { guardUnsavedChanges } from '../composables/useUnsavedGuard'

/**
 * 统一的「打开一个 Markdown 文件」入口:未保存保护 + 阅读位置恢复。
 * 侧边栏、快速打开等处共用,保证行为一致。
 */
export async function openMarkdownFile(path: string, name: string): Promise<void> {
  const store = useAppStore()
  if (path === store.currentFilePath) return
  if (!(await guardUnsavedChanges('guard.action.openFile'))) return

  try {
    const content = await invoke<string>('read_file', { path })
    // 恢复阅读位置:上次读的文件用绝对滚动位置,其他文件按阅读进度比例恢复
    if (path === store.lastFilePath) {
      store.pendingScrollRestore = store.lastScrollTop
    } else if ((store.readingProgress[path] ?? 0) > 0.005) {
      store.pendingProgressRestore = store.readingProgress[path]
    }
    store.openFile(path, name, content)
  } catch (e) {
    console.error('Open file failed:', e)
  }
}
