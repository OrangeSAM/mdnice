<template>
  <div class="app" :data-theme="currentTheme">
    <TitleBar />
    <div class="app-body">
      <Sidebar />
      <div class="main-content" v-if="store.hasFile">
        <div class="split-pane">
          <div class="editor-section" :style="{ width: `${store.settings.editor_width}%` }">
            <div class="panel-header">
              <span class="panel-label">Editor</span>
            </div>
            <EditorPanel @update="handleContentUpdate" />
          </div>
          <div class="resize-handle" @mousedown="startResize">
            <div class="resize-line"></div>
          </div>
          <div class="preview-section" :style="{ width: `${100 - store.settings.editor_width}%` }">
            <PreviewPanel />
          </div>
        </div>
      </div>
      <div class="welcome" v-else>
        <div class="welcome-content">
          <div class="welcome-icon">M</div>
          <h1>Markdown Nice</h1>
          <p>A beautiful Markdown reader for macOS</p>
          <div class="welcome-actions">
            <button class="welcome-btn" @click="handleOpenFile">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
              </svg>
              Open File
            </button>
            <button class="welcome-btn secondary" @click="handleOpenFolder">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" stroke="currentColor" stroke-width="1.2"/>
                <path d="M2 7H14" stroke="currentColor" stroke-width="1.2"/>
              </svg>
              Open Folder
            </button>
          </div>
          <div class="welcome-shortcuts">
            <span><kbd>⌘</kbd> + <kbd>O</kbd> Open File</span>
            <span><kbd>⌘</kbd> + <kbd>S</kbd> Save</span>
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
import TitleBar from './components/TitleBar.vue'
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
    const selected = await open({
      directory: true,
      multiple: false,
    })
    if (selected) {
      const entries = await invoke<any[]>('read_folder', { path: selected as string })
      store.fileTree = entries
    }
  } catch (e) {
    console.error('Open folder failed:', e)
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

// Keyboard shortcuts
onMounted(async () => {
  await loadSettings()

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
      e.preventDefault()
      handleOpenFile()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      if (store.currentFilePath && store.isModified) {
        invoke('write_file', {
          path: store.currentFilePath,
          content: store.fileContent,
        }).then(() => {
          store.isModified = false
        })
      }
    }
  })
})
</script>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
}

.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.split-pane {
  display: flex;
  width: 100%;
  height: 100%;
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
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.panel-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.resize-handle {
  width: 5px;
  cursor: col-resize;
  background: transparent;
  position: relative;
  flex-shrink: 0;
  z-index: 10;
}

.resize-handle:hover {
  background: var(--accent);
}

.resize-handle:active {
  background: var(--accent);
}

.resize-line {
  display: none;
}

/* Welcome screen */
.welcome {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
}

.welcome-content {
  text-align: center;
  max-width: 400px;
}

.welcome-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  color: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  margin: 0 auto 20px;
  box-shadow: 0 8px 24px rgba(91, 106, 191, 0.3);
}

.welcome h1 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.welcome p {
  margin: 0 0 28px;
  color: var(--text-muted);
  font-size: 14px;
}

.welcome-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.welcome-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.welcome-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(91, 106, 191, 0.3);
}

.welcome-btn.secondary {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.welcome-btn.secondary:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  box-shadow: none;
}

.welcome-shortcuts {
  display: flex;
  gap: 20px;
  justify-content: center;
  color: var(--text-muted);
  font-size: 12px;
}

.welcome-shortcuts kbd {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 5px;
  font-family: var(--font-mono);
  font-size: 11px;
}
</style>
