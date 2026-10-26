import { watch } from 'vue'
import { useAppStore, RecentItem } from '../stores/app'
import { invoke } from '@tauri-apps/api/core'
import { debounce } from 'lodash-es'

// 与 Rust SessionState 对齐(snake_case)
interface SessionState {
  last_folder_path: string
  last_file_path: string
  last_scroll_top: number
  recent_items: RecentItem[]
  reading_progress?: Record<string, number>
  open_tabs?: string[]
}

export function useSession() {
  const store = useAppStore()

  const loadSession = async () => {
    try {
      const session = await invoke<SessionState>('load_session')
      store.setSession({
        lastFolderPath: session.last_folder_path,
        lastFilePath: session.last_file_path,
        lastScrollTop: session.last_scroll_top,
      })
      store.setRecentItems(session.recent_items || [])
      store.setReadingProgressMap(session.reading_progress || {})

      // 恢复多标签页
      if (session.open_tabs && session.open_tabs.length > 0) {
        for (const path of session.open_tabs) {
          try {
            const content = await invoke<string>('read_file', { path })
            const name = path.split('/').pop() || path.split('\\').pop() || path
            const isLastFile = path === session.last_file_path
            const restoreScroll = isLastFile ? session.last_scroll_top : undefined
            const restoreProgress = !isLastFile ? session.reading_progress?.[path] : undefined
            store.openFile(path, name, content, { restoreScroll, restoreProgress })
          } catch {
            // 文件若已被移动或删除，忽略
          }
        }
        if (session.last_file_path && store.tabs.some((t) => t.path === session.last_file_path)) {
          store.switchTab(session.last_file_path)
        }
      } else if (session.last_file_path) {
        // 兼容旧 session: 单个文件恢复
        try {
          const content = await invoke<string>('read_file', { path: session.last_file_path })
          const name = session.last_file_path.split('/').pop() || session.last_file_path.split('\\').pop() || session.last_file_path
          store.openFile(session.last_file_path, name, content, { restoreScroll: session.last_scroll_top })
        } catch {
          // 忽略
        }
      }
    } catch (e) {
      console.error('Failed to load session:', e)
    }
  }

  const saveSession = async () => {
    try {
      await invoke('save_session', {
        session: {
          last_folder_path: store.lastFolderPath,
          last_file_path: store.lastFilePath,
          last_scroll_top: store.lastScrollTop,
          recent_items: store.recentItems,
          reading_progress: store.readingProgress,
          open_tabs: store.tabs.map((t) => t.path),
        },
      })
    } catch (e) {
      console.error('Failed to save session:', e)
    }
  }

  // 低频字段(目录/文件路径)变化立即持久化
  watch(
    () => [store.lastFolderPath, store.lastFilePath],
    () => {
      saveSession()
    }
  )

  // 标签页列表变化(打开新标签/关闭标签/顺序变动)立即持久化
  watch(
    () => store.tabs.map((t) => t.path).join(','),
    () => {
      saveSession()
    }
  )

  // 最近书架变化立即持久化(低频:仅在打开/移除文件目录时)
  watch(
    () => store.recentItems,
    () => {
      saveSession()
    },
    { deep: true }
  )

  // 高频字段(滚动位置)变化节流持久化,避免每次滚动都写盘
  const debouncedSave = debounce(() => {
    saveSession()
  }, 500)
  watch(
    () => store.lastScrollTop,
    () => {
      debouncedSave()
    }
  )

  // 阅读进度变化(滚动中 >0.5% 才会变)同样节流持久化
  watch(
    () => store.readingProgress,
    () => {
      debouncedSave()
    },
    { deep: true }
  )

  return { loadSession, saveSession }
}
