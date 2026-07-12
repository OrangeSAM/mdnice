import { watch } from 'vue'
import { useAppStore } from '../stores/app'
import { invoke } from '@tauri-apps/api/core'
import { debounce } from 'lodash-es'

// 与 Rust SessionState 对齐(snake_case)
interface SessionState {
  last_folder_path: string
  last_file_path: string
  last_scroll_top: number
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

  return { loadSession, saveSession }
}
