<template>
  <div class="app" :data-theme="currentTheme">
    <div class="titlebar" data-tauri-drag-region></div>
    <div class="app-body">
      <Sidebar v-if="store.showSidebar" />
      <div class="main-area">
        <div class="app-topbar">
          <div class="topbar-left" data-tauri-drag-region>
            <span class="file-indicator" v-if="store.isModified"></span>
            <span class="file-name">{{ store.currentFileName || 'Markdown Nice' }}</span>
          </div>
          <div class="topbar-actions">
            <!-- View mode toggle -->
            <div class="view-toggle" v-if="store.hasFile">
              <button
                class="toggle-btn"
                :class="{ active: store.settings.view_mode === 'editor' }"
                @click="store.updateSettings({ view_mode: 'editor' })"
                title="Editor only"
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
                title="Split view"
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
                title="Preview only"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M5 6H11M5 8H11M5 10H8" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="topbar-divider" v-if="store.hasFile"></div>
            <button class="topbar-btn" @click="handleOpen" title="Open File">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </button>
            <button class="topbar-btn" @click="handleSave" title="Save" :disabled="!store.isModified" v-if="store.hasFile">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M3 2H10L13 5V13C13 13.5523 12.5523 14 12 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2Z" stroke="currentColor" stroke-width="1.2"/>
                <path d="M5 2V6H9V2" stroke="currentColor" stroke-width="1.2"/>
                <path d="M5 9H10" stroke="currentColor" stroke-width="1.2"/>
                <path d="M5 11H8" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </button>
            <div class="topbar-divider"></div>
            <button class="topbar-btn" @click="store.showSettings = !store.showSettings" title="Settings">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" stroke-width="1.2"/>
                <path d="M13.5 8C13.5 7.6 13.3 7.2 13 6.9L13.6 5.4L12.1 4.5L10.8 5.5C10.5 5.3 10.1 5.2 9.7 5.1L9.4 3.7H7.4L7.1 5.1C6.7 5.2 6.3 5.3 6 5.5L4.7 4.5L3.2 5.4L3.8 6.9C3.6 7.2 3.5 7.6 3.5 8C3.5 8.4 3.6 8.8 3.8 9.1L3.2 10.6L4.7 11.5L6 10.5C6.3 10.7 6.7 10.8 7.1 10.9L7.4 12.3H9.4L9.7 10.9C10.1 10.8 10.5 10.7 10.8 10.5L12.1 11.5L13.6 10.6L13 9.1C13.3 8.8 13.5 8.4 13.5 8Z" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Split view -->
        <div class="split-pane" v-if="store.hasFile && store.settings.view_mode === 'split'">
          <div class="editor-section" :style="{ width: `${store.settings.editor_width}%` }">
            <div class="panel-header">
              <span class="panel-label">Markdown</span>
            </div>
            <EditorPanel @update="handleContentUpdate" />
          </div>
          <div class="resize-handle" @mousedown="startResize"></div>
          <div class="preview-section" :style="{ width: `${100 - store.settings.editor_width}%` }">
            <PreviewPanel />
          </div>
        </div>

        <!-- Editor only -->
        <div class="single-pane" v-else-if="store.hasFile && store.settings.view_mode === 'editor'">
          <EditorPanel @update="handleContentUpdate" />
        </div>

        <!-- Preview only -->
        <div class="single-pane" v-else-if="store.hasFile && store.settings.view_mode === 'preview'">
          <PreviewPanel />
        </div>

        <!-- Welcome -->
        <div class="welcome" v-else>
          <div class="welcome-content">
            <div class="welcome-logo">
              <span>M</span>
            </div>
            <h1>Markdown Nice</h1>
            <p class="welcome-subtitle">A quiet place to read and write Markdown.</p>
            <div class="welcome-actions">
              <button class="btn-primary" @click="handleOpenFile">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
                </svg>
                Open File
              </button>
              <button class="btn-ghost" @click="handleOpenFolder">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M2 7H14" stroke="currentColor" stroke-width="1.2"/>
                </svg>
                Open Folder
              </button>
            </div>
            <div class="welcome-hints">
              <div class="hint-item">
                <kbd>⌘</kbd><kbd>O</kbd>
                <span>Open</span>
              </div>
              <div class="hint-item">
                <kbd>⌘</kbd><kbd>S</kbd>
                <span>Save</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <SettingsPanel />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAppStore } from './stores/app'
import { useTheme } from './composables/useTheme'
import { useSettings } from './composables/useSettings'
import Sidebar from './components/Sidebar.vue'
import EditorPanel from './components/EditorPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'

const store = useAppStore()
const { themeMode } = useTheme()
const { loadSettings } = useSettings()

const currentTheme = computed(() => {
  if (themeMode.value === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return themeMode.value
})

onMounted(async () => {
  await loadSettings()

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
      e.preventDefault()
      handleOpenFile()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  })
})

function handleContentUpdate(content: string) {
  store.setContent(content)
}

async function handleOpenFile() {
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
      const content = await readTextFile(path)
      const name = path.split('/').pop() || path
      store.openFile(path, name, content)
    }
  } catch (e) {
    console.error('Open file failed:', e)
  }
}

async function handleOpenFolder() {
  try {
    const selected = await open({ directory: true, multiple: false })
    if (selected) {
      const entries = await invoke<any[]>('read_folder', { path: selected as string })
      store.fileTree = entries
    }
  } catch (e) {
    console.error('Open folder failed:', e)
  }
}

async function handleOpen() {
  await handleOpenFile()
}

async function handleSave() {
  if (!store.currentFilePath || !store.isModified) return
  try {
    await invoke('write_file', {
      path: store.currentFilePath,
      content: store.fileContent,
    })
    store.isModified = false
  } catch (e) {
    console.error('Save failed:', e)
  }
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
</script>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
}

.titlebar {
  height: 28px;
  flex-shrink: 0;
  background: var(--bg-primary);
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
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.topbar-btn {
  width: 28px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
}

.topbar-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
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
  border-radius: var(--radius-sm);
  padding: 2px;
  gap: 1px;
}

.toggle-btn {
  width: 26px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
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

/* ==================== Welcome Screen ==================== */

.welcome {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-content {
  text-align: center;
  max-width: 360px;
}

.welcome-logo {
  width: 52px;
  height: 52px;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  margin: 0 auto 24px;
  font-family: var(--font-serif);
  letter-spacing: -0.02em;
  box-shadow: var(--shadow-md);
}

.welcome h1 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.welcome-subtitle {
  margin: 0 0 32px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.5;
}

.welcome-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 32px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border: none;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: var(--shadow-md);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.btn-ghost:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
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
</style>
