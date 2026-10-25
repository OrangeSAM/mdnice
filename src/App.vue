<template>
  <div class="app" :data-theme="currentTheme" :class="{ immersive: store.immersive }" @mousemove="handleMouseMove">
    <div class="titlebar" data-tauri-drag-region v-if="!store.immersive"></div>
    <div class="app-body">
      <Sidebar
        v-if="store.showSidebar && (store.hasFile || store.fileTree.length) && !store.immersive"
        :style="{ width: `${store.sidebarWidth}px` }"
      />
      <div
        v-if="store.showSidebar && (store.hasFile || store.fileTree.length) && !store.immersive"
        class="sidebar-resize-handle"
        @mousedown="startSidebarResize"
        @dblclick="resetSidebarWidth"
        title="Drag to resize sidebar, double click to reset"
      ></div>
      <div class="main-area">
        <div class="app-topbar" v-if="!store.immersive">
          <div class="topbar-left" data-tauri-drag-region>
            <span class="file-indicator" v-if="store.isModified"></span>
            <span class="file-name">{{ store.currentFileName || 'Mdnice' }}</span>
          </div>
          <div class="topbar-actions">
            <button
              class="topbar-btn"
              v-if="store.hasFile || store.fileTree.length"
              @click="store.toggleSidebar()"
              :title="store.showSidebar ? t('app.hideSidebar') : t('app.showSidebar')"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/>
                <path d="M6 2V14" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </button>
            <button
              class="topbar-btn"
              v-if="store.hasFile || store.fileTree.length"
              @click="handleHome"
              :title="t('app.home')"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M2 7L8 2L14 7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3.5 6.5V13H12.5V6.5" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="topbar-divider" v-if="store.hasFile || store.fileTree.length"></div>
            <!-- View mode toggle -->
            <div class="view-toggle" v-if="store.hasFile">
              <button
                class="toggle-btn"
                :class="{ active: store.settings.view_mode === 'editor' }"
                @click="store.updateSettings({ view_mode: 'editor' })"
                :title="t('app.editorOnly')"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M5 6H11M5 8H9M5 10H7" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
                </svg>
              </button>
              <button
                class="toggle-btn"
                :class="{ active: store.settings.view_mode === 'split' }"
                @click="store.updateSettings({ view_mode: 'split' })"
                :title="t('app.splitView')"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M8 2V14" stroke="currentColor" stroke-width="1"/>
                </svg>
              </button>
              <button
                class="toggle-btn"
                :class="{ active: store.settings.view_mode === 'preview' }"
                @click="store.updateSettings({ view_mode: 'preview' })"
                :title="t('app.previewOnly')"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M5 6H11M5 8H11M5 10H8" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="topbar-divider" v-if="store.hasFile"></div>
            <!-- Outline toggle -->
            <button
              class="topbar-btn"
              :class="{ active: store.showToc }"
              v-if="store.hasFile && store.settings.view_mode !== 'editor'"
              @click="store.toggleToc()"
              :title="store.showToc ? t('app.hideOutline') : t('app.showOutline')"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M2.5 3.5H13.5M2.5 8H13.5M2.5 12.5H8.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="topbar-btn" @click="store.showQuickOpen = true" :title="t('app.quickOpen')" v-if="store.hasFile || store.fileTree.length">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.2"/>
                <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="topbar-btn" @click="handleOpen" :title="t('app.openFile')" v-if="store.hasFile">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </button>
            <button class="topbar-btn" @click="handleSave" :title="t('app.save')" :disabled="!store.isModified" v-if="store.hasFile">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M3 2H10L13 5V13C13 13.5523 12.5523 14 12 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2Z" stroke="currentColor" stroke-width="1.2"/>
                <path d="M5 2V6H9V2" stroke="currentColor" stroke-width="1.2"/>
                <path d="M5 9H10" stroke="currentColor" stroke-width="1.2"/>
                <path d="M5 11H8" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </button>
            <div class="topbar-divider" v-if="store.hasFile"></div>
            <button class="topbar-btn" @click="store.showSettings = !store.showSettings" :title="t('app.settings')">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" stroke-width="1.2"/>
                <path d="M13.5 8C13.5 7.6 13.3 7.2 13 6.9L13.6 5.4L12.1 4.5L10.8 5.5C10.5 5.3 10.1 5.2 9.7 5.1L9.4 3.7H7.4L7.1 5.1C6.7 5.2 6.3 5.3 6 5.5L4.7 4.5L3.2 5.4L3.8 6.9C3.6 7.2 3.5 7.6 3.5 8C3.5 8.4 3.6 8.8 3.8 9.1L3.2 10.6L4.7 11.5L6 10.5C6.3 10.7 6.7 10.8 7.1 10.9L7.4 12.3H9.4L9.7 10.9C10.1 10.8 10.5 10.7 10.8 10.5L12.1 11.5L13.6 10.6L13 9.1C13.3 8.8 13.5 8.4 13.5 8Z" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Immersive: 预览占满 -->
        <div class="single-pane" v-if="store.immersive && store.hasFile">
          <PreviewPanel ref="previewPanelRef" />
        </div>

        <!-- Split view -->
        <div class="split-pane" v-else-if="store.hasFile && store.settings.view_mode === 'split'">
          <div class="editor-section" :style="{ width: `${store.settings.editor_width}%` }">
            <div class="panel-header">
              <span class="panel-label">{{ t('app.markdown') }}</span>
            </div>
            <EditorPanel @update="handleContentUpdate" />
          </div>
          <div class="resize-handle" @mousedown="startResize"></div>
          <div class="preview-section" :style="{ width: `${100 - store.settings.editor_width}%` }">
            <PreviewPanel ref="previewPanelRef" />
          </div>
        </div>

        <!-- Editor only -->
        <div class="single-pane" v-else-if="store.hasFile && store.settings.view_mode === 'editor'">
          <EditorPanel @update="handleContentUpdate" />
        </div>

        <!-- Preview only -->
        <div class="single-pane" v-else-if="store.hasFile && store.settings.view_mode === 'preview'">
          <PreviewPanel ref="previewPanelRef" />
        </div>

        <!-- Home -->
        <div class="welcome" v-else>
          <div class="welcome-content">
            <div class="welcome-logo">
              <span>M</span>
            </div>
            <h1>Mdnice</h1>
            <p class="welcome-subtitle">{{ t('app.tagline') }}</p>
            <p class="welcome-folder-hint" v-if="store.fileTree.length && store.lastFolderPath">
              {{ t('app.currentFolder') }}: <strong>{{ store.lastFolderPath.split('/').pop() || store.lastFolderPath.split('\\').pop() }}</strong>
            </p>
            <div class="welcome-actions">
              <button class="btn-primary" @click="handleOpenFile">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
                </svg>
                {{ t('app.openFile') }}
              </button>
              <button class="btn-ghost" @click="handleOpenFolder">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M2 7H14" stroke="currentColor" stroke-width="1.2"/>
                </svg>
                {{ t('app.openFolder') }}
              </button>
            </div>

            <!-- Recent shelf -->
            <div class="recent" v-if="store.recentItems.length">
              <div class="recent-header">
                <span class="recent-title">{{ t('app.recent') }}</span>
              </div>
              <div class="recent-list">
                <div
                  class="recent-item"
                  v-for="item in store.recentItems"
                  :key="item.path"
                  @click="openRecentItem(item)"
                >
                  <span class="recent-icon">
                    <svg v-if="item.is_dir" width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
                    </svg>
                    <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M4 2H10L12 4V14H4V2Z" stroke="currentColor" stroke-width="1.2"/>
                      <path d="M10 2V4H12" stroke="currentColor" stroke-width="1.2"/>
                    </svg>
                  </span>
                <div class="recent-item-body">
                  <span class="recent-name">{{ item.name }}</span>
                  <div
                    class="recent-progress"
                    v-if="!item.is_dir && (store.readingProgress[item.path] ?? 0) > 0.005"
                    :title="t('app.readPercent', { percent: Math.round((store.readingProgress[item.path] ?? 0) * 100) })"
                  >
                    <i :style="{ width: `${Math.round((store.readingProgress[item.path] ?? 0) * 100)}%` }"></i>
                  </div>
                </div>
                <button class="recent-remove" @click.stop="store.removeRecent(item.path)" :title="t('app.removeRecent')">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="welcome-hints">
              <div class="hint-item">
                <kbd>⌘</kbd><kbd>O</kbd>
                <span>{{ t('hint.open') }}</span>
              </div>
              <div class="hint-item">
                <kbd>⌘</kbd><kbd>S</kbd>
                <span>{{ t('hint.save') }}</span>
              </div>
              <div class="hint-item">
                <kbd>⌘</kbd><kbd>P</kbd>
                <span>{{ t('hint.quickOpen') }}</span>
              </div>
              <div class="hint-item">
                <kbd>⌘</kbd><kbd>⇧</kbd><kbd>I</kbd>
                <span>{{ t('hint.immersive') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 沉浸式:鼠标移到顶部浮现的精简顶栏 -->
    <div class="floating-topbar" v-if="store.immersive" :class="{ visible: topbarHover }">
      <span class="floating-filename">{{ store.currentFileName || 'Mdnice' }}</span>
      <div class="floating-actions">
        <button
          class="floating-btn"
          :class="{ active: store.showToc }"
          @click="store.toggleToc()"
          :title="store.showToc ? t('app.immersiveOutlineActive') : t('app.immersiveOutline')"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M2.5 3.5H13.5M2.5 8H13.5M2.5 12.5H8.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="floating-exit" @click="store.toggleImmersive" :title="'Esc'">{{ t('app.immersiveExit') }}</button>
      </div>
    </div>
    <SettingsPanel />
    <QuickOpen />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAppStore } from './stores/app'
import { useTheme } from './composables/useTheme'
import { useSettings } from './composables/useSettings'
import { useSession } from './composables/useSession'
import Sidebar from './components/Sidebar.vue'
import EditorPanel from './components/EditorPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import QuickOpen from './components/QuickOpen.vue'
import { open, ask } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { homeDir } from '@tauri-apps/api/path'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { setHomeDir } from './markdown-it-local-images'
import { setupAutoSave, flushSave } from './composables/useAutoSave'
import { guardUnsavedChanges } from './composables/useUnsavedGuard'
import { setupExternalReload } from './composables/useExternalReload'
import { t, setLocale, resolveLocale } from './i18n'
import { findFirstMarkdownFile } from './utils/file'

const store = useAppStore()
const { themeMode } = useTheme()
const { loadSettings } = useSettings()
const { loadSession } = useSession()

const previewPanelRef = ref<InstanceType<typeof PreviewPanel> | null>(null)

const currentTheme = computed(() => {
  if (themeMode.value === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return themeMode.value
})

const topbarHover = ref(false)
function handleMouseMove(e: MouseEvent) {
  if (store.immersive) {
    topbarHover.value = e.clientY < 40
  }
}

onMounted(async () => {
  await loadSettings()
  await loadSession()

  // 界面语言:跟随设置(system 则检测系统语言)
  setLocale(resolveLocale(store.settings.language || 'system'))

  // 图片路径 ~ 前缀展开用;失败不影响主流程
  homeDir().then(setHomeDir).catch(() => {})

  setupAutoSave()
  setupExternalReload()

  // 关窗前的未保存保护:自动保存开着就冲刷;否则询问保存还是放弃
  getCurrentWebviewWindow().onCloseRequested(async (event) => {
    const modified = store.hasFile && store.isModified
    if (!modified) return
    if (store.settings.auto_save) {
      await flushSave()
      return
    }
    event.preventDefault()
    const save = await ask(t('close.message'), {
      title: t('guard.title'),
      kind: 'warning',
      okLabel: t('close.saveAndExit'),
      cancelLabel: t('guard.discard'),
    })
    if (save) await flushSave()
    await getCurrentWebviewWindow().destroy()
  })

  // 启动时消费一次; 之后 app 运行中右键打开文件会触发 open-file 事件
  await openPendingFiles()
  await listen('open-file', () => {
    openPendingFiles()
  })

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
      e.preventDefault()
      handleOpenFile()
    }
    // ⌘P:快速打开 / 全文搜索
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p' && !e.shiftKey) {
      e.preventDefault()
      if (store.hasFile || store.fileTree.length) {
        store.showQuickOpen = true
      }
    }
    // ⌘F:预览内查找;编辑器聚焦时交给 CodeMirror 自带搜索
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f' && !e.shiftKey) {
      const target = e.target as HTMLElement | null
      if (target?.closest?.('.cm-editor')) return
      if (store.hasFile && store.settings.view_mode !== 'editor') {
        e.preventDefault()
        previewPanelRef.value?.openFind()
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      store.toggleImmersive()
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault()
      store.toggleToc()
    }
    if (e.key === 'Escape') {
      // Esc 关闭层级:设置 → 快速打开 → 沉浸模式(快速打开输入框内的 Esc 已自处理)
      if (store.showSettings) {
        e.preventDefault()
        store.showSettings = false
        return
      }
      if (store.showQuickOpen) {
        e.preventDefault()
        store.showQuickOpen = false
        return
      }
      if (store.immersive) {
        e.preventDefault()
        store.toggleImmersive()
      }
    }
  })
})

function handleContentUpdate(content: string) {
  store.setContent(content)
}

async function handleOpenFile() {
  if (!(await guardUnsavedChanges('guard.action.openFile'))) return
  try {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
        { name: 'All', extensions: ['*'] },
      ],
    })
    if (selected) {
      const path = selected as string
      const content = await invoke<string>('read_file', { path })
      const name = path.split('/').pop() || path
      store.openFile(path, name, content)
    }
  } catch (e) {
    console.error('Open file failed:', e)
  }
}

async function handleOpenFolder() {
  if (!(await guardUnsavedChanges('guard.action.openFolder'))) return
  try {
    const selected = await open({ directory: true, multiple: false })
    if (selected) {
      const entries = await invoke<any[]>('read_folder', { path: selected as string })
      store.openFolder(selected as string, entries)
      // 若当前没有打开文件，自动打开该目录下的第一个 Markdown 文件
      if (!store.hasFile) {
        const firstFile = findFirstMarkdownFile(entries)
        if (firstFile) {
          const content = await invoke<string>('read_file', { path: firstFile.path })
          store.openFile(firstFile.path, firstFile.name, content)
        }
      }
    }
  } catch (e) {
    console.error('Open folder failed:', e)
  }
}

async function handleOpen() {
  await handleOpenFile()
}

// 点击书架项打开;文件/目录失效则静默从书架移除
async function openRecentItem(item: { name: string; path: string; is_dir: boolean }) {
  if (item.path === store.currentFilePath) return
  if (!(await guardUnsavedChanges('guard.action.openFile'))) return
  try {
    if (item.is_dir) {
      const entries = await invoke<any[]>('read_folder', { path: item.path })
      store.openFolder(item.path, entries)
      if (!store.hasFile) {
        const firstFile = findFirstMarkdownFile(entries)
        if (firstFile) {
          const content = await invoke<string>('read_file', { path: firstFile.path })
          store.openFile(firstFile.path, firstFile.name, content)
        }
      }
    } else {
      const content = await invoke<string>('read_file', { path: item.path })
      // 恢复阅读位置:上次读的文件用绝对滚动位置,其他文件按阅读进度比例恢复
      if (item.path === store.lastFilePath) {
        store.pendingScrollRestore = store.lastScrollTop
      } else if ((store.readingProgress[item.path] ?? 0) > 0.005) {
        store.pendingProgressRestore = store.readingProgress[item.path]
      }
      store.openFile(item.path, item.name, content)
    }
  } catch (e) {
    console.error('Open recent item failed:', e)
    store.removeRecent(item.path)
  }
}

// 文件关联 / 命令行参数打开: 从 Rust 拉取待打开路径并加载
async function openPendingFiles() {
  try {
    const paths = await invoke<string[]>('take_pending_open_files')
    for (const path of paths) {
      if (path === store.currentFilePath) continue
      if (!(await guardUnsavedChanges('guard.action.openFile'))) continue
      const content = await invoke<string>('read_file', { path })
      const name = path.split('/').pop() || path.split('\\').pop() || path
      store.openFile(path, name, content)
    }
  } catch (e) {
    console.error('Open pending files failed:', e)
  }
}

// 返回首页:清空当前文件/目录,保留书架
async function handleHome() {
  if (!(await guardUnsavedChanges('guard.action.home'))) return
  store.closeFolder()
}

async function handleSave() {
  await flushSave()
}

function startResize(e: MouseEvent) {
  const startX = e.clientX
  const startWidth = store.settings.editor_width
  const container = (e.target as HTMLElement).closest('.split-pane') as HTMLElement | null
  const containerWidth = container?.offsetWidth || window.innerWidth

  function onMouseMove(e: MouseEvent) {
    const delta = e.clientX - startX
    const newWidth = startWidth + (delta / containerWidth) * 100
    store.updateSettings({ editor_width: Math.max(20, Math.min(80, newWidth)) })
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function startSidebarResize(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = store.sidebarWidth

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  function onMouseMove(e: MouseEvent) {
    const delta = e.clientX - startX
    store.setSidebarWidth(startWidth + delta)
  }

  function onMouseUp() {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function resetSidebarWidth() {
  store.setSidebarWidth(220)
}
</script>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
  transition: background-color 0.2s ease;
}

.titlebar {
  height: 28px;
  flex-shrink: 0;
  background: var(--bg-primary);
  transition: background-color 0.2s ease;
}

.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Top bar */
.app-topbar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.file-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.file-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 3px;
}

.topbar-btn {
  width: 30px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.topbar-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.topbar-btn.active {
  background: var(--accent-light);
  color: var(--accent);
}

.topbar-btn:disabled {
  opacity: 0.25;
  cursor: default;
}

.topbar-btn:disabled:hover {
  background: transparent;
  color: var(--text-muted);
}

.topbar-divider {
  width: 1px;
  height: 14px;
  background: var(--border);
  margin: 0 4px;
}

/* View toggle */
.view-toggle {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: 2px;
  gap: 2px;
}

.toggle-btn {
  width: 28px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.toggle-btn.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.toggle-btn:hover:not(.active) {
  color: var(--text-secondary);
}

/* Split pane */
.split-pane {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.single-pane {
  flex: 1;
  overflow: hidden;
}

.editor-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 200px;
}

.preview-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 200px;
}

.panel-header {
  height: 30px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.panel-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.resize-handle {
  width: 1px;
  cursor: col-resize;
  background: var(--border);
  position: relative;
  flex-shrink: 0;
  z-index: 10;
  transition: background 0.12s ease, width 0.12s ease;
}

.resize-handle:hover {
  width: 3px;
  background: var(--accent);
}

.resize-handle:active {
  background: var(--accent);
}

.sidebar-resize-handle {
  width: 1px;
  cursor: col-resize;
  background: var(--border);
  position: relative;
  flex-shrink: 0;
  z-index: 15;
  transition: background 0.12s ease, width 0.12s ease;
}

.sidebar-resize-handle::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  right: -4px;
  cursor: col-resize;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle:active {
  width: 3px;
  background: var(--accent);
}

/* ==================== Welcome Screen ==================== */

.welcome {
  flex: 1;
  display: flex;
  align-items: safe center;
  justify-content: center;
  overflow-y: auto;
  padding: 32px 0;
}

.welcome-content {
  text-align: center;
  max-width: 400px;
}

.welcome-logo {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  color: white;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  margin: 0 auto 28px;
  font-family: var(--font-serif);
  letter-spacing: -0.02em;
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: transform 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out);
}

.welcome-logo:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.welcome h1 {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-serif);
  letter-spacing: -0.03em;
}

.welcome-subtitle {
  margin: 0 0 20px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
}

.welcome-folder-hint {
  margin: -10px 0 24px;
  font-size: 12px;
  color: var(--accent);
  background: var(--accent-light);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  display: inline-block;
}

.welcome-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 36px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border: none;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-lg);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s var(--ease-out);
}

.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-lg);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s var(--ease-out);
}

.btn-ghost:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.welcome-hints {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 11px;
}

.hint-item kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
}

.hint-item span {
  margin-left: 2px;
}

/* ==================== Recent Shelf ==================== */

.recent {
  margin-bottom: 32px;
  text-align: left;
}

.recent-header {
  margin-bottom: 8px;
}

.recent-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 280px;
  overflow-y: auto;
}

.recent-list::-webkit-scrollbar {
  width: 4px;
}

.recent-list::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-secondary);
  transition: background-color 0.1s ease;
}

.recent-item:hover {
  background: var(--bg-secondary);
}

.recent-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-muted);
}

.recent-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.recent-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.recent-progress {
  height: 2px;
  border-radius: 1px;
  background: var(--border);
  overflow: hidden;
  margin-right: 24px;
}

.recent-progress i {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 1px;
}

.recent-remove {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.1s ease;
  flex-shrink: 0;
}

.recent-item:hover .recent-remove {
  opacity: 1;
}

.recent-remove:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* ==================== Immersive Mode ==================== */

.floating-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 80px;
  background: color-mix(in srgb, var(--bg-secondary) 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  transform: translateY(-100%);
  transition: transform 0.25s var(--ease-out);
  z-index: 50;
  user-select: none;
  -webkit-user-select: none;
}

.floating-topbar.visible {
  transform: translateY(0);
}

.floating-filename {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.floating-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.floating-btn {
  width: 26px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s ease;
}

.floating-btn:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.floating-btn.active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-light);
}

.floating-exit {
  padding: 4px 12px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.floating-exit:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}
</style>
