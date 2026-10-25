import { watch } from 'vue'
import { useAppStore } from '../stores/app'
import { invoke } from '@tauri-apps/api/core'
import { debounce } from 'lodash-es'

// 阅读器场景下编辑是顺手改两笔,自动保存天经地义:停止输入 800ms 后写盘。
// 关闭自动保存时仍提供手动 ⌘S 保存。

/** 立即保存当前文件(有修改时)。供守卫、退出前冲刷复用 */
export async function flushSave(): Promise<boolean> {
  const store = useAppStore()
  if (!store.hasFile || !store.isModified) return true
  try {
    await invoke('write_file', {
      path: store.currentFilePath,
      content: store.fileContent,
    })
    store.isModified = false
    return true
  } catch (e) {
    console.error('Save failed:', e)
    return false
  }
}

// 调度时记录目标路径:若用户在防抖窗口内切走了文件,过期保存不落盘
let scheduledPath = ''

const debouncedAutoSave = debounce(() => {
  const store = useAppStore()
  if (!store.hasFile || !store.isModified || !store.settings.auto_save) return
  if (store.currentFilePath !== scheduledPath) return
  void flushSave()
}, 800)

export function setupAutoSave(): void {
  const store = useAppStore()

  watch(
    () => store.fileContent,
    () => {
      if (!store.hasFile || !store.settings.auto_save) return
      scheduledPath = store.currentFilePath
      debouncedAutoSave()
    }
  )

  watch(
    () => store.settings.auto_save,
    (enabled) => {
      if (!enabled) debouncedAutoSave.cancel()
    }
  )
}
