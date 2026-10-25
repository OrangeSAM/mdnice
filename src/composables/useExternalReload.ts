import { watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../stores/app'

// 外部修改自动刷新:别的工具(iCloud / Obsidian Sync / git)改了正在读的文件时,
// 预览自动跟进最新内容并保持阅读位置。轮询 mtime,足够简单可靠,不引额外依赖。

let lastMtime: number | null = null
let timer: ReturnType<typeof setInterval> | null = null

async function check() {
  const store = useAppStore()
  if (!store.hasFile) {
    lastMtime = null
    return
  }
  // 关闭自动保存时,未保存的本地编辑优先,不能被外部内容覆盖
  if (store.isModified && !store.settings.auto_save) return

  try {
    const mtime = await invoke<number | null>('file_mtime', { path: store.currentFilePath })
    if (mtime === null || mtime === 0) {
      lastMtime = null
      return
    }
    if (lastMtime === null) {
      // 首轮只建立基线
      lastMtime = mtime
      return
    }
    if (mtime === lastMtime) return
    lastMtime = mtime

    const content = await invoke<string>('read_file', { path: store.currentFilePath })
    // 内容与本地一致(多半是我们自己的自动保存触发了 mtime),无需刷新
    if (content === store.fileContent) return

    store.pendingScrollRestore = store.lastScrollTop
    store.fileContent = content
    store.isModified = false
  } catch {
    // 文件暂时不可读(被移动/占用等),忽略这一轮,下轮再试
  }
}

export function setupExternalReload(intervalMs = 2500): void {
  if (timer !== null) return
  timer = setInterval(() => void check(), intervalMs)

  // 切换文件后重置基线,避免拿旧文件的 mtime 误判
  const store = useAppStore()
  watch(
    () => store.currentFilePath,
    () => {
      lastMtime = null
    }
  )
}
