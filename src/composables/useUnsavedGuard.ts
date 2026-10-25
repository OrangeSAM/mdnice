import { ask } from '@tauri-apps/plugin-dialog'
import { useAppStore } from '../stores/app'
import { flushSave } from './useAutoSave'
import { t } from '../i18n'

/**
 * 切换/关闭前的未保存保护:
 * - 自动保存开启时直接冲刷写盘(切换是安全的);
 * - 关闭自动保存时弹确认框,用户选择是否放弃。
 * 返回 false 表示用户取消,调用方应中止切换。
 */
export async function guardUnsavedChanges(actionKey: string): Promise<boolean> {
  const store = useAppStore()
  if (!store.hasFile || !store.isModified) return true

  if (store.settings.auto_save) {
    return flushSave()
  }

  return ask(t('guard.message', { action: t(actionKey) }), {
    title: t('guard.title'),
    kind: 'warning',
    okLabel: t('guard.discard'),
    cancelLabel: t('guard.cancel'),
  })
}
