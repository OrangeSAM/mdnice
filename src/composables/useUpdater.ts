import { ref, onMounted } from 'vue'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

/**
 * Auto-update checker for the Tauri-hosted app.
 *
 * On mount, schedules a delayed background check (3s) so the app start
 * isn't blocked. Exposes a manual `checkForUpdates` for the settings UI,
 * and `downloadAndInstall` + `relaunch` for the install flow.
 *
 * Failures during the auto-check are logged but never surfaced to the
 * user — the manual button is the explicit opt-in path.
 */
export function useUpdater() {
  const updateAvailable = ref(false)
  const updateVersion = ref('')
  const updateNotes = ref('')
  const downloading = ref(false)
  const downloadProgress = ref(0)
  const error = ref<string | null>(null)

  let pendingUpdate: Update | null = null

  const checkForUpdates = async () => {
    error.value = null
    try {
      const update = await check()
      if (update) {
        updateAvailable.value = true
        updateVersion.value = update.version
        updateNotes.value = update.body || ''
        pendingUpdate = update
      } else {
        updateAvailable.value = false
      }
      return update
    } catch (e) {
      console.warn('Update check failed:', e)
      error.value = String(e)
      return null
    }
  }

  const downloadAndInstall = async () => {
    if (!pendingUpdate) return false

    downloading.value = true
    error.value = null

    try {
      await pendingUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            downloadProgress.value = 0
            break
          case 'Progress':
            downloadProgress.value = event.data.chunkLength
            break
          case 'Finished':
            downloadProgress.value = 100
            break
        }
      })
      // 安装完成后重启应用
      await relaunch()
      return true
    } catch (e) {
      error.value = String(e)
      downloading.value = false
      return false
    }
  }

  const dismiss = () => {
    updateAvailable.value = false
    pendingUpdate = null
  }

  onMounted(() => {
    // 延迟检查，避免影响启动速度
    setTimeout(checkForUpdates, 3000)
  })

  return {
    updateAvailable,
    updateVersion,
    updateNotes,
    downloading,
    downloadProgress,
    error,
    checkForUpdates,
    downloadAndInstall,
    dismiss,
  }
}
