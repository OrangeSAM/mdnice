import { watch } from 'vue'
import { useAppStore } from '../stores/app'
import { invoke } from '@tauri-apps/api/core'
import { debounce } from 'lodash-es'

// 阅读器场景下编辑是顺手改两笔,自动保存天经地义:停止输入 800ms 后写盘。
// 关闭自动保存时仍提供手动 ⌘S 保存。

/** 立即保存指定标签页或当前文件(有修改时)。供守卫、退出前冲刷复用 */
export async function flushSave(tabId?: string): Promise<boolean> {
  const store = useAppStore()
  const tab = tabId ? store.tabs.find((t) => t.id === tabId) : store.activeTab
  if (!tab || !tab.path || !tab.isModified) return true
  try {
    await invoke('write_file', {
      path: tab.path,
      content: tab.content,
    })
    tab.isModified = false
    return true
  } catch (e) {
    console.error('Save failed:', e)
    return false
  }
}

/** 冲刷保存所有有未保存更改的标签页 */
export async function flushAllSave(): Promise<boolean> {
  const store = useAppStore()
  let allSuccess = true
  for (const tab of store.tabs) {
    if (tab.isModified) {
      const ok = await flushSave(tab.id)
      if (!ok) allSuccess = false
    }
  }
  return allSuccess
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
