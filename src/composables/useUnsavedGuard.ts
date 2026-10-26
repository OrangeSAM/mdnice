import { ask } from '@tauri-apps/plugin-dialog'
import { useAppStore } from '../stores/app'
import { flushSave, flushAllSave } from './useAutoSave'
import { t } from '../i18n'

/**
 * 切换/关闭前的未保存保护:
 * - 自动保存开启时直接冲刷写盘(切换是安全的);
 * - 关闭自动保存时弹确认框,用户选择是否放弃。
 * 返回 false 表示用户取消,调用方应中止切换。
 */
export async function guardUnsavedChanges(actionKey: string): Promise<boolean> {
  const store = useAppStore()
  const hasAnyModified = store.tabs.some((t) => t.isModified)
  if (!hasAnyModified) return true

  if (store.settings.auto_save) {
    return flushAllSave()
  }

  return ask(t('guard.message', { action: t(actionKey) }), {
    title: t('guard.title'),
    kind: 'warning',
    okLabel: t('guard.discard'),
    cancelLabel: t('guard.cancel'),
  })
}

/**
 * 关闭单个标签页时的未保存保护:
 * - 自动保存开启时冲刷该标签并允许关闭;
 * - 关闭自动保存时提示确认。
 */
export async function guardCloseTab(tabId: string): Promise<boolean> {
  const store = useAppStore()
  const tab = store.tabs.find((t) => t.id === tabId)
  if (!tab || !tab.isModified) return true

  if (store.settings.auto_save) {
    return flushSave(tabId)
  }

  return ask(t('guard.message', { action: t('guard.action.closeTab', { name: tab.name }) }), {
    title: t('guard.title'),
    kind: 'warning',
    okLabel: t('guard.discard'),
    cancelLabel: t('guard.cancel'),
  })
}
